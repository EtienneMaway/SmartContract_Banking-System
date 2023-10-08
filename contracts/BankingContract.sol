// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.19;

contract BankingContract {

 // the structure defining an account
  struct Account {
    address owner;
    uint256 balance;
  }

  // mapping that stores accounts
  mapping (uint256 => Account) private accounts;

  // keeping track of the current contract owner
  address public contractOwner;
  
  // Keep track of the account numbers
  uint256 public accountsCounter;

  // Event to be emitted when an account is successfully created
  event AccountCreated(uint256 accountNumber, address owner, uint256 initialBalance);

  // Event to be emitted when an funds have been transferred successfully
  event FundsTransferred(uint fromNumber, uint256 toNumber,  uint256 amount);

  // modifier that sets restrictions on some functionalities
  // for administrative purpose
  modifier onlyOwnner{
    require(msg.sender == contractOwner, "You must be the contract owner");
    _;
  } 

  // Deployer set to contract owner
  constructor(){
    contractOwner = msg.sender;
  }

  // The owner can transfer the ownership by calling this function
  function setContractOwner(address _newOwner) public onlyOwnner {
    require(msg.sender == contractOwner, "You must be the contract owner");

    // updating the new owner of the contract
    contractOwner = _newOwner;
  }

  // User creating a new account
  function createAccout() public {
    // account number
    accountsCounter++;

    // Initializing and saving the new account in the blockchain
    Account storage newAccount = accounts[accountsCounter];
    newAccount.owner = msg.sender;
    newAccount.balance = 0;

    // AccountCreated event emitted upon successful account creation
    emit AccountCreated(accountsCounter, msg.sender, newAccount.balance);
  }

  // getting an account detail by its account number
  function getAccountDetails(uint256 _accountNumber) public view onlyOwnner returns(Account memory){
    return accounts[_accountNumber];
  }

  // Depositing ether in the created account
  function deposit(uint256 _accountNumber, uint256 _amount) public payable {
    // Amount should not be an invalid number
    require(_amount > 0, 'Amount lesser or equal to 0');

    // only the owner of the account can deposit to his account
    require(accounts[_accountNumber].owner == msg.sender, "You must be the account owner");

    // updating the balance after successful deposit
    accounts[_accountNumber].balance += _amount;
  }

  // function to help fetch the account balance
  function getAccountBalance(uint256 _accountNumber) public view returns(uint256){
    // Only you(owner of the account) can view your account balance
    require(msg.sender == accounts[_accountNumber].owner, "you are not the account owner");

    // Retrieving the account balance
    return accounts[_accountNumber].balance;
  }

  // Function to help withdraw the deposited ether
  function withdraw(uint256 _accountNumber, uint256 _amount) public {
    // You can not withdraw from someone else's account
    require(msg.sender == accounts[_accountNumber].owner, 'You can withdraw only from the account you own');

    // You are able to withdraw less or equal to your current balance
    require(_amount <= accounts[_accountNumber].balance, "insuficient balance");

    // Updating your balance after a successful withdrawal
    accounts[_accountNumber].balance -= _amount;
  }

  // Function helping to tranfer funds withing the banking system
  function transferFunds(uint256 _fromAccountNumber, uint256 _toAccountNumber, uint256 _amount) public {
    // check if the amount is invalid
    require(_amount > 0, "amount must be greater than zero");

    // Check if the "_fromAccountNumber" is different from the "_toAccountNumber"
    require(_fromAccountNumber != _toAccountNumber, "cannot transfer funds to the same account");

    // Initalizing the accounts
    Account storage fromAccount = accounts[_fromAccountNumber];
    Account storage toAccount = accounts[_toAccountNumber];

    // check if the sender is the owner of "_fromAccountNumber"
    require(msg.sender == fromAccount.owner, 'You must be the account owner');

    // Check if the sender's balance is equal or greater than the "_amount"
    require(fromAccount.balance >= _amount, "insuficient balance");

    // Updating the "fromAccount" and "toAccount" balance fields
    fromAccount.balance -= _amount;
    toAccount.balance += _amount;
    
    // emitting the Transfer event
    emit FundsTransferred(_fromAccountNumber, _toAccountNumber, _amount);
  }
}
