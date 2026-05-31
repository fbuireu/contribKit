// Blocks commits that touch more than one package at once.
// Reason: semantic-release-monorepo includes a commit in every package changelog whose files it touched,
// so mixed commits cause web changes to appear in the app changelog and vice versa.
import { execSync } from 'node:child_process';

const PACKAGES = ['app', 'web'];

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
