


import { ethers } from "hardhat";




const path = require('path')


async function main() {

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

// DEPLOY BAYC CONTRACT
const BaycFactory = await ethers.getContractFactory(
"contracts/BoredApeYachtClub.sol:BoredApeYachtClub"
);
const Bayc = await BaycFactory.deploy();
await Bayc.deployed();

console.log(`NFT's deployed at ${Bayc.address}`)

// MINT NFT FROM deployer 2
const Bayc_Dep2 = Bayc.connect(deployer2) // connecting bayc with second signer

let minted = await Bayc_Dep2.mintApe(1, {value: "1000000000000000"})
const receipt = await minted.wait(1)
console.log(`dep 2 minted status: ${receipt.status}`)


// dep1 deploys Summon contract

const SummonFactory = await ethers.getContractFactory(
  "contracts/Summon.sol:Summon"
)
const Summon = await SummonFactory.deploy('0x1c7e51D7481fb83249C4e60d87ed4C937A23cD37') // msg.sender is dep1
await Summon.deployed()

console.log(`Summon contract deployed at ${Summon.address}`)

// // TEST: can dep2 call setApprovalForAll and then can dep1 transfer the NFT?

// let tx = await Bayc_Dep2.setApprovalForAll(dep1Address, true)
// let tx_r = await tx.wait()
// console.log(`setApprovalForAll status is ${tx_r.status}`)

// const Bayc_Dep1 = Bayc.connect(deployer1)
// tx = await Bayc_Dep1.transferFrom(dep2Address, dep1Address, 0)
// tx_r = await tx.wait()
// console.log(`transferFrom status is: ${tx_r.status}`)

// dep2 calls setApprovalForAll, approving the summon contract as an operator

let tx = await Bayc_Dep2.setApprovalForAll(Summon.address, true)
let tx_r = await tx.wait()
console.log(`setApprovalForAll to summon address status is ${tx_r.status}`)




// dep2 calls depositToken function on Summon contract

const Summon_Dep2 = Summon.connect(deployer2) // connecting bayc with second signer
tx = await Summon_Dep2.depositToken(Bayc.address, 0)
tx_r = await tx.wait()
console.log(`depositToken status is status is: ${tx_r.status}`)

// dep2 calls withdrawToken

// tx = await Summon_Dep2.withdrawToken(Bayc.address, 0)
// tx_r = await tx.wait()
// console.log(`withdrawToken status is status is: ${tx_r.status}`)

// test for sending an NFT from deployer 2 to deployer 1 using a low level call
  // let IBayc = bayc.interface
  // console.log(IBayc)
  // let nft_from =  await deployer2.getAddress();
  // let nft_to = await deployer1.getAddress()
  // let tx_data = IBayc.encodeFunctionData("transferFrom", [
  //   `${nft_from}`,
  //   `${nft_to}`,
  //   0
  // ])
  // console.log(tx_data)
  // let tx_nonce = await deployer2.getTransactionCount()
  // console.log(tx_nonce)
  // const nftTransferTxReq = {
  //   to: bayc.address,
  //   from: nft_from,
  //   nonce: tx_nonce,
  //   data: tx_data
  // }
  // const tx_resp = await deployer2.sendTransaction( nftTransferTxReq )
  // console.log(tx_resp)





}
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });