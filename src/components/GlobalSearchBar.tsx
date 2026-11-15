import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Star, ArrowUpRight, CornerDownLeft, Sparkles, SlidersHorizontal } from "lucide-react";
import { Ficha, FichaTipo } from "../types";
import { searchFichasGlobal, HighlightRange, GlobalSearchResult } from "../lib/searchEngine";

interface GlobalSearchBarProps {
  fichas: Ficha[];
  onSelectFicha: (ficha: Ficha) => void;
  onApplyToSidebar?: (query: string) => void;
}

const TIPO_META: Record<FichaTipo, { label: string; plural: string; emoji: string }> = {
  artista: { label: "Artista", plural: "Artistas", emoji: "🎭" },
  movimento: { label: "Movimento", plural: "Movimentos", emoji: "🌊" },
  musica: { label: "Música", plural: "Músicas", emoji: "🎵" },
  instrumento: { label: "Instrumento", plural: "Instr.", emoji: "🎻" },
  roteiro: { label: "Roteiro", plural: "Roteiros", emoji: "🎬" },
};

function HighlightedText({
  text,
  ranges,
  className = "",
}: {
  text: string;
  ranges: HighlightRange[];
  className?: string;
}) {
  if (!ranges || ranges.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, idx) => {
    if (range.start > cursor) {
      parts.push(<span key={`t-${idx}`}>{text.slice(cursor, range.start)}</span>);
    }
    parts.push(
      <mark
        key={`m-${idx}`}
        className="bg-[#c4a35a]/30 text-[#fef3c7] rounded-[3px] px-0.5 font-semibold not-italic"
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(<span key="t-end">{text.slice(cursor)}</span>);
  }

  return <span className={className}>{parts}</span>;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  fichas,
  onSelectFicha,
  onApplyToSidebar,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTipo, setActiveTipo] = useState<"all" | FichaTipo>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Compute all matches across every ficha first (for category counts)
  const allResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchFichasGlobal(fichas, query, "all");
  }, [fichas, query]);

  // Filter by selected category tab inside the search popover
  const visibleResults: GlobalSearchResult[] = useMemo(() => {
    if (activeTipo === "all") return allResults;
    return allResults.filter((r) => r.ficha.tipo === activeTipo);
  }, [allResults, activeTipo]);

  // Category counts for quick filter tabs
  const countsByTipo = useMemo(() => {
    const counts: Record<FichaTipo, number> = {
      artista: 0,
      movimento: 0,
      musica: 0,
      instrumento: 0,
      roteiro: 0,
    };
    for (const r of allResults) {
      counts[r.ficha.tipo] = (counts[r.ficha.tipo] || 0) + 1;
    }
    return counts;
  }, [allResults]);

  // Reset active highlight index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTipo]);

  // Keep selected item scrolled into view during keyboard navigation
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  // Global shortcut: Ctrl+K or Cmd+K focuses global search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (ficha: Ficha) => {
    onSelectFicha(ficha);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setActiveTipo("all");
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen && query.trim()) {
      setIsOpen(true);
    }

    if (visibleResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % visibleResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + visibleResults.length) % visibleResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = visibleResults[selectedIndex];
      if (target) {
        handleSelect(target.ficha);
      }
    }
  };

  const hasQuery = query.trim().length > 0;
  const showDropdown = isOpen && hasQuery;

  return (
    <div ref={containerRef} className="relative w-full md:flex-1 md:max-w-xl z-50">
      {/* Search Input Bar */}
      <div
        className={`relative flex items-center rounded-lg border transition-all duration-200 ${
          isOpen
            ? "bg-zinc-900 border-[#c4a35a] shadow-[0_0_20px_rgba(196,163,90,0.12)]"
            : "bg-zinc-900/70 border-zinc-800/90 hover:border-zinc-700"
        }`}
      >
        <Search
          className={`w-4 h-4 ml-3.5 flex-shrink-0 transition-colors ${
            isOpen || hasQuery ? "text-[#c4a35a]" : "text-zinc-500"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar em todas as fichas (títulos, biografias, obras, análises...)"
          aria-label="Busca global em todas as fichas"
          className="w-full bg-transparent px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none font-sans"
        />

        {/* Right Controls: Match Counter, Clear, or Shortcut Hint */}
        <div className="flex items-center gap-1.5 pr-2.5 flex-shrink-0">
          {hasQuery ? (
            <>
              <span className="hidden sm:inline-flex items-center font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#c4a35a]/15 text-[#ebdcb9] border border-[#c4a35a]/30 font-bold">
                {allResults.length} {allResults.length === 1 ? "ficha" : "fichas"}
              </span>
              <button
                type="button"
                onClick={handleClear}
                title="Limpar busca"
                aria-label="Limpar busca"
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <kbd
              onClick={() => inputRef.current?.focus()}
              className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[9px] text-zinc-500 bg-zinc-950/80 border border-zinc-800 px-1.5 py-0.5 rounded cursor-pointer select-none"
              title="Atalho de teclado: Ctrl+K ou ⌘K"
            >
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>

      {/* Results Popover Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#0d0d10]/98 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden z-[100] flex flex-col max-h-[75vh]">
          {/* Dropdown Header: Summary & Category Filter Tabs */}
          <div className="px-3.5 py-2.5 border-b border-zinc-900 bg-zinc-950/80 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                <Sparkles className="w-3 h-3 text-[#c4a35a]" />
                <span>
                  Busca profunda em{" "}
                  <strong className="text-[#ebdcb9]">{fichas.length}</strong> fichas
                </span>
              </div>

              {onApplyToSidebar && allResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyToSidebar(query.trim());
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold text-[#c4a35a] hover:text-[#ebdcb9] bg-[#c4a35a]/10 hover:bg-[#c4a35a]/20 border border-[#c4a35a]/30 px-2 py-0.5 rounded transition cursor-pointer"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>Filtrar no Histórico</span>
                </button>
              )}
            </div>

            {allResults.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTipo("all")}
                  className={`text-[9px] font-mono uppercase font-bold px-2 py-1 rounded border transition cursor-pointer flex-shrink-0 ${
                    activeTipo === "all"
                      ? "border-[#c4a35a] bg-[#c4a35a]/15 text-[#ebdcb9]"
                      : "border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Todas ({allResults.length})
                </button>

                {(Object.keys(TIPO_META) as FichaTipo[]).map((tipo) => {
                  const count = countsByTipo[tipo];
                  if (count === 0) return null;
                  const meta = TIPO_META[tipo];
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setActiveTipo(tipo)}
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                        activeTipo === tipo
                          ? "border-[#c4a35a] bg-[#c4a35a]/15 text-[#ebdcb9]"
                          : "border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span>{meta.emoji}</span>
                      <span>
                        {meta.plural} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="overflow-y-auto sidebar-scrollable divide-y divide-zinc-900/70">
            {visibleResults.length > 0 ? (
              visibleResults.map((result, idx) => {
                const { ficha, titleHighlights, subtitleHighlights, snippets } = result;
                const meta = TIPO_META[ficha.tipo];
                const isSelected = idx === selectedIndex;

                return (
                  <button
                    key={ficha.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelect(ficha)}
                    className={`w-full text-left px-4 py-3 transition-colors duration-150 cursor-pointer block border-l-2 ${
                      isSelected
                        ? "bg-zinc-900/85 border-[#c4a35a]"
                        : "bg-transparent border-transparent hover:bg-zinc-900/45"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className="mt-0.5 w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs flex-shrink-0"
                          title={meta.label}
                        >
                          {meta.emoji}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif text-sm font-bold text-zinc-100 leading-snug">
                              <HighlightedText text={ficha.titulo} ranges={titleHighlights} />
                            </h4>
                            <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold">
                              {meta.label}
                            </span>
                            {ficha.isFavorite && (
                              <Star className="w-3 h-3 fill-[#c4a35a] text-[#c4a35a] flex-shrink-0" />
                            )}
                          </div>

                          {ficha.subtitulo && (
                            <p className="text-[11px] text-zinc-400 italic font-serif truncate mt-0.5">
                              <HighlightedText
                                text={ficha.subtitulo}
                                ranges={subtitleHighlights}
                              />
                            </p>
                          )}

                          {/* Internal content match snippets */}
                          {snippets.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {snippets.map((s, sIdx) => (
                                <div
                                  key={`${s.fieldKey}-${sIdx}`}
                                  className="text-[11px] leading-relaxed text-zinc-300 bg-zinc-950/75 border border-zinc-800/70 rounded-md px-2.5 py-1.5"
                                >
                                  <span className="inline-block font-mono text-[8.5px] uppercase tracking-wider font-bold text-[#c4a35a] mr-2">
                                    {s.fieldLabel}:
                                  </span>
                                  <HighlightedText
                                    text={s.snippet}
                                    ranges={s.highlights}
                                    className="text-zinc-300 font-sans"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 mt-1 text-zinc-500">
                        {isSelected ? (
                          <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[8.5px] uppercase text-[#c4a35a] font-bold">
                            Abrir
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-6 py-8 text-center space-y-2">
                <Search className="w-6 h-6 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-300 font-medium">
                  Nenhum termo correspondente encontrado para{" "}
                  <span className="text-[#ebdcb9] font-mono">"{query.trim()}"</span>
                </p>
                <p className="text-[11px] text-zinc-500">
                  {fichas.length === 0
                    ? "Você ainda não possui fichas salvas no histórico."
                    : "Tente buscar por nomes de compositores, obras, instrumentos, conceitos teóricos ou períodos."}
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#c4a35a] hover:text-[#ebdcb9] border border-[#c4a35a]/40 px-3 py-1 rounded cursor-pointer transition"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </div>

          {/* Dropdown Footer */}
          {visibleResults.length > 0 && (
            <div className="px-3.5 py-2 border-t border-zinc-900 bg-zinc-950/90 flex items-center justify-between text-[9.5px] font-mono text-zinc-500 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span>↑↓ navegar</span>
                <span>Enter abrir ficha</span>
                <span>Esc fechar</span>
              </div>
              <span>
                Mostrando {visibleResults.length}{" "}
                {visibleResults.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
