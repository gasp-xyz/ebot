import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { doRequest } from './utils/requestHelper.js';
import { logger } from './utils/logger.js';
import { requireEnv, validateUrl } from './utils/env.js';

const OUTPUT = path.join('resources', 'tokens.json');

/**
 * Fetches token lists from TOKEN_LIST_URLS to build a local token database.
 * Handles partial failures if one or more sources are unavailable.
 */
export const updateTokenList = async () => {
  const sources = requireEnv('TOKEN_LIST_URLS').split(',').map((url, index) => ({
    name: `source ${index + 1}`,
    url: validateUrl('TOKEN_LIST_URLS', url),
  }));

  const seen = new Set();

  for (const source of sources) {
    try {
      const raw = await doRequest(source.url);
      const data = JSON.parse(raw);
      if (data.tokens) {
        data.tokens.forEach(t => seen.add(t.address.toLowerCase()));
        logger.info(`[tokens] loaded ${data.tokens.length} from ${source.name}`);
      }
    } catch (e) {
      logger.error(`[tokens] failed to fetch from ${source.name}: ${e.message}`);
    }
  }

  if (seen.size > 0) {
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify([...seen], null, 2));
    logger.success(`[tokens] ${seen.size} unique tokens written to ${OUTPUT}`);
  } else {
    logger.warn('[tokens] no tokens found, skipping file update');
  }
};

import { fileURLToPath } from 'url';

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  updateTokenList().catch(err => { logger.error(`[tokens] fatal: ${err.message}`); process.exit(1); });
}
