import './src/config.js';
import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { config } from './src/config.js';
import { initApis, checkConnections } from './src/web3api.js';
import { initWallets } from './src/wallets.js';
import { initContracts } from './src/contracts/initContracts.js';
import { subscribePendingTx } from './src/subscribePendingTx.js';
import { subscribePrices } from './src/subscribePrices.js';
import { updateEthStatus } from './src/ethStatus.js';
import { processTrade } from './src/processTrade.js';
import { logger } from './src/utils/logger.js';

const app = express();
app.use(bodyParser.json());

app.post('/hook', async (req, res) => {
  res.status(200).end();
  try { await processTrade(req); } catch (e) { logger.error(`[hook] ${e.message}`); }
});

const main = async () => {
  initApis();
  initWallets();
  initContracts();

  await checkConnections();
  await updateEthStatus();

  subscribePendingTx();
  subscribePrices();

  if (config.localtunnelSubdomain) {
    exec(`lt --port ${config.port} --subdomain ${config.localtunnelSubdomain}`,
      (err) => { if (err) logger.error(`[tunnel] ${err.message}`); });
  }

  app.listen(config.port, () => logger.info(`[bot] listening on :${config.port}`));
};

main().catch(err => { logger.error(`[bot] fatal: ${err.message}`); process.exit(1); });
