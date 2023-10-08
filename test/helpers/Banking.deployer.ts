/** @format */

import { ethers } from "hardhat";

async function deployerHelper() {
	const BankingContract = await ethers.getContractFactory("BankingContract");
	const deployedBankingContract = await BankingContract.deploy();

	return { deployedBankingContract };
}

export default deployerHelper;
