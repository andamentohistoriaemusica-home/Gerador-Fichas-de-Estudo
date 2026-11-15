import { Ficha, ArtistaData, MovimentoData, MusicaData, RoteiroData, InstrumentoData } from "../types";
import { fusionarFichaComTemplate, DEFAULT_TEMPLATES } from "./templateEngine";
import JSZip from "jszip";

/**
 * Gracesfully formats various Date representations (string, number, Firestore Timestamp) to ISO.
 */
function formatDate(dateAny: any): string {
  if (!dateAny) return new Date().toISOString();
  if (typeof dateAny.toDate === "function") {
    return dateAny.toDate().toISOString();
  }
  if (dateAny.seconds) {
    return new Date(dateAny.seconds * 1000).toISOString();
  }
  try {
    const d = new Date(dateAny);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {
    // Ignore and fallback
  }
  return new Date().toISOString();
}

/**
 * Builds an exceptionally complete Obsidian-compatible YAML front-matter with all structured fields.
 */
export function buildObsidianFrontMatter(ficha: Ficha): string {
  const d = ficha.data;
  const lines: string[] = [];

  lines.push("---");
  lines.push(`id: "${ficha.id || ""}"`);
  lines.push(`title: "${(ficha.titulo || "").replace(/"/g, '\\"')}"`);
  lines.push(`type: "${ficha.tipo}"`);
  
  if ((d as any).foto_url) {
    lines.push(`image: "${(d as any).foto_url}"`);
  }
  
  const tags: string[] = ["fichas-musicais", ficha.tipo];
  
  if (ficha.tipo === "artista") {
    const art = d as ArtistaData;
    lines.push(`nome_original: "${(art.nome_original || "").replace(/"/g, '\\"')}"`);
    lines.push(`era: "${(art.era_badge || "").replace(/"/g, '\\"')}"`);
    lines.push(`nome_completo: "${(art.nome_completo || "").replace(/"/g, '\\"')}"`);
    lines.push(`nascimento_morte: "${(art.nascimento_morte || "").replace(/"/g, '\\"')}"`);
    lines.push(`nacionalidade: "${(art.nacionalidade || "").replace(/"/g, '\\"')}"`);
    lines.push(`instrumentos_principais: "${(art.instrumentos || "").replace(/"/g, '\\"')}"`);
    
    if (art.generos && art.generos.length > 0) {
      lines.push("generos:");
      art.generos.forEach(g => lines.push(`  - "${g.replace(/"/g, '\\"')}"`));
    }
    if (art.influenciou && art.influenciou.length > 0) {
      lines.push("influenciou:");
      art.influenciou.forEach(i => lines.push(`  - "${i.replace(/"/g, '\\"')}"`));
    }
    if (art.influenciado_por && art.influenciado_por.length > 0) {
      lines.push("influenciado_por:");
      art.influenciado_por.forEach(i => lines.push(`  - "${i.replace(/"/g, '\\"')}"`));
    }
    if (art.movimento && art.movimento.length > 0) {
      lines.push("movimentos_associados:");
      art.movimento.forEach(m => lines.push(`  - "${m.replace(/"/g, '\\"')}"`));
    }
    if (art.conexoes_inesperadas && art.conexoes_inesperadas.length > 0) {
      lines.push("conexoes_inesperadas:");
      art.conexoes_inesperadas.forEach(c => lines.push(`  - "${c.replace(/"/g, '\\"')}"`));
    }
    if (art.era_badge) {
      const eraTag = art.era_badge
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-");
      tags.push(eraTag);
    }
    
  } else if (ficha.tipo === "movimento") {
    const mov = d as MovimentoData;
    lines.push(`periodo: "${(mov.periodo || "").replace(/"/g, '\\"')}"`);
    lines.push(`origem: "${(mov.origem || "").replace(/"/g, '\\"')}"`);
    
    if (mov.surgiu_de && mov.surgiu_de.length > 0) {
      lines.push("surgiu_de:");
      mov.surgiu_de.forEach(s => lines.push(`  - "${s.replace(/"/g, '\\"')}"`));
    }
    if (mov.influenciou && mov.influenciou.length > 0) {
      lines.push("influenciou:");
      mov.influenciou.forEach(i => lines.push(`  - "${i.replace(/"/g, '\\"')}"`));
    }
    if (mov.em_paralelo && mov.em_paralelo.length > 0) {
      lines.push("em_paralelo:");
      mov.em_paralelo.forEach(p => lines.push(`  - "${p.replace(/"/g, '\\"')}"`));
    }
    if (mov.reacao_contra && mov.reacao_contra.length > 0) {
      lines.push("reacao_contra:");
      mov.reacao_contra.forEach(r => lines.push(`  - "${r.replace(/"/g, '\\"')}"`));
    }
    if (mov.figuras && mov.figuras.length > 0) {
      lines.push("figuras_centrais:");
      mov.figuras.forEach(f => lines.push(`  - "${(f.nome || "").replace(/"/g, '\\"')}"`));
    }
    
  } else if (ficha.tipo === "musica") {
    const mus = d as MusicaData;
    lines.push(`artista: "${(mus.artista || "").replace(/"/g, '\\"')}"`);
    lines.push(`ano_lancamento: "${(mus.ano || "").replace(/"/g, '\\"')}"`);
    lines.push(`genero: "${(mus.genero || "").replace(/"/g, '\\"')}"`);
    lines.push(`categoria: "${(mus.badge || "").replace(/"/g, '\\"')}"`);
    
    if (mus.artistas && mus.artistas.length > 0) {
      lines.push("artistas_envolvidos:");
      mus.artistas.forEach(a => lines.push(`  - "${a.replace(/"/g, '\\"')}"`));
    }
    if (mus.movimento && mus.movimento.length > 0) {
      lines.push("movimentos_esteticos:");
      mus.movimento.forEach(m => lines.push(`  - "${m.replace(/"/g, '\\"')}"`));
    }
    if (mus.influenciou && mus.influenciou.length > 0) {
      lines.push("influenciou:");
      mus.influenciou.forEach(i => lines.push(`  - "${i.replace(/"/g, '\\"')}"`));
    }
    if (mus.conceitos_teoricos && mus.conceitos_teoricos.length > 0) {
      lines.push("conceitos_teoricos:");
      mus.conceitos_teoricos.forEach(c => lines.push(`  - "${c.replace(/"/g, '\\"')}"`));
    }
    
  } else if (ficha.tipo === "roteiro") {
    const rot = d as RoteiroData;
    lines.push(`formato: "${(rot.formato || "").replace(/"/g, '\\"')}"`);
    lines.push(`era_genero: "${(rot.era_genero || "").replace(/"/g, '\\"')}"`);
    lines.push(`tese_central: "${(rot.tese_central || "").replace(/"/g, '\\"')}"`);
    
    if (rot.titulos_alternativos && rot.titulos_alternativos.length > 0) {
      lines.push("titulos_alternativos:");
      rot.titulos_alternativos.forEach(a => lines.push(`  - "${a.replace(/"/g, '\\"')}"`));
    }
    
  } else if (ficha.tipo === "instrumento") {
    const inst = d as InstrumentoData;
    lines.push(`familia_acustica: "${(inst.familia || "").replace(/"/g, '\\"')}"`);
    lines.push(`classificacao_sachs_hornbostel: "${(inst.classificacao_sachs_hornbostel || "").replace(/"/g, '\\"')}"`);
    lines.push(`origem_historica: "${(inst.origem_historica || "").replace(/"/g, '\\"')}"`);
    lines.push(`construtores_pioneiros: "${(inst.construtores_pioneiros || "").replace(/"/g, '\\"')}"`);
    
    if (inst.tecnicas_expressivas && inst.tecnicas_expressivas.length > 0) {
      lines.push("tecnicas_expressivas:");
      inst.tecnicas_expressivas.forEach(t => lines.push(`  - "${t.replace(/"/g, '\\"')}"`));
    }
    if (inst.conexoes_historicas && inst.conexoes_historicas.length > 0) {
      lines.push("conexoes_historicas:");
      inst.conexoes_historicas.forEach(c => lines.push(`  - "${c.replace(/"/g, '\\"')}"`));
    }
  }

  lines.push("tags:");
  tags.forEach(t => lines.push(`  - ${t}`));
  
  lines.push(`created_at: "${formatDate(ficha.createdAt)}"`);
  lines.push(`updated_at: "${formatDate(ficha.updatedAt || ficha.createdAt)}"`);
  lines.push("---");

  return lines.join("\n");
}

/**
 * Replaces or injects our structured, ultra-portable Obsidian properties block in any compiled Markdown string.
 */
export function injectRichFrontMatterInMarkdown(rawMarkdown: string, ficha: Ficha): string {
  const richFM = buildObsidianFrontMatter(ficha);
  const trimmed = rawMarkdown.trim();
  
  if (trimmed.startsWith("---")) {
    const secondSeparatorIndex = trimmed.indexOf("---", 3);
    if (secondSeparatorIndex !== -1) {
      // Extract the body of the markdown, skipping the basic template's frontmatter
      const rest = trimmed.substring(secondSeparatorIndex + 3).trim();
      return `${richFM}\n\n${rest}`;
    }
  }
  return `${richFM}\n\n${trimmed}`;
}

export function getFichaMdString(
  ficha: Ficha,
  customTemplate?: string,
  nomesFichasParaLinks?: string[]
): string {
  let rawBodyMd = "";
  const templateToUse = customTemplate || DEFAULT_TEMPLATES[ficha.tipo];
  
  if (templateToUse) {
    try {
      rawBodyMd = fusionarFichaComTemplate(templateToUse, ficha, nomesFichasParaLinks);
    } catch (e) {
      console.warn("Erro ao fazer fusão com o template, usando gerador nativo:", e);
    }
  }

  // Fallback to beautiful native generation if template failed or was empty
  if (!rawBodyMd) {
    const d = ficha.data;
    let bodyMd = "";

    if (ficha.tipo === "artista") {
      const art = d as ArtistaData;
      const obras = (art.obras || [])
        .map(o => `### ${o.titulo} (${o.ano})\n${o.descricao}`)
        .join("\n\n");
      
      const analise = (art.analise || [])
        .map(a => `* **${a.chave}**: ${a.valor}`)
        .join("\n");

      const ganchos = (art.ganchos || []).map(g => `> 🎣 ${g}`).join("\n\n");

      bodyMd = `
# ${art.nome}
${art.foto_url ? `![${art.nome}](${art.foto_url})\n\n` : ""}*${art.nome_original}*

> ${art.tagline}

## 📊 Metadados
- **Era / Período**: ${art.era_badge}
- **Nome Completo civil**: ${art.nome_completo}
- **Nascimento / Morte**: ${art.nascimento_morte}
- **Nacionalidade**: ${art.nacionalidade}
- **Instrumentos**: ${art.instrumentos}
- **Gêneros**: ${art.generos.join(", ")}

## 📝 Biografia Essencial
${art.biografia}

## 💿 Obras Essenciais para o Canal
${obras}

## 🔬 Análise Técnica
${analise}

## 🎬 Ganchos de Retenção para Vídeos
${ganchos}

## 🔗 Conexões Estéticas
- **Influenciou**: ${art.influenciou.join(", ")}
- **Foi Influenciado por**: ${art.influenciado_por.join(", ")}
- **Movimentos associados**: ${art.movimento.join(", ")}
- **Conexões Inesperadas**: ${art.conexoes_inesperadas.join(", ")}
`;
    } else if (ficha.tipo === "movimento") {
      const mov = d as MovimentoData;
      const carac = (mov.caracteristicas || [])
        .map(c => `* **${c.aspecto}**: ${c.descricao}`)
        .join("\n");

      const figs = (mov.figuras || [])
        .map(f => `* **${f.nome}**: ${f.papel}`)
        .join("\n");

      const obras = (mov.obras_representativas || [])
        .map(o => `### ${o.titulo} — *${o.artista}* (${o.ano})\n${o.importancia}`)
        .join("\n\n");

      const ganchos = (mov.ganchos || []).map(g => `> 🎣 ${g}`).join("\n\n");

      bodyMd = `
# Movimento: ${mov.nome}
${mov.foto_url ? `![${mov.nome}](${mov.foto_url})\n\n` : ""}*${mov.periodo} · ${mov.origem}*

> ${mov.tagline}

## 📝 Visão Geral Estética
${mov.descricao_geral}

## 🏛 Contexto Histórico
${mov.contexto_historico}

## 🔬 Características Musicais
${carac}

## 👥 Figuras Centrais
${figs}

## 💿 Obras Representativas
${obras}

## 🔗 Filiações Históricas
- **Surgiu de**: ${mov.surgiu_de.join(", ")}
- **Influenciou**: ${mov.influenciou.join(", ")}
- **Em paralelo**: ${mov.em_paralelo.join(", ")}
- **Reação contra**: ${mov.reacao_contra.join(", ")}

## 🎬 Ganchos para Vídeo
${ganchos}
`;
    } else if (ficha.tipo === "musica") {
      const mus = d as MusicaData;
      const analise = (mus.analise_musical || [])
        .map(a => `* **${a.chave}**: ${a.valor}`)
        .join("\n");

      const imps = (mus.impactos || []).map(i => `* ${i}`).join("\n");
      const ganchos = (mus.ganchos || []).map(g => `> 🎣 ${g}`).join("\n\n");

      bodyMd = `
# Música Pivô: ${mus.titulo}
${mus.foto_url ? `![${mus.titulo}](${mus.foto_url})\n\n` : ""}*${mus.artista} (${mus.ano})*

> ${mus.tagline}

## 🎯 Por que é uma Música Pivô?
${mus.por_que_pivo}

## 🏛 Contexto de Criação & Estúdio
${mus.contexto_criacao}

## 🔬 Análise Técnica da Composição
${analise}

## ⚡️ Impacto Histórico & Legado
${imps}

## 🎬 Ganchos Narrativos
${ganchos}

## 🔗 Conexões
- **Artistas**: ${mus.artistas.join(", ")}
- **Movimentos**: ${mus.movimento.join(", ")}
- **Influenciou**: ${mus.influenciou.join(", ")}
- **Conceitos Teóricos**: ${mus.conceitos_teoricos.join(", ")}
`;
    } else if (ficha.tipo === "roteiro") {
      const rot = d as RoteiroData;
      const viradas = (rot.pontos_virada || []).map(v => `* ${v}`).join("\n");
      const visuais = (rot.recursos_visuais || []).map(r => `* ${r}`).join("\n");
      const alts = (rot.titulos_alternativos || []).map(a => `* ${a}`).join("\n");

      bodyMd = `
# Roteiro: ${rot.titulo}
${rot.foto_url ? `![${rot.titulo}](${rot.foto_url})\n\n` : ""}*Formato: ${rot.formato} | Tema: ${rot.era_genero}*

## 🎬 Gancho dos 30 Segundos Iniciais (Narrador Verbatim)
> ${rot.gancho_30s}

---
**Tese Central**: *${rot.tese_central}*
---

## 🧭 Estrutura Dinâmica do Vídeo

### 1. Introdução (~10%)
${rot.introducao}

### 2. Desenvolvimento (~75%)
${rot.desenvolvimento}

### 3. Conclusão & CTA (~15%)
${rot.conclusao}

## ↯ Pontos de Virada Narrativos
${viradas}

## 🎨 Recursos Visuais & Direção de Arte
${visuais}

## 📌 Títulos Alternativos recomendados (Alta Retenção)
${alts}

## 🖼 Ideia de Capa (Thumbnail)
${rot.thumbnail_ideia}
`;
    } else if (ficha.tipo === "instrumento") {
      const inst = d as InstrumentoData;
      const timbricas = (inst.caracteristicas_timbristicas || [])
        .map(t => `* **${t.registro}**: ${t.descricao}`)
        .join("\n");

      const virtuoses = (inst.pioneiros_virtuoses || [])
        .map(v => `* **${v.nome}**: ${v.estilo_contribuicao}`)
        .join("\n");

      const obras = (inst.obras_chave || [])
        .map(o => `### ${o.titulo} — *${o.artista}* (${o.ano})\n${o.descricao}`)
        .join("\n\n");

      const ganchos = (inst.ganchos || []).map(g => `> 🎣 ${g}`).join("\n\n");

      bodyMd = `
# Instrumento: ${inst.nome}
${inst.foto_url ? `![${inst.nome}](${inst.foto_url})\n\n` : ""}

> ${inst.tagline}

## 📊 Metadados
- **Família Acústica**: ${inst.familia}
- **Classificação Sachs-Hornbostel**: ${inst.classificacao_sachs_hornbostel}
- **Origem Histórica**: ${inst.origem_historica}
- **Criadores e Pioneiros**: ${inst.construtores_pioneiros}

## 🔊 Mecânica de Funcionamento Acústico
${inst.funcionamento_acustico}

## 🔬 Registros e Características Timbrísticas
${timbricas}

## 👥 Mestres & Virtuoses do Instrumento
${virtuoses}

## 💿 Obras Chave de Referência
${obras}

## 🛠 Técnicas Expressivas & Contextos
- **Técnicas**: ${(inst.tecnicas_expressivas || []).join(", ")}
- **Contextos e Relações**: ${(inst.conexoes_historicas || []).join(", ")}

## 🎬 Ganchos Biográficos & Curiosidades
${ganchos}
`;
    }

    rawBodyMd = `${bodyMd}\n\n## 📚 Fontes Bibliográficas Recomendadas\n${d.fontes || ""}`;
  }

  // Intercept raw compiled markdown to inject the Obsidian properties formatted YAML front-matter
  return injectRichFrontMatterInMarkdown(rawBodyMd, ficha);
}

export function sanitizeFichaFileName(ficha: Ficha): string {
  const safeName = (ficha.titulo || "ficha_musical")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_+|_+$)/g, "");

  return `ficha_${ficha.tipo}_${safeName || "sem_titulo"}.md`;
}

// Client helper to trigger browser download
export function downloadFichaAsMd(ficha: Ficha) {
  const mdContent = getFichaMdString(ficha);
  const blob = new Blob([mdContent], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  link.download = sanitizeFichaFileName(ficha);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface BatchZipExportOptions {
  customZipName?: string;
  allVaultTitles?: string[];
  includeIndex?: boolean;
}

/**
 * Packs multiple fichas into a single .zip file containing individual .md files
 * formatted for Obsidian / Markdown tools with complete frontmatter, and triggers browser download.
 */
export async function downloadFichasAsZip(
  fichas: Ficha[],
  options?: BatchZipExportOptions
): Promise<{ count: number; zipName: string }> {
  if (!fichas || fichas.length === 0) {
    throw new Error("Nenhuma ficha foi selecionada para exportação.");
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  const vaultTitles = options?.allVaultTitles || fichas.map((f) => f.titulo).filter(Boolean);

  const typeLabels: Record<string, string> = {
    artista: "🎭 Artista",
    movimento: "🌊 Movimento",
    musica: "🎵 Música",
    roteiro: "🎬 Roteiro",
    instrumento: "🎻 Instrumento",
  };

  const indexRows: string[] = [];

  // Generate each .md file
  fichas.forEach((ficha, index) => {
    let baseFileName = sanitizeFichaFileName(ficha);
    let finalFileName = baseFileName;
    let counter = 1;

    while (usedNames.has(finalFileName)) {
      finalFileName = baseFileName.replace(/\.md$/, `_${counter}.md`);
      counter++;
    }
    usedNames.add(finalFileName);

    // Markdown content with Obsidian frontmatter and wiki-links
    const mdContent = getFichaMdString(ficha, undefined, vaultTitles);
    zip.file(finalFileName, mdContent);

    const typeStr = typeLabels[ficha.tipo] || ficha.tipo;
    const dateFormatted = ficha.updatedAt
      ? new Date(ficha.updatedAt).toLocaleDateString("pt-BR")
      : "—";

    indexRows.push(
      `| ${typeStr} | **${(ficha.titulo || "Sem título").replace(/\|/g, "-")}** | ${(ficha.subtitulo || "—").replace(/\|/g, "-")} | \`${finalFileName}\` | ${dateFormatted} |`
    );
  });

  // Include an index Markdown file if requested (default: true)
  if (options?.includeIndex !== false) {
    const nowStr = new Date().toLocaleString("pt-BR");
    const indexContent = [
      `# 📚 Índice do Pacote de Fichas Musicais`,
      ``,
      `> **Exportação em Lote gerada em:** ${nowStr}`,
      `> **Total de Fichas:** ${fichas.length}`,
      ``,
      `Este arquivo compactado contém **${fichas.length} fichas individuais em formato Markdown (.md)** com metadados estruturados (Obsidian Properties / YAML Frontmatter), prontas para serem importadas no Obsidian, Logseq, Notion ou lidas em qualquer editor de Markdown.`,
      ``,
      `---`,
      ``,
      `## 📑 Relação das Fichas no Pacote`,
      ``,
      `| Categoria | Título | Subtítulo | Nome do Arquivo | Data |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
      ...indexRows,
      ``,
      `---`,
      `*Exportado automaticamente pelo Sistema de Fichas Musicais & História da Música.*`,
    ].join("\n");

    zip.file("00_INDICE_FICHAS.md", indexContent);
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipName =
    options?.customZipName ||
    (fichas.length === 1
      ? `ficha_${fichas[0].tipo}_${sanitizeFichaFileName(fichas[0]).replace(/\.md$/, "")}.zip`
      : `fichas_musicais_${dateStr}_(${fichas.length}_fichas).zip`);

  const downloadUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  return { count: fichas.length, zipName };
}

