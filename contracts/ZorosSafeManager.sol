//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/base/GuardManager.sol";
import "hardhat/console.sol";

abstract contract IERC721 {
  function balanceOf(address owner) virtual external view returns (uint256 balance);
  function isApprovedForAll(address _owner, address _operator) virtual external view returns (bool);
  function safeTransferFrom(address from, address to, uint256 tokenId) virtual external;
}

contract ZorosSafeManager is Guard {

  mapping(bytes32 => bool) private restrictedFunctions;

  //tokenId -> RentalInfo
  mapping(uint256 => RentalInfo) public activeRentals;
  // Users -> Safes
  mapping(address => address) public safes;

  // Safes -> tokenID
  mapping(address => uint256[]) public activeTokens;

  struct RentalInfo {
    address lenderAddress;
    address safeAddress;
    address tokenAddress;
  }

  constructor() {
    restrictedFunctions[keccak256(abi.encodePacked(uint(0xe19a9dd9)))] = true; //Add Guard
    restrictedFunctions[keccak256(abi.encodePacked(uint(0x610b5925)))] = true; // Add Module
    restrictedFunctions[keccak256(abi.encodePacked(uint(0xe009cfde)))] = true; // Remove Module
  }

  function acceptListing(
    uint256 tokenId,
    address tokenAddress,
    address lenderAddress,
    address borrowerAddress,
    address safeAddress,
    bytes memory signature) payable public {

    IERC721 tokenContract = IERC721(tokenAddress);

    bool isTokenApproved = tokenContract.isApprovedForAll(
      lenderAddress,
      address(this)
    );

    require(
      isTokenApproved,
      'token is not approved for operation'
    );

    RentalInfo memory info = RentalInfo(lenderAddress, safeAddress, tokenAddress);
    activeRentals[tokenId] = info;
    activeTokens[safeAddress].push(tokenId);

    bytes memory moduleData = abi.encodeWithSignature(
      "enableModule(address)",
      address(this)
    );

    execTransaction(safeAddress, address(this), 0, moduleData, signature);

    bytes memory guardData = abi.encodeWithSignature(
      "setGuard(address)",
      address(this)
    );

    execTransaction(safeAddress, address(this), 0, guardData, signature);

    tokenContract.safeTransferFrom(lenderAddress, safeAddress , tokenId);
  }

  function retrieveNFT(uint256 tokenId) public {
    RentalInfo memory info = activeRentals[tokenId];

    require(msg.sender == info.lenderAddress, "Sender not authorized.");

    bytes memory data = abi.encodeWithSignature(
      "safeTransferFrom(address,address,uint256)",
      info.safeAddress,
      info.lenderAddress,
      tokenId
    );

    GnosisSafe(payable(info.safeAddress)).execTransactionFromModule(
      info.tokenAddress,
      0,
      data,
      Enum.Operation.Call
    );

    delete activeRentals[tokenId];
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

    uint256[] memory tokens = activeTokens[msg.sender];

    for (uint i=0; i < tokens.length; i++) {
      RentalInfo memory info = activeRentals[tokens[i]];

      IERC721 tokenContract = IERC721(info.tokenAddress);
      uint256 balance = tokenContract.balanceOf(info.safeAddress);

      require(balance == 1, 'Attempting prohibited token transfer');
    }
  }

   function execTransaction (
    address safeAddress,
    address to,
    uint256 value,
    bytes memory data,
    bytes memory signature
  ) internal {

    GnosisSafe(payable(safeAddress)).execTransaction(
      safeAddress,
      value,
      data,
      Enum.Operation.Call,
      0,
      0,
      0,
      address(0),
      payable(address(0)),
      signature
    );
  }
}
