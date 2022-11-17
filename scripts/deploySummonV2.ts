import hre from "hardhat";

const path = require('path')


async function main() {
const {ethers} = hre
  const [deployer1, deployer2] = await ethers.getSigners()
  const dep1Address = await deployer1.getAddress()
  const dep2Address = await deployer2.getAddress()



console.log(deployer1);
console.log(
  "Deploying the contracts with the account:",
  await dep1Address
);
console.log(
  "secondary account:",
  await dep2Address
);

const SummonFactoryFactory = await ethers.getContractFactory(
"contracts/SummonFactoryV2.sol:SummonFactoryV2"
);

const SummonFactory = await SummonFactoryFactory.deploy();
await SummonFactory.deployed();

console.log(`SummonFactory deployed at ${SummonFactory.address}`)

const SummonFactory_dep2 = SummonFactory.connect(deployer2)
let tx = await SummonFactory_dep2.CreateNewSummon(dep1Address)
let tx_r = tx.wait()
let r = await tx_r
let [owner, summonAddress] = r.events[0].args
// console.log(`owner is ${owner}`)
// console.log(`summonAddress is ${summonAddress}`)
if(owner != dep1Address) console.log("ERROR: owner address doesn't match dep1 address")
console.log(`New Summon Safe created for dep1 at ${summonAddress}`)




}
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });