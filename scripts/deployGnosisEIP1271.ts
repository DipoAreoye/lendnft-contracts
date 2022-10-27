import { ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import {
  ContractNetworksConfig,
  SafeFactory,
  SafeAccountConfig,
} from "@gnosis.pm/safe-core-sdk";

const localDeployments = {
  gnosis: "",
  proxyFactory: "",
  multiSend: "",
  fallbackHandler: "",
};

async function main() {
  const GnosisSafeProxyFactory = await ethers.getContractFactory(
    "contracts/GnosisSafe/proxies/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory"
  );
  const proxyFactory = await GnosisSafeProxyFactory.deploy();
  await proxyFactory.deployed();
  localDeployments.proxyFactory = proxyFactory.address;

  console.log("attempting to deploy Gnosis safe");
  const GnosisSafe = await ethers.getContractFactory(
    "contracts/GnosisSafe/GnosisSafe.sol:GnosisSafe"
  );
  const gnosis = await GnosisSafe.deploy();
  await gnosis.deployed();
  localDeployments.gnosis = gnosis.address;

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

  console.log(`deployed contracts ${localDeployments}`);
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
      safeMasterCopyAddress: localDeployments.gnosis,
      safeProxyFactoryAddress: localDeployments.proxyFactory,
    },
  };

  const safeFactory = await SafeFactory.create({
    ethAdapter,
    contractNetworks,
  });

  const owners = ["0x812eb89130a071ce95499cc8f6e951de3a742f06"];
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
