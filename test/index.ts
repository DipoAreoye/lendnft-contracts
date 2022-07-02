import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";
import { BigNumber } from "ethers";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import { Wallet } from '@ethersproject/wallet'
import { ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'

describe("Deploy Safe", function () {
  let lender : Wallet;
  let borrower: Wallet;
  let tokenAddress = "0x1aAD0be6EaB3EDbDd05c05601037CC4FCd9bB944";
  let moduleAddress: string;
  let guardAddress: string;
  let safeAddress: string;
  let tokenId: BigNumber;

  before("Deploy Safe, Module & Mint NFT to lender address", async function() {

    //Deploy safe SDK dependency contracts
    await deployments.fixture();

    const [user1, user2] = waffle.provider.getWallets();
    lender = user1
    borrower = user2

    //Mint NFT from contract
    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    tokenAddress = boredApeContract.address;

    const apePrice = await boredApeContract.apePrice();
    tokenId = await boredApeContract.totalSupply();
    const tx = await boredApeContract.mintApe(1, { value: apePrice })

    let receipt = await tx.wait();
    const transferEvent = receipt.events?.filter((x) => {return x.event == "Transfer"})

    if (transferEvent != null) {
      tokenId = BigNumber.from(transferEvent[0].topics[3])
    }

    //Deploy Safe
    const ethAdapter = new EthersAdapter({
      ethers,
      signer: lender
    })

    const chainId = await ethAdapter.getChainId()
    const contractNetworks: ContractNetworksConfig = {
      [chainId]: {
        multiSendAddress: '0x67e11fA659C73636214507Cf3d9DFC0a879561C9',
        safeMasterCopyAddress: '0x67e11fA659C73636214507Cf3d9DFC0a879561C9',
        safeProxyFactoryAddress: '0x7178aA4031d6c90f944fb536dB64dC97B8aa2D69'
      }
    }

    const safeFactory = await SafeFactory.create({ethAdapter, contractNetworks})

    const owners = [lender.address];
    const threshold = 1
    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
    }

    const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig })
    safeAddress = safeSdk.getAddress();

    //Deploy Guard
    const BrentGuard = await ethers.getContractFactory("BrentGuard");
    const guard = await BrentGuard.deploy(
      tokenAddress,
      lender.address,
      tokenId);

    await guard.deployed();
    guardAddress = guard.address;

    //Deploy Module
    const BrentModule = await ethers.getContractFactory("BrentModule");
    const module = await BrentModule.deploy(
      safeAddress,
      tokenAddress,
      lender.address,
      tokenId);

    await module.deployed();
    moduleAddress = module.address;

    const safeTransaction = await safeSdk.getEnableModuleTx(moduleAddress)
    await safeSdk.executeTransaction(safeTransaction)
    expect(await safeSdk.isModuleEnabled(moduleAddress)).to.equal(true)
  })

  it("Transfer NFT to safe", async function () {
    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    const balanceBefore = await boredApeContract.balanceOf(safeAddress)
    expect(balanceBefore).to.equal(BigNumber.from(0))

    await boredApeContract.transferFrom(lender.address,safeAddress,tokenId)

    const balanceAfter = await boredApeContract.balanceOf(safeAddress)
    expect(balanceAfter).to.equal(BigNumber.from(1))
  });

  it("Retrieve NFT from safe", async function () {
    const BrentModule = await ethers.getContractFactory("BrentModule");
    const module = BrentModule.attach(moduleAddress);

    await module.returnNFT();

    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    const balance = await boredApeContract.balanceOf(lender.address)
    expect(balance).to.equal(BigNumber.from(1))});
});