//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Summon.sol";

contract SummonFactory {
  event SummonCreated(address owner, address summonAddress);
  mapping(address => address) public WalletAddressToSummonAddress;
  mapping(address => address) public SummonAddressToWalletAddress;

  function CreateNewSummon(address _owner) public {
    require(WalletAddressToSummonAddress[_owner] == address(0), "address already has a Summon");
    Summon summon = new Summon(_owner);
    WalletAddressToSummonAddress[_owner] = address(summon);
    SummonAddressToWalletAddress[address(summon)] = _owner;
    emit SummonCreated(_owner, address(summon));
  }

  //  function depositTokenToSummon(address _summon, address tokenAddress, uint256) public {
  //    Greeter(address(GreeterArray[_greeterIndex])).setGreeting(_greeting);
  //  }

  //  function gfGetter(uint256 _greeterIndex) public view returns (string memory) {
  //   return Greeter(address(GreeterArray[_greeterIndex])).greet();
  //  }
}