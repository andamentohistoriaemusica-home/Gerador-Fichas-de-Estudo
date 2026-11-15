import { Ficha, ArtistaData, MovimentoData, MusicaData, RoteiroData, InstrumentoData } from "../types";

// Default/Standard Templates recommended for Obsidian to populate the vault
export const DEFAULT_TEMPLATES: Record<string, string> = {
  artista: `---
title: "{{nome}}"
type: "artista"
era: "{{era_badge}}"
tags: [fichas-musicais, artista, {{era_tag}}]
created_at: "{{created_at}}"
---

# 🎭 Artista: {{nome}}
*(Original: {{nome_original}})*

> [!abstract] **Estética e Legado**
> {{tagline}}

## 📊 Metadados de Identificação
- **Nome Civil Completo**: {{nome_completo}}
- **Período / Era**: [[{{era_badge}}]]
- **Nascimento e Morte**: {{nascimento_morte}}
- **Nacionalidade**: {{nacionalidade}}
- **Instrumentos Principais**: {{instrumentos}}
- **Gêneros Associados**: {{generos}}

---

## 📝 Biografia Essencial
{{biografia}}

---

## 💿 Obras de Relevância (Para o Canal e Estudos)
{{obras}}

---

## 🔬 Análise Técnica e Linguagem Estética
{{analise}}

---

## 🎬 Ganchos de Storytelling (Curiosidades para Retenção de Vídeos)
{{ganchos}}

---

## 🔗 Conexões e Filiações Artísticas
- **Influenciou Diretamente**: {{influenciou}}
- **Teve Influência de (Foi Influenciado por)**: {{influenciado_por}}
- **Movimentos Estéticos Vinculados**: {{movimento}}
- **Conexões Inesperadas**: {{conexoes_inesperadas}}

---
## 📚 Fontes Bibliográficas Recomendadas
{{fontes}}
`,

  movimento: `---
title: "{{nome}}"
type: "movimento"
periodo: "{{periodo}}"
tags: [fichas-musicais, movimento]
created_at: "{{created_at}}"
---

# 🏛 Movimento: {{nome}}
*Atividade: {{periodo}} | Origem Geopolítica: [[{{origem}}]]*

> [!quote] **Espírito do Movimento**
> {{tagline}}

## 📝 Visão Geral Estética & Manifesto
{{descricao_geral}}

---

## 🏛 Contexto Histórico e Político-Social
{{contexto_historico}}

---

## 🔬 Características Musicais (Assinatura Técnica)
{{caracteristicas}}

---

## 👥 Figuras Centrais e Líderes Poéticos
{{figuras}}

---

## 💿 Obras & LPs Fundamentais Representativos
{{obras_representativas}}

---

## 🔗 Árvore de Influência & Rebeldias
- **Surgiu de (Origens)**: {{surgiu_de}}
- **Deixou Legado de Influência para**: {{influenciou}}
- **Estilos Irmãos Ativos em Paralelo**: {{em_paralelo}}
- **Reação Estética Direta contra**: {{reacao_contra}}

---

## 🎬 Ganchos de Bastidores (Curiosidades Artísticas e Storytelling)
{{ganchos}}

---
## 📚 Fontes Bibliográficas Recomendadas
{{fontes}}
`,

  musica: `---
title: "{{titulo}}"
type: "musica"
artista: "{{artista}}"
ano: "{{ano}}"
tags: [fichas-musicais, musica-pivo]
created_at: "{{created_at}}"
---

# 🎼 Música Pivô: {{titulo}}
*Compositor/Artista: [[{{artista}}]] | Lançamento: [[{{ano}}]] | Gênero: {{genero}}*

> [!example] **Impacto em Destaque**
> {{tagline}}

## 🎯 Por que esta Composição é um Pivô Histórico?
{{por_que_pivo}}

---

## 🏛 Contexto de Criação, Bastidores & Estúdio
{{contexto_criacao}}

---

## 🔬 Análise Técnica da Composição (Harmonia, Melodia, Ritmo e Timbre)
{{analise_musical}}

---

## ⚡️ Impacto Histórico, Inovações Tecnológicas & Legado
{{impactos}}

---

## 🎬 Ganchos Narrativos e Curiosidades (Fisgar Espectadores)
{{ganchos}}

---

## 🔗 Conexões e Links Estruturais
- **Artistas Envolvidos**: {{artistas}}
- **Movimentos Estéticos Associados**: {{movimento}}
- **Parâmetros e Gêneros Influenciados**: {{influenciou}}
- **Conceitos Teóricos Utilizados**: {{conceitos_teoricos}}

---
## 📚 Fontes Bibliográficas Recomendadas
{{fontes}}
`,

  roteiro: `---
title: "{{titulo}}"
type: "roteiro"
tags: [fichas-musicais, roteiro-video]
created_at: "{{created_at}}"
---

# 🎬 Roteiro de Ensaio Visual: {{titulo}}
*Formato: {{formato}} | Tema: {{era_genero}}*

---
> [!meta] **Tese de Ouro Narrativa**
> *{{tese_central}}*
---

## 🎙 Gancho Verbal - Primeiros 30 Segundos (Verbatim)
> {{gancho_30s}}

---

## 🧭 Estrutura Dinâmica & Direção de Arte do Vídeo

### 1. Introdução Narrativa (~10%)
{{introducao}}

### 2. Desenvolvimento com Profundidade (~75%)
{{desenvolvimento}}

### 3. Conclusão Rápida & CTA (~15%)
{{conclusao}}

---

## ↯ Pontos de Virada Narrativos (Plot Twists)
{{pontos_virada}}

---

## 🎨 Recursos Visuais, Edição & Efeitos Sugeridos
{{recursos_visuais}}

---

## 📌 Títulos Alternativos Projetados (Alta Retenção / CTR)
{{titulos_alternativos}}

---

## 🖼 Ideia de Capa (Thumbnail Concept)
{{thumbnail_ideia}}

---
## 📚 Fontes Bibliográficas Recomendadas
{{fontes}}
`,

  instrumento: `---
title: "{{nome}}"
type: "instrumento"
tags: [fichas-musicais, instrumento]
created_at: "{{created_at}}"
---

# 🎷 Instrumento: {{nome}}
*Família Acústica: [[{{familia}}]] | Origem: {{origem_historica}}*

> [!info] **Assinatura Sonora**
> {{tagline}}

## 📊 Especificações Técnicas
- **Classificação Sachs-Hornbostel**: {{classificacao_sachs_hornbostel}}
- **Fundadores, Luthiers ou Inventores Pioneiros**: {{construtores_pioneiros}}

---

## 🔊 Mecânica e Funcionamento Acústico
{{funcionamento_acustico}}

---

## 🔬 Registros e Características Timbrísticas
{{caracteristicas_timbristicas}}

---

## 👥 Mestres, Virtuoses e Pioneiros no Instrumento
{{pioneiros_virtuoses}}

---

## 💿 Obras Chave e Solo de Referência
{{obras_chave}}

---

## 🛠 Técnicas Expressivas & Contextos Históricos
- **Técnicas Expandidas**: {{tecnicas_expressivas}}
- **Contextos Culturais e Sociais**: {{conexoes_historicas}}

---

## 🎬 Ganchos Biográficos & Curiosidades Luthias
{{ganchos}}

---
## 📚 Fontes Bibliográficas Recomendadas
{{fontes}}
`
};

/**
 * Converte referências soltas a termos musicais e nomes reconhecidos em Wiki-links do Obsidian
 * para enriquecer o grafo e o mapa de eras do vault.
 */
export function enriquecerComWikiLinks(texto: string, termosFichas: string[] = []): string {
  if (!texto) return "";
  let resultado = texto;

  // Dicionário padrão de períodos, movimentos e figuras históricas importantes da música
  // que sempre devem tentar ser conectados no mapa de eras se mencionados.
  const termosFamosos = [
    "Barroco", "Classicismo", "Romantismo", "Modernismo", "Renascimento", "Impressionismo",
    "Bossa Nova", "Jazz", "Choro", "Samba", "Fuga", "Sonata", "Sinfonia", "Luthier",
    "Bach", "Mozart", "Beethoven", "Chopin", "Stravinsky", "Vivaldi", "Debussy", "Wagner",
    "Villa-Lobos", "Tom Jobim", "João Gilberto", "Caetano Veloso", "Gilberto Gil", "Pixinguinha",
    "Schoenberg", "Liszt", "Schubert", "Monteverdi", "Puccini", "Verdi"
  ];

  // Combina com termos do próprio cofre para criar conexões cruzadas inteligentes
  const todosTermos = Array.from(new Set([
    ...termosFichas.filter(t => t && t.length > 3),
    ...termosFamosos
  ])).sort((a, b) => b.length - a.length); // Ordena decrescente por tamanho para evitar substituir partes de palavras maiores

  for (const termo of todosTermos) {
    if (!termo) continue;
    
    // Regex para encontrar a palavra exata com limite de palavra (\b) para não quebrar tags ou strings que já estão em links.
    // Garante que o termo não esteja dentro de colchetes [[termo]] ou de um link markdown [termo](...)
    // ou precedido de um caractere especial de markdown.
    // Usamos uma heurística simples: de forma segura, procura ocorrências da palavra isolada.
    const escapedTermo = termo.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    
    // Regex segura que substitui se não estiver pré-emoldurada por colchetes
    const regex = new RegExp(`(?<!\\[\\[|\\bimg:|\\burl:)\\b(${escapedTermo})\\b(?!\\]\\])`, "gi");
    
    // Substitui apenas as ocorrências que não estão em links
    resultado = resultado.replace(regex, (match) => {
      return `[[${match}]]`;
    });
  }

  return resultado;
}

/**
 * Realiza a fusão entre um template em formato texto Markdown e os dados de uma ficha técnica.
 * Substitui inteligentemente os placeholders e as tabelas/listas.
 */
export function fusionarFichaComTemplate(
  templateText: string,
  ficha: Ficha,
  nomesFichasParaLinks: string[] = []
): string {
  const d = ficha.data;
  let text = templateText;

  // 1. Substituições Universais
  text = text.replace(/\{\{nome\}\}/g, (d as any).nome || (d as any).titulo || ficha.titulo || "");
  text = text.replace(/\{\{titulo\}\}/g, (d as any).titulo || (d as any).nome || ficha.titulo || "");
  const taglineText = (d as any).tagline || "";
  text = text.replace(/\{\{tagline\}\}/g, taglineText);
  text = text.replace(/\{\{created_at\}\}/g, new Date(ficha.createdAt).toISOString());
  text = text.replace(/\{\{fontes\}\}/g, d.fontes || "");

  // Gera tags apropriadas baseadas na era para catalogação
  const eraBadge = (d as any).era_badge || (d as any).periodo || "";
  text = text.replace(/\{\{era_badge\}\}/g, eraBadge);
  const eraTag = eraBadge
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  text = text.replace(/\{\{era_tag\}\}/g, eraTag);

  // 2. Substituições Específicas baseadas no Tipo de Ficha
  if (ficha.tipo === "artista") {
    const art = d as ArtistaData;
    text = text.replace(/\{\{nome_original\}\}/g, art.nome_original || "");
    text = text.replace(/\{\{nome_completo\}\}/g, art.nome_completo || "");
    text = text.replace(/\{\{nascimento_morte\}\}/g, art.nascimento_morte || "");
    text = text.replace(/\{\{nacionalidade\}\}/g, art.nacionalidade || "");
    text = text.replace(/\{\{instrumentos\}\}/g, art.instrumentos || "");
    text = text.replace(/\{\{generos\}\}/g, (art.generos || []).map(g => `[[${g}]]`).join(", "));
    text = text.replace(/\{\{biografia\}\}/g, art.biografia || "");

    // Formata Obras Essenciais
    const obrasTexto = (art.obras || [])
      .map(o => `### 💿 [[${o.titulo}]]${o.ano ? ` (${o.ano})` : ""}\n> **Importância de Repertório:** ${o.descricao}`)
      .join("\n\n");
    text = text.replace(/\{\{obras\}\}/g, obrasTexto);

    // Formata Análise Técnica
    const analiseTexto = (art.analise || [])
      .map(a => `* **${a.chave}**: ${a.valor}`)
      .join("\n");
    text = text.replace(/\{\{analise\}\}/g, analiseTexto);

    // Formata Ganchos
    const ganchosTexto = (art.ganchos || []).map(g => `> 🎣 **Gancho Cinematográfico:** ${g}`).join("\n\n");
    text = text.replace(/\{\{ganchos\}\}/g, ganchosTexto);

    // Conexões
    text = text.replace(/\{\{influenciou\}\}/g, (art.influenciou || []).map(i => `[[${i}]]`).join(", "));
    text = text.replace(/\{\{influenciado_por\}\}/g, (art.influenciado_por || []).map(i => `[[${i}]]`).join(", "));
    text = text.replace(/\{\{movimento\}\}/g, (art.movimento || []).map(m => `[[${m}]]`).join(", "));
    text = text.replace(/\{\{conexoes_inesperadas\}\}/g, (art.conexoes_inesperadas || []).map(c => `* ${c}`).join("\n"));

  } else if (ficha.tipo === "movimento") {
    const mov = d as MovimentoData;
    text = text.replace(/\{\{periodo\}\}/g, mov.periodo || "");
    text = text.replace(/\{\{origem\}\}/g, mov.origem || "");
    text = text.replace(/\{\{descricao_geral\}\}/g, mov.descricao_geral || "");
    text = text.replace(/\{\{contexto_historico\}\}/g, mov.contexto_historico || "");

    // Características técnicas
    const caracTexto = (mov.caracteristicas || [])
      .map(c => `* **${c.aspecto}**: ${c.descricao}`)
      .join("\n");
    text = text.replace(/\{\{caracteristicas\}\}/g, caracTexto);

    // Figuras centrais
    const figsTexto = (mov.figuras || [])
      .map(f => `* **[[${f.nome}]]**: ${f.papel}`)
      .join("\n");
    text = text.replace(/\{\{figuras\}\}/g, figsTexto);

    // Obras representativas
    const obrasTexto = (mov.obras_representativas || [])
      .map(o => `### 💿 [[${o.titulo}]] — [[${o.artista}]]\n*Ano: ${o.ano}* | **Importância:** ${o.importancia}`)
      .join("\n\n");
    text = text.replace(/\{\{obras_representativas\}\}/g, obrasTexto);

    // Conexões e Legados
    text = text.replace(/\{\{surgiu_de\}\}/g, (mov.surgiu_de || []).map(s => `[[${s}]]`).join(", "));
    text = text.replace(/\{\{influenciou\}\}/g, (mov.influenciou || []).map(i => `[[${i}]]`).join(", "));
    text = text.replace(/\{\{em_paralelo\}\}/g, (mov.em_paralelo || []).map(p => `[[${p}]]`).join(", "));
    text = text.replace(/\{\{reacao_contra\}\}/g, (mov.reacao_contra || []).map(r => `[[${r}]]`).join(", "));

    // Ganchos
    const ganchosTexto = (mov.ganchos || []).map(g => `> 🎣 **Factóide de Impacto:** ${g}`).join("\n\n");
    text = text.replace(/\{\{ganchos\}\}/g, ganchosTexto);

  } else if (ficha.tipo === "musica") {
    const mus = d as MusicaData;
    text = text.replace(/\{\{artista\}\}/g, mus.artista || "");
    text = text.replace(/\{\{ano\}\}/g, mus.ano || "");
    text = text.replace(/\{\{genero\}\}/g, mus.genero || "");
    text = text.replace(/\{\{por_que_pivo\}\}/g, mus.por_que_pivo || "");
    text = text.replace(/\{\{contexto_criacao\}\}/g, mus.contexto_criacao || "");

    // Análise técnica
    const analiseTexto = (mus.analise_musical || [])
      .map(a => `* **${a.chave}**: ${a.valor}`)
      .join("\n");
    text = text.replace(/\{\{analise_musical\}\}/g, analiseTexto);

    // Impactos
    const impsTexto = (mus.impactos || []).map(i => `* ${i}`).join("\n");
    text = text.replace(/\{\{impactos\}\}/g, impsTexto);

    // Ganchos
    const ganchosTexto = (mus.ganchos || []).map(g => `> 🎣 **Curiosidade Narrativa:** ${g}`).join("\n\n");
    text = text.replace(/\{\{ganchos\}\}/g, ganchosTexto);

    // Conexões
    text = text.replace(/\{\{artistas\}\}/g, (mus.artistas || []).map(a => `[[${a}]]`).join(", "));
    text = text.replace(/\{\{movimento\}\}/g, (mus.movimento || []).map(m => `[[${m}]]`).join(", "));
    text = text.replace(/\{\{influenciou\}\}/g, (mus.influenciou || []).map(i => `[[${i}]]`).join(", "));
    text = text.replace(/\{\{conceitos_teoricos\}\}/g, (mus.conceitos_teoricos || []).map(c => `\`${c}\``).join(", "));

  } else if (ficha.tipo === "roteiro") {
    const rot = d as RoteiroData;
    text = text.replace(/\{\{formato\}\}/g, rot.formato || "");
    text = text.replace(/\{\{era_genero\}\}/g, rot.era_genero || "");
    text = text.replace(/\{\{gancho_30s\}\}/g, rot.gancho_30s || "");
    text = text.replace(/\{\{tese_central\}\}/g, rot.tese_central || "");
    text = text.replace(/\{\{introducao\}\}/g, rot.introducao || "");
    text = text.replace(/\{\{desenvolvimento\}\}/g, rot.desenvolvimento || "");
    text = text.replace(/\{\{conclusao\}\}/g, rot.conclusao || "");

    const viradasTexto = (rot.pontos_virada || []).map(v => `* **Virada Crítica:** ${v}`).join("\n");
    text = text.replace(/\{\{pontos_virada\}\}/g, viradasTexto);

    const visuaisTexto = (rot.recursos_visuais || []).map(v => `* ${v}`).join("\n");
    text = text.replace(/\{\{recursos_visuais\}\}/g, visuaisTexto);

    const altsTexto = (rot.titulos_alternativos || []).map(a => `* ${a}`).join("\n");
    text = text.replace(/\{\{titulos_alternativos\}\}/g, altsTexto);

    text = text.replace(/\{\{thumbnail_ideia\}\}/g, rot.thumbnail_ideia || "");

  } else if (ficha.tipo === "instrumento") {
    const inst = d as InstrumentoData;
    text = text.replace(/\{\{familia\}\}/g, inst.familia || "");
    text = text.replace(/\{\{classificacao_sachs_hornbostel\}\}/g, inst.classificacao_sachs_hornbostel || "");
    text = text.replace(/\{\{origem_historica\}\}/g, inst.origem_historica || "");
    text = text.replace(/\{\{construtores_pioneiros\}\}/g, inst.construtores_pioneiros || "");
    text = text.replace(/\{\{funcionamento_acustico\}\}/g, inst.funcionamento_acustico || "");

    // Registros timbrísticos
    const regsTexto = (inst.caracteristicas_timbristicas || [])
      .map(t => `* **${t.registro}**: ${t.descricao}`)
      .join("\n");
    text = text.replace(/\{\{caracteristicas_timbristicas\}\}/g, regsTexto);

    // Mestres e virtuoses
    const virtTexto = (inst.pioneiros_virtuoses || [])
      .map(v => `* **[[${v.nome}]]**: ${v.estilo_contribuicao}`)
      .join("\n");
    text = text.replace(/\{\{pioneiros_virtuoses\}\}/g, virtTexto);

    // Obras chave
    const obrasTexto = (inst.obras_chave || [])
      .map(o => `### 💿 [[${o.titulo}]] — [[${o.artista}]] (${o.ano})\n> **Uso do Instrumento:** ${o.descricao}`)
      .join("\n\n");
    text = text.replace(/\{\{obras_chave\}\}/g, obrasTexto);

    // Técnicas / Conexões
    text = text.replace(/\{\{tecnicas_expressivas\}\}/g, (inst.tecnicas_expressivas || []).map(t => `\`${t}\``).join(", "));
    text = text.replace(/\{\{conexoes_historicas\}\}/g, (inst.conexoes_historicas || []).map(c => `[[${c}]]`).join(", "));

    // Ganchos
    const ganchosTexto = (inst.ganchos || []).map(g => `> 🎣 **Curiosidade Acústica:** ${g}`).join("\n\n");
    text = text.replace(/\{\{ganchos\}\}/g, ganchosTexto);
  }

  // Se restarem algumas chaves no formato {{chave}} que não foram preenchidas, vamos removê-las de forma limpa.
  text = text.replace(/\{\{[^}]+\}\}/g, "-");

  // 3. Enriquecer o texto final com links e marcações para o Mapa de Eras e Grafo do Obsidian!
  return enriquecerComWikiLinks(text, nomesFichasParaLinks);
}
