import { expect } from "chai";
import { deployments, ethers, waffle } from "hardhat";

import { BigNumber } from "ethers";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import { Wallet } from '@ethersproject/wallet'

import nftContractABI from '../abi/ERC721.json'
import rentalManagerABI from '../artifacts/contracts/SummonRentalManager.sol/SummonRentalManager.json'

import { ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'

export const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001'

describe("Deploy Safe", function () {
  let localDeployments = {
    gnosis: "",
    proxyFactory: "",
    multiSend: "",
    fallbackHandler: ""
  }

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

    const GnosisSafe = await ethers.getContractFactory("contracts/GnosisSafe/GnosisSafe.sol:GnosisSafe");
    const gnosis = await GnosisSafe.deploy();
    await gnosis.deployed();
    localDeployments.gnosis = gnosis.address;

    const GnosisSafeProxyFactory = await ethers.getContractFactory("contracts/GnosisSafe/proxies/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory");
    const proxyFactory = await GnosisSafeProxyFactory.deploy();
    await proxyFactory.deployed();
    localDeployments.proxyFactory = proxyFactory.address;

    const MultiSend = await ethers.getContractFactory("contracts/GnosisSafe/libraries/MultiSend.sol:MultiSend");
    const multiSend = await MultiSend.deploy();
    await multiSend.deployed();
    localDeployments.multiSend = multiSend.address;

    const CompatibilityFallbackHandler = await ethers.getContractFactory("CompatibilityFallbackHandler");
    const fallbackHandler = await CompatibilityFallbackHandler.deploy();
    await fallbackHandler.deployed();
    localDeployments.fallbackHandler = fallbackHandler.address;

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
        multiSendAddress: localDeployments.multiSend,
        safeMasterCopyAddress: localDeployments.gnosis,
        safeProxyFactoryAddress: localDeployments.proxyFactory
      }
    }

    const safeFactory = await SafeFactory.create({ethAdapter, contractNetworks})

    let owners = [safeManagerAddress];
    let threshold = 1
    let safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
      fallbackHandler: localDeployments.fallbackHandler
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
    const safeManager = SummonRentalManager.attach(safeManagerAddress);

    const signatures = generatePreValidatedSignature(safeManagerAddress)
    const bytesString = ethers.utils.hexlify(signatures)

    const interace = new ethers.utils.Interface(rentalManagerABI.abi);

    const data = interace.encodeFunctionData(
      "addRental(address,address,address,uint256,bytes)",
      [safeAddress,borrower.address,tokenAddress,tokenId,bytesString]
    );

    const transaction: SafeTransactionDataPartial = {
      to: safeManagerAddress,
      value: '0',
      data
    };

    const daoTx = await safeSdkDao.createTransaction(transaction);
    await expect(safeSdkDao.executeTransaction(daoTx))
      .to.emit(safeManager, "RentalAdded")
      .withArgs(safeAddress, tokenAddress, tokenId, daoSafeAddress, borrower.address);

    expect(await safeSdkRental.isModuleEnabled(safeManagerAddress)).to.equal(true);
    expect(await safeSdkRental.isOwner(borrower.address)).to.equal(true);
    expect(await safeSdkRental.isOwner(safeSdkDao.getAddress())).to.equal(true);
    expect(await safeSdkRental.isOwner(safeManagerAddress)).to.equal(true);
    expect(await safeSdkRental.getThreshold()).to.equal(3);
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

  it("Swap borrower on safe", async function () {
    const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
    const safeManager = SummonRentalManager.attach(safeManagerAddress);

    const owners = await safeSdkRental.getOwners()

    const oldOwnerIndex = owners.findIndex((owner: string) =>
     owner.toLowerCase() === borrower.address.toLowerCase()
    )

    const prevOwner = oldOwnerIndex == 0 ? SENTINEL_ADDRESS : owners[oldOwnerIndex - 1];

    const interace = new ethers.utils.Interface(rentalManagerABI.abi);

    expect(owners.includes(borrower.address)).to.equal(true);

    const data = interace.encodeFunctionData(
      "swapBorrower(address,address,uint256,address,address,address)",
      [safeAddress,tokenAddress,tokenId,prevOwner,borrower.address,dipo.address]
    );

    const transaction: SafeTransactionDataPartial = {
      to: safeManagerAddress,
      value: '0',
      data
    };


    const daoTx = await safeSdkDao.createTransaction(transaction);
    await expect(safeSdkDao.executeTransaction(daoTx))
      .to.emit(safeManager, "BorrowerChanged")
      .withArgs(safeAddress, borrower.address, dipo.address);


    expect(await safeSdkRental.isOwner(dipo.address)).to.equal(true);
    expect(await safeSdkRental.isOwner(borrower.address)).to.equal(false);
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

    const interace = new ethers.utils.Interface(rentalManagerABI.abi);

    const data = interace.encodeFunctionData(
      "returnNFT(address,address,uint256)",
      [safeAddress,tokenAddress,tokenId]
    );

    const transaction: SafeTransactionDataPartial = {
      to: safeManagerAddress,
      value: '0',
      data
    };

    const daoTx = await safeSdkDao.createTransaction(transaction);
    await expect(safeSdkDao.executeTransaction(daoTx))
      .to.emit(safeManager, "RentalEnded")
      // .withArgs(safeAddress, tokenAddress, tokenId, daoSafeAddress, dipo.address);

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
