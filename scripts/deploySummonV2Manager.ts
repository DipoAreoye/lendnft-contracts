

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

const SummonV2EthersFactory = await ethers.getContractFactory(
  "contracts/SummonV2.sol:Summon"
)
const SummonV2 = await SummonV2EthersFactory.deploy();

await SummonV2.deployed();

console.log(`Singleton deployed at ${SummonV2.address}`)

const SummonManagerFactory = await ethers.getContractFactory(
"contracts/SummonV2Manager.sol:SummonV2Manager"
);

const SummonV2Manager = await SummonManagerFactory.deploy(SummonV2.address); // summon V2 address as in the constructor
await SummonV2Manager.deployed();

console.log(`Summon V2 Manager deployed at ${SummonV2Manager.address}`)

const SummonManager_dep2 = SummonV2Manager.connect(deployer2)
let tx = await SummonManager_dep2.CreateNewSummon(dep1Address)
console.log(`creating new summon, tx hash: ${tx.hash}`)
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