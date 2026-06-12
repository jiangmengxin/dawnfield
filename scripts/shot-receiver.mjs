// 临时截图接收器（Agent 自动化验证用）：接收 base64 JPEG → 落盘 .shots/
// 用法：node scripts/shot-receiver.mjs  → POST http://localhost:5199/shot?name=xxx
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.shots');
mkdirSync(dir, { recursive: true });

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const name = new URL(req.url, 'http://x').searchParams.get('name') ?? 'shot';
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const b64 = body.replace(/^data:image\/\w+;base64,/, '');
    const file = join(dir, name.replace(/[^\w-]/g, '_') + '.jpg');
    writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log('saved', file, Math.round(b64.length / 1024) + 'KB');
    res.end('ok');
  });
}).listen(5199, () => console.log('shot receiver on :5199'));
