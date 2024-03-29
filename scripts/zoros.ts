import { Network, Alchemy, initializeAlchemy } from '@alch/alchemy-sdk';

import Web3 from "web3";

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

import { BigNumber } from "ethers";
import Web3Adapter from '@gnosis.pm/safe-web3-lib'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'

const settings = {
  apiKey: '2gV_Wy-XGkOgONR2q7eJr83iPR23pAsC',
  network: Network.ETH_RINKEBY,
  maxRetries: 10
};

const ALCHEMY_URL = "https://eth-goerli.g.alchemy.com/v2/7Lj0FoX7MwaZ_tjynkc4pAMGMcaPh8Pu";

const web3 = createAlchemyWeb3(ALCHEMY_URL);
let alchemy : Alchemy;

function init() {
  alchemy = initializeAlchemy(settings);
}

async function createSafe(borrowerAddress: string) : Promise<string> {
  const ethAdapter = new Web3Adapter({
    web3,
    signerAddress: borrowerAddress
  })

  const safeFactory = await SafeFactory.create({ethAdapter})

  const owners = [borrowerAddress];
  const threshold = 1
  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold,
  }

  const safeSdk = await safeFactory.deploySafe({ safeAccountConfig })
  return Promise.resolve(safeSdk.getAddress())
}

async function acceptLend(value: BigNumber, tokenId: BigNumber,
  tokenAddress: string, tokenOwner: string, borrowerAddress: string) {
}

async function retrieveNFT(tokenId: BigNumber) {

}
