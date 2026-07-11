#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const url = process.argv[2] || 'http://localhost:5173/mobile-preview.html';
const isWsl = Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
let command;
let args;

if (process.platform === 'win32') {
  command = 'cmd.exe';
  args = ['/c', 'start', '', url];
} else if (process.platform === 'darwin') {
  command = 'open';
  args = [url];
} else if (isWsl) {
  command = 'cmd.exe';
  args = ['/c', 'start', '', url];
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
console.log(`Opened mobile layout lab: ${url}`);
