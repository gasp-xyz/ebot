import dotenv from 'dotenv';
import { requireEnv, readHttpUrl, validateUrl } from './utils/env.js';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  localtunnelSubdomain: process.env.LOCALTUNNEL_SUBDOMAIN || null,

  rpc: {
    wsUrl:    validateUrl('WS_RPC_URL', process.env.WS_RPC_URL ?? 'ws://localhost:8545', ['ws:', 'wss:']),
    httpUrl:  validateUrl('HTTP_RPC_URL', process.env.HTTP_RPC_URL ?? 'http://localhost:8545'),
    infuraFs: readHttpUrl('INFURA_FS_URL'),
    infuraBs: readHttpUrl('INFURA_BS_URL'),
  },

  wallets: {
    fsKeystorePath: process.env.FS_WALLET_PATH ?? 'wallets/wallet.json',
    bsKeystorePath: process.env.BS_WALLET_PATH ?? 'wallets/walletbs.json',
    fsPassword: requireEnv('FS_WALLET_PASSWORD'),
    bsPassword: requireEnv('BS_WALLET_PASSWORD'),
  },

  gasStation: {
    url:           readHttpUrl('ETH_GAS_STATION_URL'),
    apiKey:        process.env.ETH_GAS_STATION_API_KEY ?? '',
    pollIntervalMs: parseInt(process.env.GAS_POLL_INTERVAL_MS ?? '60000', 10),
  },
};
