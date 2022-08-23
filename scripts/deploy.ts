import { ethers } from "hardhat";

async function main() {
  const SummonRentalManager = await ethers.getContractFactory("SummonRentalManager");
  const contract = await SummonRentalManager.deploy();

  await contract.deployed();
  console.log(`SummonRentalManager deployed to ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
