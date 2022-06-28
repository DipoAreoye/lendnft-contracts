//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@gnosis.pm/safe-contracts/contracts/base/GuardManager.sol";

contract BrentGuard is Guard {
    string private tokenAddress;
    string private lenderAddress;

    constructor(string memory _tokenAddress, string memory _lenderAddress) {
        tokenAddress = _tokenAddress;
        lenderAddress = _lenderAddress;
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
      require(false);
  }

  function checkAfterExecution(bytes32, bool) external view override {}
}
