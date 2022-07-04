//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract BrentModule {
    address payable private safeAddress;
    address lenderAddress;
    address private tokenAddress;
    uint256 private tokenId;

    constructor(address _target, address _tokenAddress, address _lenderAddress, uint256 _tokenId) {  
      tokenAddress = _tokenAddress;
      lenderAddress = _lenderAddress;
      tokenId = _tokenId;
      safeAddress = payable(_target);
    }

    function returnNFT() public {
        require(msg.sender == lenderAddress, "Sender not authorized.");

        exectuteTransfer();
    }

    function exectuteTransfer() private {
      bytes memory data = abi.encodeWithSignature("safeTransferFrom(address,address,uint256)",safeAddress,lenderAddress,tokenId);

      GnosisSafe(safeAddress).execTransactionFromModule(
        tokenAddress,
        0,
        data,
        Enum.Operation.Call
      );
    }
  }
