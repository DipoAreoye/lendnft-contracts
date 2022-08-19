import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";

import { BigNumber } from "ethers";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import { Wallet } from '@ethersproject/wallet'
import guardABI from '../abi/GuardManager.json'
import nftContractABI from '../abi/ERC721.json'

import { ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk'
import Safe,
  { SafeFactory,
    SafeAccountConfig,
    AddOwnerTxParams,
    RemoveOwnerTxParams,
    SwapOwnerTxParams } from '@gnosis.pm/safe-core-sdk'
import { SafeSignature, SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'
import EthSignSignature from '../scripts/SafeSignature'

describe("Deploy Safe", function () {
  let safeSdk: Safe;
  let lender : Wallet;
  let borrower: Wallet;
  let tokenAddress = "0x1aAD0be6EaB3EDbDd05c05601037CC4FCd9bB944";
  let safeManagerAddress: string;
  let safeAddress: string;
  let tokenId: BigNumber;

  before("Deploy Safe & Mint NFT to lender address", async function() {

    //Deploy safe SDK dependency contracts
    await deployments.fixture();

    const [user1, user2] = waffle.provider.getWallets();
    borrower = user1
    lender = user2

    //Deploy ZorosSafeManager
    const ZorosSafeManager = await ethers.getContractFactory("ZorosSafeManager");
    const safeManager = await ZorosSafeManager.deploy();

    await safeManager.deployed();
    safeManagerAddress = safeManager.address;

    //Mint NFT from contract
    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    tokenAddress = boredApeContract.address;

    const apePrice = await boredApeContract.apePrice();
    tokenId = await boredApeContract.totalSupply();
    const tx = await boredApeContract.connect(lender).mintApe(1, { value: apePrice })

    let receipt = await tx.wait();
    const transferEvent = receipt.events?.filter((x) => {return x.event == "Transfer"})

    if (transferEvent != null) {
      tokenId = BigNumber.from(transferEvent[0].topics[3])
    }

    //Deploy Safe
    const ethAdapter = new EthersAdapter({
      ethers,
      signer: borrower
    })

    // Need to tell the SDK the addresses of our deployed contracts
    const chainId = await ethAdapter.getChainId()
    const contractNetworks: ContractNetworksConfig = {
      [chainId]: {
        multiSendAddress: '0x48FD1FC214Fd0d7901d775b3c9d7128514e123Ab',
        safeMasterCopyAddress: '0x8a1497f3eAe314BD80d310FD12b6993C3B0fF6A4',
        safeProxyFactoryAddress: '0x2bF28434F12edd5d7c29B5E56Daf907525C1C345'
      }
    }

    const safeFactory = await SafeFactory.create({ethAdapter, contractNetworks})

    const owners = [borrower.address, safeManagerAddress];
    const threshold = 1
    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
      fallbackHandler:"0xDAFf25a30e2A29A32eD0783A908953B3DE396C6F"
    }

    safeSdk = await safeFactory.deploySafe({ safeAccountConfig })
    safeAddress = safeSdk.getAddress();
  })

  // it("Create Listing", async function() {
  //   const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
  //   const boredApeContract = MyContract.attach(tokenAddress);
  //
  //   await boredApeContract.connect(lender)
  //     .setApprovalForAll(safeManagerAddress, true);
  //
  //   expect(
  //     await boredApeContract.isApprovedForAll(
  //       lender.address, safeManagerAddress
  //     )
  //   ).to.equal(true);
  // });

  it("AcceptListing", async function () {
    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    const balanceBefore = await boredApeContract.balanceOf(safeAddress)
    expect(balanceBefore).to.equal(BigNumber.from(0))

    const ZorosSafeManager = await ethers.getContractFactory("ZorosSafeManager");
    const safeManagerContract = ZorosSafeManager.attach(safeManagerAddress);

    const signatures = generatePreValidatedSignature(safeManagerAddress)
    const bytesString = ethers.utils.hexlify(signatures)

    const lenderBalanceBefore = await waffle.provider.getBalance(lender.address);

    let overrides = {
      value: ethers.utils.parseEther("0.01")
    }

    await safeManagerContract.connect(lender).acceptListing(
      tokenId,
      tokenAddress,
      lender.address,
      borrower.address,
      safeAddress,
    );

    expect(await safeSdk.isModuleEnabled(safeManagerAddress)).to.equal(true)

    const balanceAfter = await boredApeContract.balanceOf(safeAddress)
    expect(balanceAfter).to.equal(BigNumber.from(1))


    const lenderBalanceAfter = await waffle.provider.getBalance(lender.address);
    const lenderBalanceDiff = lenderBalanceAfter.sub(lenderBalanceBefore)
    expect(lenderBalanceDiff).to.equal(ethers.utils.parseEther("0.00975"));
  });

  it("Add owner to safe", async function () {
    const params: AddOwnerTxParams = {
      ownerAddress: lender.address
    }

    const safeTransaction = await safeSdk.getAddOwnerTx(params)
    await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted
  });

  it("Remove owner from safe", async function () {
      const params: RemoveOwnerTxParams = {
        ownerAddress: safeManagerAddress,
        threshold: 1
      }

      const safeTransaction = await safeSdk.getRemoveOwnerTx(params)
      await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted
  });

  it("Swap owner from safe", async function () {
    const params: SwapOwnerTxParams = {
      oldOwnerAddress: borrower.address,
      newOwnerAddress: lender.address
    }

    const safeTransaction = await safeSdk.getSwapOwnerTx(params)
    await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted
  });

  it("Ensure guard protects NFT", async function () {
    const interace = new ethers.utils.Interface(nftContractABI);
    const data = interace.encodeFunctionData("transferFrom", [safeAddress, lender.address, tokenId]);

    const transaction: SafeTransactionDataPartial = {
      to: tokenAddress,
      value: '0',
      data
    }

    const addGuardTx = await safeSdk.createTransaction(transaction)
    await expect(safeSdk.executeTransaction(addGuardTx)).to.be.reverted
  });

  it("Ensure guard protects removing guard", async function () {
    const guardInterface = new ethers.utils.Interface(guardABI);
    const data = guardInterface.encodeFunctionData("setGuard", [ethers.constants.AddressZero]);

    const transaction: SafeTransactionDataPartial = {
      to: safeAddress,
      value: '0',
      data
    };

    const addGuardTx = await safeSdk.createTransaction(transaction);
    await expect(safeSdk.executeTransaction(addGuardTx)).to.be.reverted;
  });

  it("Ensure guard protects adding module", async function () {
    //Deploy Module
    const BrentModule = await ethers.getContractFactory("BrentModule");
    const module2 = await BrentModule.deploy(
      safeAddress,
      tokenAddress,
      borrower.address,
      tokenId);

    await module2.deployed();
    const module2Address = module2.address;

    const safeTransaction = await safeSdk.getEnableModuleTx(module2Address);
    await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted;
  });

  it("Ensure guard protects removing module", async function () {
    const safeTransaction = await safeSdk.getDisableModuleTx(safeManagerAddress)
    await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted;
  });

  it("Retrieve NFT from safe", async function () {
    const ZorosSafeManager = await ethers.getContractFactory("ZorosSafeManager");
    const safeManager = ZorosSafeManager.attach(safeManagerAddress);

    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    const balanceBefore = await boredApeContract.balanceOf(lender.address)
    expect(balanceBefore).to.equal(BigNumber.from(0))

    await safeManager.connect(lender).retrieveNFT(
      safeAddress,
      tokenAddress,
      tokenId
    );

    const balance = await boredApeContract.balanceOf(lender.address)
    expect(balance).to.equal(BigNumber.from(1))
  });

  function generatePreValidatedSignature(ownerAddress: string): string {
    const signature =
      '0x000000000000000000000000' +
      ownerAddress.slice(2) +
      '0000000000000000000000000000000000000000000000000000000000000000' +
      '01'

      return signature;
  }
});
