import { ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import {
  ContractNetworksConfig,
  SafeFactory,
  SafeAccountConfig,
} from "@gnosis.pm/safe-core-sdk";




// deployed contracts:
//   gnosis (master): 0x4Ac24ADc4611F57cE6Cb5Ba5dCa89B109C24c589
//   proxyFactory: 0xA96503b5a9E6071FBCE5e1AdDf64295d78a43f24
//   multiSend: 0xE215b2C6D42400302810A35Ba6997cb6D43d795D
//   fallbackHandler: 0xE220806E7F3A60F1612F822197966e88af19A93b
//   safe: 0x897C500f2196bD04b3f89B22727746c70Dc6b231

const localDeployments = {
    gnosis: "0x4Ac24ADc4611F57cE6Cb5Ba5dCa89B109C24c589",
  // gnosis: "0xa0f43C52211DEf09Be4cdEAB5cC0a19E0baBe88a",
  proxyFactory: "",
  multiSend: "",
  fallbackHandler: "",
};

const path = require('path')

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(deployer);
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );
  
console.log("line 18")
const GnosisSafeProxyFactory = await ethers.getContractFactory(
  "contracts/GnosisSafe/proxies/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory"
  );
  const proxyFactory = await GnosisSafeProxyFactory.deploy();
  await proxyFactory.deployed();

  localDeployments.proxyFactory = proxyFactory.address;

  const MultiSend = await ethers.getContractFactory(
    "contracts/GnosisSafe/libraries/MultiSend.sol:MultiSend"
  );
  const multiSend = await MultiSend.deploy();
  await multiSend.deployed();
  localDeployments.multiSend = multiSend.address;

  const CompatibilityFallbackHandler = await ethers.getContractFactory(
    "CompatibilityFallbackHandler"
  );
  const fallbackHandler = await CompatibilityFallbackHandler.deploy();
  await fallbackHandler.deployed();
  localDeployments.fallbackHandler = fallbackHandler.address;

  console.log(`deployed contracts:
  gnosis: ${localDeployments.gnosis}
  proxyFactory: ${localDeployments.proxyFactory}
  multiSend: ${localDeployments.multiSend}
  fallbackHandler: ${localDeployments.fallbackHandler}
  `);
  deployGnosisSafe();
}

async function deployGnosisSafe() {
  const lender = new ethers.Wallet(
    process.env.MAINNET_PRIVATE_KEY ?? "",
    ethers.provider
  );

  const ethAdapter = new EthersAdapter({
    ethers,
    signer: lender,
  });

  const chainId = await ethAdapter.getChainId()
  const contractNetworks: ContractNetworksConfig = {
    [chainId]: {
      multiSendAddress: localDeployments.multiSend,
      safeMasterCopyAddress: localDeployments.gnosis, // <--- singleton
      safeProxyFactoryAddress: localDeployments.proxyFactory,
    },
  };

  const safeFactory = await SafeFactory.create({
    ethAdapter,
    contractNetworks,
  });

  // const owners = ["0x812eb89130a071ce95499cc8f6e951de3a742f06"];
  const owners = ["0x1c7e51D7481fb83249C4e60d87ed4C937A23cD37"]; //brent's public key
  const threshold = 1;
  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold,
    fallbackHandler: localDeployments.fallbackHandler,
  };

  const safeSdkRental = await safeFactory.deploySafe({ safeAccountConfig });
  const safeAddress = safeSdkRental.getAddress();

  console.log(`deployed rental safe address is ${safeAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
