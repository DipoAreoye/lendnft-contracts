//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";

contract BrentModule {
    address payable private safeAddress;

    address private tokenAddress;

    uint256 private tokenId;
    address lenderAddress;

    constructor(address _target, address _tokenAddress, address _lenderAddress, uint256 _tokenId) {
      tokenAddress = _tokenAddress;
      lenderAddress = _lenderAddress;
      tokenId = _tokenId;
      safeAddress = payable(_target);
    }

    function returnNFT() public returns (bool success) {
        console.log("return NFT called");

        require(
          msg.sender == lenderAddress,
          "Sender not authorized."
        );

        success = GnosisSafe(safeAddress).execTransactionFromModule(
            tokenAddress,
            0,
            abi.encodePacked(bytes4(keccak256(
              "transferFrom(address,address,uint256)"
            )), safeAddress,lenderAddress,tokenId),
            Enum.Operation.Call
        );
        return true;
    }
  }
