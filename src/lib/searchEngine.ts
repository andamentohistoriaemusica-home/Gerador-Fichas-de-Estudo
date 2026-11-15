import { Ficha, FichaTipo } from "../types";

export interface HighlightRange {
  start: number;
  end: number;
}

export interface SearchFieldSnippet {
  fieldKey: string;
  fieldLabel: string;
  snippet: string;
  highlights: HighlightRange[];
}

export interface GlobalSearchResult {
  ficha: Ficha;
  score: number;
  matchedInTitle: boolean;
  matchedInSubtitle: boolean;
  titleHighlights: HighlightRange[];
  subtitleHighlights: HighlightRange[];
  snippets: SearchFieldSnippet[];
  totalMatchedFields: number;
}

const FIELD_LABELS: Record<string, string> = {
  // Artista
  nome: "Nome",
  nome_original: "Nome Original",
  era_badge: "Era / Período",
  nome_completo: "Nome Completo",
  nascimento_morte: "Nascimento / Morte",
  nacionalidade: "Nacionalidade",
  instrumentos: "Instrumentos",
  generos: "Gêneros",
  tagline: "Síntese",
  biografia: "Biografia",
  obras: "Obras",
  analise: "Análise Técnica",
  ganchos: "Ganchos Narrativos",
  influenciou: "Influenciou",
  influenciado_por: "Influenciado por",
  movimento: "Movimento",
  conexoes_inesperadas: "Conexões Inesperadas",
  fontes: "Fontes",

  // Movimento
  periodo: "Período",
  origem: "Origem",
  descricao_geral: "Descrição Geral",
  contexto_historico: "Contexto Histórico",
  caracteristicas: "Características",
  figuras: "Figuras-Chave",
  obras_representativas: "Obras Representativas",
  surgiu_de: "Surgiu de",
  em_paralelo: "Em Paralelo",
  reacao_contra: "Reação Contra",

  // Música
  titulo: "Título",
  artista: "Artista",
  ano: "Ano",
  genero: "Gênero",
  badge: "Selo / Era",
  por_que_pivo: "Por que é Pivô",
  contexto_criacao: "Contexto de Criação",
  analise_musical: "Análise Musical",
  impactos: "Impactos",
  artistas: "Artistas",
  conceitos_teoricos: "Conceitos Teóricos",

  // Roteiro
  formato: "Formato",
  era_genero: "Era / Gênero",
  gancho_30s: "Gancho (30s)",
  tese_central: "Tese Central",
  introducao: "Introdução",
  desenvolvimento: "Desenvolvimento",
  conclusao: "Conclusão",
  pontos_virada: "Pontos de Virada",
  recursos_visuais: "Recursos Visuais",
  titulos_alternativos: "Títulos Alternativos",
  thumbnail_ideia: "Ideia de Thumbnail",

  // Instrumento
  familia: "Família",
  classificacao_sachs_hornbostel: "Sachs-Hornbostel",
  origem_historica: "Origem Histórica",
  construtores_pioneiros: "Construtores Pioneiros",
  funcionamento_acustico: "Funcionamento Acústico",
  caracteristicas_timbristicas: "Características Timbrísticas",
  pioneiros_virtuoses: "Pioneiros e Virtuoses",
  obras_chave: "Obras-Chave",
  tecnicas_expressivas: "Técnicas Expressivas",
  conexoes_historicas: "Conexões Históricas",
};

const TYPE_LABELS: Record<FichaTipo, string> = {
  artista: "Artista",
  movimento: "Movimento",
  musica: "Música",
  roteiro: "Roteiro",
  instrumento: "Instrumento",
};

const IGNORED_KEYS = new Set(["foto_url", "tipo"]);

/**
 * Strips diacritics and lowercases a string, returning both the normalized string
 * and a map from each normalized character index back to the original string index.
 */
function buildNormalizedWithMap(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const stripped = ch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    for (let j = 0; j < stripped.length; j++) {
      norm += stripped[j];
      map.push(i);
    }
  }

  return { norm, map };
}

export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Finds highlight ranges in the original text for all normalized query tokens.
 */
export function findHighlightRanges(text: string, normTokens: string[]): HighlightRange[] {
  if (!text || normTokens.length === 0) return [];
  const { norm, map } = buildNormalizedWithMap(text);
  const rawRanges: HighlightRange[] = [];

  for (const token of normTokens) {
    if (!token) continue;
    let searchFrom = 0;
    while (searchFrom < norm.length) {
      const idx = norm.indexOf(token, searchFrom);
      if (idx === -1) break;
      const origStart = map[idx];
      const lastNormIdx = idx + token.length - 1;
      const origEnd = (map[lastNormIdx] ?? origStart) + 1;
      rawRanges.push({ start: origStart, end: origEnd });
      searchFrom = idx + token.length;
    }
  }

  if (rawRanges.length === 0) return [];

  // Merge overlapping/adjacent ranges
  rawRanges.sort((a, b) => a.start - b.start);
  const merged: HighlightRange[] = [rawRanges[0]];
  for (let i = 1; i < rawRanges.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = rawRanges[i];
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

interface SearchableEntry {
  fieldKey: string;
  fieldLabel: string;
  text: string;
}

function formatObjectEntry(obj: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (IGNORED_KEYS.has(k) || v === null || v === undefined) continue;
    const str = String(v).trim();
    if (str) parts.push(str);
  }
  return parts.join(" — ");
}

/**
 * Flattens all internal fields of a Ficha's data object into searchable text entries.
 */
function extractInternalEntries(ficha: Ficha): SearchableEntry[] {
  const entries: SearchableEntry[] = [];
  const data = ficha.data as unknown as Record<string, any>;

  if (!data || typeof data !== "object") return entries;

  for (const [key, value] of Object.entries(data)) {
    if (IGNORED_KEYS.has(key) || value === null || value === undefined) continue;

    const label = FIELD_LABELS[key] || key.replace(/_/g, " ");

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        entries.push({ fieldKey: key, fieldLabel: label, text: trimmed });
      }
    } else if (Array.isArray(value)) {
      if (value.length === 0) continue;

      if (typeof value[0] === "string") {
        const joined = value
          .map((item) => String(item).trim())
          .filter(Boolean)
          .join(" • ");
        if (joined) {
          entries.push({ fieldKey: key, fieldLabel: label, text: joined });
        }
      } else if (typeof value[0] === "object") {
        for (const item of value) {
          if (item && typeof item === "object") {
            const formatted = formatObjectEntry(item);
            if (formatted) {
              entries.push({ fieldKey: key, fieldLabel: label, text: formatted });
            }
          }
        }
      }
    }
  }

  return entries;
}

/**
 * Creates a clean contextual snippet around the first highlight in `text`,
 * adjusting the highlight ranges to match the sliced snippet string.
 */
function createContextualSnippet(
  text: string,
  highlights: HighlightRange[],
  contextBefore = 42,
  contextAfter = 88
): { snippet: string; highlights: HighlightRange[] } {
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (cleanText.length <= contextBefore + contextAfter + 20) {
    return { snippet: cleanText, highlights };
  }

  const first = highlights[0];
  if (!first) {
    return {
      snippet: cleanText.slice(0, contextBefore + contextAfter) + "…",
      highlights: [],
    };
  }

  let sliceStart = Math.max(0, first.start - contextBefore);
  let sliceEnd = Math.min(cleanText.length, first.end + contextAfter);

  // Snap sliceStart forward to word boundary if truncated
  if (sliceStart > 0) {
    const nextSpace = cleanText.indexOf(" ", sliceStart);
    if (nextSpace !== -1 && nextSpace < first.start - 5) {
      sliceStart = nextSpace + 1;
    }
  }

  // Snap sliceEnd backward to word boundary if truncated
  if (sliceEnd < cleanText.length) {
    const prevSpace = cleanText.lastIndexOf(" ", sliceEnd);
    if (prevSpace !== -1 && prevSpace > first.end + 5) {
      sliceEnd = prevSpace;
    }
  }

  const prefix = sliceStart > 0 ? "…" : "";
  const suffix = sliceEnd < cleanText.length ? "…" : "";
  const rawSlice = cleanText.slice(sliceStart, sliceEnd);
  const offset = prefix.length - sliceStart;

  const adjustedHighlights = highlights
    .map((h) => ({
      start: Math.max(prefix.length, h.start + offset),
      end: Math.min(prefix.length + rawSlice.length, h.end + offset),
    }))
    .filter((h) => h.end > h.start);

  return {
    snippet: `${prefix}${rawSlice}${suffix}`,
    highlights: adjustedHighlights,
  };
}

/**
 * Fast boolean check used for filtering lists (e.g. sidebar) across title, subtitle, and all internal content.
 */
export function fichaMatchesQuery(ficha: Ficha, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const tokens = normalizeSearchText(trimmed).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const combinedParts = [
    ficha.titulo || "",
    ficha.subtitulo || "",
    TYPE_LABELS[ficha.tipo] || ficha.tipo,
    ...extractInternalEntries(ficha).map((e) => e.text),
  ];

  const normalizedCorpus = normalizeSearchText(combinedParts.join(" \n "));
  return tokens.every((token) => normalizedCorpus.includes(token));
}

/**
 * Full-content search across all fichas with relevance scoring and contextual field snippets.
 */
export function searchFichasGlobal(
  fichas: Ficha[],
  query: string,
  tipoFilter: "all" | FichaTipo = "all"
): GlobalSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normPhrase = normalizeSearchText(trimmed);
  const tokens = Array.from(new Set(normPhrase.split(/\s+/).filter(Boolean)));
  if (tokens.length === 0) return [];

  const results: GlobalSearchResult[] = [];

  for (const ficha of fichas) {
    if (tipoFilter !== "all" && ficha.tipo !== tipoFilter) continue;

    const title = ficha.titulo || "";
    const subtitle = ficha.subtitulo || "";
    const typeLabel = TYPE_LABELS[ficha.tipo] || ficha.tipo;
    const internalEntries = extractInternalEntries(ficha);

    const normTitle = normalizeSearchText(title);
    const normSubtitle = normalizeSearchText(subtitle);
    const normType = normalizeSearchText(typeLabel);

    const corpus = [
      normTitle,
      normSubtitle,
      normType,
      ...internalEntries.map((e) => normalizeSearchText(e.text)),
    ].join(" \n ");

    // Must match ALL tokens across the ficha
    const allTokensPresent = tokens.every((t) => corpus.includes(t));
    if (!allTokensPresent) continue;

    let score = 0;

    const titleRanges = findHighlightRanges(title, tokens);
    const subtitleRanges = findHighlightRanges(subtitle, tokens);
    const matchedInTitle = titleRanges.length > 0;
    const matchedInSubtitle = subtitleRanges.length > 0;

    if (normTitle.includes(normPhrase)) score += 120;
    if (matchedInTitle) score += titleRanges.length * 45;

    if (normSubtitle.includes(normPhrase)) score += 75;
    if (matchedInSubtitle) score += subtitleRanges.length * 25;

    if (normType.includes(normPhrase)) score += 20;

    const matchedSnippets: Array<{ score: number; snippetObj: SearchFieldSnippet }> = [];
    const seenFields = new Set<string>();

    for (const entry of internalEntries) {
      const cleanEntryText = entry.text.replace(/\s+/g, " ").trim();
      const normEntry = normalizeSearchText(cleanEntryText);
      const entryTokenHits = tokens.filter((t) => normEntry.includes(t));
      if (entryTokenHits.length === 0) continue;

      const entryRanges = findHighlightRanges(cleanEntryText, entryTokenHits);
      if (entryRanges.length === 0) continue;

      let entryScore = entryTokenHits.length * 15;
      if (normEntry.includes(normPhrase)) entryScore += 40;
      score += entryScore;

      // Avoid showing duplicate field snippets if we already have one for the same fieldKey,
      // unless it's an array of items like obras/analise with different matched items
      const dedupKey = `${entry.fieldKey}:${cleanEntryText.slice(0, 30)}`;
      if (seenFields.has(dedupKey)) continue;
      seenFields.add(dedupKey);

      // Avoid echoing exact title/subtitle again unless nothing else matched
      if (
        (entry.fieldKey === "nome" || entry.fieldKey === "titulo") &&
        normalizeSearchText(cleanEntryText) === normTitle
      ) {
        continue;
      }

      const { snippet, highlights } = createContextualSnippet(cleanEntryText, entryRanges);
      matchedSnippets.push({
        score: entryScore + (entryTokenHits.length === tokens.length ? 30 : 0),
        snippetObj: {
          fieldKey: entry.fieldKey,
          fieldLabel: entry.fieldLabel,
          snippet,
          highlights,
        },
      });
    }

    if (ficha.isFavorite) score += 2;

    matchedSnippets.sort((a, b) => b.score - a.score);

    results.push({
      ficha,
      score,
      matchedInTitle,
      matchedInSubtitle,
      titleHighlights: titleRanges,
      subtitleHighlights: subtitleRanges,
      snippets: matchedSnippets.slice(0, 3).map((m) => m.snippetObj),
      totalMatchedFields: matchedSnippets.length + (matchedInTitle ? 1 : 0) + (matchedInSubtitle ? 1 : 0),
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.ficha.updatedAt ? new Date(a.ficha.updatedAt).getTime() : 0;
    const dateB = b.ficha.updatedAt ? new Date(b.ficha.updatedAt).getTime() : 0;
    return dateB - dateA;
  });

  return results;
}
