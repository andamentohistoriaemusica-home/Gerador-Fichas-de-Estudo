import React, { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Ficha } from "../types";
import { Calendar, Compass, Clock, MapPin, Sparkles, Maximize2 } from "lucide-react";

interface TimelineErasProps {
  fichas: Ficha[];
  activeFicha: Ficha | null;
  onSelectFicha: (ficha: Ficha) => void;
  onOpenFullView?: () => void;
}

interface TimelineItem {
  id: string;
  year: number;
  label: string;
  tipo: string;
  era: string;
  subtitle: string;
  y: number; // for vertical displacement to prevent overlap
  ficha: Ficha;
}

// Robust helper to extract a meaningful numeric representation of year/century from a Ficha's fields
function extractYear(f: Ficha): number {
  const d = f.data as any;
  if (!d) return 1900;

  // 1. Check direct year fields
  if (d.ano) {
    const match = String(d.ano).match(/\b\d{3,4}\b/);
    if (match) return parseInt(match[0], 10);
  }

  // 2. Check birth/death, period or historic origin
  const keysToTest = [
    "nascimento_morte",
    "periodo",
    "origem_historica",
    "era_genero",
    "era_badge",
    "descricao_geral",
  ];

  for (const k of keysToTest) {
    if (d[k] && typeof d[k] === "string") {
      // Find first 3 or 4 digit number
      const match = d[k].match(/\b(1\d{3}|20\d{2}|\d{3})\b/);
      if (match) return parseInt(match[0], 10);
    }
  }

  // 3. Fallback to century matches
  const textRepresentation = JSON.stringify(d).toLowerCase();
  if (textRepresentation.includes("medieval") || textRepresentation.includes("idade média")) return 1100;
  if (textRepresentation.includes("renascimento") || textRepresentation.includes("renascentista")) return 1500;
  if (textRepresentation.includes("barroco")) return 1700;
  if (textRepresentation.includes("classicismo") || textRepresentation.includes("clássico")) return 1780;
  if (textRepresentation.includes("romantismo") || textRepresentation.includes("romântico")) return 1840;
  if (textRepresentation.includes("impressionismo") || textRepresentation.includes("impressionista")) return 1900;
  if (textRepresentation.includes("bossa nova") || textRepresentation.includes("jazz") || textRepresentation.includes("samba")) return 1950;
  if (textRepresentation.includes("século xx") || textRepresentation.includes("seculo xx")) return 1930;
  if (textRepresentation.includes("século xix") || textRepresentation.includes("seculo xix")) return 1850;
  if (textRepresentation.includes("século xviii") || textRepresentation.includes("seculo xviii")) return 1750;
  if (textRepresentation.includes("século xvii") || textRepresentation.includes("seculo xvii")) return 1650;

  // 4. Default stable year mapped to the first word's characters
  const charSum = f.titulo ? f.titulo.charCodeAt(0) : 65;
  return 1800 + (charSum % 150);
}

// Standard beautiful colors for the kinds of sheets
const TYPE_COLORS: Record<string, string> = {
  artista: "#c4a35a",    // Gold
  movimento: "#3b82f6",  // Blue
  musica: "#10b981",     // Emerald
  instrumento: "#a855f7",// Purple
  roteiro: "#f43f5e"     // Rose
};

const TYPE_LABELS: Record<string, string> = {
  artista: "Artista",
  movimento: "Movimento",
  musica: "Música",
  instrumento: "Instrumento",
  roteiro: "Roteiro"
};

export const TimelineEras: React.FC<TimelineErasProps> = ({
  fichas,
  activeFicha,
  onSelectFicha,
  onOpenFullView,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const timelineData = useMemo(() => {
    if (!fichas || fichas.length === 0) return [];

    // Parse and enrich all fichas with their calculated timeline year
    const items: TimelineItem[] = fichas.map((f) => {
      const year = extractYear(f);
      let era = "Outro";
      const d = f.data as any;

      if (f.tipo === "artista") era = d.era_badge || "Estudo de Artista";
      else if (f.tipo === "movimento") era = d.nome || "Estudo de Movimento";
      else if (f.tipo === "musica") era = d.genero || d.badge || "Repertório";
      else if (f.tipo === "roteiro") era = d.era_genero || "Roteirização";
      else if (f.tipo === "instrumento") era = d.familia || "Acústica";

      return {
        id: f.id,
        year,
        label: f.titulo || "Ficha sem título",
        tipo: f.tipo,
        era,
        subtitle: f.subtitulo || "",
        y: 1, // Will assign staggered Y values next to avoid overlapping dots
        ficha: f
      };
    });

    // Sort chronologically
    items.sort((a, b) => a.year - b.year);

    // Stagger algorithm: if items are extremely close in year (< 15 years), increment Y to avoid visual overlapping
    for (let i = 0; i < items.length; i++) {
      let overlapCount = 0;
      for (let j = 0; j < i; j++) {
        if (Math.abs(items[i].year - items[j].year) < 15 && items[i].y === items[j].y) {
          overlapCount++;
          items[i].y = 1 + (overlapCount % 3); // cycles through Y values 1, 2, 3
        }
      }
    }

    return items;
  }, [fichas]);

  // Handle dot or element click on the timeline chart
  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedData = state.activePayload[0].payload as TimelineItem;
      if (clickedData && clickedData.ficha) {
        onSelectFicha(clickedData.ficha);
      }
    }
  };

  if (fichas.length === 0) {
    return (
      <div className="bg-zinc-950/20 p-4 rounded-xl border border-zinc-900/60 text-center select-none space-y-1.5 flex-shrink-0">
        <Clock className="w-5 h-5 text-zinc-750 mx-auto" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Histórico Cronológico</span>
        <p className="text-[10px] text-zinc-500 font-sans">
          Gere ou salve fichas para preencher a linha do tempo das eras musicais automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900/80 space-y-2.5 flex-shrink-0 transition-all duration-300">
      <div className="flex items-center justify-between select-none gap-2">
        <button 
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 hover:text-white text-[#ebdcb9] transition cursor-pointer flex-1 text-left outline-none group"
          title={isExpanded ? "Recolher Linha do Tempo" : "Expandir Linha do Tempo"}
        >
          <Calendar className="w-4 h-4 text-[#c4a35a] group-hover:scale-110 transition-transform duration-200" />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] font-extrabold text-[#c4a35a] group-hover:text-amber-300 transition-colors duration-200">
            Linha do Tempo
          </span>
          <span className="text-[10px] text-zinc-650 font-bold ml-1">{isExpanded ? "▲" : "▼"}</span>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenFullView && (
            <button
              type="button"
              onClick={onOpenFullView}
              title="Abrir em Tela Cheia"
              className="p-1 px-1.5 text-zinc-500 hover:text-[#c4a35a] hover:bg-zinc-900/60 border border-zinc-900 rounded transition cursor-pointer flex items-center justify-center text-[10px] font-mono leading-none gap-1 font-bold"
            >
              <Maximize2 className="w-2.5 h-2.5 text-[#c4a35a]" />
              <span className="text-[8px] uppercase tracking-wider text-zinc-400">Ver</span>
            </button>
          )}
          <span className="font-mono text-[8px] text-zinc-550 border border-zinc-900/50 px-1.5 py-0.5 rounded bg-zinc-950 hover:text-zinc-400 transition select-none">
            {timelineData.length} {timelineData.length === 1 ? "ficha" : "fichas"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Interactive Recharts Area */}
          <div className="h-28 w-full bg-zinc-950/40 rounded-lg p-1.5 border border-zinc-900/30 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={timelineData} 
                onClick={handleChartClick}
                margin={{ top: 15, right: 15, left: 15, bottom: 5 }}
              >
                <XAxis 
                  dataKey="year" 
                  type="number"
                  domain={["dataMin - 30", "dataMax + 30"]}
                  stroke="#52525b"
                  fontSize={8}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={true}
                  tickFormatter={(val) => `${val} DC`}
                />
                <YAxis 
                  domain={[0, 4]} 
                  hide={true} 
                />
                <Tooltip
                  cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TimelineItem;
                      const typeColor = TYPE_COLORS[data.tipo] || "#c4a35a";
                      return (
                        <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded shadow-2xl space-y-1 font-mono text-[9px] max-w-xs select-none">
                          <div className="flex items-center justify-between gap-2.5 pb-1 border-b border-zinc-900/45">
                            <span 
                              className="px-1.5 py-0.5 rounded-sm text-[7px] font-black uppercase text-zinc-950"
                              style={{ backgroundColor: typeColor }}
                            >
                              {TYPE_LABELS[data.tipo] || data.tipo}
                            </span>
                            <span className="text-[#ebdcb9] font-black">{data.year} d.C.</span>
                          </div>
                          <p className="font-serif text-[11px] font-bold text-zinc-100 truncate">{data.label}</p>
                          {data.era && (
                            <p className="text-zinc-520 flex items-center gap-1">
                              <Compass className="w-2.5 h-2.5 text-zinc-550" />
                              <span className="truncate">{data.era}</span>
                            </p>
                          )}
                          <p className="text-[7.5px] text-zinc-600 truncate italic">Clique para focar esta ficha</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  wrapperStyle={{ pointerEvents: "none" }}
                />
                
                {/* Visual horizontal guide timeline */}
                <ReferenceLine y={0.5} stroke="#27272a" strokeWidth={1} />

                {/* Primary connection path line */}
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="#27272a"
                  strokeWidth={1}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const item = payload as TimelineItem;
                    const isSelected = activeFicha?.id === item.id;
                    const baseColor = TYPE_COLORS[item.tipo] || "#c4a35a";
                    
                    return (
                      <g key={item.id} className="cursor-pointer">
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 6 : 4}
                          fill={isSelected ? "#09090b" : baseColor}
                          stroke={baseColor}
                          strokeWidth={isSelected ? 2.5 : 1}
                          className="transition-all duration-300"
                        />
                        {isSelected && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={10}
                            fill="none"
                            stroke={baseColor}
                            strokeWidth={0.5}
                            strokeDasharray="2 2"
                            className="animate-spin-slow"
                          />
                        )}
                      </g>
                    );
                  }}
                  activeDot={{ r: 8, strokeWidth: 1.5, fill: "#ffffff" }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rapid navigation interactive bar list */}
          <div className="space-y-1 max-h-[110px] overflow-y-auto sidebar-scrollable p-1 border border-zinc-900/40 rounded-lg bg-zinc-950/20">
            {timelineData.map((item) => {
              const isSelected = activeFicha?.id === item.id;
              const typeColor = TYPE_COLORS[item.tipo] || "#c4a35a";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectFicha(item.ficha)}
                  className={`w-full flex items-center justify-between p-1.5 rounded transition text-left cursor-pointer select-none group font-mono text-[9px] ${
                    isSelected 
                      ? "bg-purple-950/20 border border-purple-900/30 text-purple-200" 
                      : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span 
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: typeColor }}
                    />
                    <span className="font-sans font-bold text-zinc-300 group-hover:text-[#c4a35a] truncate transition-colors duration-150 text-[10px]">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-2">
                    <span className="text-[7.5px] text-zinc-550 truncate max-w-[65px] h-3 uppercase tracking-wider hidden sm:inline">
                      {item.era}
                    </span>
                    <span className="px-1 py-0.5 rounded bg-zinc-950 text-zinc-500 text-[8px] font-semibold border border-zinc-900 min-w-[42px] text-center">
                      {item.year}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
