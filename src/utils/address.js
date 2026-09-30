import { requireEnv } from './env.js';

// Deployment addresses must be supplied explicitly; no production defaults.
export const requireAddress = (name) => {
  const value = requireEnv(name).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(value) || /^0x0{40}$/i.test(value)) {
    throw new Error(`Invalid ${name}: set a nonzero Ethereum address in .env`);
  }
  return value;
};
