import { readFileSync, writeFileSync } from 'node:fs';

// Increments package.json's patch version by 1. Run in CI before the build,
// so the build embeds the same version that then gets committed back.
const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`package.json version bumped to ${pkg.version}`);
