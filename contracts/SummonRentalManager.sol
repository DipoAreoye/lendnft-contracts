//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "./GnosisSafe/GnosisSafe.sol";

abstract contract IERC721 {
  function safeTransferFrom(address from, address to, uint256 tokenId) virtual external;
}

contract SummonRentalManager {

  // Constant used for default owner of GnosisSafe
  address internal constant SENTINEL_OWNERS = address(0x1);

  // Safes -> tokenAdress/ID hash -> RentalInfo
  mapping(address => mapping(bytes32 => RentalInfo)) public activeRentals;

  struct RentalInfo {
    address borrowerAddress;
    address lenderAddress;
  }

  function addRental(
    address prevOwner,
    address safeAddress,
    address lenderAddress,
    address borrowerAddress,
    address tokenAddress,
    uint256 tokenId,
    bytes memory signature
  ) public {
    GnosisSafe safe = GnosisSafe(payable(safeAddress));

    // Ensure safe is availible
    address[] memory owners = safe.getOwners();
    require(owners.length == 2, "safe address is already in use");

    // Add module to safe to enable NFT return without threshold requirement
    bytes memory moduleData = abi.encodeWithSignature(
      "enableModule(address)",
      address(this)
    );

    execTransaction(safeAddress, 0, moduleData, signature);

    // Store record of rental
    bytes32 rentalHash = genrateRentalHash(tokenAddress, tokenId);
    activeRentals[safeAddress][rentalHash] = RentalInfo(
      borrowerAddress,
      lenderAddress
    );

    // Add Borrower to safe
    bytes memory swapOwnerData = abi.encodeWithSignature(
      "addOwnerWithThreshold(address,uint256)",
      borrowerAddress,
      1
    );

    execTransaction(safeAddress, 0, swapOwnerData, signature);

    // Remove current Smart Contract as owner
    bytes memory removeOwnerData = abi.encodeWithSignature(
      "removeOwner(address,address,uint256)",
      prevOwner,
      address(this),
      2
    );
    execTransaction(safeAddress, 0, removeOwnerData, signature);
  }


  function removeBorrowerFromSafe(address safeAddress, address tokenAddress, uint256 tokenId) internal {
    bytes32 rentalHash = genrateRentalHash(tokenAddress, tokenId);
    RentalInfo memory info = activeRentals[safeAddress][rentalHash];

    GnosisSafe safe = GnosisSafe(payable(safeAddress));
    address[] memory owners = safe.getOwners();

    address prevOwner;

    for (uint256 i = 0; i < owners.length; i++) {
      if (owners[i] == info.borrowerAddress) {
        if(i == 0) {
          prevOwner = SENTINEL_OWNERS;
        } else {
          prevOwner = owners[i - 1];
        }
      }
    }

    // Remove Borrower and Add Contract to safe
    bytes memory swapOwnerData = abi.encodeWithSignature(
      "swapOwner(address,address,address)",
      prevOwner,
      info.borrowerAddress,
      address(this)
    );

    GnosisSafe(payable(safeAddress)).execTransactionFromModule(
      safeAddress,
      0,
      swapOwnerData,
      Enum.Operation.Call
    );

    //Update threshold
    bytes memory updateThresholdData = abi.encodeWithSignature(
      "changeThreshold(uint256)",
      1
    );

    GnosisSafe(payable(safeAddress)).execTransactionFromModule(
      safeAddress,
      0,
      updateThresholdData,
      Enum.Operation.Call
    );
  }

  function returnNFT(
    address safeAddress,
    address lenderAddress,
    address tokenAddress,
    uint256 tokenId
  ) public {

    bytes32 rentalHash = genrateRentalHash(tokenAddress, tokenId);
    RentalInfo memory info = activeRentals[safeAddress][rentalHash];

    GnosisSafe safe = GnosisSafe(payable(lenderAddress));

    //Ensure that the user triggering the return authorized the  rental
    require(safe.isOwner(msg.sender), "sender not authorized");

    removeBorrowerFromSafe(safeAddress, tokenAddress, tokenId);

    bytes memory transferData = abi.encodeWithSignature(
      "safeTransferFrom(address,address,uint256)",
      safeAddress,
      lenderAddress,
      tokenId
    );

    GnosisSafe(payable(safeAddress)).execTransactionFromModule(
      tokenAddress,
      0,
      transferData,
      Enum.Operation.Call
    );

    //remove rental entry
    delete activeRentals[safeAddress][rentalHash];
  }

  function getRentalInfo(
    address safe,
    address tokenAddress,
    uint256 tokenId
  ) public view returns(RentalInfo memory) {
    bytes32 rentalHash = genrateRentalHash(tokenAddress, tokenId);
    return activeRentals[safe][rentalHash];
  }

  function genrateRentalHash(
    address tokenAdress,
    uint256 tokenId
  ) internal view returns(bytes32) {
    return keccak256(abi.encodePacked(tokenAdress, tokenId));
  }

  function execTransaction (
   address safeAddress,
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
