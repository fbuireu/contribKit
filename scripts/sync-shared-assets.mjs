import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sharedDir = join(root, "shared");
const targetDir = join(root, "app", "assets");

if (!existsSync(targetDir)) {
  process.stderr.write(`Cannot sync: ${targetDir} does not exist. Run this from a full checkout.\n`);
  process.exit(1);
}

const files = readdirSync(sharedDir).filter((file) => file.endsWith(".json"));
const copied = [];
for (const file of files) {
  copyFileSync(join(sharedDir, file), join(targetDir, file));
  copied.push(join("app", "assets", file));
}

if (process.argv.includes("--stage") && copied.length > 0) {
  execFileSync("git", ["add", ...copied], { cwd: root });
}

process.stdout.write(`Synced ${copied.length} shared asset(s) to app/assets/\n`);
