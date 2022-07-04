//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@gnosis.pm/safe-contracts/contracts/base/GuardManager.sol";

contract BrentGuard is Guard {
    address private tokenAddress;
    address private lenderAddress;
    uint256 private tokenId;


    constructor(address _tokenAddress, address _lenderAddress, uint256 _tokenId) {
        tokenAddress = _tokenAddress;
        lenderAddress = _lenderAddress;
        tokenId = _tokenId;
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
    require(to != tokenAddress, 'Attempting to transact on NFT');
  }

  function checkAfterExecution(bytes32, bool) external view override {}
}
