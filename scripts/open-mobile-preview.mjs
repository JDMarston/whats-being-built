#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const rawUrl = process.argv[2] || 'http://localhost:5173/mobile-preview.html';
let url;
try {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('only credential-free HTTP(S) URLs are allowed');
  }
  url = parsed.toString();
} catch (error) {
  console.error(`Invalid preview URL: ${error.message}`);
  process.exit(1);
}

const isWsl = Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
let command;
let args;

if (process.platform === 'win32' || isWsl) {
  command = 'rundll32.exe';
  args = ['url.dll,FileProtocolHandler', url];
} else if (process.platform === 'darwin') {
  command = 'open';
  args = [url];
} else {
  command = 'xdg-open';
  args = [url];
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  cwd: isWsl ? '/mnt/c/Windows' : undefined
});
if (result.error) {
  console.error(`Could not open ${url}: ${result.error.message}`);
  process.exit(1);
}
if (typeof result.status === 'number' && result.status !== 0) process.exit(result.status);
console.log(`Opened mobile preview: ${url}`);
