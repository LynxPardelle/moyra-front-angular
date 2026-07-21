import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const appName = 'moyra-frontend';
const distRoot = path.join(root, 'dist', appName);
const browserDir = path.join(distRoot, 'browser');
const serverDir = path.join(distRoot, 'server');
const outputRoot = path.join(root, 'dist', 'ssr-lambda');
const stagingDir = path.join(outputRoot, 'staging');
const zipPath = path.join(outputRoot, 'ssr-handler.zip');
const manifestPath = path.join(outputRoot, 'manifest.json');
const releaseId = process.env.RELEASE_ID || gitValue(['rev-parse', '--short=12', 'HEAD']);
const environmentName = process.env.DEPLOY_ENV || 'test';
const apiBaseUrl = process.env.API_BASE_URL || defaultApiBaseUrl(environmentName);
const artifactBasePrefix = `frontend/angular-ssr/${environmentName}`;
const serverlessHttpDir = path.join(root, 'node_modules', 'serverless-http');

await assertDirectory(browserDir, 'Run `npm run build` before packaging; browser output is missing.');
await assertDirectory(serverDir, 'Run `npm run build` before packaging; server output is missing.');
await assertDirectory(serverlessHttpDir, 'Run `npm install` before packaging; serverless-http is missing.');

await rm(outputRoot, { force: true, recursive: true });
await mkdir(stagingDir, { recursive: true });

await cp(browserDir, path.join(stagingDir, 'browser'), { recursive: true });
await cp(serverDir, path.join(stagingDir, 'server'), { recursive: true });
await cp(serverlessHttpDir, path.join(stagingDir, 'node_modules', 'serverless-http'), {
  recursive: true,
});

await writeFile(
  path.join(stagingDir, 'index.mjs'),
  `import serverless from 'serverless-http';\nimport { reqHandler } from './server/server.mjs';\n\nconst angularHandler = serverless(reqHandler, {\n  provider: 'aws',\n  binary: ['application/octet-stream', 'application/pdf', 'font/*', 'image/*'],\n});\n\nexport const handler = async (event, context) => angularHandler(event, context);\n`,
);

await writeFile(
  path.join(stagingDir, 'package.json'),
  `${JSON.stringify(
    {
      type: 'module',
      dependencies: {
        'serverless-http': '^4.0.0',
      },
    },
    null,
    2,
  )}\n`,
);

await createZip(stagingDir, zipPath);
const sha256 = await hashFile(zipPath);
const sourceCommit = gitValue(['rev-parse', 'HEAD']);
const manifest = {
  schemaVersion: 1,
  app: appName,
  environment: environmentName,
  releaseId,
  sourceCommit,
  apiBaseUrl,
  nodeRuntime: 'nodejs22.x',
  browserPrefix: `${artifactBasePrefix}/releases/${releaseId}/browser`,
  serverBundleKey: `${artifactBasePrefix}/releases/${releaseId}/server/ssr-handler.zip`,
  checksums: {
    'server/ssr-handler.zip': sha256,
  },
  createdAt: new Date().toISOString(),
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ zipPath, manifestPath, releaseId, sha256 }, null, 2));

async function assertDirectory(directory, message) {
  try {
    const current = await stat(directory);
    if (current.isDirectory()) {
      return;
    }
  } catch {
    // Fall through to the shared error below.
  }
  throw new Error(message);
}

async function createZip(sourceDir, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  if (process.platform === 'win32') {
    const quotedSource = quotePowerShellPath(sourceDir);
    const quotedDestination = quotePowerShellPath(destination);
    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Add-Type -AssemblyName System.IO.Compression.FileSystem; if (Test-Path ${quotedDestination}) { Remove-Item -LiteralPath ${quotedDestination} -Force }; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quotedSource}, ${quotedDestination}, [System.IO.Compression.CompressionLevel]::Optimal, $false)`,
      ],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) {
      throw new Error(`CreateFromDirectory failed with exit code ${result.status}.`);
    }
    return;
  }

  const result = spawnSync('zip', ['-qr', destination, '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('The `zip` command is required to package the Lambda SSR artifact.');
  }
}

async function hashFile(filePath) {
  const contents = await readFile(filePath);
  return createHash('sha256').update(contents).digest('hex');
}

function gitValue(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function quotePowerShellPath(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function defaultApiBaseUrl(environmentName) {
  if (environmentName === 'production' || environmentName === 'prod') {
    return 'https://api.moyra.org/api/v2';
  }
  return 'https://api.test.moyra.org/api/v2';
}


