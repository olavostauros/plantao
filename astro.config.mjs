// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages serve o site em https://olavostauros.github.io/plantao/.
// Com domínio próprio, troque `site` e remova `base` (ver docs/SPECIFICATIONS.md §5).
export default defineConfig({
  site: 'https://olavostauros.github.io',
  base: '/plantao',
  output: 'static',
  trailingSlash: 'always',
});
