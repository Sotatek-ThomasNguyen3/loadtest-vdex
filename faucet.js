import axios from 'axios';
import {
  generateWallets,
  signMessage,
  generateRandomPrice,
  deposit,
  getBalance,
} from './helpers.js';
import { WALLET_COUNT, API_BASE, CHAIN_ID, WETH_ADDRESS } from './env.js';

async function processWallet(wallet) {
  console.log(
    `\n🚀 Processing wallet: ${wallet.address} - ${wallet.privateKey}\n`
  );
  const results = {
    address: wallet.address,
    login: false,
    verify: false,
    faucet: false,
  };

  try {
    // Sign message
    const { signature, message } = await signMessage(
      wallet.privateKey,
      wallet.address
    );

    // Login
    const loginResponse = await axios.post(
      `${API_BASE}/auth-service/api/v1/auth/login`,
      {
        address: wallet.address,
        signature: signature,
        message: message,
        referrerCode: '',
      }
    );

    if ([200, 201].includes(loginResponse.status)) {
      results.login = true;
      console.log(`✅ Login successful for ${wallet.address}`);
      const accessToken = loginResponse.data?.data?.accessToken;

      // Verify
      const verifyResponse = await axios.get(
        `${API_BASE}/auth-service/api/v1/auth/verify`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if ([200, 201].includes(verifyResponse.status)) {
        results.verify = true;
        console.log(`✅ Verification successful for ${wallet.address}`);

        // Faucet
        const faucetResponse = await axios.post(
          `${API_BASE}/signature-service/api/v1/faucets`,
          {
            chainID: CHAIN_ID,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if ([200, 201].includes(faucetResponse.status)) {
          results.faucet = true;
          console.log(`✅ Faucet successful for ${wallet.address}`);
        } else {
          console.log(`❌ Faucet failed for ${wallet.address}`);
        }
      } else {
        console.log(`❌ Verification failed for ${wallet.address}`);
      }
    } else {
      console.log(`❌ Login failed for ${wallet.address}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${wallet.address}: ${error.message}`);
  }

  return results;
}

async function main() {
  console.log(`\n🚀 Starting process with ${WALLET_COUNT} wallets...\n`);

  const wallets = generateWallets(WALLET_COUNT);
  const results = await Promise.all(wallets.map(processWallet));

  // Calculate success rates
  const successRates = results.reduce(
    (acc, result) => {
      if (result.login) acc.login++;
      if (result.verify) acc.verify++;
      if (result.faucet) acc.faucet++;
      return acc;
    },
    { login: 0, verify: 0, faucet: 0 }
  );

  console.log('\n📊 Success Rates:');
  console.log(
    `Login: ${((successRates.login / WALLET_COUNT) * 100).toFixed(2)}%`
  );
  console.log(
    `Verify: ${((successRates.verify / WALLET_COUNT) * 100).toFixed(2)}%`
  );
  console.log(
    `Faucet: ${((successRates.faucet / WALLET_COUNT) * 100).toFixed(2)}%`
  );
}

main().catch(console.error);
