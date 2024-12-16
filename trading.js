import axios from 'axios';
import { API_BASE, WALLET_ADDRESS_TRADING, WALLET_COUNT } from './env.js';
import { generateRandomPrice, signMessage } from './helpers.js';

async function processTradingWallet(wallet, numberOfPositions = 20) {
  const results = {
    address: wallet.address,
    login: false,
    positions: [], // Changed to array to track multiple positions
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

      if (accessToken) {
        // Create 20 positions
        const positions = [];
        for (let i = 0; i < numberOfPositions; i++) {
          try {
            const priceETH = generateRandomPrice(4000, 10);
            console.log(`Position ${i + 1} - priceETH: ${priceETH}`);

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
              positions.push(true);
              console.log(
                `✅ Position ${i + 1} successful for ${wallet.address}`
              );
              console.log('positionResponse: ', positionResponse.data);
            } else {
              positions.push(false);
              console.log(`❌ Position ${i + 1} failed for ${wallet.address}`);
            }
          } catch (error) {
            positions.push(false);
            console.error(
              `❌ Error creating position ${i + 1}: ${error.message}`
            );
          }
        }
        results.positions = positions;
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
  const numberOfPositions = 20;
  const wallets = [WALLET_ADDRESS_TRADING];
  const results = await Promise.all(
    wallets.map((wallet) => processTradingWallet(wallet, numberOfPositions))
  );

  // Calculate success rates
  const successRates = results.reduce(
    (acc, result) => {
      if (result.login) acc.login++;
      acc.positions += result.positions.filter((p) => p).length;
      return acc;
    },
    { login: 0, positions: 0 }
  );

  console.log('\n📊 Success Rates:');
  console.log(
    `Login: ${((successRates.login / wallets.length) * 100).toFixed(2)}%`
  );
  console.log(
    `Positions: ${(
      (successRates.positions / (wallets.length * 20)) *
      100
    ).toFixed(2)}%`
  );
}

main().catch(console.error);
