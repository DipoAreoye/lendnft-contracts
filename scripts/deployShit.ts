// import { ethers } from "hardhat";

// const path = require('path')

// // address _target, address _tokenAddress, address _lenderAddress, uint256 _tokenId
// // safeAddress, tokenAddress, lenderAddress, tokenID
// const args = ['0x41Ffd70EDFF983AB1D48911884dbFB57986601C6', '0xf5de760f2e916647fd766B4AD9E85ff943cE3A2b', '0xaDAe8CDc7C2Da113E48447193a2db0c139aaA297' , 2316172]

// async function main() {
// const Module = await ethers.getContractFactory(
//   "contracts/BrentModule.sol:BrentModule"
//   );
//   const brentModule = await Module.deploy(...args);
//   await brentModule.deployed();
  
//   console.log(`module deployed at ${brentModule.address}`)


// }
//   main().catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
//   });



import { ethers } from "hardhat";

const path = require('path')


async function main() {

const [deployer1, deployer2] = await ethers.getSigners();
console.log(deployer1);
console.log(
  "Deploying the contracts with the account:",
  await deployer1.getAddress()
);
console.log(
  "secondary account:",
  await deployer2.getAddress()
);

// DEPLOY BAYC CONTRACT
const BaycFactory = await ethers.getContractFactory(
"contracts/BoredApeYachtClub.sol:BoredApeYachtClub"
);
const Bayc = await BaycFactory.deploy();
await Bayc.deployed();

console.log(`NFT's deployed at ${Bayc.address}`)

// MINT NFT FROM deployer 2
let baycTwo = Bayc.connect(deployer2) // connecting bayc with second signer

let minted = await baycTwo.mintApe(1, {value: "1000000000000000"})
const receipt = await minted.wait(1)
console.log(receipt.status)


// dep1 deploys Summon contract

const SummonFactory = await ethers.getContractFactory(
  "contracts/Summon.sol:Summon"
)
const Summon = await SummonFactory.deploy()
await Summon.deployed()

console.log(`Summon contract deployed at ${Summon.address}`)

// dep2 calls setApprovalForAll, approving the summon contract as an operator



// dep2 calls depositToken function on Summon contract






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