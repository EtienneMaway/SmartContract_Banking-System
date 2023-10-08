/** @format */

import { Signer } from "ethers";
import { ethers } from "hardhat";
import { describe } from "mocha";
import { expect, assert } from "chai";
import { BankingContract } from "../typechain-types";
import deployerHelper from "./helpers/Banking.deployer";

// helper that converts ether to Wei
const ether = (n: Number) => {
	return ethers.parseUnits(n.toString(), "ether");
};

describe("Banking Contract", async () => {
	// Initialization of state variables
	let deployedBankingContract: BankingContract;
	let accountNumber: BigInt;
	let owner: Signer;
	let account2: Signer;
	let account3: Signer;

	before("BeforeEach", async () => {
		// Setting up the accounts
		[owner, account2, account3] = await ethers.getSigners();

		// calling the deployed contract from Banking.deployer.ts folder
		({ deployedBankingContract } = await deployerHelper());
	});

	// Affirming that the right owner is set
	it("should set the correct owner", async () => {
		// Fetching the right owner from the deployed contract
		const expectedOwner = await deployedBankingContract.contractOwner();

		// Fetching the default deployer from the Signers
		const currentOwner = await owner.getAddress();

		// Asserting the right ownership
		assert(expectedOwner === currentOwner, "The owner should be set correctly");
	});

	// Creating a new banck account saved in the system
	it("should create an account successfully", async () => {
		// Random user requesting a banck account creation
		await deployedBankingContract.connect(account2).createAccout();

		// Account created and updates the accountNumber from the state
		accountNumber = await deployedBankingContract.accountsCounter();

		// Affirming that the new Accout exists
		expect(accountNumber).to.equal(1);

		// Retrieving the new created account details based on the accountNumber
		const newAccount = await deployedBankingContract.getAccountDetails(
			Number(accountNumber)
		);

		// Expecting the owner of the contract to be the caller
		expect(newAccount.owner).to.equal(await account2.getAddress());

		// Asserting that the balance is 0 at account creation
		expect(newAccount.balance).to.equal(0);
	});

	// It emits an event after a successful account creation
	it("should emit an AccountCreated event", async () => {
		expect(await deployedBankingContract.connect(account3).createAccout())
			.emit(deployedBankingContract, "AccountCreated")
			.withArgs(2, account3, 0);
	});

	// Ability to transfer the ownership of the contract
	it("should be able to set a new owner of the contract", async () => {
		await deployedBankingContract.connect(owner).setContractOwner(account2);

		expect(await deployedBankingContract.contractOwner()).to.be.equal(
			await account2.getAddress()
		);
	});
	it("should restrict random user from changing the contract ownership", async () => {
		await expect(
			deployedBankingContract.connect(account3).setContractOwner(owner)
		).to.be.revertedWith("You must be the contract owner");
	});

	// Owner should be able to deposit ether to his account
	it("should deposit ether to the registered account balance", async () => {
		// the value in ether
		let amount = ether(2);

		// calling the function deposit for the first time
		await deployedBankingContract
			.connect(account2)
			.deposit(Number(accountNumber), amount);

		// Retrieving the deposited amount
		const firstDepositBalance = await deployedBankingContract
			.connect(account2)
			.getAccountBalance(Number(accountNumber));

		// asserting that the amount is correct
		expect(firstDepositBalance).to.equal(amount);

		// Depositing for the second time
		await deployedBankingContract
			.connect(account2)
			.deposit(Number(accountNumber), amount);

		//Retrieving the deposited amount again
		const secondTimeDeposit = await deployedBankingContract
			.connect(account2)
			.getAccountBalance(Number(accountNumber));

		// asserting that both the deposits match the total amount
		expect(secondTimeDeposit).to.equal(amount + amount);
	});

	// Failing to deposit 0 ether or less
	it("should fail if depositing 0 ether or negative amount", async () => {
		await expect(
			deployedBankingContract.connect(account2).deposit(1, 0)
		).to.be.revertedWith("Amount lesser or equal to 0");
	});

	// Only the owner of the account should deposit to his account
	it("should fail if not deposited by the owner", async () => {
		await expect(
			deployedBankingContract.connect(account3).deposit(1, ether(7))
		).to.be.revertedWith("You must be the account owner");
	});

	// Ability of the owner to withdraw the deposited amount
	it("should be able to withdraw the deposited amount", async () => {
		// Fetching the initial balance from the contract
		const initialBal = await deployedBankingContract
			.connect(account2)
			.getAccountBalance(Number(accountNumber));

		// The value in ether to be withdrawn from the contract
		let amoutToWithdraw = ether(3);

		// The owner withdrawing funds
		await deployedBankingContract
			.connect(account2)
			.withdraw(1, amoutToWithdraw);

		// Fetching the remaining balance
		const currentBal = await deployedBankingContract
			.connect(account2)
			.getAccountBalance(Number(accountNumber));

		// Aserting that the balance is deducted by amount
		expect(currentBal).to.be.equal(initialBal - amoutToWithdraw);
	});

	// Checking that only the account owner can withdraw from his account
	it("should fail if withdrawing by another account", async () => {
		await expect(
			deployedBankingContract.connect(owner).withdraw(1, ether(0.5))
		).to.be.revertedWith("You can withdraw only from the account you own");
	});

	// making sure user withdraws only what they deposited
	it("should not withdraw more than the current balance", async () => {
		await expect(
			deployedBankingContract.connect(account2).withdraw(1, ether(1.1))
		).to.be.revertedWith("insuficient balance");
	});

	// Transfering ether between the created accounts
	it("should transfer funds from one account to another", async () => {
		// Amount to transact
		const amountToTransfer = ether(0.5);

		// fetching initial sender balance
		const initialSenderBalance = await deployedBankingContract
			.connect(account2)
			.getAccountBalance(1);

		// fetching initial Receiver balance
		const initialReceiverBalance = await deployedBankingContract
			.connect(account3)
			.getAccountBalance(2);

		// Transfering funds from acc1 to acc2
		await deployedBankingContract
			.connect(account2)
			.transferFunds(1, 2, amountToTransfer);

		// fetching current Sender balance
		const currentSenderBal = await deployedBankingContract
			.connect(account2)
			.getAccountBalance(1);

		// // fetching current Receiver balance
		const currentReceiverBal = await deployedBankingContract
			.connect(account3)
			.getAccountBalance(2);

		// Asserting that the balance fields are updated
		expect(currentSenderBal).to.equal(initialSenderBalance - amountToTransfer);

		expect(currentReceiverBal).to.equal(
			initialReceiverBalance + amountToTransfer
		);
	});

	// Transfering 0 ether or less not allowed
	it("should fail if transfering 0 ether or less", async () => {
		await expect(
			deployedBankingContract.connect(account2).transferFunds(1, 2, 0)
		).to.be.revertedWith("amount must be greater than zero");
	});

	// Transfering to the same account is not allowed
	it("should fail if transfering to the same account", async () => {
		await expect(
			deployedBankingContract.connect(account2).transferFunds(1, 1, ether(0.3))
		).to.be.revertedWith("cannot transfer funds to the same account");
	});

	// Should revert if transfering from an account you don't own
	it("should revert if transfering from another account", async () => {
		await expect(
			deployedBankingContract.connect(account2).transferFunds(2, 1, ether(0.3))
		).to.be.revertedWith("You must be the account owner");
	});

	// Should revert if tranfering more than your current balance
	it("should revert if tranfering more than the current balance", async () => {
		await expect(
			deployedBankingContract.connect(account2).transferFunds(1, 2, ether(1))
		).to.be.revertedWith("insuficient balance");
	});
});
