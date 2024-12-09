import { ethers } from 'ethers';
import { BITLAYER_ADDRESS, RPC_URL } from './env.js';
import erc20Abi from './abis/erc20.json' assert { type: 'json' };
import vaultAbi from './abis/vault.json' assert { type: 'json' };
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWallets(fileName) {
  const fs = await import('fs/promises');

  const files = await fs.readdir('./wallets');
  const walletFiles = files.filter((file) => file.match(/^\d+_wallets\.json$/));
  const latestWalletFile = fileName || walletFiles.sort().pop();

  const { default: wallets } = await import('./wallets/' + latestWalletFile, {
    assert: { type: 'json' },
  });

  console.log('Using wallet file:', latestWalletFile);
  console.log('wallets: ', wallets);
  return wallets;
}

function generateWallets(count) {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();
    wallets.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
  }
  const nameFile = `./wallets/${Date.now()}_wallets.json`;
  fs.writeFileSync(nameFile, JSON.stringify(wallets, null, 2));
  return wallets;
}

function generateNonce() {
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const allChars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 4; i++) {
    nonce += upperChars[Math.floor(Math.random() * upperChars.length)];
  }
  nonce += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 0; i < 2; i++) {
    nonce += upperChars[Math.floor(Math.random() * upperChars.length)];
  }
  for (let i = 0; i < 9; i++) {
    nonce += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return nonce;
}

async function signMessage(privateKey, address) {
  const wallet = new ethers.Wallet(privateKey);
  const formattedMessage = `dapp.vdex.trade wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to the app.\n\nURI: https://dapp.vdex.trade\nVersion: 1\nChain ID: 200810\nNonce: ${generateNonce()}\nIssued At: ${new Date().toISOString()}`;
  const signature = await wallet.signMessage(formattedMessage);
  return {
    signature,
    message: formattedMessage,
  };
}

function generateRandomPrice(basePrice = 4000, percentageRange = 10) {
  const minPrice = basePrice * (1 - percentageRange / 100);
  const maxPrice = basePrice * (1 + percentageRange / 100);
  return Math.floor(Math.random() * (maxPrice - minPrice) + minPrice);
}

async function tokenApprove(
  amountDeposit,
  chainId,
  tokenAddress,
  approveTo,
  privateKey
) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);

  try {
    const amount = ethers.utils.parseUnits(amountDeposit, 18);

    // Check existing allowance
    const allowance = await tokenContract.allowance(signer.address, approveTo);
    console.log('allowance: ', ethers.utils.formatUnits(allowance, 18));
    if (allowance.gte(amount)) {
      console.log(`[${chainId}] token ${tokenAddress} allowance is enough`);
      return;
    }

    // Prepare approval transaction
    const txData = tokenContract.interface.encodeFunctionData('approve', [
      approveTo,
      amount,
    ]);
    const gasEstimate = await tokenContract.estimateGas.approve(
      approveTo,
      amount
    );

    const tx = {
      to: tokenAddress,
      data: txData,
      value: '0',
      gasLimit: Math.floor(gasEstimate.toNumber() * 1.1).toString(), // Increase gas limit by 10%
      nonce: await signer.getTransactionCount(),
    };

    const txResponse = await signer.sendTransaction(tx);
    const receipt = await txResponse.wait();

    console.log(`Approval transaction mined on block: ${receipt.blockNumber}`);
    console.log(`Transaction hash: ${txResponse.hash}`);
    console.log(`From: ${txResponse.from} to ${txResponse.to}`);

    return txResponse;
  } catch (error) {
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error(`[${chainId}] tokenApprove failed: ${error.reason}`);
    } else {
      throw new Error(`[${chainId}] tokenApprove failed: ${error.message}`);
    }
  }
}

async function deposit(amountDeposit, chainId, tokenAddress, privateKey) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);
  const vaultContract = new ethers.Contract(BITLAYER_ADDRESS, vaultAbi, signer);

  try {
    // Kiểm tra balance native token
    const balance = await provider.getBalance(signer.address);
    console.log(
      `Native token balance: ${ethers.utils.formatEther(balance)} BTC`
    );

    // Ước tính gas price
    const gasPrice = await provider.getGasPrice();
    const estimatedGasLimit = await vaultContract.estimateGas.deposit(
      tokenAddress,
      ethers.utils.parseUnits(amountDeposit, 18)
    );
    const estimatedCost = gasPrice.mul(estimatedGasLimit);
    console.log('estimatedCost: ', ethers.utils.formatEther(estimatedCost));

    // Kiểm tra xem có đủ native token để trả phí gas không
    if (balance.lt(estimatedCost)) {
      console.log(
        `[${chainId}] - ❌ Insufficient native token for gas... Need ${ethers.utils.formatEther(
          estimatedCost
        )} BTC, but only have ${ethers.utils.formatEther(balance)} BTC, ` +
          `try to deposit ${ethers.utils.formatEther(
            estimatedCost.sub(balance)
          )} BTC`
      );
      throw new Error(
        `Insufficient native token for gas. Need ${ethers.utils.formatEther(
          estimatedCost
        )} BTC, ` + `but only have ${ethers.utils.formatEther(balance)} BTC`
      );
    }

    const amount = ethers.utils.parseUnits(amountDeposit, 18);
    // First approve tokens
    await tokenApprove(
      amountDeposit,
      chainId,
      tokenAddress,
      BITLAYER_ADDRESS,
      privateKey
    );

    // Prepare transaction data
    const txData = vaultContract.interface.encodeFunctionData('deposit', [
      tokenAddress,
      amount,
    ]);
    const gasEstimate = await vaultContract.estimateGas.deposit(
      tokenAddress,
      amount
    );

    const tx = {
      to: BITLAYER_ADDRESS,
      data: txData,
      value: '0',
      gasLimit: Math.floor(gasEstimate.toNumber() * 1.1).toString(), // Increase gas limit by 10%
      nonce: await signer.getTransactionCount(),
    };

    const txResponse = await signer.sendTransaction(tx);
    const receipt = await txResponse.wait();

    console.log(`Deposit transaction mined: ${txResponse.hash}`);
    return txResponse;
  } catch (error) {
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error(`[${chainId}] deposit failed: ${error.reason}`);
    } else {
      throw new Error(`[${chainId}] deposit failed: ${error.message}`);
    }
  }
}

async function getBalance(tokenAddress, privateKey) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
  const balance = await tokenContract.balanceOf(signer.address);
  return ethers.utils.formatUnits(balance, 18);
}

export {
  sleep,
  generateWallets,
  signMessage,
  generateRandomPrice,
  deposit,
  getBalance,
  getWallets,
};
