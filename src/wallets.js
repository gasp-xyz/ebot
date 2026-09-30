import fs from "fs";
import { getWeb3Bs, getWeb3Fs } from "./web3api.js";
import { config } from "./config.js";

let fsWallet;
let bsWallet;

export const initWallets = () => {
  const web3Fs = getWeb3Fs();
  const web3Bs = getWeb3Bs();

  const loadKeystore = (path) => {
    if (!fs.existsSync(path)) {
      throw new Error(`Keystore file not found at ${path}. Did you run 'npm run create_wallet'?`);
    }
    try {
      return JSON.parse(fs.readFileSync(path));
    } catch (e) {
      throw new Error(`Failed to parse keystore at ${path}: ${e.message}`);
    }
  };

  const fsKeystore = loadKeystore(config.wallets.fsKeystorePath);
  const bsKeystore = loadKeystore(config.wallets.bsKeystorePath);

  fsWallet = web3Fs.eth.accounts.wallet.decrypt(fsKeystore, config.wallets.fsPassword);
  bsWallet = web3Bs.eth.accounts.wallet.decrypt(bsKeystore, config.wallets.bsPassword);
};

export const getFsWallet = () => {
  if (!fsWallet) throw new Error("Front-swap wallet is not initialized");
  return fsWallet;
};

export const getBsWallet = () => {
  if (!bsWallet) throw new Error("Back-swap wallet is not initialized");
  return bsWallet;
};
