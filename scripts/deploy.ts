import { ethers } from "hardhat";
import { getDefaultProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import nftContractABI from '../abi/ERC721.json'
import moduleABI from '../abi/BrentModule.json'
const  moduleContractABI = moduleABI.abi

const safeAddress = "0xcdC1bEddBa3924ffA30b1FF36eb0b03e73BC2607";
const borrowerAddress = "0x192BFe541752a1a77CD380feB2e5Aa9d9c4e1109";
const lenderAddress = "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483";
const moduleAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const guardAddress = "0xAB5741ae25efD7417796b0a8fbEfDF2575531CDf";
const tokenAddress = "0xf1761434049015206D1C09f76E663b7f565753cB";


async function createSafe() {
  const signer = new Wallet (
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    ethers.provider
  )

  const ethAdapter = new EthersAdapter({
    ethers,
    signer
  })

  const safeFactory = await SafeFactory.create({ethAdapter})

  const owners = [signer.address];
  const threshold = 1
  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold,
  }

  const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig })
  const safeAddress = safeSdk.getAddress();

  console.log("safe deployed:", safeAddress);
}

async function deployGuardContract() {
  const BrentGuard = await ethers.getContractFactory("BrentGuard");
  const guard = await BrentGuard.deploy("0xFf1df8f17aC935087592120A0E2C7c45f1CeE483", "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483");

  await guard.deployed();
  console.log("guard deployed:", guard.address);
}

async function deployModuleContract() {
  const BrentModule = await ethers.getContractFactory("BrentModule");
  const module = await BrentModule.deploy(
    safeAddress,
    tokenAddress,
    lenderAddress,
    12);

  await module.deployed();
  console.log("module deployed:", module.address)
}

async function addModuleToSafe() {
  const provider = getDefaultProvider(process.env.RINKEBY_URL);
  const signer = new Wallet (
    process.env.PRIVATE_KEY || '',
    provider
  )

  const ethAdapter = new EthersAdapter({
    ethers,
    signer
  })

  const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapter, safeAddress })

  const safeTransaction = await safeSdk.getEnableModuleTx(moduleAddress)
  const txResponse = await safeSdk.executeTransaction(safeTransaction)
  const tx = await txResponse.transactionResponse?.wait()

  console.log("module added:", tx)
}

async function checkModuleIsAdded() {
  const provider = getDefaultProvider(process.env.RINKEBY_URL);
  const signer = new Wallet (
    process.env.PRIVATE_KEY || '',
    provider
  )

  const ethAdapter = new EthersAdapter({
    ethers,
    signer
  })

  const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapter, safeAddress })
  const isEnabled = await safeSdk.isModuleEnabled(moduleAddress)

  console.log("module added:", isEnabled)
}

async function mintNFTSToLender() {
  const provider = getDefaultProvider(process.env.RINKEBY_URL);
  const signer = new Wallet (
    process.env.PRIVATE_KEY || '',
    provider
  )

  console.log("signer:", signer.address);

  const BoredApeFactory = await ethers.getContractFactory(
       "BoredApeYachtClub"
  );

  let boredApeContract = await BoredApeFactory.deploy(
       "Bored Ape Yacht Club",
       "BAYC",
       10000,
       1
  );

  const apePrice = await boredApeContract.apePrice();
  const mintTxn =  await boredApeContract.mintApe(1, {
    value: apePrice,
  })

  mintTxn.wait();

  const count = await boredApeContract.balanceOf(signer.address);
  console.log("mintNFTSToLender", count.toNumber() > 0);
}


async function sendNFTsToSafe(tokenAddress: string, tokenId: number) {
  const provider = getDefaultProvider(process.env.RINKEBY_URL);
  const signer = new Wallet (
    process.env.PRIVATE_KEY || '',
    provider
  )

  const nft = new ethers.Contract(
    tokenAddress,
    nftContractABI,
    signer
  );

  const tx = await nft["safeTransferFrom(address,address,uint256)"](lenderAddress, safeAddress, tokenId)
  tx.wait()

  console.log("tranfer tx;", tx)
}

async function retrieveNFTFromSafe() {
  const provider = getDefaultProvider(process.env.RINKEBY_URL);
  const signer = new Wallet (
    process.env.PRIVATE_KEY || '',
    provider
  )

  const module = new ethers.Contract(
    moduleAddress,
    moduleContractABI,
    signer
  );

  const tx = await module.returnNFT();
  tx.wait()

  console.log("retireve NFT tx;", tx)
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
createSafe().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// deployModuleContract().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
//
// addModuleToSafe().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

// checkModuleIsAdded().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
//

// mintNFTSToLender().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

// sendNFTsToSafe(tokenAddress, 13).catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

// retrieveNFTFromSafe().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
