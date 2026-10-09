// Um bloco de cartões de resultado: id, número e trecho (decisão 0006).
import type { APIRoute, GetStaticPaths } from 'astro';
import { siteSearch } from '../../../lib/search/site';

export const getStaticPaths: GetStaticPaths = () =>
  siteSearch().blocks.map((_, n) => ({ params: { n: String(n) } }));

export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(siteSearch().blocks[Number(params.n)]));
