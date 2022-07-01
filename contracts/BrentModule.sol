//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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
        require(
          msg.sender == lenderAddress,
          "Sender not authorized."
        );

        success = GnosisSafe(safeAddress).execTransactionFromModule(
            tokenAddress,
            0,
            abi.encodeWithSignature("transferFrom(address,address,uint256)", safeAddress,lenderAddress,tokenId),
            Enum.Operation.Call
        );

        console.log(success);
        return success;
    }

    function iToHex(bytes memory buffer) public pure returns (string memory) {

      // Fixed buffer size for hexadecimal convertion
      bytes memory converted = new bytes(buffer.length * 2);

      bytes memory _base = "0123456789abcdef";

      for (uint256 i = 0; i < buffer.length; i++) {
          converted[i * 2] = _base[uint8(buffer[i]) / _base.length];
          converted[i * 2 + 1] = _base[uint8(buffer[i]) % _base.length];
      }

      return string(abi.encodePacked("0x", converted));
  }
  }
