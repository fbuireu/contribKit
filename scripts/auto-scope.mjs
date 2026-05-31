import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const msgFile = process.argv[2];
if (!msgFile) process.exit(0);

const content = readFileSync(msgFile, 'utf8');
const firstLine = content.split('\n')[0];

// Already has a scope — nothing to do
if (/^[a-zA-Z]+\([^)]+\)!?:/.test(firstLine)) process.exit(0);

// Not a conventional commit — let commitlint handle it
if (!/^[a-zA-Z]+!?:/.test(firstLine)) process.exit(0);

let staged;
try {
  staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
} catch {
  process.exit(0);
}

const files = staged.trim().split('\n').filter(Boolean);
const hasApp = files.some(f => f.startsWith('app/'));
const hasWeb = files.some(f => f.startsWith('web/'));

if (hasApp && hasWeb) {
  process.stderr.write(
    '\nThis commit touches both app/ and web/ — split it into two separate commits.\n\n',
  );
  process.exit(1);
}

const scope = hasApp ? 'app' : hasWeb ? 'web' : null;
if (!scope) process.exit(0);

const newFirstLine = firstLine.replace(/^([a-zA-Z]+)(!?):/, `$1(${scope})$2:`);
writeFileSync(msgFile, content.replace(firstLine, newFirstLine));
