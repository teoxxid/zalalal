import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, '..');
const repoDir = resolve(frontendDir, '..');
const sourceDir = resolve(repoDir, 'minio-files');
const targetDir = resolve(frontendDir, 'public', 'minio-files');

if (!existsSync(sourceDir)) {
  throw new Error(`MinIO assets directory not found: ${sourceDir}`);
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`Copied MinIO assets from ${sourceDir} to ${targetDir}`);
