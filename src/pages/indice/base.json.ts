// Índice-base da busca (decisão 0006): filtros, facetas e ordem dos resultados.
import type { APIRoute } from 'astro';
import { siteSearch } from '../../lib/search/site';

export const GET: APIRoute = () => new Response(JSON.stringify(siteSearch().base));
