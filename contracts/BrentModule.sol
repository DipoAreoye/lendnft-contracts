//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";

contract BrentModule {
    address payable private safeAddress;

    address private tokenAddress;
    address private borrowersAddress;

    uint256 private tokenId;
    address lenderAddress;

    constructor(address _target, address _tokenAddress, address _lenderAddress, address _borrowersAddress, uint256 _tokenId) {
      bytes memory initializeParams = abi.encode(_tokenAddress, _tokenId, _lenderAddress);

      tokenAddress = _tokenAddress;
      lenderAddress = _lenderAddress;
      tokenId = _tokenId;
      safeAddress = payable(_target);
    }

    function returnNFT() public returns (bool success) {
        require(msg.sender == lenderAddress);

        success = GnosisSafe(safeAddress).execTransactionFromModule(
            lenderAddress,
            0,
            abi.encodePacked(bytes4(keccak256("safeTransferFrom(address,address,uint256)")), safeAddress,lenderAddress,tokenId),
            Enum.Operation.Call
        );
        return true;
    }
  }
