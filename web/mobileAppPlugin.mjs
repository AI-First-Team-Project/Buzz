// 화면 전환 - Android 앱 빌드를 웹 개발 서버와 배포 결과에 연결
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function mobileAppPlugin() {
  const appRoot = fileURLToPath(new URL('../android-app/', import.meta.url));
  let html;

  const buildMobile = () => {
    if (html !== undefined) return html;
    const outDir = mkdtempSync(join(tmpdir(), 'buzz-mobile-build-'));
    execFileSync(process.execPath, [
      join(appRoot, 'node_modules/vite/bin/vite.js'),
      'build', '--outDir', outDir, '--base', './',
    ], {
      cwd: appRoot,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
      windowsHide: true,
    });
    html = readFileSync(join(outDir, 'index.html'), 'utf8');
    return html;
  };

  return {
    name: 'buzz-mobile-app',
    buildStart() {
      buildMobile();
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/mobile/index.html') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(buildMobile());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'mobile/index.html', source: buildMobile() });
    },
  };
}
