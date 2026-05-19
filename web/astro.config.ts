import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

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
  },
});
