// O índice da busca do site, gerado uma vez por build a partir do snapshot.
import { catalog, questions } from '../snapshot';
import { buildSearch, type SearchBuild } from './build';
import { SearchEngine } from './engine';

let built: SearchBuild | null = null;
let engine: SearchEngine | null = null;

export function siteSearch(): SearchBuild {
  return (built ??= buildSearch(questions, catalog));
}

export function siteEngine(): SearchEngine {
  return (engine ??= new SearchEngine(siteSearch().base));
}
