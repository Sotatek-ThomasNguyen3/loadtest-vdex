# VDEX Faucet Testing Script

A Node.js script to test the VDEX faucet functionality by automatically creating wallets, logging in, and requesting test tokens.

## Prerequisites

- Node.js (v18 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
```

2. Install dependencies:

```bash
npm install axios ethers
```

## Configuration

Open `faucet.js` and modify the following constants if needed:

```javascript
const WALLET_COUNT = 1; // Number of wallets to test
const API_BASE = 'https://api.vdex.trade';
```

## Usage

Run the script using Node.js:

```bash
node faucet.js
```

The script will:

1. Generate random Ethereum wallets
2. Sign authentication messages
3. Login to the VDEX platform
4. Verify authentication
5. Request tokens from the faucet
6. Display success rates for each operation

## Output

The script provides detailed console output showing:

- Wallet addresses being processed
- Success/failure status for each operation
- Final success rates for login, verification, and faucet requests

Example output:

```
🚀 Starting process with 1 wallets...

✅ Login successful for 0x123...
✅ Verification successful for 0x123...
✅ Faucet successful for 0x123...

📊 Success Rates:
Login: 100.00%
Verify: 100.00%
Faucet: 100.00%
```

## Trading Script

The repository also includes a trading script (`trading.js`) for automated trading testing.

### Running Trading Tests

Execute the trading script:

```bash
node trading.js
```

The trading script will:

1. Connect to your configured wallet
2. Place random buy/sell orders
3. Monitor order execution
4. Report trading statistics

Example trading output:
✅ Login successful for 0xff0...
✅ Deposit successful for 0xff0...
✅ Position successful for 0xff0...

📊 Success Rates:
Login: 100.00%
Position: 100.00%

## Important Notes

- This script uses the most recent file in the wallets folder by default. To use your own wallet file, replace the wallets folder with your own or specify a filename in the `getWallets()` function.
  Example: `const wallets = await getWallets('1733762697787_wallets.json');`

- In trading.js, where you see the comment `Wait for deposit to be confirmed`: The confirmation time may be longer than expected, and transactions might stall due to gas fees. If transactions remain pending for too long, errors may occur. To resolve this, please ensure you have sufficient BTC (native token) on the [Bitlayer network](https://www.bitlayer.org/faucet) to process transactions successfully.

## Error Handling

The script includes error handling for each operation and will display detailed error messages if any step fails.

## Contributing

Feel free to submit issues and enhancement requests!

## License

[MIT License](LICENSE)

```

This README provides:
1. Clear installation instructions
2. Configuration options
3. Usage instructions
4. Expected output examples
5. Basic error handling information
6. Standard sections for contributing and licensing

You can customize this further based on your specific needs or add additional sections like:
- Troubleshooting guide
- API documentation
- Development setup
- Testing instructions
```
