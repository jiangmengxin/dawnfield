import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// 开发期截图落盘：页面 POST base64 到 /__shot?name=xxx → .shots/xxx.jpg
// （预览面板 hidden 时浏览器截图工具不可用，用 renderer.snapshot + 此通道验证视觉）
function shotSink(): Plugin {
  return {
    name: 'shot-sink',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        let body = '';
        req.on('data', (c: Buffer) => { body += c.toString(); });
        req.on('end', () => {
          try {
            const url = new URL(req.url ?? '/', 'http://x');
            const name = (url.searchParams.get('name') ?? 'shot').replace(/[^\w-]/g, '');
            const b64 = body.replace(/^data:image\/\w+;base64,/, '');
            const dir = path.resolve(__dirname, '.shots');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, name + '.jpg'), Buffer.from(b64, 'base64'));
            res.end('ok');
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5183,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
  plugins: [shotSink()],
});
