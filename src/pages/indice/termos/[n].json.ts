// Uma fatia do índice invertido do texto (decisão 0006).
import type { APIRoute, GetStaticPaths } from 'astro';
import { siteSearch } from '../../../lib/search/site';

export const getStaticPaths: GetStaticPaths = () =>
  siteSearch().shards.map((_, n) => ({ params: { n: String(n) } }));

export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(siteSearch().shards[Number(params.n)]));
