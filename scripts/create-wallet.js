/**
 * One-time wallet creation utility.
 *
 * Run this script once per wallet to generate an encrypted keystore file:
 *
 *   node scripts/create-wallet.js
 *
 * The script reads the password from the environment so it never appears in
 * source code or shell history:
 *
 *   FS_WALLET_PASSWORD=secret node scripts/create-wallet.js --output wallets/wallet.json
 *   BS_WALLET_PASSWORD=secret node scripts/create-wallet.js --output wallets/walletbs.json
 *
 * IMPORTANT: Keep the generated .json files and your passwords safe.
 * Never commit them to version control.
 */

import "dotenv/config";
import Web3 from "web3";
import fs from "fs";
import path from "path";

import { logger } from "../src/utils/logger.js";
import { requireEnv } from "../src/utils/env.js";

const args = process.argv.slice(2);
const outputFlag = args.indexOf("--output");
const outputPath = outputFlag !== -1 ? args[outputFlag + 1] : "wallet.json";

// Use the front-swap password when present, otherwise the back-swap password.
const password = requireEnv(process.env.FS_WALLET_PASSWORD ? 'FS_WALLET_PASSWORD' : 'BS_WALLET_PASSWORD');

const web3 = new Web3();

web3.eth.accounts.wallet.create(1);
const encrypted = web3.eth.accounts.wallet.encrypt(password);
const address = web3.eth.accounts.wallet[0].address;

const dir = path.dirname(outputPath);
if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(outputPath, JSON.stringify(encrypted, null, 2));

logger.success(`Wallet created: ${address}`);
logger.info(`Keystore saved to: ${outputPath}`);
logger.warn("Record the address and keep the keystore file and password secure.");
