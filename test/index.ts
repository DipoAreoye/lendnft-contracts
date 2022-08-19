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

export const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001'

describe("Deploy Safe", function () {
  let safeSdk: Safe;
  let lender : Wallet;
  let borrower: Wallet;
  let dipo: Wallet;
  let tokenAddress = "0x1aAD0be6EaB3EDbDd05c05601037CC4FCd9bB944";
  let safeManagerAddress: string;
  let simulateTxAccessorAddress: string;
  let safeAddress: string;
  let tokenId: BigNumber;

  before("Deploy Safe & Mint NFT to lender address", async function() {

    //Deploy safe SDK dependency contracts
    await deployments.fixture();

    //Deploy SimulateTxAccessor
    const SimulateTxAccessor = await ethers.getContractFactory("SimulateTxAccessor");
    const simulateTxAccessor = await SimulateTxAccessor.deploy();
    simulateTxAccessorAddress = simulateTxAccessor.address;

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

    //Deploy Safe
    const ethAdapter = new EthersAdapter({
      ethers,
      signer: borrower
    })

    // Need to tell the SDK the addresses of our deployed contracts
    const chainId = await ethAdapter.getChainId()
    const contractNetworks: ContractNetworksConfig = {
      [chainId]: {
        multiSendAddress: '0xCB9136828F00f1d7544051f6d0A53e3c653dfa40',
        safeMasterCopyAddress: '0x49d78Ed4aCFc0E4c35D35CB500De4Ee1E215d672',
        safeProxyFactoryAddress: '0x467E5f3767308a4ee6d01167992C0914474a0960'
      }
    }

    const safeFactory = await SafeFactory.create({ethAdapter, contractNetworks})

    const owners = [dipo.address, safeManagerAddress];
    const threshold = 1
    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
      fallbackHandler:"0xfd58D98C88dA02e270Dae0DD068F490b6C7AFDb6"
    }

    safeSdk = await safeFactory.deploySafe({ safeAccountConfig })
    safeAddress = safeSdk.getAddress();
  })


  it("Add Rental", async function () {
    const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
    const safeManagerContract = SummonRentalManager.attach(safeManagerAddress);

    const signatures = generatePreValidatedSignature(safeManagerAddress)
    const bytesString = ethers.utils.hexlify(signatures)

    const owners = await safeSdk.getOwners()
    const oldOwnerIndex = owners.indexOf(safeManagerAddress)
    const prevOwner = oldOwnerIndex == 0 ? SENTINEL_ADDRESS : owners[oldOwnerIndex - 1];

    await safeManagerContract.connect(lender).addRental(
      prevOwner,
      safeAddress,
      lender.address,
      borrower.address,
      tokenAddress,
      tokenId,
      simulateTxAccessorAddress,
      bytesString
    );

    expect(await safeSdk.isModuleEnabled(safeManagerAddress)).to.equal(true);
    expect(await safeSdk.isOwner(borrower.address)).to.equal(true);
    expect(await safeSdk.getThreshold()).to.equal(2);
  });

  // it("Add owner to safe", async function () {
  //   const params: AddOwnerTxParams = {
  //     ownerAddress: lender.address
  //   }
  //
  //   const safeTransaction = await safeSdk.getAddOwnerTx(params)
  //   await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted
  // });
  //
  // it("Remove owner from safe", async function () {
  //     const params: RemoveOwnerTxParams = {
  //       ownerAddress: safeManagerAddress,
  //       threshold: 1
  //     }
  //
  //     const safeTransaction = await safeSdk.getRemoveOwnerTx(params)
  //     await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted
  // });
  //
  // it("Swap owner from safe", async function () {
  //   const params: SwapOwnerTxParams = {
  //     oldOwnerAddress: borrower.address,
  //     newOwnerAddress: lender.address
  //   }
  //
  //   const safeTransaction = await safeSdk.getSwapOwnerTx(params)
  //   await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted
  // });
  //
  // it("Ensure guard protects NFT", async function () {
  //   const interace = new ethers.utils.Interface(nftContractABI);
  //   const data = interace.encodeFunctionData("transferFrom", [safeAddress, lender.address, tokenId]);
  //
  //   const transaction: SafeTransactionDataPartial = {
  //     to: tokenAddress,
  //     value: '0',
  //     data
  //   }
  //
  //   const addGuardTx = await safeSdk.createTransaction(transaction)
  //   await expect(safeSdk.executeTransaction(addGuardTx)).to.be.reverted
  // });
  //
  // it("Ensure guard protects removing guard", async function () {
  //   const guardInterface = new ethers.utils.Interface(guardABI);
  //   const data = guardInterface.encodeFunctionData("setGuard", [ethers.constants.AddressZero]);
  //
  //   const transaction: SafeTransactionDataPartial = {
  //     to: safeAddress,
  //     value: '0',
  //     data
  //   };
  //
  //   const addGuardTx = await safeSdk.createTransaction(transaction);
  //   await expect(safeSdk.executeTransaction(addGuardTx)).to.be.reverted;
  // });
  //
  // it("Ensure guard protects adding module", async function () {
  //   //Deploy Module
  //   const BrentModule = await ethers.getContractFactory("BrentModule");
  //   const module2 = await BrentModule.deploy(
  //     safeAddress,
  //     tokenAddress,
  //     borrower.address,
  //     tokenId);
  //
  //   await module2.deployed();
  //   const module2Address = module2.address;
  //
  //   const safeTransaction = await safeSdk.getEnableModuleTx(module2Address);
  //   await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted;
  // });
  //
  // it("Ensure guard protects removing module", async function () {
  //   const safeTransaction = await safeSdk.getDisableModuleTx(safeManagerAddress)
  //   await expect(safeSdk.executeTransaction(safeTransaction)).to.be.reverted;
  // });

  it("Transfer NFT to safe", async function () {
    const BoredApeYachtClub = await ethers.getContractFactory("BoredApeYachtClub");
    const nftContract = BoredApeYachtClub.attach(tokenAddress);

    const balanceBefore = await nftContract.balanceOf(safeAddress);
    expect(balanceBefore).to.equal(BigNumber.from(0));

    await nftContract.connect(lender)["safeTransferFrom(address,address,uint256)"](lender.address, safeAddress, tokenId);

    const balanceAfter = await nftContract.balanceOf(safeAddress);
    expect(balanceAfter).to.equal(BigNumber.from(1));
  });

  it("Retrieve NFT from safe", async function () {
    const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
    const safeManager = SummonRentalManager.attach(safeManagerAddress);

    const MyContract = await ethers.getContractFactory("BoredApeYachtClub");
    const boredApeContract = MyContract.attach(tokenAddress);

    const balanceBefore = await boredApeContract.balanceOf(lender.address)
    expect(balanceBefore).to.equal(BigNumber.from(0))

    await safeManager.connect(lender).returnNFT(
      safeAddress,
      lender.address,
      tokenAddress,
      tokenId
    );

    const balance = await boredApeContract.balanceOf(lender.address)
    expect(balance).to.equal(BigNumber.from(1))

    expect(await safeSdk.isOwner(borrower.address)).to.equal(false);
    expect(await safeSdk.getThreshold()).to.equal(1);
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
