import { spawnSync } from 'node:child_process';

const run = filename => {
  const result = spawnSync(process.execPath, [filename], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
};
if (process.env.BLOG_TRANSLATION_AUTO === '1') run('scripts/translate-blog.mjs');
run('scripts/build-blog-discovery.mjs');
