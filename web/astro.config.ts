import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import path from 'node:path';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  trailingSlash: 'never',
  site: 'https://contribkit.app',
  prefetch: {
    prefetchAll: true,
  },
  vite: {
    build: {
      target: 'esnext',
    },
    resolve: {
      alias: {
        '@shared': path.resolve('../shared'),
      },
    },
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
});
