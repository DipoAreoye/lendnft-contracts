import { Network, Alchemy, initializeAlchemy } from '@alch/alchemy-sdk';

import Web3 from "web3";

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

import moduleABI from "../abi/BrentModule.json"
import guardABI from "../abi/GuardManager.json"

import { BigNumber } from "ethers";
import Web3Adapter from '@gnosis.pm/safe-web3-lib'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'


const settings = {
  apiKey: '2gV_Wy-XGkOgONR2q7eJr83iPR23pAsC',
  network: Network.ETH_RINKEBY,
  maxRetries: 10
};

const web3 = createAlchemyWeb3("https://eth-mainnet.alchemyapi.io/2gV_Wy-XGkOgONR2q7eJr83iPR23pAsC");
const safeOwner = '0x<address>'
let alchemy : Alchemy;

const brentContractAddress = ""

function init() {
  alchemy = initializeAlchemy(settings);
}

async function acceptLend(value: BigNumber, tokenId: BigNumber,
  tokenAddress: string, tokenOwner: string, borrowerAddress: string) {

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
  const safeAddress = safeSdk.getAddress();

  const contract = new web3.eth.Contract(moduleABI.abi);
}
