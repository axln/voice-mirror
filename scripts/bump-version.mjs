import { readFileSync, writeFileSync } from 'node:fs';

// Splices the current GitHub Actions run number in as the semver patch
// digit, so package.json's committed version always matches the last
// successfully deployed build. Run only from CI, after a successful deploy.
const buildNumber = process.env.GITHUB_RUN_NUMBER;
if (!buildNumber) {
  console.error('GITHUB_RUN_NUMBER is not set; refusing to bump package.json outside CI.');
  process.exit(1);
}

const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor] = pkg.version.split('.');
pkg.version = `${major}.${minor}.${buildNumber}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`package.json version set to ${pkg.version}`);
