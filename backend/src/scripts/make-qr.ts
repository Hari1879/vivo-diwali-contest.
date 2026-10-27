/**
 * Generates the print-ready QR code for the contest link.
 *   npm run qr -- https://your-domain.in
 * Writes qr/contest-qr.png (2000 px) and qr/contest-qr.svg (vector, for print).
 */
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import QRCode from 'qrcode';

async function main() {
  const url = process.argv[2];
  if (!url || !/^https?:\/\//.test(url)) {
    console.error('Usage: npm run qr -- https://your-domain.in');
    process.exit(1);
  }
  const dir = resolve('qr');
  mkdirSync(dir, { recursive: true });
  const opts = { errorCorrectionLevel: 'H' as const, margin: 4, color: { dark: '#0b1440', light: '#ffffff' } };
  await QRCode.toFile(resolve(dir, 'contest-qr.png'), url, { ...opts, width: 2000 });
  await QRCode.toFile(resolve(dir, 'contest-qr.svg'), url, { ...opts, type: 'svg' });
  console.log(`QR codes for ${url} saved in ${dir}`);
}

void main();
