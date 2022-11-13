import { ethers } from "hardhat";

async function main() {
const Module = await ethers.getContractFactory(
  "contracts/BrentModule.sol:BrentModule"
  );
  const brentModule = await Module.deploy();
  await brentModule.deployed();
  
  console.log(`module deployed at ${brentModule.address}`)


}
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });