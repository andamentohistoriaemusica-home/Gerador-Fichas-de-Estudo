import React, { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Ficha, FichaTipo } from "../types";
import { PieChart as PieChartIcon, Filter, Layers, Check, RefreshCw } from "lucide-react";

interface CategoryPieChartProps {
  fichas: Ficha[];
  activeFilter?: "all" | FichaTipo;
  onSelectCategory?: (tipo: FichaTipo | "all") => void;
  onLoadSamples?: () => void;
}

export const CATEGORY_CONFIG: Record<
  FichaTipo,
  {
    label: string;
    plural: string;
    color: string;
    hoverColor: string;
    bgBadge: string;
    borderBadge: string;
    textBadge: string;
    emoji: string;
  }
> = {
  artista: {
    label: "Artista",
    plural: "Artistas",
    color: "#c4a35a",
    hoverColor: "#dfba6c",
    bgBadge: "bg-[#c4a35a]/10",
    borderBadge: "border-[#c4a35a]/40",
    textBadge: "text-[#ebdcb9]",
    emoji: "🎭",
  },
  movimento: {
    label: "Movimento",
    plural: "Movimentos",
    color: "#3b82f6",
    hoverColor: "#60a5fa",
    bgBadge: "bg-blue-500/10",
    borderBadge: "border-blue-500/40",
    textBadge: "text-blue-300",
    emoji: "🌊",
  },
  musica: {
    label: "Música",
    plural: "Músicas",
    color: "#10b981",
    hoverColor: "#34d399",
    bgBadge: "bg-emerald-500/10",
    borderBadge: "border-emerald-500/40",
    textBadge: "text-emerald-300",
    emoji: "🎵",
  },
  instrumento: {
    label: "Instrumento",
    plural: "Instrumentos",
    color: "#a855f7",
    hoverColor: "#c084fc",
    bgBadge: "bg-purple-500/10",
    borderBadge: "border-purple-500/40",
    textBadge: "text-purple-300",
    emoji: "🎻",
  },
  roteiro: {
    label: "Roteiro",
    plural: "Roteiros",
    color: "#f43f5e",
    hoverColor: "#fb7185",
    bgBadge: "bg-rose-500/10",
    borderBadge: "border-rose-500/40",
    textBadge: "text-rose-300",
    emoji: "🎬",
  },
};

interface SliceData {
  tipo: FichaTipo;
  name: string;
  plural: string;
  value: number;
  percent: number;
  color: string;
  hoverColor: string;
  emoji: string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  fichas,
  activeFilter = "all",
  onSelectCategory,
  onLoadSamples,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredSlice, setHoveredSlice] = useState<SliceData | null>(null);

  // Group and count fichas per category
  const { allCategoriesData, chartData, totalFichas, dominantCategory, activeCategoriesCount } = useMemo(() => {
    const counts: Record<FichaTipo, number> = {
      artista: 0,
      movimento: 0,
      musica: 0,
      instrumento: 0,
      roteiro: 0,
    };

    fichas.forEach((f) => {
      if (counts[f.tipo] !== undefined) {
        counts[f.tipo]++;
      }
    });

    const total = fichas.length;
    const categories: FichaTipo[] = ["artista", "movimento", "musica", "instrumento", "roteiro"];

    const allData: SliceData[] = categories.map((tipo) => {
      const config = CATEGORY_CONFIG[tipo];
      const count = counts[tipo];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        tipo,
        name: config.label,
        plural: config.plural,
        value: count,
        percent,
        color: config.color,
        hoverColor: config.hoverColor,
        emoji: config.emoji,
      };
    });

    const activeChart = allData.filter((d) => d.value > 0);

    // Find dominant category
    let dominant: SliceData | null = null;
    for (const item of allData) {
      if (item.value > 0 && (!dominant || item.value > dominant.value)) {
        dominant = item;
      }
    }

    return {
      allCategoriesData: allData,
      chartData: activeChart,
      totalFichas: total,
      dominantCategory: dominant,
      activeCategoriesCount: activeChart.length,
    };
  }, [fichas]);

  // Handle click on slice or legend
  const handleItemClick = (tipo: FichaTipo) => {
    if (!onSelectCategory) return;
    if (activeFilter === tipo) {
      onSelectCategory("all");
    } else {
      onSelectCategory(tipo);
    }
  };

  if (totalFichas === 0) {
    return (
      <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900/80 text-center select-none space-y-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#c4a35a]/10 border border-[#c4a35a]/30 flex items-center justify-center mx-auto text-[#c4a35a]">
          <PieChartIcon className="w-4 h-4" />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#c4a35a] font-extrabold block">
          Distribuição dos Estudos
        </span>
        <p className="text-[10.5px] text-zinc-400 font-sans leading-relaxed">
          Gere ou salve fichas para visualizar o gráfico de rosca com a composição do seu histórico de estudos.
        </p>
        {onLoadSamples && (
          <button
            type="button"
            onClick={onLoadSamples}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#c4a35a]/15 hover:bg-[#c4a35a]/25 text-[#ebdcb9] border border-[#c4a35a]/40 rounded-lg text-[10px] font-mono font-bold transition duration-150 cursor-pointer shadow-sm hover:border-[#c4a35a]"
          >
            <RefreshCw className="w-3 h-3 text-[#c4a35a]" />
            Carregar Exemplos de Estudo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900/80 space-y-3 flex-shrink-0 transition-all duration-300">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between select-none gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 hover:text-white text-[#ebdcb9] transition cursor-pointer flex-1 text-left outline-none group"
          title={isExpanded ? "Recolher Gráfico de Rosca" : "Expandir Gráfico de Rosca"}
        >
          <PieChartIcon className="w-4 h-4 text-[#c4a35a] group-hover:scale-110 transition-transform duration-200" />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] font-extrabold text-[#c4a35a] group-hover:text-amber-300 transition-colors duration-200">
            Composição dos Estudos
          </span>
          <span className="text-[10px] text-zinc-650 font-bold ml-1">{isExpanded ? "▲" : "▼"}</span>
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {activeFilter !== "all" && onSelectCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory("all")}
              title="Limpar filtro"
              className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[8px] font-mono text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition flex items-center gap-1 cursor-pointer"
            >
              <Filter className="w-2.5 h-2.5 text-[#c4a35a]" />
              Limpar
            </button>
          )}
          <span className="font-mono text-[8px] text-zinc-400 border border-zinc-900/80 px-1.5 py-0.5 rounded bg-zinc-950/90 font-bold select-none">
            {totalFichas} {totalFichas === 1 ? "ficha" : "fichas"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Main Visual: Donut Chart with Dynamic Center Display */}
          <div className="flex items-center gap-2">
            {/* Donut Chart Container */}
            <div className="relative w-[130px] h-[130px] flex-shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as SliceData;
                        return (
                          <div className="bg-zinc-950/95 border border-zinc-800 p-2 rounded-lg shadow-2xl font-mono text-[9.5px] space-y-1 select-none backdrop-blur-md pointer-events-none z-50">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-850">
                              <span>{item.emoji}</span>
                              <span className="font-bold text-zinc-100">{item.plural}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-zinc-400">
                              <span>Quantidade:</span>
                              <span className="font-bold text-zinc-100" style={{ color: item.color }}>
                                {item.value} {item.value === 1 ? "ficha" : "fichas"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-zinc-400">
                              <span>Participação:</span>
                              <span className="font-bold text-[#ebdcb9]">{item.percent}%</span>
                            </div>
                            <p className="text-[7.5px] text-zinc-500 italic pt-0.5">
                              Clique para {activeFilter === item.tipo ? "remover filtro" : "filtrar"}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={chartData.length > 1 ? 3 : 0}
                    stroke="#09090b"
                    strokeWidth={2}
                    cursor="pointer"
                    onMouseEnter={(_, index) => {
                      if (chartData[index]) setHoveredSlice(chartData[index]);
                    }}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onClick={(entry: any) => {
                      if (entry && entry.tipo) handleItemClick(entry.tipo);
                    }}
                  >
                    {chartData.map((entry) => {
                      const isFiltered = activeFilter === entry.tipo;
                      const isHovered = hoveredSlice?.tipo === entry.tipo;
                      return (
                        <Cell
                          key={`cell-${entry.tipo}`}
                          fill={isHovered ? entry.hoverColor : entry.color}
                          opacity={activeFilter === "all" || isFiltered ? 1 : 0.35}
                          style={{
                            outline: isFiltered ? `2px solid ${entry.color}` : "none",
                            transition: "all 0.2s ease",
                          }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none px-2">
                {hoveredSlice ? (
                  <>
                    <span className="text-xs leading-none">{hoveredSlice.emoji}</span>
                    <span className="font-mono font-black text-[13px] text-white leading-tight">
                      {hoveredSlice.percent}%
                    </span>
                    <span className="font-mono text-[7px] text-zinc-400 uppercase tracking-tighter truncate max-w-[50px]">
                      {hoveredSlice.value} {hoveredSlice.value === 1 ? "item" : "itens"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono font-black text-[15px] text-[#ebdcb9] leading-tight">
                      {totalFichas}
                    </span>
                    <span className="font-mono text-[7.5px] uppercase tracking-wider text-zinc-500 font-extrabold">
                      {totalFichas === 1 ? "Ficha" : "Fichas"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Composition Legend / Stats on the Right */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {allCategoriesData.map((item) => {
                const isSelected = activeFilter === item.tipo;
                const isHovered = hoveredSlice?.tipo === item.tipo;

                return (
                  <button
                    key={item.tipo}
                    type="button"
                    onClick={() => handleItemClick(item.tipo)}
                    onMouseEnter={() => setHoveredSlice(item)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    title={`Filtrar por ${item.plural} (${item.value} fichas, ${item.percent}%)`}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-all duration-150 cursor-pointer border ${
                      isSelected
                        ? "bg-zinc-900 border-[#c4a35a] shadow-[0_0_8px_rgba(196,163,90,0.15)] ring-1 ring-[#c4a35a]/50"
                        : isHovered
                        ? "bg-zinc-900/60 border-zinc-700 text-zinc-100"
                        : "bg-zinc-900/30 border-zinc-900/60 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
                        style={{
                          backgroundColor: item.color,
                          transform: isHovered || isSelected ? "scale(1.25)" : "scale(1)",
                        }}
                      />
                      <span className="text-[10px] truncate font-serif font-medium">
                        {item.plural}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[9px]">
                      <span className="font-bold text-zinc-200">{item.value}</span>
                      <span
                        className="text-[8px] px-1 py-0.2 rounded font-bold"
                        style={{
                          backgroundColor: `${item.color}15`,
                          color: item.color,
                        }}
                      >
                        {item.percent}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Insights Bar */}
          <div className="pt-2 border-t border-zinc-900/60 flex items-center justify-between text-[8.5px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <Layers className="w-2.5 h-2.5 text-[#c4a35a]" />
              <span>
                {activeCategoriesCount} de 5 categorias
              </span>
            </span>

            {dominantCategory && (
              <span className="truncate text-zinc-400">
                Foco principal:{" "}
                <strong className="text-[#ebdcb9] font-bold">
                  {dominantCategory.name}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
