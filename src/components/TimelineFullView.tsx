import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ficha, FichaTipo } from "../types";
import { 
  X, 
  Calendar, 
  Search, 
  Sparkles, 
  Star, 
  Compass, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Cpu, 
  BarChart3, 
  HelpCircle, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  ArrowUpDown
} from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ZAxis } from "recharts";

interface TimelineFullViewProps {
  isOpen: boolean;
  onClose: () => void;
  fichas: Ficha[];
  activeFicha: Ficha | null;
  onSelectFicha: (ficha: Ficha) => void;
}

type VisualMode = "stream" | "centuries" | "eras" | "density";

const TYPE_COLORS: Record<string, { base: string; border: string; bg: string; text: string; label: string }> = {
  artista: {
    base: "#c4a35a",
    border: "border-[#c4a35a]/40",
    bg: "bg-[#c4a35a]/10",
    text: "text-[#ebdcb9]",
    label: "Artista 🎭"
  },
  movimento: {
    base: "#3b82f6",
    border: "border-blue-500/40",
    bg: "bg-blue-500/10",
    text: "text-blue-300",
    label: "Movimento 🌊"
  },
  musica: {
    base: "#10b981",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    label: "Música 🎵"
  },
  instrumento: {
    base: "#a855f7",
    border: "border-purple-500/40",
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    label: "Instrumento 🎻"
  },
  roteiro: {
    base: "#f43f5e",
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    label: "Roteiro 🎬"
  }
};

// Year extraction helper matching sidebar behaviour
function getFichaYear(f: Ficha): number {
  const d = f.data as any;
  if (!d) return 1900;

  if (d.ano) {
    const match = String(d.ano).match(/\b\d{3,4}\b/);
    if (match) return parseInt(match[0], 10);
  }

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
      const match = d[k].match(/\b(1\d{3}|20\d{2}|\d{3})\b/);
      if (match) return parseInt(match[0], 10);
    }
  }

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

  const charSum = f.titulo ? f.titulo.charCodeAt(0) : 65;
  return 1800 + (charSum % 150);
}

// Map century for a given year
function getCentury(year: number): string {
  if (year < 500) return "Séc. V ou antes";
  if (year >= 500 && year < 1000) return "Idade Média (Séc. V-X)";
  if (year >= 1000 && year < 1400) return "Séc. XI - XIII (Medieval)";
  if (year >= 1400 && year < 1500) return "Séc. XV (Pré-Renascença)";
  if (year >= 1500 && year < 1600) return "Séc. XVI (Renascimento)";
  if (year >= 1600 && year < 1700) return "Séc. XVII (Barroco Inicial/Médio)";
  if (year >= 1700 && year < 1800) return "Séc. XVIII (Barroco Tardio / Clássico)";
  if (year >= 1800 && year < 1900) return "Séc. XIX (Romantismo)";
  if (year >= 1900 && year < 2000) return "Séc. XX (Modernismo a Contemporâneo)";
  return "Séc. XXI (Contemporâneo)";
}

// Map musical era based on year and metadata text
function getMusicalEra(f: Ficha, year: number): string {
  const d = f.data as any;
  const contentStr = (f.titulo + " " + f.subtitulo + " " + JSON.stringify(d)).toLowerCase();

  if (contentStr.includes("medieval") || contentStr.includes("gregoriano") || contentStr.includes("ars nova") || year < 1450) {
    return "Medieval 📜 (Até 1450)";
  }
  if (contentStr.includes("renascimento") || contentStr.includes("renascentista") || contentStr.includes("madrigal") || (year >= 1450 && year < 1600)) {
    return "Renascença 🎨 (1450 - 1600)";
  }
  if (contentStr.includes("barroco") || contentStr.includes("bach") || contentStr.includes("vivaldi") || contentStr.includes("fuga") || (year >= 1600 && year < 1750)) {
    return "Barroco 🎻 (1600 - 1750)";
  }
  if (contentStr.includes("clássico") || contentStr.includes("classicismo") || contentStr.includes("mozart") || contentStr.includes("beethoven") || (year >= 1750 && year < 1820)) {
    return "Classicismo 🏛️ (1750 - 1820)";
  }
  if (contentStr.includes("romântico") || contentStr.includes("romantismo") || contentStr.includes("chopin") || contentStr.includes("liszt") || (year >= 1820 && year < 1900)) {
    return "Romantismo 🌹 (1820 - 1900)";
  }
  if (contentStr.includes("jazz") || contentStr.includes("bossa") || contentStr.includes("reggae") || contentStr.includes("rock") || contentStr.includes("pop") || contentStr.includes("moderno") || (year >= 1900 && year < 1960)) {
    return "Séc. XX & Gêneros Modernos 🎷 (1900 - 1960)";
  }
  return "Contemporâneo / Vanguarda 🚀 (1960 - Presente)";
}

export const TimelineFullView: React.FC<TimelineFullViewProps> = ({
  isOpen,
  onClose,
  fichas,
  onSelectFicha,
  activeFicha,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<FichaTipo | "all">("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [visualMode, setVisualMode] = useState<VisualMode>("stream");
  const [hoveredFicha, setHoveredFicha] = useState<Ficha | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Parse items with year and specific metadata
  const timelineItems = useMemo(() => {
    const items = fichas.map((f) => {
      const year = getFichaYear(f);
      const century = getCentury(year);
      const musicalEra = getMusicalEra(f, year);
      
      let eraDetail = "Ficha de Estudos";
      const d = f.data as any;
      if (f.tipo === "artista") eraDetail = d.era_badge || "Estudo de Artista";
      else if (f.tipo === "movimento") eraDetail = d.nome || "Estudo de Movimento";
      else if (f.tipo === "musica") eraDetail = d.genero || d.badge || "Repertório";
      else if (f.tipo === "roteiro") eraDetail = d.era_genero || "Roteirização";
      else if (f.tipo === "instrumento") eraDetail = d.familia || "Acústica";

      return {
        ficha: f,
        year,
        century,
        musicalEra,
        eraDetail,
        tipo: f.tipo,
        titulo: f.titulo || "Ficha sem título",
        subtitulo: f.subtitulo || "",
        isFavorite: !!f.isFavorite
      };
    });
    return items.sort((a, b) => sortOrder === "asc" ? a.year - b.year : b.year - a.year);
  }, [fichas, sortOrder]);

  // Combined Filters
  const filteredItems = useMemo(() => {
    return timelineItems.filter((item) => {
      const matchesSearch = 
        item.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.subtitulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.century.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.musicalEra.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === "all" || item.tipo === selectedType;
      const matchesFavorite = !onlyFavorites || item.isFavorite;

      return matchesSearch && matchesType && matchesFavorite;
    });
  }, [timelineItems, searchQuery, selectedType, onlyFavorites]);

  // Group by Century
  const itemsByCentury = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.century]) groups[item.century] = [];
      groups[item.century].push(item);
    });
    return Object.entries(groups).sort((a, b) => {
      // Sort centuries roughly based on typical years
      const yearA = a[1][0]?.year || 0;
      const yearB = b[1][0]?.year || 0;
      return sortOrder === "asc" ? yearA - yearB : yearB - yearA;
    });
  }, [filteredItems, sortOrder]);

  // Group by Musical Era Period
  const itemsByMusicalEra = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.musicalEra]) groups[item.musicalEra] = [];
      groups[item.musicalEra].push(item);
    });
    const order = [
      "Medieval 📜 (Até 1450)",
      "Renascença 🎨 (1450 - 1600)",
      "Barroco 🎻 (1600 - 1750)",
      "Classicismo 🏛️ (1750 - 1820)",
      "Romantismo 🌹 (1820 - 1900)",
      "Séc. XX & Gêneros Modernos 🎷 (1900 - 1960)",
      "Contemporâneo / Vanguarda 🚀 (1960 - Presente)"
    ];
    return Object.entries(groups).sort((a, b) => {
      const idxA = order.indexOf(a[0]);
      const idxB = order.indexOf(b[0]);
      return sortOrder === "asc" ? idxA - idxB : idxB - idxA;
    });
  }, [filteredItems, sortOrder]);

  // Density scatter chart coordinates
  const scatterChartData = useMemo(() => {
    return filteredItems.map((item, index) => {
      // Y displacement based on type to separate them clearly
      let yVal = 1;
      if (item.tipo === "artista") yVal = 4;
      else if (item.tipo === "movimento") yVal = 3;
      else if (item.tipo === "musica") yVal = 2;
      else if (item.tipo === "instrumento") yVal = 1;
      else if (item.tipo === "roteiro") yVal = 0;

      return {
        x: item.year,
        y: yVal + (index % 3) * 0.15 - 0.15, // slight jitter to avoid exact overlap
        z: 10,
        name: item.titulo,
        year: item.year,
        tipo: item.tipo,
        era: item.eraDetail,
        item: item
      };
    });
  }, [filteredItems]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-4 md:p-6 select-none">
        
        {/* Main interactive window container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full h-full max-w-7xl max-h-[850px] bg-zinc-900/90 border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative text-left"
        >
          
          {/* Header Bar */}
          <div className="p-5 border-b border-zinc-800/85 bg-zinc-950/45 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c4a35a]/20 to-purple-950/40 border border-[#c4a35a]/30 flex items-center justify-center shadow">
                <Calendar className="w-5 h-5 text-[#c4a35a] animate-pulse" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <span>Cronologia Histórica & Mapa de Eras</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#c4a35a]/10 text-[#ebdcb9] border border-[#c4a35a]/25 tracking-wider">
                    Modo Avançado
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Explore e isole a densidade temporal das suas fichas de história da música.
                </p>
              </div>
            </div>

            {/* Close button with escape warning */}
            <button 
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 md:static p-2 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl border border-transparent hover:border-zinc-800 transition cursor-pointer flex items-center justify-center"
              title="Fechar Linha do Tempo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filtering Tools Dashboard */}
          <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3.5 flex-shrink-0">
            
            {/* Search Input Filter */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, século, era..." 
                className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs pl-9 pr-4 py-2.5 outline-none rounded-xl focus:border-[#c4a35a] focus:ring-1 focus:ring-[#c4a35a]/25 text-zinc-200 transition"
              />
            </div>

            {/* Type Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 w-full md:w-auto max-w-full">
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold hidden lg:inline mr-1">Tópico:</span>
              <button 
                onClick={() => setSelectedType("all")}
                className={`text-[9px] font-mono px-3 py-1.5 rounded-lg border uppercase tracking-wider font-extrabold cursor-pointer transition flex-shrink-0 ${
                  selectedType === "all" 
                    ? "bg-zinc-100 border-zinc-100 text-zinc-950" 
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                Todos ({fichas.length})
              </button>
              {(["artista", "movimento", "musica", "instrumento", "roteiro"] as const).map(tipo => {
                const isSelected = selectedType === tipo;
                const config = TYPE_COLORS[tipo];
                const count = fichas.filter(f => f.tipo === tipo).length;
                return (
                  <button
                    key={tipo}
                    onClick={() => setSelectedType(tipo)}
                    className={`text-[9.5px] font-mono px-2.5 py-1.5 rounded-lg border uppercase tracking-wider font-extrabold cursor-pointer transition flex items-center gap-1 flex-shrink-0 ${
                      isSelected 
                        ? `${config.border} ${config.bg} ${config.text} ring-1 ring-${config.base}/20`
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span>{config.label.split(" ")[0]}</span>
                    <span className="text-[7.5px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Right side actions - beautifully aligned and wrapped to prevent overlap */}
            <div className="flex items-center flex-wrap md:flex-nowrap gap-2.5 justify-end w-full md:w-auto">
              
              {/* Order toggler (Crescente / Decrescente) */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1 flex-shrink-0">
                <button
                  onClick={() => setSortOrder("asc")}
                  title="Ordem Cronológica Crescente (Antigo para Recente)"
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold cursor-pointer transition flex items-center gap-1 ${
                    sortOrder === "asc"
                      ? "bg-[#c4a35a]/10 border border-[#c4a35a]/30 text-[#ebdcb9]"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3 text-[#c4a35a]/80" />
                  <span>Crescente ⬆️</span>
                </button>
                <button
                  onClick={() => setSortOrder("desc")}
                  title="Ordem Cronológica Decrescente (Recente para Antigo)"
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold cursor-pointer transition flex items-center gap-1 ${
                    sortOrder === "desc"
                      ? "bg-[#c4a35a]/10 border border-[#c4a35a]/30 text-[#ebdcb9]"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3 text-[#c4a35a]/80" />
                  <span>Decrescente ⬇️</span>
                </button>
              </div>

              {/* Favorites filter toggle button with strict overflow safety */}
              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-mono uppercase tracking-wider font-extrabold cursor-pointer transition flex-shrink-0 ${
                  onlyFavorites 
                    ? "border-[#c4a35a] bg-[#c4a35a]/20 text-[#ebdcb9]" 
                    : "border-[#c4a35a]/20 bg-zinc-900/60 text-[#c4a35a] hover:bg-zinc-900 hover:text-zinc-200 hover:border-[#ebdcb9]/40"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-[#c4a35a] text-[#c4a35a]" : ""}`} />
                <span>Favoritas</span>
              </button>

              <div className="h-9 w-px bg-zinc-850 hidden lg:block" />

              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1 flex-shrink-0">
                {[
                  { id: "stream", label: "Fluxo", title: "Fluxo Cronológico" },
                  { id: "centuries", label: "Séculos", title: "Matriz de Séculos" },
                  { id: "eras", label: "Eras", title: "Tabela de Períodos" },
                  { id: "density", label: "Dispersão", title: "Gráfico de Dispersão" }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setVisualMode(mode.id as VisualMode)}
                    title={mode.title}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold cursor-pointer transition ${
                      visualMode === mode.id 
                        ? "bg-purple-950/40 text-purple-300 border border-purple-900/40" 
                        : "text-zinc-500 hover:text-zinc-350 border border-transparent"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Visualization Canvas Workspace */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
            
            {/* Left side: Render active screen based on visualMode */}
            <div className="flex-1 overflow-y-auto sidebar-scrollable p-5 bg-gradient-to-b from-transparent to-zinc-950/20">
              
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <span className="text-3xl">🏜️</span>
                  <h4 className="font-serif text-sm font-bold text-zinc-300">Nenhum estudo histórico atende aos filtros atuais</h4>
                  <p className="text-xs text-zinc-500 max-w-md leading-relaxed font-sans">
                    Refine seus termos de busca livre ou filtre por outros tópicos de estudo para reordenar a linha do tempo.
                  </p>
                  <button 
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("all");
                      setOnlyFavorites(false);
                    }}
                    className="mt-2 text-xs font-mono font-bold text-[#c4a35a] hover:text-[#ebdcb9] underline cursor-pointer"
                  >
                    Restaurar Todos os Filtros
                  </button>
                </div>
              ) : (
                <>
                  {/* MODE 1: CHRONOLOGICAL STREAM */}
                  {visualMode === "stream" && (
                    <div className="relative pl-6 md:pl-12 py-4 space-y-8">
                      {/* Vertical line tracker helper */}
                      <div className="absolute left-[13px] md:left-[35px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#c4a35a]/40 via-purple-900/30 to-zinc-800/10" />

                      {filteredItems.map((item, index) => {
                        const config = TYPE_COLORS[item.tipo];
                        const isFocused = activeFicha?.id === item.ficha.id;
                        
                        return (
                          <motion.div 
                            key={item.ficha.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.4) }}
                            className={`relative group flex gap-4 md:gap-6 ${
                              isFocused ? "scale-[1.01]" : ""
                            }`}
                          >
                            {/* Chronology Badge Bubble */}
                            <div className="absolute -left-[27px] md:-left-[49px] top-1.5 flex items-center justify-center z-10 transition-all duration-300">
                              <div 
                                onClick={() => {
                                  onSelectFicha(item.ficha);
                                }}
                                className={`w-7 h-7 md:w-10 md:h-10 rounded-full border flex flex-col items-center justify-center cursor-pointer transition ${
                                  isFocused 
                                    ? "bg-zinc-950 border-[#c4a35a] shadow-[0_0_12px_rgba(196,163,90,0.35)] scale-110" 
                                    : "bg-zinc-900 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-850"
                                }`}
                              >
                                <span className={`text-[8px] md:text-[9.5px] font-mono font-black ${isFocused ? "text-[#c4a35a]" : "text-zinc-400"}`}>
                                  {item.year <= 1000 ? `${item.year}` : String(item.year)}
                                </span>
                                <span className="text-[6px] text-zinc-550 font-sans tracking-tighter uppercase leading-none font-bold">d.C.</span>
                              </div>
                            </div>

                            {/* Stream Event Card */}
                            <div 
                              onClick={() => {
                                onSelectFicha(item.ficha);
                              }}
                              onMouseEnter={() => setHoveredFicha(item.ficha)}
                              className={`flex-1 p-4 rounded-xl border bg-zinc-900/40 hover:bg-zinc-900/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative group ${
                                isFocused 
                                  ? "border-l-4 border-l-[#c4a35a] border-zinc-800/90 shadow-[inset_6px_0_0_rgba(196,163,90,0.05)] bg-[#c4a35a]/5" 
                                  : "border-zinc-850 hover:border-zinc-800"
                              }`}
                            >
                              <div className="space-y-1 pr-6 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded-sm text-[7.5px] font-mono tracking-wider font-extrabold uppercase ${config.bg} ${config.text} border ${config.border}`}>
                                    {config.label}
                                  </span>
                                  <span className="font-mono text-[7px] text-purple-300 font-extrabold bg-purple-950/20 px-1.5 py-0.5 rounded border border-purple-900/35">
                                    {item.century}
                                  </span>
                                </div>
                                <h4 className="font-serif text-[14.5px] font-bold text-zinc-100 group-hover:text-[#c4a35a] transition duration-200 mt-1">
                                  {item.titulo}
                                </h4>
                                <p className="text-xs text-zinc-400 font-serif italic line-clamp-1">
                                  {item.subtitulo}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right hidden sm:block">
                                  <span className="font-mono text-[8px] text-zinc-550 uppercase tracking-widest font-black block">Estilo Musical</span>
                                  <span className="font-sans font-bold text-zinc-300 text-[11px] truncate block max-w-[150px]">
                                    {item.eraDetail}
                                  </span>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-[#c4a35a] group-hover:border-[#c4a35a]/40 transition">
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* MODE 2: CENTURY MATRIX GRID */}
                  {visualMode === "centuries" && (
                    <div className="space-y-6">
                      {itemsByCentury.map(([centuryName, entries], idx) => (
                        <div key={centuryName} className="space-y-3 bg-zinc-950/25 p-4 rounded-xl border border-zinc-900/40">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-1.5">
                            <span className="font-serif text-sm font-bold text-[#ebdcb9] flex items-center gap-2">
                              <span>🏛️ {centuryName}</span>
                            </span>
                            <span className="font-mono text-[8.5px] text-zinc-500 px-2 py-0.5 rounded border border-zinc-900 bg-zinc-950 font-bold">
                              {entries.length} {entries.length === 1 ? "tópico" : "tópicos"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {entries.map((item) => {
                              const config = TYPE_COLORS[item.tipo];
                              const isFocused = activeFicha?.id === item.ficha.id;
                              return (
                                <div
                                  key={item.ficha.id}
                                  onClick={() => onSelectFicha(item.ficha)}
                                  onMouseEnter={() => setHoveredFicha(item.ficha)}
                                  className={`p-3.5 rounded-xl border transition cursor-pointer select-none text-left relative group flex flex-col justify-between h-28 ${
                                    isFocused 
                                      ? "bg-[#c4a35a]/5 border-[#c4a35a] shadow-md" 
                                      : "bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900/80 hover:border-zinc-800"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono tracking-wider font-extrabold uppercase ${config.bg} ${config.text} border ${config.border}`}>
                                        {config.label.split(" ")[0]}
                                      </span>
                                      <span className="font-mono text-[9px] text-[#ebdcb9] font-black">{item.year} d.C.</span>
                                    </div>
                                    <h4 className="font-serif text-[12.5px] font-extrabold text-zinc-100 group-hover:text-[#c4a35a] transition truncate mt-2 leading-tight">
                                      {item.titulo}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 font-serif italic truncate mt-0.5">
                                      {item.subtitulo}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900 mt-1.5">
                                    <span className="text-[9px] font-sans font-semibold text-zinc-400 truncate max-w-[120px]">
                                      {item.eraDetail}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition duration-150 flex items-center gap-1">
                                      <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase">visualizar</span>
                                      <ChevronRight className="w-2.5 h-2.5 text-[#c4a35a]" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MODE 3: MUSICAL ERA PERIODS */}
                  {visualMode === "eras" && (
                    <div className="space-y-6">
                      {itemsByMusicalEra.map(([eraName, entries]) => (
                        <div key={eraName} className="space-y-3 bg-zinc-950/25 p-4 rounded-xl border border-zinc-900/40">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-1.5">
                            <span className="font-serif text-sm font-black text-rose-300 flex items-center gap-2">
                              <span>⚜️ {eraName}</span>
                            </span>
                            <span className="font-mono text-[8.5px] text-zinc-500 px-2 py-0.5 rounded border border-zinc-900 bg-zinc-950 font-bold">
                              {entries.length} {entries.length === 1 ? "tópico" : "tópicos"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {entries.map((item) => {
                              const config = TYPE_COLORS[item.tipo];
                              const isFocused = activeFicha?.id === item.ficha.id;
                              return (
                                <div
                                  key={item.ficha.id}
                                  onClick={() => onSelectFicha(item.ficha)}
                                  onMouseEnter={() => setHoveredFicha(item.ficha)}
                                  className={`p-3.5 rounded-xl border transition cursor-pointer select-none text-left relative group flex flex-col justify-between h-28 ${
                                    isFocused 
                                      ? "bg-[#c4a35a]/5 border-[#c4a35a] shadow-md" 
                                      : "bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900/80 hover:border-zinc-805"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono tracking-wider font-extrabold uppercase ${config.bg} ${config.text} border ${config.border}`}>
                                        {config.label.split(" ")[0]}
                                      </span>
                                      <span className="font-mono text-[9px] text-zinc-200 font-extrabold">{item.year} d.C.</span>
                                    </div>
                                    <h4 className="font-serif text-[12.5px] font-extrabold text-zinc-100 group-hover:text-[#c4a35a] transition truncate mt-2 leading-tight">
                                      {item.titulo}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 font-serif italic truncate mt-0.5">
                                      {item.subtitulo}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900 mt-1.5">
                                    <span className="text-[9px] font-sans font-bold text-purple-300 truncate max-w-[120px]">
                                      {item.eraDetail}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition duration-150 flex items-center gap-1">
                                      <span className="text-[8px] font-mono text-zinc-550 font-bold uppercase">visualizar</span>
                                      <ChevronRight className="w-2.5 h-2.5 text-[#c4a35a]" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MODE 4: HISTORICAL DENSITY SCATTER SCATTERPLOT */}
                  {visualMode === "density" && (
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-920 space-y-1 flex-shrink-0">
                        <h4 className="font-mono text-[9.5px] uppercase tracking-wider text-[#c4a35a] font-bold">Gráfico de Dispersão e Concentração de Estudos</h4>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                          Cada círculo representa uma ficha de estudo. O eixo X distribui os anos reais cronológicos (d.C.). As linhas verticais agrupam o foco estético no tempo. Passe o mouse ou clique sobre os pontos para destacar.
                        </p>
                      </div>

                      <div className="h-72 w-full bg-zinc-950/45 rounded-xl p-3 border border-zinc-900 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                            <XAxis 
                              type="number" 
                              dataKey="x" 
                              name="Ano" 
                              unit=" d.C." 
                              domain={["dataMin - 50", "dataMax + 50"]}
                              stroke="#52525b"
                              fontSize={9}
                              fontFamily="monospace"
                              tickLine={false}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="y" 
                              name="Categoria" 
                              domain={[0, 5]}
                              ticks={[0, 1, 2, 3, 4]}
                              tickFormatter={(tick) => {
                                if (tick === 4) return "Artista";
                                if (tick === 3) return "Movimento";
                                if (tick === 2) return "Música";
                                if (tick === 1) return "Instrumento";
                                if (tick === 0) return "Roteiro";
                                return "";
                              }}
                              stroke="#52525b"
                              fontSize={8}
                              fontFamily="monospace"
                              tickLine={false}
                              width={70}
                            />
                            <ZAxis type="number" dataKey="z" range={[64, 180]} />
                            <Tooltip 
                              cursor={{ strokeDasharray: "3 3", stroke: "#27272a" }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const config = TYPE_COLORS[data.tipo] || { base: "#c4a35a" };
                                  return (
                                    <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-2xl font-mono text-[9px] max-w-xs space-y-1 leading-snug">
                                      <p className="font-extrabold text-[#ebdcb9] border-b border-zinc-900 pb-1 flex items-center justify-between">
                                        <span>{data.year} d.C.</span>
                                        <span style={{ color: config.base }}>{data.tipo.toUpperCase()}</span>
                                      </p>
                                      <p className="font-serif text-[11px] font-bold text-zinc-150 truncate pt-0.5">{data.name}</p>
                                      <p className="text-zinc-500 font-sans">{data.era}</p>
                                      <p className="text-[7.5px] text-zinc-600 italic pt-1">Clique para focar esta ficha</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Scatter 
                              name="Fichas" 
                              data={scatterChartData} 
                              fill="#c4a35a"
                              onClick={(data) => {
                                if (data && data.item) {
                                  onSelectFicha(data.item.ficha);
                                }
                              }}
                              onMouseEnter={(data) => {
                                if (data && data.item) {
                                  setHoveredFicha(data.item.ficha);
                                }
                              }}
                              shape={(props: any) => {
                                const { cx, cy, payload } = props;
                                const isSelected = activeFicha?.id === payload.item.ficha.id;
                                const config = TYPE_COLORS[payload.tipo] || { base: "#c4a35a" };
                                return (
                                  <g key={payload.name} className="cursor-pointer">
                                    <circle 
                                      cx={cx} 
                                      cy={cy} 
                                      r={isSelected ? 10 : 6} 
                                      fill={isSelected ? "#09090b" : config.base} 
                                      stroke={config.base} 
                                      strokeWidth={isSelected ? 3 : 1}
                                      className="transition-all duration-300 hover:scale-125"
                                    />
                                    {isSelected && (
                                      <circle 
                                        cx={cx} 
                                        cy={cy} 
                                        r={14} 
                                        fill="none" 
                                        stroke={config.base} 
                                        strokeWidth={0.5} 
                                        strokeDasharray="2 2"
                                      />
                                    )}
                                  </g>
                                );
                              }}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Rapid Access scatter bar checklist */}
                      <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-550 font-bold block">Fichas disponíveis no Gráfico ({filteredItems.length}):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[140px] overflow-y-auto sidebar-scrollable p-1 border border-zinc-900 rounded-lg bg-zinc-950/20">
                        {filteredItems.map(item => {
                          const config = TYPE_COLORS[item.tipo];
                          const isSelected = activeFicha?.id === item.ficha.id;
                          return (
                            <button
                              key={item.ficha.id}
                              onClick={() => onSelectFicha(item.ficha)}
                              className={`p-2 rounded-lg border text-left truncate transition cursor-pointer flex flex-col justify-between h-[52px] ${
                                isSelected 
                                  ? "bg-purple-950/15 border-purple-800 text-purple-200" 
                                  : "bg-zinc-900/10 border-zinc-900/60 hover:bg-zinc-900/30 hover:border-zinc-800 text-zinc-400"
                              }`}
                            >
                              <span className="font-sans font-bold text-[10px] text-zinc-200 truncate block w-full leading-tight">
                                {item.titulo}
                              </span>
                              <div className="flex items-center justify-between gap-1 w-full mt-1.5 border-t border-zinc-900 pt-1">
                                <span className="font-mono text-[7px] uppercase tracking-wide opacity-80">{item.tipo}</span>
                                <span className="text-[#ebdcb9] font-mono text-[8.5px] font-black">{item.year} d.C.</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Right side: Selected Ficha Detail / Quick Preview Panel */}
            <div className="w-full md:w-85 p-5 bg-zinc-950/50 flex flex-col justify-between flex-shrink-0">
              
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="border-b border-zinc-850 pb-2.5">
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#c4a35a] font-black block">Pré-Visualização Rápida</span>
                  <h4 className="font-serif text-sm font-bold text-zinc-200 mt-1">Status do Registro Selecionado</h4>
                </div>

                {activeFicha ? (
                  <div className="flex-1 overflow-y-auto sidebar-scrollable space-y-3.5 pr-1">
                    
                    {/* Rich Title Block */}
                    <div className="p-3 bg-zinc-900/65 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-1.5 py-0.5 bg-[#c4a35a]/10 text-[#ebdcb9] border border-[#c4a35a]/30 rounded uppercase font-mono text-[7.5px] font-bold">
                          {activeFicha.tipo.toUpperCase()}
                        </span>
                        <span className="font-mono text-[9px] text-[#c4a35a] font-extrabold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#c4a35a]" />
                          <span>{getFichaYear(activeFicha)} d.C.</span>
                        </span>
                      </div>
                      <h4 className="font-serif text-[15px] font-black text-zinc-100 mt-2 leading-snug">{activeFicha.titulo}</h4>
                      <p className="text-[11.5px] text-zinc-400 italic font-serif leading-snug mt-0.5">{activeFicha.subtitulo}</p>
                    </div>

                    {/* Metadata attributes based on type */}
                    <div className="space-y-2 text-xs font-sans">
                      {activeFicha.tipo === "artista" && (
                        <div className="space-y-2">
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Época / Era Histórica:</span>
                            <span className="text-zinc-200 font-bold">{(activeFicha.data as any).era_badge || "N/A"}</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Nascimento & Morte:</span>
                            <span className="text-zinc-200 font-bold">{(activeFicha.data as any).nascimento_morte || "N/A"}</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Biografia Sintética:</span>
                            <p className="text-zinc-400 text-[10.5px] leading-relaxed line-clamp-3 mt-1 font-serif">
                              {(activeFicha.data as any).biografia || "Nenhuma biografia incluída."}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeFicha.tipo === "movimento" && (
                        <div className="space-y-2">
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Período de Referência:</span>
                            <span className="text-zinc-200 font-bold">{(activeFicha.data as any).periodo || "N/A"}</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Contexto Histórico:</span>
                            <p className="text-zinc-400 text-[10.5px] leading-relaxed line-clamp-3 mt-1 font-serif">
                              {(activeFicha.data as any).contexto_historico || "Não informado."}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeFicha.tipo === "musica" && (
                        <div className="space-y-2">
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Artista / Compositor:</span>
                            <span className="text-zinc-200 font-bold">{(activeFicha.data as any).artista || "N/A"}</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Por que é uma Obra Pivô?</span>
                            <p className="text-zinc-400 text-[10.5px] leading-relaxed line-clamp-3 mt-1 font-serif">
                              {(activeFicha.data as any).por_que_pivo || "N/A"}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeFicha.tipo === "instrumento" && (
                        <div className="space-y-2">
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Família Acústica:</span>
                            <span className="text-zinc-200 font-bold">{(activeFicha.data as any).familia || "N/A"}</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Origem de Fabricação:</span>
                            <span className="text-zinc-200 font-bold">{(activeFicha.data as any).origem_historica || "N/A"}</span>
                          </div>
                        </div>
                      )}

                      {activeFicha.tipo === "roteiro" && (
                        <div className="space-y-2">
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
                            <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-550 block">Tese Central do Vídeo:</span>
                            <p className="text-zinc-400 text-[10.5px] leading-relaxed line-clamp-3 mt-1 font-serif">
                              {(activeFicha.data as any).tese_central || "N/A"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-gradient-to-r from-[#c4a35a]/5 to-transparent p-2.5 rounded border border-[#c4a35a]/10 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#c4a35a] animate-pulse" />
                      <span className="text-[10px] text-zinc-350 font-medium">Esta ficha está totalmente carregada no central de rascunhos.</span>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-zinc-900/10 border border-dashed border-zinc-800 rounded-xl">
                    <HelpCircle className="w-8 h-8 text-zinc-700 block mb-2 stroke-[1.5]" />
                    <span className="font-mono text-[8px] uppercase tracking-wide text-zinc-500 font-black">Nenhum Registro Ativo</span>
                    <p className="text-[10px] text-zinc-500 font-sans mt-1">
                      Clique em qualquer ponto do gráfico ou lista temporal para visualizar o resumo inteligente e editar instantaneamente.
                    </p>
                  </div>
                )}
              </div>

              {/* Central control layout action */}
              <div className="pt-4 border-t border-zinc-850 mt-4 flex-shrink-0">
                {activeFicha ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-purple-950 to-[#c4a35a]/20 hover:from-purple-900 hover:to-[#c4a35a]/30 border border-purple-800 text-white font-mono text-[10px] uppercase tracking-[0.2em] font-extrabold transition duration-200 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#c4a35a]" />
                    <span>Focar Esta Ficha</span>
                  </button>
                ) : (
                  <p className="text-[9px] text-zinc-500 text-center font-mono uppercase tracking-wider leading-relaxed">
                    Selecione um evento para acionar o foco de tela
                  </p>
                )}
              </div>

            </div>

          </div>

          {/* Footer warning */}
          <div className="bg-zinc-950/70 p-3.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4a35a]" />
              <span>Cronologia calculada dinamicamente via IA e metadados</span>
            </div>
            <span>Andamento, História e Música d.C.</span>
          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  );
};
