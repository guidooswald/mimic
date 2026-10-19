import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const bin = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

if (!bin) {
  console.error('Neither Chrome nor Edge was found');
  process.exit(1);
}

const svgFile = path.resolve('docs/screenshots/architecture-diagram.svg');
const pngFile = path.resolve('docs/screenshots/architecture-diagram.png');
const fileUrl = 'file:///' + svgFile.replace(/\\/g, '/');

const args = [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  `--screenshot=${pngFile}`,
  '--window-size=1100,560',
  fileUrl
];

console.log('Rendering SVG with headless browser...');
execFileSync(bin, args);

if (fs.existsSync(pngFile)) {
  console.log(`Success! ${pngFile} generated (${fs.statSync(pngFile).size} bytes)`);
} else {
  console.error('Failed to generate PNG');
}
