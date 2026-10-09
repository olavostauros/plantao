import { useEffect, useRef, useState } from 'preact/hooks';
import { SearchEngine, type BaseIndex, type FacetCounts, type Filters, type ListKey } from '../../lib/search/engine';
import { careerLabel, formatCount, questionsLabel, resultsAnnouncement, typeLabel } from '../../lib/search/labels';
import { blockOf, resultItem, type ResultItem } from '../../lib/search/results';
import { textMask, type Card, type TermShard } from '../../lib/search/text';
import { isEmptyState, parseSearchParams, toSearchParams, type SearchState } from '../../lib/search/url';

// Busca em /questoes/ (ilha Preact). Sem JS, a página mostra as primeiras questões (HTML do build)
// e esconde o formulário. Com JS: estado na URL, índice-base baixado na primeira interação (ou na
// hora, se a URL já tem filtros), fatias do texto e blocos de cartões só quando precisa.

export interface InitialView {
  total: number;
  items: ResultItem[];
  facets: FacetCounts;
}

interface Props {
  /** `import.meta.env.BASE_URL`, com barra no fim. */
  base: string;
  version: string;
  pageSize: number;
  initial: InitialView;
}

interface View extends InitialView {
  shown: number;
}

// --- dados (um por página) ------------------------------------------------------------------

let enginePromise: Promise<SearchEngine> | null = null;
const shards = new Map<number, Promise<TermShard>>();
const blocks = new Map<number, Promise<Card[]>>();

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as T;
}

function cached<T>(cache: Map<number, Promise<T>>, key: number, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key);
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => cache.delete(key)); // nova tentativa baixa de novo
  }
  return p;
}

function loadEngine(base: string, version: string): Promise<SearchEngine> {
  if (!enginePromise) {
    enginePromise = getJson<BaseIndex>(`${base}indice/base.json?v=${version}`).then((ix) => new SearchEngine(ix));
    enginePromise.catch(() => (enginePromise = null));
  }
  return enginePromise;
}

/** A página esconde a lista do build quando a URL já tem filtros (ver questoes/index.astro). */
const reveal = () => document.documentElement.classList.remove('busca-url');

// --- componente -----------------------------------------------------------------------------

const FACET_LIMIT = 8;
const EMPTY: SearchState = { filters: {}, query: '' };

interface Option {
  value: string;
  label: string;
  detail?: string;
  count: number;
}

export function SearchApp({ base, version, pageSize, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<SearchState>(EMPTY);
  const [draft, setDraft] = useState('');
  const [view, setView] = useState<View>({ ...initial, shown: initial.items.length });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [announce, setAnnounce] = useState('');
  const [names, setNames] = useState<BaseIndex | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const seq = useRef(0);
  const last = useRef<{ key: string; ords: number[]; facets: FacetCounts } | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const root = useRef<HTMLDivElement>(null);

  async function run(st: SearchState, shown: number, focusFrom: number | null = null) {
    const id = ++seq.current;
    setStatus('loading');
    try {
      const engine = await loadEngine(base, version);
      setNames(engine.index);
      const key = toSearchParams(st).toString() + '|' + st.query;
      if (last.current?.key !== key) {
        const ix = engine.index;
        const mask = await textMask(st.query, ix.count, ix.term_shards, (n) =>
          cached(shards, n, () => getJson<TermShard>(`${base}indice/termos/${n}.json?v=${version}`)),
        );
        last.current = { key, ords: engine.search(st.filters, mask), facets: engine.facets(st.filters, mask) };
      }
      const { ords, facets } = last.current;
      const visible = ords.slice(0, shown);
      const size = engine.index.block_size;
      const needed = [...new Set(visible.map((o) => blockOf(o, size)))];
      const loaded = await Promise.all(
        needed.map((b) => cached(blocks, b, () => getJson<Card[]>(`${base}indice/blocos/${b}.json?v=${version}`))),
      );
      const byBlock = new Map(needed.map((b, i) => [b, loaded[i]]));
      const items = visible.map((o) => resultItem(engine, o, byBlock.get(blockOf(o, size))![o % size]));
      if (id !== seq.current) return;
      reveal();
      setView({ total: ords.length, items, facets, shown: items.length });
      setStatus('idle');
      if (focusFrom === null) setAnnounce(resultsAnnouncement(ords.length));
      else {
        setAnnounce(`${questionsLabel(items.length - focusFrom)} a mais na lista.`);
        setFocusIndex(focusFrom);
      }
    } catch {
      if (id === seq.current) {
        reveal();
        setStatus('error');
        setAnnounce('Não foi possível carregar a busca.');
      }
    }
  }

  function apply(st: SearchState) {
    setState(st);
    const qs = toSearchParams(st).toString();
    history.replaceState({ shown: pageSize }, '', qs ? `?${qs}` : location.pathname);
    void run(st, pageSize);
  }

  useEffect(() => {
    // Primeira interação com a busca: começa a baixar o índice-base.
    const warm = () => void loadEngine(base, version).catch(() => undefined);
    root.current?.addEventListener('focusin', warm, { once: true });
    root.current?.addEventListener('pointerdown', warm, { once: true });
    setHydrated(true);
    const st = parseSearchParams(new URLSearchParams(location.search));
    setState(st);
    setDraft(st.query);
    const shown = Math.max(pageSize, Number(history.state?.shown) || 0);
    if (!isEmptyState(st) || shown > pageSize) void run(st, shown);
    else reveal();
  }, []);

  useEffect(() => {
    if (focusIndex === null) return;
    list.current?.querySelectorAll<HTMLAnchorElement>('li a')[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex]);

  const toggle = (key: ListKey, value: string) => {
    const cur = state.filters[key] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    const filters = { ...state.filters, [key]: next };
    if (!next.length) delete filters[key];
    apply({ ...state, filters });
  };

  const setYear = (bound: 'from' | 'to', value: string) => {
    const year = { ...state.filters.year };
    if (value) year[bound] = Number(value);
    else delete year[bound];
    const filters: Filters = { ...state.filters, year };
    if (year.from === undefined && year.to === undefined) delete filters.year;
    apply({ ...state, filters });
  };

  const loadMore = () => {
    const from = view.items.length;
    history.replaceState({ shown: from + pageSize }, '', location.href);
    void run(state, from + pageSize, from);
  };

  // Nomes: das facetas atuais; para um valor marcado sem questões, do índice-base.
  const f = view.facets;
  const dictName = (dict: readonly (readonly string[])[] | undefined, value: string, col = 1) =>
    dict?.find((e) => e[0] === value)?.[col] ?? value;
  const topicParent = (path: string) => {
    const parent = path.split('.').slice(0, -1).join('.');
    return names?.topic.find((t) => t[0] === parent)?.[1] ?? f.topic.find((t) => t.path === parent)?.name;
  };

  const groups: { key: ListKey; legend: string; options: Option[] }[] = [
    { key: 'exam_board', legend: 'Banca', options: f.exam_board.map((x) => ({ value: x.slug, label: x.short_name, count: x.count })) },
    { key: 'agency', legend: 'Órgão', options: f.agency.map((x) => ({ value: x.slug, label: x.short_name, detail: x.name !== x.short_name ? x.name : undefined, count: x.count })) },
    { key: 'subject', legend: 'Disciplina', options: f.subject.map((x) => ({ value: x.slug, label: x.name, count: x.count })) },
    { key: 'topic', legend: 'Assunto', options: f.topic.map((x) => ({ value: x.path, label: x.name, detail: topicParent(x.path), count: x.count })) },
    { key: 'position', legend: 'Cargo', options: f.position.map((x) => ({ value: x.slug, label: x.name, count: x.count })) },
    { key: 'career', legend: 'Carreira', options: f.career.map((x) => ({ value: x.value, label: careerLabel(x.value), count: x.count })) },
    { key: 'type', legend: 'Tipo de questão', options: f.type.map((x) => ({ value: x.value, label: typeLabel(x.value), count: x.count })) },
  ];
  const labelOf = (key: ListKey, value: string): string => {
    const opt = groups.find((g) => g.key === key)?.options.find((o) => o.value === value);
    if (opt) return opt.label;
    if (key === 'career') return careerLabel(value);
    if (key === 'type') return typeLabel(value);
    const dict = names?.[key];
    return dict ? dictName(dict, value, key === 'exam_board' || key === 'agency' ? 2 : 1) : value;
  };

  const chips: { label: string; remove: () => void }[] = [];
  for (const g of groups)
    for (const v of state.filters[g.key] ?? [])
      chips.push({ label: `${g.legend}: ${labelOf(g.key, v)}`, remove: () => toggle(g.key, v) });
  const year = state.filters.year;
  if (year) chips.push({ label: yearLabel(year), remove: () => apply({ ...state, filters: { ...state.filters, year: undefined } }) });
  if (state.filters.include_annulled)
    chips.push({ label: 'Com anuladas', remove: () => apply({ ...state, filters: { ...state.filters, include_annulled: undefined } }) });
  if (state.query.trim()) chips.push({ label: `Texto: ${state.query.trim()}`, remove: () => (setDraft(''), apply({ ...state, query: '' })) });

  const years = [...new Set([...f.year.map((y) => y.value), ...(year?.from ? [year.from] : []), ...(year?.to ? [year.to] : [])])].sort((a, b) => b - a);
  const activeCount = chips.length - (state.query.trim() ? 1 : 0);
  const remaining = view.total - view.items.length;

  return (
    <div ref={root}>
      <form
        role="search"
        aria-label="Buscar questões"
        id="busca-form"
        class="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ ...state, query: draft });
        }}
      >
        <label for="busca-texto" class="mb-1 block font-semibold">
          Buscar no texto das questões
        </label>
        <div class="flex flex-wrap gap-2">
          <input
            id="busca-texto"
            type="search"
            name="q"
            value={draft}
            onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
            enterKeyHint="search"
            autocomplete="off"
            aria-describedby="busca-dica"
            class="min-h-11 min-w-0 flex-1 basis-48 rounded-lg border-2 border-line bg-bg px-3 text-fg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
          />
          <button
            type="submit"
            class="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-fg bg-fg px-4 font-semibold text-bg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            Buscar
          </button>
        </div>
        <p id="busca-dica" class="mt-1 mb-0 text-base text-muted">
          Acentos e maiúsculas não fazem diferença. Use aspas para a frase exata, como{' '}
          "prisão em flagrante", e um traço para tirar uma palavra, como{' '}
          <span class="whitespace-nowrap">-furto</span>.
        </p>

        <details class="mt-4 rounded-lg border-2 border-line">
          <summary class="flex min-h-11 cursor-pointer items-center px-3 font-semibold">
            Filtros{activeCount > 0 && ` (${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'})`}
          </summary>
          <div class="px-3 pb-3">
            {groups.map((g) => (
              <FacetGroup
                key={g.key}
                name={g.key}
                legend={g.legend}
                options={withSelected(g.options, state.filters[g.key] ?? [], (v) => labelOf(g.key, v))}
                selected={state.filters[g.key] ?? []}
                onToggle={(v) => toggle(g.key, v)}
              />
            ))}
            <fieldset class="mt-4 min-w-0">
              <legend class="mb-1 font-semibold">Ano da prova</legend>
              <div class="flex flex-wrap gap-3">
                {(['from', 'to'] as const).map((bound) => (
                  <label key={bound} class="flex min-h-11 max-w-full min-w-0 flex-wrap items-center gap-x-2">
                    {bound === 'from' ? 'De' : 'Até'}
                    <select
                      value={year?.[bound] ?? ''}
                      onChange={(e) => setYear(bound, (e.target as HTMLSelectElement).value)}
                      class="min-h-11 max-w-full min-w-0 rounded-lg border-2 border-line bg-bg px-2 text-fg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
                    >
                      <option value="">Qualquer</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>
            <label class="mt-4 flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={!!state.filters.include_annulled}
                onChange={() => apply({ ...state, filters: { ...state.filters, include_annulled: state.filters.include_annulled ? undefined : true } })}
                class="size-5 shrink-0 accent-fg"
              />
              Incluir questões anuladas
            </label>
            <a
              href="#resultados"
              class="mt-4 inline-flex min-h-11 items-center font-semibold text-fg underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              {view.total === 0 ? 'Ver o resultado' : view.total === 1 ? 'Ver a questão' : `Ver as ${questionsLabel(view.total)}`}
            </a>
          </div>
        </details>
      </form>

      {hydrated && chips.length > 0 && (
        <div class="mb-4">
          <h2 class="sr-only">Filtros escolhidos</h2>
          <ul class="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.label}>
                <button
                  type="button"
                  onClick={c.remove}
                  aria-label={`Tirar ${c.label}`}
                  class="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border-2 border-line px-3 text-left text-base focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
                >
                  <span class="min-w-0 break-words">{c.label}</span>
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => (setDraft(''), apply(EMPTY))}
                class="inline-flex min-h-11 items-center px-3 text-base font-semibold underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                Limpar tudo
              </button>
            </li>
          </ul>
        </div>
      )}

      <section id="lista" aria-labelledby="resultados" aria-busy={status === 'loading'}>
        <h2 id="resultados" tabIndex={-1} class="mb-2 scroll-mt-4 text-xl font-bold">
          {status === 'loading' && view.items.length === 0 ? 'Carregando…' : questionsLabel(view.total)}
        </h2>
        <p role="status" aria-live="polite" aria-atomic="true" class="sr-only">
          {announce}
        </p>
        {status === 'loading' && <p class="m-0 mb-2 text-muted">Carregando a busca…</p>}
        {status === 'error' && (
          <div class="mb-4 rounded-lg border-2 border-bad px-3 py-2">
            <p class="m-0">Não foi possível carregar a busca. Confira a internet e tente de novo.</p>
            <button
              type="button"
              onClick={() => void run(state, Math.max(pageSize, view.items.length))}
              class="mt-2 inline-flex min-h-11 items-center rounded-lg border-2 border-fg px-4 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              Tentar de novo
            </button>
          </div>
        )}
        {view.total === 0 && status === 'idle' && (
          <p>Nenhuma questão com esses filtros. Tire algum filtro ou busque outras palavras.</p>
        )}
        <ol ref={list} class="m-0 list-none p-0">
          {view.items.map((item) => (
            <ResultCard key={item.id} item={item} base={base} />
          ))}
        </ol>
        {remaining > 0 && (
          <button
            type="button"
            onClick={loadMore}
            disabled={status === 'loading'}
            data-js-only
            class="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-fg px-4 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-60"
          >
            Mostrar mais {formatCount(Math.min(pageSize, remaining))} de {questionsLabel(remaining)}
          </button>
        )}
      </section>
    </div>
  );
}

function yearLabel({ from, to }: NonNullable<Filters['year']>): string {
  if (from !== undefined && from === to) return `Ano: ${from}`;
  if (from !== undefined && to !== undefined) return `Ano: ${from} a ${to}`;
  return from !== undefined ? `Ano: de ${from} em diante` : `Ano: até ${to}`;
}

/** Valores marcados aparecem mesmo sem questões (contagem 0), para poder desmarcar. */
function withSelected(options: Option[], selected: string[], label: (v: string) => string): Option[] {
  const missing = selected.filter((v) => !options.some((o) => o.value === v));
  return [...missing.map((v) => ({ value: v, label: label(v), count: 0 })), ...options];
}

function FacetGroup(props: {
  name: string;
  legend: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const { name, legend, options, selected, onToggle } = props;
  const [all, setAll] = useState(false);
  if (options.length === 0) return null;
  // Marcados primeiro não reordena a lista ao clicar: a ordem é a das facetas, que não muda
  // quando se marca um valor da própria faceta (contagem disjuntiva).
  const shown = all ? options : options.filter((o, i) => i < FACET_LIMIT || selected.includes(o.value));
  return (
    <fieldset class="mt-4 min-w-0">
      <legend class="mb-1 font-semibold">{legend}</legend>
      <ul class="m-0 list-none p-0">
        {shown.map((o) => {
          const id = `f-${name}-${o.value}`.replace(/[^A-Za-z0-9_-]/g, '_');
          return (
            <li key={o.value}>
              <label for={id} class="flex min-h-11 items-center gap-3 py-1">
                <input
                  id={id}
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => onToggle(o.value)}
                  class="size-5 shrink-0 accent-fg"
                />
                <span class="min-w-0 break-words">
                  {o.label}
                  {o.detail && <span class="block text-base text-muted">{o.detail}</span>}
                </span>
                <span class="ml-auto shrink-0 text-base text-muted" aria-hidden="true">
                  {formatCount(o.count)}
                </span>
                <span class="sr-only">, {questionsLabel(o.count)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {options.length > FACET_LIMIT && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          aria-expanded={all}
          class="mt-1 inline-flex min-h-11 items-center font-semibold underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          {all ? `Mostrar menos` : `Mostrar todos (${formatCount(options.length)})`}
        </button>
      )}
    </fieldset>
  );
}

export function ResultCard({ item, base }: { item: ResultItem; base: string }) {
  return (
    <li class="border-b border-line py-4 first:pt-0">
      <h3 class="m-0 text-lg font-bold">
        <a href={`${base}questao/${item.id}/`} class="text-fg underline underline-offset-2">
          Questão {item.number} · {item.exam_name}
        </a>
      </h3>
      <p class="m-0 mt-1 text-base text-muted">
        {item.exam_board} · {item.agency} · {item.year} · {item.subject} · {typeLabel(item.type)}
        {item.annulled && (
          <>
            {' · '}
            <strong class="font-semibold text-bad">Anulada</strong>
          </>
        )}
      </p>
      <p class="m-0 mt-2 break-words">{item.excerpt}</p>
    </li>
  );
}
