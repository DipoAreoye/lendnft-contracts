//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/base/GuardManager.sol";
import "hardhat/console.sol";

abstract contract IERC721 {
  function balanceOf(address owner) virtual external view returns (uint256 balance);
}

contract BrentGuard is Guard {
    address private tokenAddress;
    address private lenderAddress;
    address private safeAddress;
    uint256 private tokenId;
    mapping(bytes32 => bool) private restrictedFunctions;

    constructor(address _tokenAddress, address _lenderAddress, uint256 _tokenId, address _safeAddress) {
        tokenAddress = _tokenAddress;
        lenderAddress = _lenderAddress;
        tokenId = _tokenId;
        safeAddress = _safeAddress;

        restrictedFunctions[keccak256(abi.encodePacked(uint(0xe19a9dd9)))] = true; //Add Guard
        restrictedFunctions[keccak256(abi.encodePacked(uint(0x610b5925)))] = true; // Add Module
        restrictedFunctions[keccak256(abi.encodePacked(uint(0xe009cfde)))] = true; // Remove Module
    }

    function checkTransaction(
      address to,
      uint256 value,
      bytes memory data,
      Enum.Operation operation,
      uint256,
      uint256,
      uint256,
      address,
      // solhint-disallow-next-line no-unused-vars
      address payable,
      bytes memory,
      address
  ) external view override {
    bytes memory selector = new bytes(32);

    for (uint8 i = 28; i <= 31; i++) {
     selector[i] = data[i - 28];
    }

    require(!restrictedFunctions[keccak256(selector)] , 'Attempted guarded transaction');
  }

  function checkAfterExecution(bytes32 txHash, bool success) external override {
    IERC721 tokenContract = IERC721(tokenAddress);
    uint256 balance = tokenContract.balanceOf(safeAddress);

    require(balance == 1, 'Attempting token transfer');
  }
}
