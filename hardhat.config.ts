import * as dotenv from "dotenv";
import 'hardhat-deploy'

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { string } from "yargs";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      },
    },
    compilers: [
      { version: "0.8.4" },
      { version: "0.6.0" },
      { version: "0.5.0" },
    ]
  },
  paths: {
    artifacts: 'artifacts',
    deploy: 'hardhat/deploy',
    sources: 'contracts',
    tests: 'test'
  },
  networks: {
      localhost: {
        url: "http://127.0.0.1:8545"
      },
      hardhat: {
        forking: {
          url: "https://eth-mainnet.alchemyapi.io/v2/2gV_Wy-XGkOgONR2q7eJr83iPR23pAsC",
        },
        allowUnlimitedContractSize: true,
        blockGasLimit: 100000000,
        gas: 100000000,
        accounts: [
          // Same as ganache-cli -d
          { balance: '100000000000000000000', privateKey: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d' },
          { balance: '100000000000000000000', privateKey: '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1' },
          { balance: '100000000000000000000', privateKey: '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c' },
          { balance: '100000000000000000000', privateKey: '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913' },
          { balance: '100000000000000000000', privateKey: '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743' },
          { balance: '100000000000000000000', privateKey: '0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd' },
          { balance: '100000000000000000000', privateKey: '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52' },
          { balance: '100000000000000000000', privateKey: '0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3' },
          { balance: '100000000000000000000', privateKey: '0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4' },
          { balance: '100000000000000000000', privateKey: '0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773' },
        ]
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    // ethereum: {
    //   url: process.env.MAINNET_URL,
    //   accounts: process.env.MAINNET_PRIVATE_KEY != undefined ? [process.env.MAINNET_PRIVATE_KEY] : [],
    // },
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/qNtE2MdnnNXNh8G5hjIZ-baxFqFnqvoQ",
      accounts: process.env.GOERLI_PRIVATE_KEY != undefined ? [process.env.GOERLI_PRIVATE_KEY] : [],
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
  etherscan: {
    apiKey: {
      goerli: 'KW3JT67I7UN9YKZBR2EYCE8PYH21J1AN78'
    }
  },



  namedAccounts: {
   deployer: {
     default: 0
   }
 }
};

export default config;
