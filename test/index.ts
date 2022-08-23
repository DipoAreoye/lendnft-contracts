import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";

import { BigNumber } from "ethers";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import { Wallet } from '@ethersproject/wallet'
import nftContractABI from '../abi/ERC721.json'

import { ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'

export const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001'

describe("Deploy Safe", function () {
  let safeSdkRental: Safe;
  let safeSdkDao: Safe;
  let lender : Wallet;
  let borrower: Wallet;
  let dipo: Wallet;
  let tokenAddress = "0x1aAD0be6EaB3EDbDd05c05601037CC4FCd9bB944";
  let safeManagerAddress: string;
  let safeAddress: string;
  let daoSafeAddress: string;
  let tokenId: BigNumber;

  before("Deploy Safe & Mint NFT to lender address", async function() {

    //Deploy safe SDK dependency contracts
    await deployments.fixture();

    const [user1, user2, user3] = waffle.provider.getWallets();
    borrower = user1
    lender = user2
    dipo = user3

    //Deploy ZorosSafeManager
    const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
    const safeManager = await SummonRentalManager.deploy();

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

    //Deploy Safe to Hold NFT
    const ethAdapter = new EthersAdapter({
      ethers,
      signer: lender
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

    let owners = [dipo.address, safeManagerAddress];
    let threshold = 1
    let safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
      fallbackHandler:"0xDAFf25a30e2A29A32eD0783A908953B3DE396C6F"
    }

    safeSdkRental = await safeFactory.deploySafe({ safeAccountConfig })
    safeAddress = safeSdkRental.getAddress();

    //deploy DAO Safe
    safeAccountConfig.owners = [lender.address];
    safeAccountConfig.threshold = 1;

    safeSdkDao = await safeFactory.deploySafe( {safeAccountConfig } )
    daoSafeAddress = safeSdkDao.getAddress();

    await boredApeContract.connect(lender)[
      "safeTransferFrom(address,address,uint256)"
    ](lender.address, daoSafeAddress, tokenId);
  })


  it("Add Rental", async function () {
    const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
    const safeManagerContract = SummonRentalManager.attach(safeManagerAddress);

    const signatures = generatePreValidatedSignature(safeManagerAddress)
    const bytesString = ethers.utils.hexlify(signatures)

    const owners = await safeSdkRental.getOwners()
    const oldOwnerIndex = owners.indexOf(safeManagerAddress)
    const prevOwner = oldOwnerIndex == 0 ? SENTINEL_ADDRESS : owners[oldOwnerIndex - 1];

    await safeManagerContract.connect(lender).addRental(
      prevOwner,
      safeAddress,
      daoSafeAddress,
      borrower.address,
      tokenAddress,
      tokenId,
      bytesString
    );

    expect(await safeSdkRental.isModuleEnabled(safeManagerAddress)).to.equal(true);
    expect(await safeSdkRental.isOwner(borrower.address)).to.equal(true);
    expect(await safeSdkRental.getThreshold()).to.equal(2);
  });


  it("Transfer NFT to safe", async function () {
    const BoredApeYachtClub = await ethers.getContractFactory("BoredApeYachtClub");
    const nftContract = BoredApeYachtClub.attach(tokenAddress);

    const interace = new ethers.utils.Interface(nftContractABI);

    const balanceBefore = await nftContract.balanceOf(safeAddress);
    expect(balanceBefore).to.equal(BigNumber.from(0));

    const data = interace.encodeFunctionData(
      "safeTransferFrom(address,address,uint256)",
     [safeSdkDao.getAddress(),safeAddress, tokenId]
    );

    const transaction: SafeTransactionDataPartial = {
      to: tokenAddress,
      value: '0',
      data
    };

    const daoTx = await safeSdkDao.createTransaction(transaction);
    await safeSdkDao.executeTransaction(daoTx);

    const balanceAfter = await nftContract.balanceOf(safeAddress);
    expect(BigNumber.from(1)).to.equal(balanceAfter);
  });

  it("Retrieve NFT from safe", async function () {
    const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
    const safeManager = SummonRentalManager.attach(safeManagerAddress);

    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    const balanceBefore = await boredApeContract.balanceOf(safeSdkDao.getAddress())
    expect(balanceBefore).to.equal(BigNumber.from(0))

    expect((await safeManager.getRentalInfo(
      safeSdkRental.getAddress(),
      tokenAddress,
      tokenId)).isIntialized).to.equal(true);

    await safeManager.connect(lender).returnNFT(
      safeAddress,
      safeSdkDao.getAddress(),
      tokenAddress,
      tokenId
    );

    const balance = await boredApeContract.balanceOf(safeSdkDao.getAddress())
    expect(balance).to.equal(BigNumber.from(1))

    expect(await safeSdkRental.isOwner(safeManagerAddress)).to.equal(true);
    expect(await safeSdkRental.isOwner(borrower.address)).to.equal(false);
    expect(await safeSdkRental.getThreshold()).to.equal(1);
    expect((await safeManager.getRentalInfo(
      safeSdkRental.getAddress(),
      tokenAddress,
      tokenId)).isIntialized).to.equal(false);
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
