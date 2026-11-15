import React, { useState, useEffect } from "react";
import { Ficha, ArtistaData, MovimentoData, MusicaData, RoteiroData, InstrumentoData } from "../types";
import { downloadFichaAsHtml } from "../lib/htmlExporter";
import { downloadFichaAsMd } from "../lib/mdExporter";
import { parseResponseJson } from "../lib/api";
import { Sparkles, FileText, Download, Check, RefreshCw, Copy, Info, Sun, Moon, Save, Database, Lightbulb, X, CheckCircle2, AlertTriangle, AlertCircle, FileJson } from "lucide-react";
import { ImageEditor } from "./ImageEditor";
import { motion, AnimatePresence } from "motion/react";

interface FichaCardProps {
  ficha: Ficha;
  onUpdate: (updatedData: any) => void;
  onToggleFavorite?: () => void;
  vaultTemplates?: Record<string, { name: string; content: string }>;
  nomesFichasParaLinks?: string[];
  allFichas?: Ficha[];
}

export const FichaCard: React.FC<FichaCardProps> = ({ 
  ficha, 
  onUpdate, 
  onToggleFavorite,
  vaultTemplates,
  nomesFichasParaLinks,
  allFichas
}) => {
  const [localData, setLocalData] = useState<any>(ficha.data);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [obsidianSaveStatus, setObsidianSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [obsidianError, setObsidianError] = useState<string | null>(null);
  const [isUnifiedMode, setIsUnifiedMode] = useState<boolean>(() => {
    return localStorage.getItem("obsidian_unified_mode") !== "false";
  });

  const [studyTip, setStudyTip] = useState<any>(null);
  const [isStudyTipOpen, setIsStudyTipOpen] = useState(false);
  const [isGeneratingStudyTip, setIsGeneratingStudyTip] = useState(false);
  const [studyTipError, setStudyTipError] = useState<string | null>(null);
  const [studyTipCopied, setStudyTipCopied] = useState(false);

  interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "info";
    description?: string;
  }

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info", description?: string) => {
    const id = Date.now().toString() + Math.random().toString();
    const newToast: Toast = { id, message, type, description };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerStudyTip = async () => {
    setIsStudyTipOpen(true);
    if (studyTip) return; // already generated!

    setIsGeneratingStudyTip(true);
    setStudyTipError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch("/api/gemini/study-tip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ficha,
          outrashfichas: allFichas || [],
        }),
        signal: controller.signal,
      });

      const resData = await parseResponseJson(response);
      setStudyTip(resData);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Erro desconhecido ao carregar a dica de estudo conectiva.";
      if (err.name === "AbortError") {
        msg = "⚠️ A requisição expirou (timeout). O modelo pode estar em alta demanda. Tente novamente.";
      } else if (err.message === "Failed to fetch" || err.name === "TypeError") {
        msg = "⚠️ Falha de comunicação com o servidor. Tente novamente em instantes.";
      }
      setStudyTipError(msg);
    } finally {
      clearTimeout(timeoutId);
      setIsGeneratingStudyTip(false);
    }
  };  const handleCopyStudyTip = async () => {
    if (!studyTip) return;

    const markdown = `## 💡 Dica de Estudo e Conexões Cruzadas: ${ficha.titulo || localData?.nome || localData?.titulo}
> [!info] **Grafo Curatorial Conectivo**
> Gerado automaticamente por Inteligência Artificial para aprofundamento de estudos e construção do cofre.

### 🔗 Conexões Recomendadas
${(studyTip.conexoesRecomendadas || []).map((c: any) => `- **${c.tema}** [Relação: *${c.relacao}*]
  ${c.exploracao}`).join("\n\n")}

### 🧠 Provocação Tridimensional de Estudo
${studyTip.provocacaoEstudo}

### 🎥 Gancho Narrativo / Transição para Vídeo
> ${studyTip.ganchoRoteirista}

### 🗺 Percurso de Expansão Recomendado (Próximas Fichas)
${(studyTip.percursoEstudo || []).map((step: string, idx: number) => `${idx + 1}. ${step}`).join("\n")}
`;

    try {
      await navigator.clipboard.writeText(markdown);
      setStudyTipCopied(true);
      setTimeout(() => setStudyTipCopied(false), 2000);
      showToast("Dica de estudo copiada!", "success", "O markdown estruturado com links do Obsidian está pronto para uso.");
    } catch (err) {
      console.error("Falha ao copiar:", err);
      showToast("Erro ao copiar dica", "error", "Permissão negada ao acessar a área de transferência.");
    }
  };

  const handleSaveToObsidian = async () => {
    setObsidianSaveStatus("saving");
    setObsidianError(null);
    try {
      const { getFichaHtmlString } = await import("../lib/htmlExporter");
      const { getFichaMdString } = await import("../lib/mdExporter");

      const vaultPath = localStorage.getItem("obsidian_vault_path") || "obsidian";

      const safeName = (ficha.titulo || "ficha_musical")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove diacritics
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/(^_+|_+$)/g, "");

      const fileNameHtml = `ficha_${ficha.tipo}_${safeName}.html`;
      const fileNameMd = `ficha_${ficha.tipo}_${safeName}.md`;

      const htmlContent = getFichaHtmlString({ ...ficha, data: localData });
      
      const templateContent = vaultTemplates?.[ficha.tipo]?.content;
      let mdContent = getFichaMdString(
        { ...ficha, data: localData },
        templateContent,
        nomesFichasParaLinks
      );

      if (isUnifiedMode) {
        // Embed the beautiful styled HTML view using an obsidian relative iframe
        const parts = mdContent.split("---\n");
        const embedHeader = `\n\n## 🎭 Visualização Interativa Integrada\n\n> [!info] **Cofre Inteligente**: O visualizador gráfico de alta definição foi embutido diretamente nesta nota. Você pode interagir com os recursos visuais completos sem sair do Obsidian!\n> Caso o iframe seja bloqueado ou queira abrir no navegador: [Clique para Abrir Ficha Interativa](./${fileNameHtml}) · Link Wiki: [[${fileNameHtml}]]\n\n<iframe src="./${fileNameHtml}" width="100%" height="820px" style="border: 1px solid rgba(168, 85, 247, 0.45); border-radius: 12px; background: #09090b; width: 100%; height: 820px;"></iframe>\n\n`;

        if (parts.length >= 3) {
          const frontmatter = parts[1];
          const body = parts.slice(2).join("---\n");
          mdContent = `---\n${frontmatter}---\n${embedHeader}---\n\n${body}`;
        } else {
          mdContent = `${embedHeader}---\n\n${mdContent}`;
        }
      } else {
        // Embed standard interactive HTML companion linkage inside the markdown note
        mdContent += `\n\n---\n### 🔗 Ficha Visual Interativa\nEsta ficha possui um arquivo visual interativo em HTML gerado na mesma pasta:\n- **Obsidian Wiki-Link**: [[${fileNameHtml}]]\n- **Link Local**: [Abrir Ficha Interativa em HTML (Navegador)](./${fileNameHtml})\n`;
      }

      // Check if there is an active native local directory handle on the browser
      const localDirHandle = (window as any).localDirectoryHandle;
      if (localDirHandle) {
        const folderMap: Record<string, string> = {
          artista: "Artista",
          movimento: "Movimento",
          musica: "Música",
          roteiro: "Roteiro",
          instrumento: "Instrumento"
        };
        const folderName = folderMap[ficha.tipo] || "Outros";

        try {
          let permission = await localDirHandle.queryPermission({ mode: "readwrite" });
          if (permission !== "granted") {
            permission = await localDirHandle.requestPermission({ mode: "readwrite" });
          }

          if (permission === "granted") {
            const subDirHandle = await localDirHandle.getDirectoryHandle(folderName, { create: true });
            
            // Save Markdown file
            const mdFileHandle = await subDirHandle.getFileHandle(fileNameMd, { create: true });
            const mdWritable = await mdFileHandle.createWritable();
            await mdWritable.write(mdContent);
            await mdWritable.close();

            // Save HTML file
            const htmlFileHandle = await subDirHandle.getFileHandle(fileNameHtml, { create: true });
            const htmlWritable = await htmlFileHandle.createWritable();
            await htmlWritable.write(htmlContent);
            await htmlWritable.close();

            // Refresh local explorer
            if (typeof (window as any).refreshLocalExplorer === "function") {
              (window as any).refreshLocalExplorer();
            }

            setObsidianSaveStatus("success");
            setTimeout(() => setObsidianSaveStatus("idle"), 3000);
            showToast(
              "Ficha salva com sucesso!",
              "success",
              `Sincronizada localmente no Obsidian no diretório "${folderName}".`
            );
            return; // Skip saving to server, since it's saved directly on their physical machine!
          }
        } catch (localWriteErr: any) {
          console.warn("Direct write failed, falling back to database server:", localWriteErr);
        }
      }

      const response = await fetch("/api/obsidian/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          htmlContent,
          mdContent,
          fileNameHtml,
          fileNameMd,
          vaultPath,
          tipo: ficha.tipo,
        }),
      });

      await parseResponseJson(response);

      setObsidianSaveStatus("success");
      setTimeout(() => setObsidianSaveStatus("idle"), 3000);
      showToast(
        "Ficha sincronizada no servidor!",
        "success",
        "Cópias .md e .html injetadas perfeitamente no cofre do Obsidian."
      );
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Erro desconhecido";
      setObsidianError(errMsg);
      setObsidianSaveStatus("error");
      showToast(
        "Erro de Sincronização!",
        "error",
        `Falha ao salvar no Obsidian: ${errMsg}`
      );
    }
  };

  // Sync state if ficha changes
  useEffect(() => {
    setLocalData(ficha.data);
  }, [ficha]);

  const handleFieldChange = (fieldPath: string[], value: string) => {
    const updated = { ...localData };
    let current = updated;
    
    for (let i = 0; i < fieldPath.length - 1; i++) {
      current = current[fieldPath[i]];
    }
    
    current[fieldPath[fieldPath.length - 1]] = value;
    
    setLocalData(updated);
    onUpdate(updated);
  };

  const handleArrayChange = (fieldPath: string[], index: number, value: string) => {
    const updated = { ...localData };
    let current = updated;
    
    for (let i = 0; i < fieldPath.length; i++) {
      current = current[fieldPath[i]];
    }
    
    if (Array.isArray(current)) {
      current[index] = value;
    }
    
    setLocalData(updated);
    onUpdate(updated);
  };

  const handleObjectArrayChange = (arrayPath: string[], index: number, property: string, value: string) => {
    const updated = { ...localData };
    let current = updated;
    
    for (let i = 0; i < arrayPath.length; i++) {
      current = current[arrayPath[i]];
    }
    
    if (Array.isArray(current) && current[index]) {
      current[index][property] = value;
    }
    
    setLocalData(updated);
    onUpdate(updated);
  };

  // Plain utilities escaping
  const handleCopyMarkdown = async () => {
    const { getFichaMdString } = await import("../lib/mdExporter");
    const templateContent = vaultTemplates?.[ficha.tipo]?.content;
    const markdown = getFichaMdString(
      { ...ficha, data: localData },
      templateContent,
      nomesFichasParaLinks
    );
    try {
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showToast("Markdown copiado!", "success", "O código markdown da ficha de estudo já está na sua área de transferência.");
    } catch (err: any) {
      console.error("Falha ao copiar texto:", err);
      showToast("Não foi possível copiar", "error", err.message || "Erro de segurança ao acessar clipboard.");
    }
  };

  const handleDownloadMd = async () => {
    const { getFichaMdString } = await import("../lib/mdExporter");
    const templateContent = vaultTemplates?.[ficha.tipo]?.content;
    let mdContent = getFichaMdString(
      { ...ficha, data: localData },
      templateContent,
      nomesFichasParaLinks
    );
    const safeName = (ficha.titulo || "ficha_musical")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "");

    const fileNameHtml = `ficha_${ficha.tipo}_${safeName}.html`;

    if (isUnifiedMode) {
      const parts = mdContent.split("---\n");
      const embedHeader = `\n\n## 🎭 Visualização Interativa Integrada\n\n> [!info] **Cofre Inteligente**: O visualizador gráfico de alta definição foi embutido diretamente nesta nota. Você pode interagir com os recursos visuais completos sem sair do Obsidian!\n> Caso o iframe seja bloqueado ou queira abrir no navegador: [Clique para Abrir Ficha Interativa](./${fileNameHtml}) · Link Wiki: [[${fileNameHtml}]]\n\n<iframe src="./${fileNameHtml}" width="100%" height="820px" style="border: 1px solid rgba(168, 85, 247, 0.45); border-radius: 12px; background: #09090b; width: 100%; height: 820px;"></iframe>\n\n`;

      if (parts.length >= 3) {
        const frontmatter = parts[1];
        const body = parts.slice(2).join("---\n");
        mdContent = `---\n${frontmatter}---\n${embedHeader}---\n\n${body}`;
      } else {
        mdContent = `${embedHeader}---\n\n${mdContent}`;
      }
    } else {
      mdContent += `\n\n---\n### 🔗 Ficha Visual Interativa\nEsta ficha possui um arquivo visual interativo em HTML gerado na mesma pasta:\n- **Obsidian Wiki-Link**: [[${fileNameHtml}]]\n- **Link Local**: [Abrir Ficha Interativa em HTML (Navegador)](./${fileNameHtml})\n`;
    }

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ficha_${ficha.tipo}_${safeName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const safeName = (ficha.titulo || "ficha_musical")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "");

    const jsonContent = JSON.stringify({
      id: ficha.id,
      tipo: ficha.tipo,
      titulo: ficha.titulo,
      subtitulo: ficha.subtitulo,
      data: localData,
      createdAt: ficha.createdAt,
      updatedAt: ficha.updatedAt
    }, null, 2);

    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ficha_${ficha.tipo}_${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Rendering individual card types
  const renderArtista = (d: ArtistaData) => {
    const artistPhoto = d.foto_url || "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80";

    return (
      <div className="bg-zinc-950/40 border border-zinc-900/70 rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.3)] backdrop-blur-md transition duration-300">
        {/* Header section */}
        <div className="p-8 md:p-10 border-b border-zinc-900/80 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Photo Frame Column */}
          <div className="col-span-12 md:col-span-3 flex flex-col items-center">
            <ImageEditor
              currentUrl={d.foto_url}
              onChange={(newUrl) => handleFieldChange(["foto_url"], newUrl)}
              onRemove={() => handleFieldChange(["foto_url"], "")}
              label="Retrato do Artista"
            />
          </div>

          <div className="col-span-12 md:col-span-5">
            <span className="font-mono text-xs text-[#c4a35a] uppercase tracking-[0.22em] font-bold block mb-2">
              Ficha de Artista #{d.numero || "001"}
            </span>

            <h1 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["nome"], e.currentTarget.textContent || "")}
              className="font-serif text-3xl md:text-4xl font-bold text-zinc-100 leading-tight outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg transition duration-150 cursor-text"
            >
              {d.nome}
            </h1>

            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["nome_original"], e.currentTarget.textContent || "")}
              className="font-serif italic text-zinc-500 text-sm mt-1 outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.nome_original}
            </p>

            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["tagline"], e.currentTarget.textContent || "")}
              className="mt-6 border-l-[3px] border-[#c4a35a] pl-4 font-sans text-zinc-400 text-base leading-relaxed tracking-wide italic outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.tagline}
            </div>
          </div>

          {/* Sidebar Meta section */}
          <div className="col-span-12 md:col-span-4 bg-zinc-950/70 p-5.5 border border-zinc-900/80 rounded-xl space-y-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Era / Período</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["era_badge"], e.currentTarget.textContent || "")}
                className="text-sm font-serif text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.era_badge}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Nome completo</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["nome_completo"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.nome_completo}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Nascimento / Morte</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["nascimento_morte"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.nascimento_morte}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Nacionalidade</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["nacionalidade"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.nacionalidade}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Instrumentos</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["instrumentos"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.instrumentos}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Gêneros / Estilos</span>
              <div className="flex flex-wrap gap-1.5">
                {(d.generos || []).map((gen, idx) => (
                  <span 
                    key={idx}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["generos"], idx, e.currentTarget.textContent || "")}
                    className="font-mono text-[9px] tracking-wider uppercase border border-zinc-850/60 bg-zinc-950/40 px-2 py-0.5 rounded text-zinc-400 outline-none focus:border-[#c4a35a] cursor-text"
                  >
                    {gen}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>        {/* Content body */}
        <div className="p-8 md:p-10 space-y-11">
          {/* Bio */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>Biografia Essencial</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["biografia"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify space-y-4 outline-none focus:bg-zinc-900/50 p-2.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.biografia }}
            />
          </div>

          {/* Obras */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Obras de Relevância</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(d.obras || []).map((o, idx) => (
                <div key={idx} className="bg-zinc-950/30 p-5.5 border border-zinc-900/80 rounded-xl hover:border-zinc-800 transition duration-200">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras"], idx, "titulo", e.currentTarget.textContent || "")}
                    className="font-serif text-zinc-100 font-bold text-base outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                  >
                    {o.titulo}
                  </div>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras"], idx, "ano", e.currentTarget.textContent || "")}
                    className="font-mono text-[9px] text-[#c4a35a]/85 uppercase tracking-[0.22em] mt-1 outline-none focus:bg-zinc-900/50 p-0.5 rounded cursor-text"
                  >
                    {o.ano}
                  </div>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras"], idx, "descricao", e.currentTarget.textContent || "")}
                    className="text-zinc-450 text-xs leading-relaxed mt-3.5 outline-none focus:bg-zinc-900/50 p-0.5 rounded cursor-text"
                  >
                    {o.descricao}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Análises */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Análise Técnica e Linguagem Estética</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(d.analise || []).map((a, idx) => (
                <div key={idx} className="bg-zinc-950/20 p-5.5 border border-zinc-900/60 rounded-xl hover:border-zinc-850/80 transition duration-200">
                  <span className="font-mono text-[9px] text-zinc-500 tracking-[0.16em] uppercase block mb-2">{a.chave}</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["analise"], idx, "valor", e.currentTarget.textContent || "")}
                    className="text-zinc-400 text-xs leading-relaxed outline-none focus:bg-zinc-900/50 p-1 rounded cursor-text"
                  >
                    {a.valor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ganchos */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Ganchos de Storytelling (Curiosidades para Vídeos)</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5">
              {(d.ganchos || []).map((g, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 hover:bg-zinc-950/30 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl transition duration-200">
                  <span className="text-[#c4a35a] select-none font-bold">🎣</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["ganchos"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {g}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conexões */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Relações de Influência e Movimentos</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/30 p-6.5 border border-zinc-900/80 rounded-2xl">
              <div className="space-y-5">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Influenciou diretamente</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.influenciou || []).map((inf, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["influenciou"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-[#c4a35a]/10 border border-[#c4a35a]/30 hover:border-[#c4a35a] text-[#ebdcb9] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition duration-200 font-sans outline-none cursor-text"
                      >
                        {inf}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Foi influenciado por</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.influenciado_por || []).map((inf, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["influenciado_por"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {inf}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Movimentos estéticos</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.movimento || []).map((mov, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["movimento"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {mov}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Conexões inusitadas</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.conexoes_inesperadas || []).map((conex, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["conexoes_inesperadas"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {conex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMovimento = (d: MovimentoData) => {
    return (
      <div className="bg-zinc-950/40 border border-zinc-900/70 rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.3)] backdrop-blur-md transition duration-300">
        <div className="p-8 md:p-10 border-b border-zinc-900/80 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Photo Frame Column */}
          <div className="col-span-12 md:col-span-3 flex flex-col items-center">
            <ImageEditor
              currentUrl={d.foto_url}
              onChange={(newUrl) => handleFieldChange(["foto_url"], newUrl)}
              onRemove={() => handleFieldChange(["foto_url"], "")}
              label="Visual do Movimento"
            />
          </div>

          <div className="col-span-12 md:col-span-5">
            <span className="font-mono text-xs text-[#c4a35a] uppercase tracking-[0.22em] font-bold block mb-2">Ficha de Movimento Musical</span>
            <h1 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["nome"], e.currentTarget.textContent || "")}
              className="font-serif text-3xl md:text-4xl font-bold text-zinc-100 leading-tight outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.nome}
            </h1>
            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const text = e.currentTarget.textContent || "";
                const parts = text.split(" · ");
                handleFieldChange(["periodo"], parts[0] || "");
                if (parts[1]) handleFieldChange(["origem"], parts[1]);
              }}
              className="font-serif italic text-zinc-500 text-sm mt-1 outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.periodo} · {d.origem}
            </p>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["tagline"], e.currentTarget.textContent || "")}
              className="mt-6 border-l-[3px] border-[#c4a35a] pl-4 font-sans text-zinc-400 text-base leading-relaxed italic outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.tagline}
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-zinc-950/70 p-5.5 border border-zinc-900/85 rounded-xl space-y-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Período de Atividade</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["periodo"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.periodo}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Origem Geopolítica</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["origem"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.origem}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-11">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>Visão Geral & Manifesto</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["descricao_geral"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify space-y-4 outline-none focus:bg-zinc-900/50 p-2.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.descricao_geral }}
            />
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>Contexto Histórico & Geopolítico</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["contexto_historico"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify outline-none focus:bg-zinc-900/60 p-2.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.contexto_historico }}
            />
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Assinatura Técnica do Movimento</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="border border-zinc-900/70 overflow-hidden bg-zinc-950/25 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <tbody>
                  {(d.caracteristicas || []).map((carac, idx) => (
                    <tr key={idx} className="border-b border-zinc-900/60 last:border-0 hover:bg-zinc-950/35 transition">
                      <td className="p-4 font-mono font-bold text-[#c4a35a]/90 select-none uppercase tracking-[0.14em] bg-zinc-950/40 border-r border-[#c4a35a]/10 w-36 text-[10px]">
                        {carac.aspecto}
                      </td>
                      <td 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleObjectArrayChange(["caracteristicas"], idx, "descricao", e.currentTarget.textContent || "")}
                        className="p-4 text-zinc-400 leading-relaxed outline-none focus:bg-zinc-900/40 cursor-text"
                      >
                        {carac.descricao}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Figuras Centrais</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-4">
              {(d.figuras || []).map((f, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-2 md:gap-6 bg-zinc-950/20 p-4 border border-zinc-900/70 rounded-xl hover:border-zinc-850/80 transition duration-200">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["figuras"], idx, "nome", e.currentTarget.textContent || "")}
                    className="font-serif text-zinc-100 font-bold block min-w-[160px] outline-none focus:bg-zinc-900/50 p-0.5 rounded cursor-text"
                  >
                    {f.nome}
                  </div>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["figuras"], idx, "papel", e.currentTarget.textContent || "")}
                    className="text-zinc-455 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/50 p-0.5 w-full cursor-text"
                  >
                    {f.papel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Obras & LPs Fundamentais</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(d.obras_representativas || []).map((o, idx) => (
                <div key={idx} className="bg-zinc-950/30 p-5.5 border border-zinc-900/80 rounded-xl hover:border-zinc-800 transition duration-200">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras_representativas"], idx, "titulo", e.currentTarget.textContent || "")}
                    className="font-serif text-zinc-100 font-bold text-base outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                  >
                    {o.titulo}
                  </div>
                  <div className="text-zinc-500 text-xs mt-1 font-sans flex items-center gap-1 flex-wrap">
                    <span 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleObjectArrayChange(["obras_representativas"], idx, "artista", e.currentTarget.textContent || "")}
                      className="text-zinc-400 outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                    >
                      {o.artista}
                    </span>
                    <span>·</span>
                    <span 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleObjectArrayChange(["obras_representativas"], idx, "ano", e.currentTarget.textContent || "")}
                      className="text-[#c4a35a] font-mono text-[9px] uppercase tracking-[0.14em] outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                    >
                      {o.ano}
                    </span>
                  </div>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras_representativas"], idx, "importancia", e.currentTarget.textContent || "")}
                    className="text-zinc-400 text-xs leading-relaxed mt-4 outline-none focus:bg-zinc-900/50 p-0.5 rounded cursor-text"
                  >
                    {o.importancia}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Origens, Influências & Reações</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/30 p-6.5 border border-zinc-900/80 rounded-2xl">
              <div className="space-y-5">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Origens (Surgiu de)</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.surgiu_de || []).map((orig, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["surgiu_de"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {orig}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Legado (Influenciou)</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.influenciou || []).map((inf, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["influenciou"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-[#c4a35a]/10 border border-[#c4a35a]/30 hover:border-[#c4a35a] text-[#ebdcb9] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition duration-200 font-sans outline-none cursor-text"
                      >
                        {inf}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Estilos Paralelos Ativos</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.em_paralelo || []).map((par, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["em_paralelo"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {par}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Rebelião/Reação estética contra</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.reacao_contra || []).map((rea, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["reacao_contra"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {rea}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Ganchos de Storytelling</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5 w-full">
              {(d.ganchos || []).map((g, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl w-full">
                  <span className="text-[#c4a35a] select-none font-bold">🎣</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["ganchos"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {g}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMusica = (d: MusicaData) => {
    return (
      <div className="bg-zinc-950/40 border border-zinc-900/70 rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.3)] backdrop-blur-md transition duration-300">
        <div className="p-8 md:p-10 border-b border-zinc-900/80 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Photo Frame Column */}
          <div className="col-span-12 md:col-span-3 flex flex-col items-center">
            <ImageEditor
              currentUrl={d.foto_url}
              onChange={(newUrl) => handleFieldChange(["foto_url"], newUrl)}
              onRemove={() => handleFieldChange(["foto_url"], "")}
              label="Capa / Arte da Música"
            />
          </div>

          <div className="col-span-12 md:col-span-5">
            <span className="font-mono text-xs text-[#c4a35a] uppercase tracking-[0.22em] font-bold block mb-2">
              Música Pivô · {d.badge}
            </span>
            <h1 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["titulo"], e.currentTarget.textContent || "")}
              className="font-serif text-3xl md:text-4xl font-bold text-zinc-100 leading-tight outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.titulo}
            </h1>
            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["artista"], e.currentTarget.textContent || "")}
              className="font-serif italic text-zinc-400 text-sm mt-1 outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.artista}
            </p>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["tagline"], e.currentTarget.textContent || "")}
              className="mt-6 border-l-[3px] border-[#c4a35a] pl-4 font-sans text-zinc-400 text-base leading-relaxed italic outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.tagline}
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-zinc-950/70 p-5.5 border border-zinc-900/85 rounded-xl space-y-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Artista</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["artista"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.artista}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Ano de Lançamento</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["ano"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.ano}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Gênero Central</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["genero"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.genero}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-11">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>Por que esta música é Pivô?</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["por_que_pivo"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify space-y-4 outline-none focus:bg-zinc-900/50 p-2.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.por_que_pivo }}
            />
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>História, Estúdio & Contexto de Criação</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["contexto_criacao"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify outline-none focus:bg-zinc-900/60 p-2.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.contexto_criacao }}
            />
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Análise Musical Arquitetônica</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(d.analise_musical || []).map((a, idx) => (
                <div key={idx} className="bg-zinc-950/20 p-5.5 border border-zinc-900/60 rounded-xl hover:border-zinc-850/80 transition duration-200">
                  <span className="font-mono text-[9px] text-zinc-500 tracking-[0.16em] uppercase block mb-2">{a.chave}</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["analise_musical"], idx, "valor", e.currentTarget.textContent || "")}
                    className="text-zinc-400 text-xs leading-relaxed outline-none focus:bg-zinc-900/50 p-1 rounded cursor-text"
                  >
                    {a.valor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Impacto Imediato & Repercussão Estética</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5">
              {(d.impactos || []).map((imp, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 hover:bg-zinc-950/30 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl transition duration-200">
                  <span className="text-[#c4a35a] select-none font-bold">◆</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["impactos"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {imp}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Ganchos de Divulgação Narrativos</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5">
              {(d.ganchos || []).map((gan, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 hover:bg-zinc-950/30 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl transition duration-200">
                  <span className="text-[#c4a35a] select-none font-bold">🎣</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["ganchos"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {gan}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Relações de Conexão</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/30 p-6.5 border border-zinc-900/80 rounded-2xl">
              <div className="space-y-5">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Compositores & Produtores</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.artistas || []).map((art, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["artistas"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-[#c4a35a]/10 border border-[#c4a35a]/30 hover:border-[#c4a35a] text-[#ebdcb9] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition duration-200 font-sans outline-none cursor-text"
                      >
                        {art}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Escola / Movimento</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.movimento || []).map((mov, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["movimento"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {mov}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Inovações Herdeiras</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.influenciou || []).map((inf, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["influenciou"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {inf}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Equipamentos / Claves Teóricas</span>
                  <div className="flex flex-wrap gap-2">
                    {(d.conceitos_teoricos || []).map((con, idx) => (
                      <span 
                        key={idx}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleArrayChange(["conceitos_teoricos"], idx, e.currentTarget.textContent || "")}
                        className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                      >
                        {con}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRoteiro = (d: RoteiroData) => {
    return (
      <div className="bg-zinc-950/40 border border-zinc-900/70 rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.3)] backdrop-blur-md transition duration-300">
        <div className="p-8 md:p-10 border-b border-zinc-900/80 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Photo Frame Column */}
          <div className="col-span-12 md:col-span-3 flex flex-col items-center">
            <ImageEditor
              currentUrl={d.foto_url}
              onChange={(newUrl) => handleFieldChange(["foto_url"], newUrl)}
              onRemove={() => handleFieldChange(["foto_url"], "")}
              label="Ideia de Thumbnail / Arte"
            />
          </div>

          <div className="col-span-12 md:col-span-5">
            <span className="font-mono text-xs text-[#c4a35a] uppercase tracking-[0.22em] font-bold block mb-1">
              Roteiro de Ensaio Audiovisual
            </span>
            <h1 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["titulo"], e.currentTarget.textContent || "")}
              className="font-serif text-2xl md:text-3xl font-bold text-zinc-100 leading-tight outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.titulo}
            </h1>
            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["tese_central"], e.currentTarget.textContent || "")}
              className="font-sans italic text-zinc-400 text-xs md:text-sm mt-3 outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text border-l-[3px] border-[#c4a35a] pl-3"
            >
              <strong>Tese:</strong> {d.tese_central}
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 bg-zinc-950/70 p-5.5 border border-zinc-900/85 rounded-xl space-y-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Formato Vídeo</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["formato"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.formato}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Era / Gênero Temático</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["era_genero"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.era_genero}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-11">
          <div>
            <div className="bg-zinc-950/40 border border-zinc-900/80 border-l-[4px] border-l-[#c4a35a] p-6 rounded-r-xl flex items-start gap-4 shadow-sm">
              <span className="font-mono text-3xl font-bold text-zinc-750 leading-none select-none">00</span>
              <div className="w-full">
                <span className="font-mono text-[9px] tracking-[0.18em] text-[#c4a35a] block mb-2.5 uppercase font-bold">Gancho de Retenção — Primeiros 30 Segundos (Voz narrador)</span>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleFieldChange(["gancho_30s"], e.currentTarget.textContent || "")}
                  className="text-zinc-200 text-sm italic font-serif leading-relaxed p-1 outline-none focus:bg-zinc-900/50 rounded cursor-text whitespace-pre-line"
                >
                  {d.gancho_30s}
                </div>
              </div>
            </div>
          </div>

          {/* Estrutura blocs */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Estrutura Geral Narrativa</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-zinc-950/30 border border-zinc-900/80 p-5 rounded-xl hover:border-zinc-800 transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-5 h-5 bg-[#c4a35a] text-zinc-950 flex items-center justify-center font-mono text-[10px] font-bold rounded">▶</div>
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-zinc-200 font-bold">Introdução</h4>
                </div>
                <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase block mb-3">~10% Duração</span>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleFieldChange(["introducao"], e.currentTarget.textContent || "")}
                  className="text-zinc-400 text-xs leading-relaxed outline-none focus:bg-zinc-900/50 p-1 rounded cursor-text whitespace-pre-line"
                >
                  {d.introducao}
                </div>
              </div>

              <div className="bg-zinc-950/30 border border-zinc-900/80 p-5 rounded-xl hover:border-zinc-800 transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-5 h-5 bg-[#c4a35a] text-zinc-950 flex items-center justify-center font-mono text-[10px] font-bold rounded">◼</div>
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-zinc-200 font-bold">Argumentos</h4>
                </div>
                <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase block mb-3">~75% Duração</span>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleFieldChange(["desenvolvimento"], e.currentTarget.textContent || "")}
                  className="text-zinc-400 text-xs leading-relaxed outline-none focus:bg-zinc-900/50 p-1 rounded cursor-text whitespace-pre-line"
                >
                  {d.desenvolvimento}
                </div>
              </div>

              <div className="bg-zinc-950/30 border border-zinc-900/80 p-5 rounded-xl hover:border-zinc-800 transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-5 h-5 bg-[#c4a35a] text-zinc-950 flex items-center justify-center font-mono text-[10px] font-bold rounded">■</div>
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-zinc-200 font-bold">Resolução & CTA</h4>
                </div>
                <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase block mb-3">~15% Duração</span>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleFieldChange(["conclusao"], e.currentTarget.textContent || "")}
                  className="text-zinc-400 text-xs leading-relaxed outline-none focus:bg-zinc-900/50 p-1 rounded cursor-text whitespace-pre-line"
                >
                  {d.conclusao}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Pontos de Virada Narrativos (Tensionamento)</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5">
              {(d.pontos_virada || []).map((pt, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 hover:bg-zinc-950/30 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl transition duration-200 font-sans">
                  <span className="text-[#c4a35a] select-none font-bold">↯</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["pontos_virada"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {pt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Sugestões de Direção Visual e Arquivos</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5">
              {(d.recursos_visuais || []).map((rec, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 hover:bg-zinc-950/30 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl transition duration-200 font-sans">
                  <span className="text-zinc-500 select-none">🎬</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["recursos_visuais"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {rec}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Títulos Alternativos Recomendados</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(d.titulos_alternativos || []).map((tit, idx) => (
                <div key={idx} className="bg-zinc-950/30 p-4.5 border border-zinc-900/80 rounded-xl flex items-center gap-3.5 hover:border-zinc-800 transition duration-200">
                  <span className="font-mono text-xs text-[#c4a35a] font-bold">✦</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["titulos_alternativos"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-350 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/50 w-full p-0.5 cursor-text"
                  >
                    {tit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>Ideia Clave para a Capa (Thumbnail)</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["thumbnail_ideia"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify outline-none focus:bg-zinc-900/50 p-3.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.thumbnail_ideia }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderInstrumento = (d: InstrumentoData) => {
    return (
      <div className="bg-zinc-950/40 border border-zinc-900/70 rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.3)] backdrop-blur-md transition duration-300">
        {/* Header section */}
        <div className="p-8 md:p-10 border-b border-zinc-900/80 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Photo Frame Column */}
          <div className="col-span-12 md:col-span-3 flex flex-col items-center">
            <ImageEditor
              currentUrl={d.foto_url}
              onChange={(newUrl) => handleFieldChange(["foto_url"], newUrl)}
              onRemove={() => handleFieldChange(["foto_url"], "")}
              label="Visual do Instrumento"
            />
          </div>

          <div className="col-span-12 md:col-span-5">
            <span className="font-mono text-xs text-[#c4a35a] uppercase tracking-[0.22em] font-bold block mb-2">
              Ficha de Instrumento Musical
            </span>

            <h1 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["nome"], e.currentTarget.textContent || "")}
              className="font-serif text-3xl md:text-4xl font-bold text-zinc-100 leading-tight outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg transition duration-150 cursor-text"
            >
              {d.nome}
            </h1>

            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["familia"], e.currentTarget.textContent || "")}
              className="font-serif italic text-zinc-500 text-sm mt-1 outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              Família: {d.familia}
            </p>

            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["tagline"], e.currentTarget.textContent || "")}
              className="mt-6 border-l-[3px] border-[#c4a35a] pl-4 font-sans text-zinc-400 text-base leading-relaxed tracking-wide italic outline-none focus:bg-zinc-900/50 p-1.5 rounded-lg cursor-text"
            >
              {d.tagline}
            </div>
          </div>

          {/* Sidebar Meta section */}
          <div className="col-span-12 md:col-span-4 bg-zinc-950/70 p-5.5 border border-zinc-900/80 rounded-xl space-y-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Classificação Sachs-Hornbostel</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["classificacao_sachs_hornbostel"], e.currentTarget.textContent || "")}
                className="text-sm font-serif text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.classificacao_sachs_hornbostel}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Origem Histórica</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["origem_historica"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.origem_historica}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] font-bold">Criadores e Pioneiros</span>
              <span 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleFieldChange(["construtores_pioneiros"], e.currentTarget.textContent || "")}
                className="text-sm text-zinc-300 outline-none focus:bg-zinc-900/60 p-0.5 rounded cursor-text"
              >
                {d.construtores_pioneiros}
              </span>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-8 md:p-10 space-y-11">
          {/* Funcionamento Acustico */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-4 flex items-center gap-2">
              <span>Funcionamento Acústico</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleFieldChange(["funcionamento_acustico"], e.currentTarget.innerHTML || "")}
              className="font-sans text-zinc-400 text-sm leading-relaxed text-justify space-y-4 outline-none focus:bg-zinc-900/50 p-2.5 rounded-lg cursor-text whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: d.funcionamento_acustico }}
            />
          </div>

          {/* Características Timbrísticas */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Registros & Características Timbrísticas</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="border border-zinc-900/70 overflow-hidden bg-zinc-950/25 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <tbody>
                  {(d.caracteristicas_timbristicas || []).map((t, idx) => (
                    <tr key={idx} className="border-b border-zinc-900/60 last:border-0 hover:bg-zinc-950/35 transition">
                      <td className="p-4 font-mono font-bold text-[#c4a35a]/90 select-none uppercase tracking-[0.14em] bg-zinc-950/40 border-r border-[#c4a35a]/10 w-36 text-[10px]">
                        {t.registro}
                      </td>
                      <td 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleObjectArrayChange(["caracteristicas_timbristicas"], idx, "descricao", e.currentTarget.textContent || "")}
                        className="p-4 text-zinc-400 leading-relaxed outline-none focus:bg-zinc-900/40 cursor-text"
                      >
                        {t.descricao}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Virtuoses */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Pioneiros & Mestres Virtuoses</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-4">
              {(d.pioneiros_virtuoses || []).map((v, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-2 md:gap-6 bg-zinc-950/20 p-4 border border-zinc-900/70 rounded-xl hover:border-zinc-850/80 transition duration-200">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["pioneiros_virtuoses"], idx, "nome", e.currentTarget.textContent || "")}
                    className="font-serif text-zinc-100 font-bold block min-w-[160px] outline-none focus:bg-zinc-900/50 p-0.5 rounded cursor-text"
                  >
                    {v.nome}
                  </div>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["pioneiros_virtuoses"], idx, "estilo_contribuicao", e.currentTarget.textContent || "")}
                    className="text-zinc-400 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/50 p-0.5 w-full cursor-text"
                  >
                    {v.estilo_contribuicao}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Obras Chave */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Obras Chave de Referência</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(d.obras_chave || []).map((o, idx) => (
                <div key={idx} className="bg-zinc-950/30 p-5.5 border border-zinc-900/80 rounded-xl hover:border-zinc-800 transition duration-200">
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras_chave"], idx, "titulo", e.currentTarget.textContent || "")}
                    className="font-serif text-zinc-100 font-bold text-base outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                  >
                    {o.titulo}
                  </div>
                  <div className="text-zinc-500 text-xs mt-1 font-sans flex items-center gap-1 flex-wrap">
                    <span 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleObjectArrayChange(["obras_chave"], idx, "artista", e.currentTarget.textContent || "")}
                      className="text-zinc-400 outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                    >
                      {o.artista}
                    </span>
                    <span>·</span>
                    <span 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleObjectArrayChange(["obras_chave"], idx, "ano", e.currentTarget.textContent || "")}
                      className="text-[#c4a35a] font-mono text-[9px] uppercase tracking-[0.14em] outline-none focus:bg-zinc-900/50 rounded p-0.5 cursor-text"
                    >
                      {o.ano}
                    </span>
                  </div>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleObjectArrayChange(["obras_chave"], idx, "descricao", e.currentTarget.textContent || "")}
                    className="text-zinc-450 text-xs leading-relaxed mt-4 outline-none focus:bg-zinc-900/50 p-0.5 rounded cursor-text"
                  >
                    {o.descricao}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tecnicas e Conexoes */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Técnicas Expressivas & Contextos</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/30 p-6.5 border border-zinc-900/80 rounded-2xl">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Técnicas Expressivas Avançadas</span>
                <div className="flex flex-wrap gap-2">
                  {(d.tecnicas_expressivas || []).map((tec, idx) => (
                    <span 
                      key={idx}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleArrayChange(["tecnicas_expressivas"], idx, e.currentTarget.textContent || "")}
                      className="text-xs bg-[#c4a35a]/10 border border-[#c4a35a]/30 hover:border-[#c4a35a] text-[#ebdcb9] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition duration-200 font-sans outline-none cursor-text"
                    >
                      {tec}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-bold block mb-2.5">Conexões Históricas & Contextos</span>
                <div className="flex flex-wrap gap-2">
                  {(d.conexoes_historicas || []).map((con, idx) => (
                    <span 
                      key={idx}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleArrayChange(["conexoes_historicas"], idx, e.currentTarget.textContent || "")}
                      className="text-xs bg-zinc-900/60 border border-zinc-800 text-zinc-300 px-3.5 py-1.5 rounded-lg outline-none focus:border-[#c4a35a] transition duration-200 cursor-text"
                    >
                      {con}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ganchos */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#c4a35a] border-b border-zinc-900/80 pb-2 mb-6 flex items-center gap-2">
              <span>Ganchos & Segredos de Bastidores</span>
              <div className="h-[1px] flex-1 bg-zinc-900/80" />
            </h3>
            <div className="space-y-3.5 w-full">
              {(d.ganchos || []).map((g, idx) => (
                <div key={idx} className="flex gap-4 bg-zinc-950/15 border border-zinc-900/60 border-l-[3px] border-l-[#c4a35a] p-4.5 rounded-r-xl w-full">
                  <span className="text-[#c4a35a] select-none font-bold">🎣</span>
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleArrayChange(["ganchos"], idx, e.currentTarget.textContent || "")}
                    className="text-zinc-300 text-xs md:text-sm leading-relaxed outline-none focus:bg-zinc-900/40 w-full p-0.5 cursor-text"
                  >
                    {g}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveContent = () => {
    switch (localData.tipo) {
      case "artista":
        return renderArtista(localData as ArtistaData);
      case "movimento":
        return renderMovimento(localData as MovimentoData);
      case "musica":
        return renderMusica(localData as MusicaData);
      case "roteiro":
        return renderRoteiro(localData as RoteiroData);
      case "instrumento":
        return renderInstrumento(localData as InstrumentoData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-zinc-950/60 p-4.5 border border-zinc-900/80 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] leading-snug">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold block">Status da visualização</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11.5px] text-zinc-400 font-sans font-medium">
                Pronto para edição e exportação imediata.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-zinc-900 pt-3 md:pt-0 md:pl-5">
            <label className="flex items-center gap-2.5 cursor-pointer group text-zinc-400 hover:text-purple-300 transition select-none">
              <input
                type="checkbox"
                checked={isUnifiedMode}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIsUnifiedMode(val);
                  localStorage.setItem("obsidian_unified_mode", String(val));
                }}
                className="rounded border-zinc-800 bg-zinc-900 border text-purple-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 text-xs accent-purple-650 cursor-pointer"
              />
              <div className="text-left">
                <span className="font-mono text-[10px] uppercase font-black tracking-wider text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
                  ⚡ Linkar HTML & MD (Cofre Unificado)
                </span>
                <span className="text-[9px] font-sans text-zinc-500 block leading-tight">
                  Embutir visualizador HTML no arquivo .md via iframe para ler como um só no Obsidian
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* Study tip intelligence generator */}
          <button 
            type="button"
            onClick={triggerStudyTip}
            className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border border-amber-900/50 bg-amber-950/25 hover:border-amber-400 hover:bg-amber-950/45 px-4.5 py-2.5 rounded-lg transition duration-240 text-amber-200 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
            title="Sugerir conexões históricas cruzadas e caminhos de estudo com outros tópicos"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            💡 Dica de Estudo
          </button>

          {/* Light/Dark view mode selector */}
          <button 
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-800 bg-zinc-900/40 hover:border-[#c4a35a]/55 hover:bg-zinc-900/90 px-4 py-2 rounded-lg transition duration-200 text-zinc-300 cursor-pointer"
            title="Alternar aparência para o Modo Leitura (Claro/Escuro)"
          >
            {isLightMode ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#c4a35a]" />
                <span>Modo Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#c4a35a]" />
                <span>Modo Claro</span>
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={handleSaveToObsidian}
            disabled={obsidianSaveStatus === "saving"}
            className={`flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border text-purple-200 transition duration-240 cursor-pointer px-4.5 py-2.5 rounded-lg mr-2 ${
              obsidianSaveStatus === "saving" 
                ? "bg-purple-950/25 border-purple-900/20 text-purple-500 cursor-not-allowed" 
                : obsidianSaveStatus === "success" 
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]" 
                : obsidianSaveStatus === "error" 
                ? "bg-red-950/45 border-red-800 text-red-300"
                : "bg-purple-950/45 hover:bg-purple-900/60 border-purple-800/80 hover:border-purple-600 hover:text-white"
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${obsidianSaveStatus === "success" ? "text-emerald-400 animate-bounce" : "text-purple-400"}`} />
            {obsidianSaveStatus === "saving" 
              ? "Salvando..." 
              : obsidianSaveStatus === "success" 
              ? "Salvo!" 
              : obsidianSaveStatus === "error" 
              ? "Falhou" 
              : "💾 Salvar Ficha"}
          </button>

          <button 
            type="button"
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-800 bg-zinc-900/40 hover:border-[#c4a35a]/50 hover:bg-zinc-900/90 px-4 py-2.5 rounded-lg transition duration-200 text-zinc-300 cursor-pointer"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#c4a35a]" />}
            {copySuccess ? "Copiado!" : "Copiar .md"}
          </button>
          
          <button 
            type="button"
            onClick={handleDownloadMd}
            className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-800 bg-zinc-900/40 hover:border-[#c4a35a]/50 hover:bg-zinc-900/90 px-4 py-2.5 rounded-lg transition duration-200 text-zinc-300 cursor-pointer"
            title="Baixar arquivo Markdown contendo as notas e metadados integrado"
          >
            <FileText className="w-3.5 h-3.5 text-[#c4a35a]" />
            Baixar .md
          </button>

          <button 
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-800 bg-zinc-900/40 hover:border-[#c4a35a]/50 hover:bg-zinc-900/90 px-4 py-2.5 rounded-lg transition duration-200 text-zinc-300 cursor-pointer"
            title="Baixar arquivo JSON contendo os dados estruturados desta ficha"
          >
            <FileJson className="w-3.5 h-3.5 text-[#c4a35a]" />
            Baixar .json
          </button>

          <button 
            type="button"
            onClick={() => downloadFichaAsHtml({ ...ficha, data: localData })}
            className="flex items-center gap-2 text-xs font-mono tracking-[0.12em] uppercase bg-[#c4a35a] hover:bg-[#ebdcb9] font-bold text-zinc-950 px-4.5 py-2.5 rounded-lg transition duration-250 cursor-pointer shadow-md hover:shadow-lg"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Exportar HTML
          </button>
        </div>
        {obsidianError && (
          <div className="w-full text-left text-[11px] text-red-400 font-mono bg-red-950/25 border border-red-900/50 p-2.5 rounded-lg mt-3">
            ⚠️ Erro Obsidian Vault: {obsidianError}. Verifique os caminhos do Vault configurados na gaveta abaixo do Histórico.
          </div>
        )}
      </div>

      <div className="flex items-start gap-2.5 text-[10px] font-mono text-zinc-500 bg-zinc-950/25 p-3.5 border border-zinc-900/80 rounded-lg">
        <Info className="w-4 h-4 text-[#c4a35a]/85 flex-shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Modo Editor Ativa</strong>: Clique duas vezes ou selecione qualquer área de texto acima para revisar em tempo real. Suas edições são salvas automaticamente no nosso banco de dados. Os botões no canto direito exportarão exatamente a sua versão revisada!
        </span>
      </div>

      {/* Advanced Connected Study Tip section in real-time */}
      {isStudyTipOpen && (
        <div className="bg-zinc-950/75 border border-amber-900/40 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden transition-all duration-300">
          {/* Subtle ambient lighting top-right */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-950/50 p-2 rounded-lg border border-amber-500/20">
                <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-zinc-100 flex items-center gap-2">
                  Dica de Estudo Conectiva
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-black">
                    Grafo Inteligente
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">Sugestões de pontes intelectuais e de storytelling para o seu cofre</p>
              </div>
            </div>
            <button 
              onClick={() => setIsStudyTipOpen(false)}
              className="text-zinc-500 hover:text-white hover:bg-zinc-900/60 p-1.5 rounded-lg transition duration-150 cursor-pointer"
              title="Fechar painel de dica"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {isGeneratingStudyTip ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-xs font-mono tracking-wider text-amber-250">TECENDO CONEXÕES MUSICOLÓGICAS ESTETICAMENTE COMPACTAS...</p>
                <p className="text-[10px] text-zinc-500">Mapeando links, biografias e outros tópicos do seu vault de Obsidian</p>
              </div>
            </div>
          ) : studyTipError ? (
            <div className="py-6 text-center space-y-4">
              <p className="text-sm text-red-400 bg-red-950/20 border border-red-900/45 p-3 rounded-xl max-w-lg mx-auto leading-relaxed">
                {studyTipError}
              </p>
              <button 
                onClick={triggerStudyTip}
                className="font-mono text-xs text-[#c4a35a] hover:text-[#ebdcb9] border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-4 py-2 rounded-lg transition cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          ) : studyTip ? (
            <div className="space-y-6">
              
              {/* connections list */}
              <div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold block mb-3.5">
                  🔗 Conexões Cruzadas Recomendadas (Obsidian Wiki-Links recomendados)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(studyTip.conexoesRecomendadas || []).map((c: any, idx: number) => {
                    const isMatchedInVault = (nomesFichasParaLinks || []).some(
                      name => c.tema?.includes(name) || (name && name.toLowerCase().includes(c.tema?.replace(/[\[\]]/g, "").toLowerCase()))
                    );

                    return (
                      <div key={idx} className="bg-zinc-950/40 border border-zinc-900/90 rounded-xl p-4.5 space-y-3 hover:border-amber-500/20 transition duration-200">
                        <div className="flex items-start justify-between gap-2.5">
                          <span className="font-serif text-sm font-bold text-zinc-100 block break-words">
                            {c.tema}
                          </span>
                          <span className={`font-mono text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${
                            isMatchedInVault 
                              ? "bg-purple-950/50 border-purple-800/40 text-purple-300"
                              : "bg-zinc-900 border-zinc-905 text-zinc-400"
                          }`}>
                            {isMatchedInVault ? "🎯 Já no seu cofre" : c.relacao || "Conexão"}
                          </span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-zinc-400 text-justify">
                          {c.exploracao}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* dynamic row for provocation and hook */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                
                {/* study provoking question */}
                <div className="md:col-span-7 bg-zinc-950/20 border border-zinc-900/80 p-5 rounded-xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold block">
                      🧠 Provocação Tridimensional de Estudo
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed text-justify italic">
                      "{studyTip.provocacaoEstudo}"
                    </p>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 pt-2 border-t border-zinc-900/60 mt-2">
                    <span>💡 Exporte ou insira este bloco de conexão diretamente no Obsidian</span>
                  </div>
                </div>

                {/* storytelling script hook */}
                <div className="md:col-span-5 bg-zinc-950/20 border border-zinc-900/80 p-5 rounded-xl space-y-2.5 flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold block mb-1">
                      🎥 Gancho Narrativo (Ideia para o Roteiro)
                    </span>
                    <div className="bg-zinc-950/50 border border-zinc-900 px-3.5 py-3 rounded-lg text-xs text-amber-200/90 font-serif leading-relaxed italic text-justify relative">
                      <span className="absolute -top-2 left-3 font-serif text-2xl text-[#c4a35a]/30 select-none">“</span>
                      {studyTip.ganchoRoteirista}
                      <span className="absolute -bottom-5 right-3 font-serif text-2xl text-[#c4a35a]/30 select-none">”</span>
                    </div>
                  </div>
                  <span className="text-[9.5px] text-zinc-500 block leading-tight pt-1">Copie para conectar seus vídeos com maestria.</span>
                </div>

              </div>

              {/* sequential expansion steps */}
              <div className="bg-amber-950/10 border border-amber-950/20 p-4.5 rounded-xl">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber-400 font-bold block mb-2.5">
                  🗺 Percurso de Expansão Recomendado (Ordem Sugerida de Estudos)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(studyTip.percursoEstudo || []).map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-3">
                      <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 w-5.5 h-5.5 rounded-full flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-[11.5px] leading-relaxed text-zinc-400">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* actions bottom */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-900/80">
                <span className="font-sans text-[10px] text-zinc-500">
                  Gerado em tempo real com o Gemini Pro · Contexto do cofre unificado analisado
                </span>
                
                <button
                  type="button"
                  onClick={handleCopyStudyTip}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-amber-500/40 px-3.5 py-1.5 rounded-lg transition duration-200 text-zinc-300 cursor-pointer"
                >
                  {studyTipCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado para o Clip!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Copiar Dica completa (.md)</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : null}
        </div>
      )}

      <div className={isLightMode ? "fichacard-light-mode rounded-2xl overflow-hidden transition-all duration-300 shadow-xl" : "transition-all duration-300"}>
        {renderActiveContent()}
      </div>

      {/* Footer Sources block */}
      <div className="bg-zinc-950/40 p-6 rounded-xl border border-zinc-900/85 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 w-full max-w-xl">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#c4a35a] font-bold block">Fontes Bibliográficas de Referência</span>
          <div 
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleFieldChange(["fontes"], e.currentTarget.textContent || "")}
            className="text-zinc-500 text-xs leading-relaxed outline-none focus:bg-zinc-900/30 p-1 rounded-md cursor-text"
          >
            {localData.fontes || "Referências bibliográficas acadêmicas."}
          </div>
        </div>
        <div className="w-3 h-3 rounded-full bg-[#c4a35a] shadow-[0_0_15px_rgba(196,163,90,0.85)] flex-shrink-0 self-start md:self-center" />
      </div>

      {/* Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl border backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-start gap-3 pointer-events-auto transition-colors duration-200 ${
                toast.type === "success"
                  ? "bg-emerald-950/85 border-emerald-500/30 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : toast.type === "error"
                  ? "bg-red-950/85 border-red-500/30 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                  : "bg-zinc-950/85 border-zinc-700/30 text-zinc-100"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />}
                {toast.type === "info" && <Info className="w-5 h-5 text-[#c4a35a]" />}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-mono text-[10.5px] font-bold leading-tight uppercase tracking-wider">{toast.message}</p>
                {toast.description && (
                  <p className="font-sans text-[11px] text-zinc-400 mt-1 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-zinc-500 hover:text-white transition cursor-pointer p-1 rounded-md hover:bg-zinc-900/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
