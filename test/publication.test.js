import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const withSnapshot = (fn) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ebot-publication-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.mkdirSync(path.join(root, 'resources'));
    fs.copyFileSync(new URL('../scripts/check-publication.js', import.meta.url),
      path.join(root, 'scripts/check-publication.js'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
    fs.writeFileSync(path.join(root, 'tokens.json'), '[]');
    fs.writeFileSync(path.join(root, 'resources/tokens.json'), '[]');
    fs.writeFileSync(path.join(root, 'resources/pathlist.json'), '{}');
    return fn(root, () => spawnSync(process.execPath, ['scripts/check-publication.js'],
      { cwd: root, encoding: 'utf8' }));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

test('a clean source archive passes the publication check without Git', () => withSnapshot((root, run) => {
  fs.writeFileSync(path.join(root, '.env.example'), 'TRADE_CONTRACT_ADDRESS=REPLACE_WITH_ADDRESS\n');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Publication check passed/);
}));

test('publication check rejects an address even in a comment without echoing it', () => withSnapshot((root, run) => {
  const fixture = `0x${'ab'.repeat(20)}`;
  fs.writeFileSync(path.join(root, 'example.js'), `// Deployment: ${fixture}\n`);
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /example.js:1: nonzero address literal/);
  assert.ok(!result.stderr.includes(fixture));
}));

test('publication check rejects populated non-EVM data, bytecode, and local configuration', () => withSnapshot((root, run) => {
  fs.writeFileSync(path.join(root, 'resources/tokens.json'), JSON.stringify(['old-token-record']));
  fs.writeFileSync(path.join(root, 'deployment.bin'), 'compiled-data');
  fs.writeFileSync(path.join(root, '.env'), 'LOCAL_SECRET=test-fixture');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /resources\/tokens.json: keep the publication dataset empty/);
  assert.match(result.stderr, /deployment.bin: compiled deployment artifact/);
  assert.match(result.stderr, /\.env: local configuration or wallet file/);
  assert.ok(!result.stderr.includes('test-fixture'));
}));
