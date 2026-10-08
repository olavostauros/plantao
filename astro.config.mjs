// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serve o site em https://olavostauros.github.io/plantao/.
// Com domínio próprio, troque `site` e remova `base` (ver docs/SPECIFICATION.md §5).
export default defineConfig({
  site: 'https://olavostauros.github.io',
  base: '/plantao',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
