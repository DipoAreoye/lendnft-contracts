import { ethers, waffle } from "hardhat";

import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import { Wallet } from '@ethersproject/wallet'


import rentalManagerABI from '../artifacts/contracts/SummonRentalManager.sol/SummonRentalManager.json'

import { ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'

export const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001'

async function main() {
  const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
  const contract = await SummonRentalManager.deploy();

  await contract.deployed();
  console.log(`SummonRentalManager deployed to ${contract.address}`);

  // const BoredApeYachtClub = await ethers.getContractFactory("BoredApeYachtClub");
  // const contract = await BoredApeYachtClub.deploy("Bored Ape Yatcht Club", "BAYC",10000,0);
  //
  // await contract.deployed();
  // console.log(`BoredApeYachtClub deployed to ${contract.address}`);
}

async function swapBorrower() {
  const safeManagerAddress = "0x09c0047AF0B463c30328693fcFA8322022329A5f"
  const daoSafeAddress = "0xE022559810E9729c08b62D19369f6dB894450d11"
  const safeAddress = "0x35b4308c800b476ee377b2fc8f8fe9df49fe2fac"
  const borrower = "0x661017a592f334E7960c2737Be9E408b3d4364eC"
  const newBorrower = "0x954e128f3e3d85ba3adafb9d53e7c060833e2bb0"
  const tokenAddress = "0x83be087611c8a1e3b82da822bac048a3c50ad3e9"
  const tokenId = "48104472201746843419636289220926452145165424656533528236006824325658936606720"

  const signer = new ethers.Wallet(process.env.MAINNET_PRIVATE_KEY as string, ethers.provider);

  const ethAdapter = new EthersAdapter({
    ethers,
    signer
  });

  const safeSdk = await Safe.create({ ethAdapter, safeAddress })
  const daoSafeSDK = await Safe.create({ ethAdapter, safeAddress: daoSafeAddress })

  const owners = await safeSdk.getOwners()

  const oldOwnerIndex = owners.findIndex((owner: string) =>
   owner.toLowerCase() === borrower.toLowerCase()
  )

  console.log(owners);

  const prevOwner = oldOwnerIndex == 0 ? SENTINEL_ADDRESS : owners[oldOwnerIndex - 1];

  const interace = new ethers.utils.Interface(rentalManagerABI.abi);

  const data = interace.encodeFunctionData(
    "swapBorrower(address,address,uint256,address,address,address)",
    [safeAddress,tokenAddress,tokenId,prevOwner,borrower,newBorrower]
  );

  const transaction: SafeTransactionDataPartial = {
    to: safeManagerAddress,
    value: '0',
    data
  };

  const daoTx = await daoSafeSDK.createTransaction(transaction);
  const result = await daoSafeSDK.executeTransaction(daoTx)

  console.log(result.hash)
}

async function retrieveNFT() {
  const safeManagerAddress = "0x09c0047af0b463c30328693fcfa8322022329a5f"
  const daoSafeAddress = "0xE022559810E9729c08b62D19369f6dB894450d11"
  const safeAddress = "0x35b4308C800B476EE377b2fc8f8FE9dF49fe2Fac"
  const tokenAddress = "0x1792a96e5668ad7c167ab804a100ce42395ce54d"
  const tokenId = "1266"

  const signer = new ethers.Wallet(process.env.MAINNET_PRIVATE_KEY as string, ethers.provider);


  const ethAdapter = new EthersAdapter({
    ethers,
    signer
  });

  const daoSafeSDK = await Safe.create({ ethAdapter, safeAddress: daoSafeAddress })

  const summonInterface = new ethers.utils.Interface(rentalManagerABI.abi);

  const data = summonInterface.encodeFunctionData(
    "returnNFT(address,address,uint256)",
    [safeAddress,tokenAddress,tokenId]
  );

  const transaction: SafeTransactionDataPartial = {
    to: safeManagerAddress,
    value: '0',
    data
  };

  const txn = await daoSafeSDK.createTransaction(transaction);
  const result = await daoSafeSDK.executeTransaction(txn);

  console.log(result.hash)
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
swapBorrower().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
