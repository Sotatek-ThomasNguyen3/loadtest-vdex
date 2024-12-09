import axios from 'axios';
import {
  getWallets,
  signMessage,
  generateRandomPrice,
  deposit,
  getBalance,
  sleep,
} from './helpers.js';
import { WALLET_COUNT, API_BASE, CHAIN_ID, WETH_ADDRESS } from './env.js';

async function processTradingWallet(wallet) {
  console.log(
    `\n🚀 Processing wallet: ${wallet.address} - ${wallet.privateKey}\n`
  );
  const results = {
    address: wallet.address,
    login: false,
    position: false,
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

      // Get balance
      const balance = await getBalance(WETH_ADDRESS, wallet.privateKey);
      console.log('balance WETH: ', balance);

      // Deposit
      const txDeposit = await deposit(
        '0.05',
        CHAIN_ID,
        WETH_ADDRESS,
        wallet.privateKey
      );
      console.log('txDeposit: ', txDeposit.hash);

      if (txDeposit?.hash) {
        console.log(`✅ Deposit successful for ${wallet.address}`);
        await sleep(10000); // Wait for deposit to be confirmed
        // Create position
        const priceETH = generateRandomPrice(4000, 10);
        console.log('priceETH: ', priceETH);
        const positionResponse = await axios.post(
          `${API_BASE}/api-gateway/v1/user/requestLeverageOrder`,
          {
            direction: 'buy',
            price: priceETH,
            quantity: 12,
            leverage_type: 'cross',
            base_asset_id: 'ETH',
            initial_margin: 12,
            leverage: 1,
            initial_margin_asset_id: 'USD',
            order_type: 'LimitOpen',
            expiration_date: -1,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if ([200, 201].includes(positionResponse.status)) {
          results.position = true;
          console.log('positionResponse: ', positionResponse.data);
          console.log(`✅ Position successful for ${wallet.address}`);
        } else {
          console.log(`❌ Position failed for ${wallet.address}`);
        }
      } else {
        console.log(`❌ Deposit failed for ${wallet.address}`);
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

  const wallets = await getWallets();
  const results = await Promise.all(wallets.map(processTradingWallet));

  // Calculate success rates
  const successRates = results.reduce(
    (acc, result) => {
      if (result.login) acc.login++;
      if (result.position) acc.position++;
      return acc;
    },
    { login: 0, position: 0 }
  );

  console.log('\n📊 Success Rates:');
  console.log(
    `Login: ${((successRates.login / WALLET_COUNT) * 100).toFixed(2)}%`
  );
  console.log(
    `Position: ${((successRates.position / WALLET_COUNT) * 100).toFixed(2)}%`
  );
}

main().catch(console.error);
