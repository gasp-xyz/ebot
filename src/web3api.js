import Web3 from "web3";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

let web3Ws;
let web3Fs;
let web3Bs;
let web3Http;

const createWsProvider = (url) => {
  const provider = new Web3.providers.WebsocketProvider(url, {
    reconnect: {
      auto: true,
      delay: 5000,
      maxAttempts: 10,
      onTimeout: false
    }
  });

  provider.on('connect', () => logger.success('[web3] WS connected'));
  provider.on('error', (e) => logger.error(`[web3] WS error: ${e.message}`));
  provider.on('end', (e) => logger.warn(`[web3] WS disconnected: ${e.reason || 'unknown'}`));

  return provider;
};

export const initApis = () => {
  web3Ws = new Web3(createWsProvider(config.rpc.wsUrl));
  web3Fs = new Web3(config.rpc.infuraFs);
  web3Bs = new Web3(config.rpc.infuraBs);
  web3Http = new Web3(new Web3.providers.HttpProvider(config.rpc.httpUrl));
};

/**
 * Validates connectivity to all configured RPC endpoints.
 * @throws {Error} if any connection fails.
 */
export const checkConnections = async () => {
  logger.info('[web3] verifying RPC connections...');
  try {
    await Promise.all([
      web3Fs.eth.getBlockNumber(),
      web3Bs.eth.getBlockNumber(),
      web3Http.eth.getBlockNumber(),
    ]);
    logger.success('[web3] all RPC connections verified');
  } catch (e) {
    throw new Error(`RPC connection failed: ${e.message}`);
  }
};

export const getWeb3Fs = () => {
  if (!web3Fs) throw new Error("web3 for front-swap is not initialized");
  return web3Fs;
};

export const getWeb3Bs = () => {
  if (!web3Bs) throw new Error("web3 for back-swap is not initialized");
  return web3Bs;
};

export const getWeb3Ws = () => {
  if (!web3Ws) throw new Error("web3 WebSocket connection is not initialized");
  return web3Ws;
};

export const getWeb3Http = () => {
  if (!web3Http) throw new Error("web3 HTTP connection is not initialized");
  return web3Http;
};
