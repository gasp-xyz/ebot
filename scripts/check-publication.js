import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['.git', 'node_modules', 'build', 'artifacts', 'coverage']);
const walk = (dir = '') => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(entry => {
    if (excluded.has(entry.name)) return [];
    const name = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? walk(name) : [name];
  });

// In a repository, check all files that can be committed (including new files).
// For a source archive, inspect every file except dependency/build directories.
const files = fs.existsSync(path.join(root, '.git'))
  ? [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))]
  : walk();

const errors = [];
const addressPattern = /0x[0-9a-f]{40}(?![0-9a-f])/gi;
for (const name of files) {
  const fullPath = path.join(root, name);
  if (!fs.existsSync(fullPath)) continue; // A tracked file removed from the worktree.
  if (fs.lstatSync(fullPath).isSymbolicLink()) {
    errors.push(`${name}: publication files must not be symlinks`);
    continue;
  }
  if ((/(^|\/)\.env(?:\.|$)/.test(name) && name !== '.env.example') ||
      /(^|\/)(?:wallets|wallet(?:bs)?\.json)(?:\/|$)/.test(name)) {
    errors.push(`${name}: local configuration or wallet file must not be published`);
  }
  if (name.endsWith('.bin')) errors.push(`${name}: compiled deployment artifact must not be published`);
  const content = fs.readFileSync(fullPath).toString('utf8');
  for (const match of content.matchAll(addressPattern)) {
    if (!/^0x0{40}$/i.test(match[0])) {
      const line = content.slice(0, match.index).split('\n').length;
      errors.push(`${name}:${line}: nonzero address literal must be a configuration value`);
    }
  }
  if (name.endsWith('.js')) {
    const urlPattern = /(?:https?|wss?):\/\/[^\s'"`<>\\)]+/gi;
    for (const match of content.matchAll(urlPattern)) {
      try {
        const host = new URL(match[0]).hostname.replace(/\.$/, '');
        if (!['localhost', '127.0.0.1', '[::1]'].includes(host) &&
            !host.endsWith('.test') && !host.endsWith('.invalid')) {
          errors.push(`${name}: external service URL must be supplied through configuration`);
        }
      } catch { /* Ignore regex fragments rather than actual URL literals. */ }
    }
  }
}

for (const [name, expected] of [
  ['tokens.json', []], ['resources/tokens.json', []], ['resources/pathlist.json', {}],
]) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
    if (JSON.stringify(value) !== JSON.stringify(expected)) {
      errors.push(`${name}: keep the publication dataset empty; populate only in your local deployment`);
    }
  } catch {
    errors.push(`${name}: missing or invalid publication placeholder`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Publication check passed (${files.length} files; empty datasets; no production address literals).`);
}
