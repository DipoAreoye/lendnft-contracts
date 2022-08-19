import { ethers } from "hardhat";

async function main() {
  const ZorosSafeManager = await ethers.getContractFactory("ZorosSafeManager");
  const contract = await ZorosSafeManager.deploy();

  await contract.deployed();
  console.log(`ZorosSafeManager deployed to ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
