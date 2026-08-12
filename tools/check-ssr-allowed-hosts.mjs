import { readFile } from 'node:fs/promises';

const angularConfig = JSON.parse(await readFile(new URL('../angular.json', import.meta.url), 'utf8'));
const allowedHosts =
  angularConfig.projects?.['moyra-frontend']?.architect?.build?.options?.security?.allowedHosts;
const expectedHosts = [
  'moyra.org',
  'www.moyra.org',
  'test.moyra.org',
  'localhost',
  '127.0.0.1',
];

if (!Array.isArray(allowedHosts)) {
  throw new Error('SSR build security.allowedHosts must be an explicit array.');
}

if (allowedHosts.includes('*')) {
  throw new Error('SSR build security.allowedHosts must not contain a wildcard.');
}

const missingHosts = expectedHosts.filter((host) => !allowedHosts.includes(host));
if (missingHosts.length > 0) {
  throw new Error(`SSR build security.allowedHosts is missing: ${missingHosts.join(', ')}`);
}

console.log(`SSR allowed hosts verified: ${expectedHosts.join(', ')}`);
