//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./SummonV2.sol";

contract SummonFactoryV2 {
  event SummonCreated(address owner, address summonAddress);
  mapping(address => address) public OwnerToSummonAddress;
  mapping(address => address) public SummonAddressToOwner;
  mapping(bytes => address) public EncodedTokenToSummon; // map from token => summon
  mapping(bytes => address) public EncodedTokenToLender; // map from token => lender


  function CreateNewSummon(address _owner) public {
    require(OwnerToSummonAddress[_owner] == address(0), "address already has a Summon");
    Summon summon = new Summon(_owner);
    OwnerToSummonAddress[_owner] = address(summon);
    SummonAddressToOwner[address(summon)] = _owner;
    emit SummonCreated(_owner, address(summon));
  }

  // function getEncodedToken(address tokenAddress, uint tokenId) public view returns(bytes memory encodedToken) {
  //   return abi.encodePacked(tokenAddress)
  // }


  // to be called by lender
   function depositTokenToSummon(address _summon, address tokenAddress, uint256 tokenId) public returns(bool success, bytes memory data) {
    require(SummonAddressToOwner[_summon] != address(0), "no summon found");
    bytes memory encodedToken = abi.encodePacked(tokenAddress, tokenId);
    
    // do state changes that say this summon has this token
    EncodedTokenToSummon[encodedToken] = _summon;
    EncodedTokenToLender[encodedToken] = msg.sender;

    // move token to that summon
    (success, data) = tokenAddress.call(abi.encodeWithSignature("safeTransferFrom(address,address,uint256)",address(msg.sender),_summon,tokenId));
    require(success, "call failed");
   }

  // to be called by lender
   function withdrawTokenFromSummon(address tokenAddress, uint tokenId) public returns(bool success, bytes memory data) {
    bytes memory _encodedToken = abi.encodePacked(tokenAddress, tokenId);
    EncodedTokenToSummon[_encodedToken] = address(0);
    EncodedTokenToLender[_encodedToken] = address(0);
    (success, data) = Summon(address(EncodedTokenToSummon[_encodedToken])).safeWithdraw(tokenAddress, tokenId, msg.sender);
    require(success, "call failed");
   }



}

// previously the summon contract itself managed everything, but howwould things changed if the summon factory manged everything?
// the summon factory itself would have to have transfer power. ok thats fine. 
// the summon factory would have to deposit every token to the specific summon address, and store state about where every token is stored.
// on withdraw, the summon factory would have permissions to call a new function: safeWithdraw on the summon in question. safeWithdraw could ONLY be called by the Summon
// Factory, and would transfer the token from the summon address to the lender address


// oooh this would also allow lending tokens to a