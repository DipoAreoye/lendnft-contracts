import { ethers } from "hardhat";
import { getDefaultProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import abi from '../abi/ERC721.json'
const nftContractABI = abi

const safeAddress = "0xDa48e23Aa2858C5CCE0a689AE70775929A55FF75";
const borrowerAddress = "0x192BFe541752a1a77CD380feB2e5Aa9d9c4e1109";
const lenderAddress = "0xFf1df8f17aC935087592120A0E2C7c45f1CeE483";
const moduleAddress = "0xD4eD49d180033250Ead1Afd418D6F2dCbEe4B7be"
const guardAddress = "0xAB5741ae25efD7417796b0a8fbEfDF2575531CDf";
const tokenAddress = "0xf1761434049015206D1C09f76E663b7f565753cB";

async function createSafe() {
  const provider = getDefaultProvider(process.env.RINKEBY_URL);
  const signer = new Wallet (
    process.env.PRIVATE_KEY || '',
    provider
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
    fallbackHandler : "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
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
    borrowerAddress,
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

  const tx = await nft.safeTransferFrom(lenderAddress, safeAddress, tokenId)
  tx.wait()

  console.log("tranfer tx;", tx)
}



// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// createSafe().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

deployModuleContract().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// addModuleToSafe().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
//
// sendNFTsToSafe(tokenAddress, safeAddress).catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
