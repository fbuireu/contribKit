import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CONVENTIONAL_WITH_SCOPE = /^[a-zA-Z]+\([^)]+\)!?:/;
const CONVENTIONAL_WITHOUT_SCOPE = /^[a-zA-Z]+!?:/;
const INJECT_SCOPE = /^([a-zA-Z]+)(!?):/;

const PACKAGES = ['app', 'web'];

const msgFile = process.argv[2];
if (!msgFile) process.exit(0);

const content = readFileSync(msgFile, 'utf8');
const firstLine = content.split('\n')[0];

if (CONVENTIONAL_WITH_SCOPE.test(firstLine)) process.exit(0);
if (!CONVENTIONAL_WITHOUT_SCOPE.test(firstLine)) process.exit(0);

let staged;
try {
  staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
} catch {
  process.exit(0);
}

const files = staged.trim().split('\n').filter(Boolean);
const touchedPackages = PACKAGES.filter(pkg => files.some(f => f.startsWith(`${pkg}/`)));

if (touchedPackages.length > 1) {
  process.stderr.write(`\nCommit touches ${touchedPackages.join(' and ')} — split into separate commits.\n\n`);
  process.exit(1);
}

const [scope] = touchedPackages;
if (!scope) process.exit(0);

const newFirstLine = firstLine.replace(INJECT_SCOPE, `$1(${scope})$2:`);
writeFileSync(msgFile, content.replace(firstLine, newFirstLine));
