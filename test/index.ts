import { expect } from "chai";
import { ethers } from "hardhat";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';


describe("Deploy Safe", function () {
  it("Deploy Safe", async function () {

    const provider = ethers.provider;
    const safeOwner = provider.getSigner(0);

    console.log("safeOwner", safeOwner._address);

    const ethAdapter = new EthersAdapter({
      ethers,
      signer: safeOwner
    })

    const safeFactory = await SafeFactory.create({ethAdapter})

    const accounts = await ethers.getSigners();
    const lender = accounts[0].address;
    const borrower = accounts[1].address;

    const owners = [lender, borrower];
    const threshold = 2
    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
      fallbackHandler : "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
    }

    console.log("deploying safe");

    const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig })
    const safeAddress = safeSdk.getAddress();

    console.log("safe deployed:", safeAddress);

    expect(safeAddress.leng th).to.greaterThan(0);
  });
});
