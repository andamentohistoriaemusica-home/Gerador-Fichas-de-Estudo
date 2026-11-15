import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import AdmZip from "adm-zip";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI client lazily or with graceful check
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
      timeout: 20000,
    },
  });
};

// Helper for generating with automatic retry for transient errors (503, UNAVAILABLE etc.)
async function generateContentWithRetry(aiClient: any, options: { model: string; contents: string; config: any }, maxRetries = 1, delayMs = 600) {
  let attempt = 0;
  while (true) {
    try {
      return await aiClient.models.generateContent(options);
    } catch (error: any) {
      attempt++;
      
      const statusValue = String(error.status || (error.error?.status) || "");
      const messageValue = String(error.message || (error.error?.message) || "");
      const codeValue = String(error.code || (error.error?.code) || "");
      const nameValue = String(error.name || "");
      const stackValue = String(error.stack || "");
      const stringifiedValue = typeof error === 'object' ? JSON.stringify(error) : String(error);
      const errStr = `${error} ${statusValue} ${messageValue} ${codeValue} ${nameValue} ${stringifiedValue} ${stackValue}`.toUpperCase();

      const isQuota = 
        errStr.includes("RESOURCE_EXHAUSTED") || 
        errStr.includes("QUOTA EXCEEDED") || 
        errStr.includes("429") || 
        errStr.includes("LIMIT") ||
        errStr.includes("404") ||
        errStr.includes("NOT_FOUND") ||
        errStr.includes("400") ||
        errStr.includes("INVALID") ||
        errStr.includes("QUOTA_EXCEEDED");

      const isTransient = 
        errStr.includes("503") || 
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("HIGH DEMAND") ||
        errStr.includes("TEMPORARY") ||
        errStr.includes("INTERNAL ERROR") ||
        errStr.includes("500") ||
        errStr.includes("BAD GATEWAY") ||
        errStr.includes("502") ||
        errStr.includes("SERVICE UNAVAILABLE");

      // Se for limite de cota (429), não tentamos novamente com este mesmo modelo. Rejeitamos imediatamente
      // para que a corrente de fallback possa tentar outros modelos de forma instantânea sem delays redundantes.
      if (isQuota) {
        console.warn(`[Gemini API] Quota limite (429) excedida para o modelo ${options.model}. Pulando tentativas redundantes e acionando fallback imediato.`);
        throw error;
      }

      if (isTransient && attempt <= maxRetries) {
        console.warn(`[Gemini API] Tentativa ${attempt} falhou/indisponível para ${options.model}. Nova tentativa em ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2.5; // Backoff exponencial
        continue;
      }
      throw error;
    }
  }
}

// Robust JSON extraction helper to handle extra text or Markdown wrapping
function extractJson(text: string): string {
  const trimmed = text.trim();
  
  // 1. Try direct parse first
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {
    let cleaned = trimmed;
    
    // Pattern A: ```json ... ```
    const markdownPattern = /```json\s*([\s\S]*?)\s*```/;
    const matchA = cleaned.match(markdownPattern);
    if (matchA && matchA[1]) {
      const blockContent = matchA[1].trim();
      try {
        JSON.parse(blockContent);
        return blockContent;
      } catch (err) {
        cleaned = blockContent;
      }
    } else {
      // Pattern B: general code blocks ``` ... ```
      const genericPattern = /```\s*([\s\S]*?)\s*```/;
      const matchB = cleaned.match(genericPattern);
      if (matchB && matchB[1]) {
        const blockContent = matchB[1].trim();
        try {
          JSON.parse(blockContent);
          return blockContent;
        } catch (err) {
          cleaned = blockContent;
        }
      }
    }

    // Pattern C: Find first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch (err) {
        return candidate;
      }
    }
    
    // Pattern D: Find first '[' and last ']'
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.substring(firstBracket, lastBracket + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch (err) {
        return candidate;
      }
    }

    return trimmed;
  }
}

// API Endpoint for generating worksheet ("ficha") content
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { tipo, data } = req.body;
    if (!tipo) {
      return res.status(400).json({ error: "O tipo de ficha é obrigatório." });
    }

    const ai = getGeminiClient();
    let systemInstruction = "Você é um musicólogo sênior, historiador da música e roteirista apaixonado de um canal de divulgação cultural estilo ensaio visual. As fichas geradas devem ser ricas, profundas e repletas de fatos históricos surpreendentes e ganchos de alta retenção no YouTube. MUITO IMPORTANTE: Sempre que mencionar figuras importantes, inventores, movimentos estéticos, outros artistas, eras históricas, conceitos teóricos ou músicas marcantes em biografias, descrições, análises ou ganchos, envolva os nomes em Wiki-Links para o Obsidian (ex: [[Bach]], [[Romantismo]], [[Luthier]], [[Bossa Nova]], [[Adolphe Sax]], [[Sinfonia No. 9]]), de modo que essas notas fiquem lindamente interligadas e estruturadas ao alimentar o mapa de eras musicais e o visualizador do cofre.";
    let prompt = "";
    
    let youtubeInfoPrompt = "";
    if (data?.youtubeUrl) {
      youtubeInfoPrompt = `\n\n[MUITO IMPORTANTE - FONTE DE ESTUDO DO YOUTUBE]\nO usuário forneceu o seguinte link de vídeo do YouTube como fonte de estudo: ${data.youtubeUrl}.\nVocê DEVE pesquisar, identificar ou analisar o conteúdo/tema deste vídeo específico do YouTube. Extraia os principais pontos de estudo apresentados no vídeo, as teses centrais, fatos históricos mencionados, e as qualidades estéticas relevantes do assunto. Utilize toda essa informação extraída para preencher prioritariamente cada seção da ficha JSON correspondente.`;
    }

    if (tipo === "artista") {
      const { nome, era, nac, instr, generos, extra } = data;
      prompt = `Gere uma ficha completa de ARTISTA em formato JSON puro.
Nome do artista: ${nome}
Era/Período: ${era || "deduzir"}
Nacionalidade: ${nac || "deduzir"}
Instrumentos: ${instr || "deduzir"}
Gêneros: ${generos || "deduzir"}
Contexto extra ou ênfase: ${extra || "nenhuma"}

Gere uma resposta estritamente em JSON válida com a seguinte estrutura física exata (use dados reais e profundos):
{
  "tipo": "artista",
  "foto_url": "URL de uma foto real e refinada de alta resolução do Unsplash representando o artista, seu instrumento (como piano, trompete, violino), estúdio clássico ou um palco de concerto vintage em preto e branco",
  "numero": "${Math.floor(Math.random() * 900) + 100}",
  "nome": "${nome}",
  "nome_original": "Nome original em alfabeto nativo ou completo relevante",
  "era_badge": "${era || 'Ex: Romantismo tardio · Séc. XIX'}",
  "nome_completo": "Nome civil completo do artista",
  "nascimento_morte": "Datas e locais exatos de nascimento e falecimento",
  "nacionalidade": "${nac || 'Nacionalidade e região'}",
  "instrumentos": "${instr || 'Instrumentos principais tocados'}",
  "generos": ["estilo1", "estilo2", "estilo3"],
  "tagline": "Frase de impacto curta (2-3 linhas) resumindo o legado seminal deste artista.",
  "biografia": "Biografia concisa em 3-4 parágrafos focando nos dramas artísticos, tensões da época ou revoluções que ele provocou.",
  "obras": [
    {"titulo": "Obra Importante 1", "ano": "Ano", "descricao": "Por que essa obra é seminal e o que ela mudou na história"},
    {"titulo": "Obra Importante 2", "ano": "Ano", "descricao": "Explicação curatorial rica para citar no vídeo"},
    {"titulo": "Obra Importante 3", "ano": "Ano", "descricao": "Fato interessante ou inovação harmônica desta obra"}
  ],
  "analise": [
    {"chave": "Harmonia", "valor": "Análise técnica do vocabulário harmônico, modulações ou inovações estéticas específicas do artista."},
    {"chave": "Melodia", "valor": "As assinaturas melódicas comuns nas composições dele."},
    {"chave": "Ritmo e Forma", "valor": "Inovações rítmicas ou adaptações de formas clássicas/modernas."},
    {"chave": "Estilo Expressivo", "valor": "Como a instrumentação ou as dinâmicas definem a sonoridade inconfundível."}
  ],
  "ganchos": [
    "Gancho surpreendente 1 (ex: curiosidade pouco conhecida ou segredo biográfico para prender o espectador)",
    "Gancho de polêmica ou disputa artística no período",
    "Fato que conecta o artista à cultura pop atual ou outro evento histórico"
  ],
  "influenciou": ["Artista 1", "Artista 2", "Estilo Musical"],
  "influenciado_por": ["Mestre 1", "Mestre 2", "Estilo Tradicional"],
  "movimento": ["Movimento musical principal associado"],
  "conexoes_inesperadas": ["Curiosidade 1 (ex: ele influenciou física quântica ou foi amigo de pintor X)", "Curiosidade 2"],
  "fontes": "2-3 referências bibliográficas reais e conceituadas (livros, autores, pesquisas acadêmicas)."
}`;
    } else if (tipo === "movimento") {
      const { nome, periodo, origem, figuras, extra } = data;
      prompt = `Gere uma ficha completa de MOVIMENTO MUSICAL em formato JSON puro.
Movimento: ${nome}
Período aproximado: ${periodo || "deduzir"}
Origem geográfica: ${origem || "deduzir"}
Figuras centrais: ${figuras || "deduzir"}
Contexto extra do usuário: ${extra || "nenhum"}

Gere uma resposta estritamente em JSON válida com a seguinte estrutura física exata (use dados reais e profundos):
{
  "tipo": "movimento",
  "nome": "${nome}",
  "periodo": "${periodo || 'Ex: 1958–1964'}",
  "origem": "${origem || 'Ex: Rio de Janeiro, Brasil'}",
  "tagline": "Frase sintética épica e artística resumindo a importância do movimento na história.",
  "descricao_geral": "Uma visão geral estético-musical de 3 parágrafos sobre as inovações, objetivos e o manifesto desse movimento.",
  "contexto_historico": "Análise do contexto geopolítico, social ou tecnológico que incentivou o nascimento desse movimento.",
  "caracteristicas": [
    {"aspecto": "Harmonia", "descricao": "Como eles inovaram as progressões ou o uso harmônico."},
    {"aspecto": "Ritmo", "descricao": "A síncope, andamento ou levada rítmica característica do movimento."},
    {"aspecto": "Forma", "descricao": "As estruturas de canção, duração ou formatos utilizados."},
    {"aspecto": "Timbre", "descricao": "Instrumentos típicos ou técnicas de produção orgânicas/eletrônicas."},
    {"aspecto": "Textura", "descricao": "Como a sobreposição de vozes e instrumentos constrói a atmosfera."}
  ],
  "figuras": [
    {"nome": "Nome da Figura 1", "papel": "Qual foi sua contribuição estética, arranjos ou composições pioneiras"},
    {"nome": "Nome da Figura 2", "papel": "Teoria criada ou canções fundamentais de sua autoria"},
    {"nome": "Nome da Figura 3", "papel": "Manifesto literário ou gravação histórica marcante"}
  ],
  "obras_representativas": [
    {"titulo": "Obra/Álbum 1", "artista": "ArtistaX", "ano": "Ano", "importancia": "Por que esta faixa ou LP cristaliza a estética do movimento"},
    {"titulo": "Obra/Álbum 2", "artista": "ArtistaY", "ano": "Ano", "importancia": "O arranjo, letra ou detalhe de performance emblemático"},
    {"titulo": "Obra/Álbum 3", "artista": "ArtistaZ", "ano": "Ano", "importancia": "Repercussão pública ou impacto comercial/cultural"}
  ],
  "surgiu_de": ["Ideia/Estilo anterior 1", "Raiz cultural/estilo de origem"],
  "influenciou": ["Gênero herdado oitentista", "Movimento moderno", "Cultura visual"],
  "em_paralelo": ["Fato sociocultural da época", "Estilo artístico irmão (ex: cinema novo, modernismo)"],
  "reacao_contra": ["O padrão acadêmico ou comercial que eles queriam derrubar"],
  "ganchos": [
    "Fato bizarro, boêmio ou conflito icônico ocorrido nos bastidores deste movimento",
    "A mística por trás do nome do movimento ou de uma gravação chave"
  ],
  "fontes": "2-3 livros clássicos acadêmicos ou ensaios teóricos de referência sobre o movimento."
}`;
    } else if (tipo === "musica") {
      const { titulo, artista, ano, genero, extra } = data;
      prompt = `Gere uma ficha completa de MÚSICA PIVÔ em formato JSON puro.
Título da obra/álbum: ${titulo}
Artista principal: ${artista || "deduzir"}
Ano de lançamento: ${ano || "deduzir"}
Gênero/Estilo: ${genero || "deduzir"}
Contexto extra do usuário: ${extra || "nenhum"}

Gere uma resposta estritamente em JSON válida com a seguinte estrutura física exata (use dados reais e profundos):
{
  "tipo": "musica",
  "titulo": "${titulo}",
  "artista": "${artista || 'Artista de referência'}",
  "ano": "${ano || 'Ano'}",
  "genero": "${genero || 'Estilo'}",
  "badge": "${genero || 'Gênero'} · ${ano || 'Ano'}",
  "tagline": "Sentença profunda descrevendo o ápice genial ou a ruptura histórica representada por esta composição ou álbum pioneiro.",
  "por_que_pivo": "Análise curatorial detalhada (3 parágrafos) do porquê esta música funciona como um ponto de inflexão histórica unindo e mudando caminhos musicais.",
  "contexto_criacao": "As lendas de estúdio, processos criativos incomuns, pressões da gravadora ou o estado mental dos compositores no momento da gravação.",
  "analise_musical": [
    {"chave": "Harmonia", "valor": "A arquitetura de acordes, tonalidade, modulações ou escalas específicas usadas."},
    {"chave": "Melodia", "valor": "Seus motivos marcantes, tensões melódicas ou técnicas expressivas."},
    {"chave": "Ritmo", "valor": "Análise da batida, métrica complexa ou dinâmicas de andamento."},
    {"chave": "Timbre e Produção", "valor": "Reverberação, escolha de microfones, efeitos lendários ou técnicas de mixagem inovadoras."}
  ],
  "impactos": [
    "Inovação que forçou os concorrentes a mudar a sonoridade após o lançamento",
    "Recorde histórico ou como moldou a cena internacional da época",
    "Efeito cultural de longo prazo (ex: samples marcantes, trilhas de cinema míticas)"
  ],
  "ganchos": [
    "Gatilho narrativo surpreendente de bastidores ou mistério na letra",
    "Fato que causou polêmica ou censura quando lançada"
  ],
  "artistas": ["Compositor principal", "Produtor lendário", "Músicos de estúdio convidados"],
  "movimento": ["Movimento estético ou escola musical onde ela se insere"],
  "influenciou": ["Movimento posterior", "Linha de sintetizadores/instrumentos", "Estética de mixagem"],
  "conceitos_teoricos": ["Escala modal utilizada", "Inversões", "Polirritmia aplicada"],
  "fontes": "2-3 livros, documentários ou teses musicais recomendadas de alta credibilidade."
}`;
    } else if (tipo === "roteiro") {
      const { tema, era, formato, extra } = data;
      prompt = `Gere uma ficha completa de ROTEIRO DE VÍDEO em formato JSON puro.
Tema principal: ${tema}
Era/Gênero musical abordado: ${era || "deduzir"}
Formato desejado: ${formato || "Vídeo longo · YouTube"}
Tese narrativa / ângulo extra: ${extra || "criar tese esteticamente sofisticada e provocativa"}

Gere uma resposta estritamente em JSON válida com a seguinte estrutura física exata (use dados reais e profundos):
{
  "tipo": "roteiro",
  "titulo": "Título Altamente Clicável e Poético para o YouTube (estilo ensaio visual refinado)",
  "formato": "${formato || 'Vídeo longo · YouTube'}",
  "era_genero": "${era || 'História Geral da Música'}",
  "gancho_30s": "Texto narrativo verbatim do roteiro para os primeiros 30 segundos — uma introdução cinematográfica impactante que fisga o cérebro do espectador com um paradoxo ou fato chocante.",
  "tese_central": "Frase curatorial resumindo a provocação intelectual central que o vídeo provará.",
  "introducao": "Tópicos de roteiro e direção de arte para os primeiros ~10% (expor o problema e introduzir a atmosfera).",
  "desenvolvimento": "Roteiro estruturado de desenvolvimento (~75%), dividido por 3 blocos bem detalhados (passo a passo dos argumentos intelectuais, transições harmônicas ou biografias).",
  "conclusao": "A resolução poética profunda dos últimos ~15%, com uma reflexão que gera compartilhamento e um CTA sutil para assinar o canal.",
  "pontos_virada": [
    "Ponto de Virada Narrativo 1: Revelação de um fato que desmente a introdução rápida ou acalma a tensão.",
    "Ponto de Virada Narrativo 2: A união de dois caminhos musicais aparentemente distantes.",
    "Ponto de Virada Narrativo 3: A grande lição estética deixada para a posteridade."
  ],
  "recursos_visuais": [
    "Inserção de retrato histórico em gravura com som de vinil ralentado",
    "Esquema dinâmico na tela mostrando acordes de piano brilhando em neon para simplificar a teoria",
    "Imagens de arquivo raras de estúdio contrastando com transições minimalistas"
  ],
  "titulos_alternativos": [
    "Título alternativo 1 (estilo curiosidade extrema)",
    "Título alternativo 2 (curto, poético e enigmático)"
  ],
  "thumbnail_ideia": "Instrução de design exata para a capa do vídeo (ex: close dramático de instrumento X em alto contraste no fundo escuro com texto dourado minimalista de uma única palavra).",
  "fontes": "3-4 artigos acadêmicos, livros de história ou documentários para o roteirista aprofundar na pesquisa."
}`;
    } else if (tipo === "instrumento") {
      const { nome, familia, origem, construtores, extra } = data;
      prompt = `Gere uma ficha completa de INSTRUMENTO MUSICAL em formato JSON puro.
Instrumento: ${nome}
Família: ${familia || "deduzir"}
Origem Histórica: ${origem || "deduzir"}
Construtores/Inventores Pioneiros: ${construtores || "deduzir"}
Contexto extra do usuário: ${extra || "nenhum"}

Gere uma resposta estritamente em JSON válida com a seguinte estrutura física exata (use dados reais e profundos com riqueza de detalhes musicológicos):
{
  "tipo": "instrumento",
  "foto_url": "URL de uma foto real de altíssima resolução do Unsplash representando o instrumento musical especificado, músicos tocando-o em concerto ou detalhes de sua construção física clássica/vintage",
  "nome": "${nome}",
  "familia": "${familia || 'Família de instrumentos correspondente'}",
  "classificacao_sachs_hornbostel": "Classificação formal de Sachs-Hornbostel (ex: Cordofone 314.122 ou Aerofone de palheta simples 422.211-71, etc.)",
  "origem_historica": "${origem || 'Origem geográfica, época e breve contexto histórico de surgimento'}",
  "construtores_pioneiros": "${construtores || 'Principais luthiers, inventores, oficinas ou fabricantes pioneiros historicamente (ex: Adolphe Sax, Robert Moog, Bartolomeo Cristofori)'}",
  "tagline": "Frase curta de impacto poético e técnico sintetizando a assinatura e o espírito acústico deste instrumento.",
  "funcionamento_acustico": "Explicação científica e poética (2 parágrafos) do funcionamento físico-acústico do instrumento: como o som é iniciado (vibrador), amplificado (ressonador), materiais tradicionais de construção e suas implicações práticas na ressonância.",
  "caracteristicas_timbristicas": [
    {"registro": "Registro Grave / Sub-grave", "descricao": "Características tímbricas, densidades e texturas expressas neste registro de frequências (ex: som aveludado, cavernoso, instável)"},
    {"registro": "Registro Médio", "descricao": "Qualidades expressivas, clareza e papel melódico tradicional neste registro intermediário"},
    {"registro": "Registro Agudo / Super-agudo", "descricao": "Brilho, penetração, características timbrísticas e limitações de entonação nesta faixa extrema"}
  ],
  "pioneiros_virtuoses": [
    {"nome": "Nome do Virtuose/Mestre 1", "estilo_contribuicao": "Gênero musical principal e de que forma sua técnica revolucionou ou expandiu as fronteiras expressivas recomendadas para o instrumento"},
    {"nome": "Nome do Virtuose/Mestre 2", "estilo_contribuicao": "Inovação técnica lendária ou álbum emblemático de referência"},
    {"nome": "Nome do Virtuose/Mestre 3", "estilo_contribuicao": "Contribuição para a consolidação acadêmica ou popularidade de rua de sua performance"}
  ],
  "obras_chave": [
    {"titulo": "Obra/Composição 1", "artista": "Compositor/Artista", "ano": "Ano", "descricao": "Análise musicológica de como o instrumento é explorado de forma genial ou pioneira nesta composição"},
    {"titulo": "Obra/Composição 2", "artista": "Compositor/Artista", "ano": "Ano", "descricao": "Especificidades do arranjo e momento culminante da performance do instrumento nesta obra"},
    {"titulo": "Obra/Composição 3", "artista": "Compositor/Artista", "ano": "Ano", "descricao": "Inovações harmônicas ou rítmicas introduzidas nessa gravação ou movimento"}
  ],
  "tecnicas_expressivas": ["Técnica 1 (ex: Slap-tonguing ou Glissando de pedal)", "Técnica 2", "Técnica 3", "Técnica 4"],
  "conexoes_historicas": ["Fato sociocultural ou de evolução física que moldou seu uso", "Transição histórica entre gêneros ou cortes reais"],
  "ganchos": [
    "Gancho biográfico, lendário ou curioso sobre um acidente acústico ou fato histórico de bastidores",
    "Mito ou segredo sobre a madeira, eletrônica ou metal especial usado na confecção de instrumentos históricos"
  ],
  "fontes": "2-3 livros, tratados de instrumentação teóricos (ex: Berlioz/Strauss, Rimsky-Korsakov ou artigos de etnomusicologia) de referência altamente conceituada."
}`;
    }

    if (youtubeInfoPrompt) {
      prompt += youtubeInfoPrompt;
    }

    const SchemaArtista = {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING },
        foto_url: { type: Type.STRING },
        numero: { type: Type.STRING },
        nome: { type: Type.STRING },
        nome_original: { type: Type.STRING },
        era_badge: { type: Type.STRING },
        nome_completo: { type: Type.STRING },
        nascimento_morte: { type: Type.STRING },
        nacionalidade: { type: Type.STRING },
        instrumentos: { type: Type.STRING },
        generos: { type: Type.ARRAY, items: { type: Type.STRING } },
        tagline: { type: Type.STRING },
        biografia: { type: Type.STRING },
        obras: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              ano: { type: Type.STRING },
              descricao: { type: Type.STRING }
            },
            required: ["titulo", "ano", "descricao"]
          }
        },
        analise: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chave: { type: Type.STRING },
              valor: { type: Type.STRING }
            },
            required: ["chave", "valor"]
          }
        },
        ganchos: { type: Type.ARRAY, items: { type: Type.STRING } },
        influenciou: { type: Type.ARRAY, items: { type: Type.STRING } },
        influenciado_por: { type: Type.ARRAY, items: { type: Type.STRING } },
        movimento: { type: Type.ARRAY, items: { type: Type.STRING } },
        conexoes_inesperadas: { type: Type.ARRAY, items: { type: Type.STRING } },
        fontes: { type: Type.STRING }
      },
      required: [
        "tipo", "foto_url", "numero", "nome", "nome_original", "era_badge", 
        "nome_completo", "nascimento_morte", "nacionalidade", "instrumentos", 
        "generos", "tagline", "biografia", "obras", "analise", "ganchos", 
        "influenciou", "influenciado_por", "movimento", "conexoes_inesperadas", "fontes"
      ]
    };

    const SchemaMovimento = {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING },
        nome: { type: Type.STRING },
        periodo: { type: Type.STRING },
        origem: { type: Type.STRING },
        tagline: { type: Type.STRING },
        descricao_geral: { type: Type.STRING },
        contexto_historico: { type: Type.STRING },
        caracteristicas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              aspecto: { type: Type.STRING },
              descricao: { type: Type.STRING }
            },
            required: ["aspecto", "descricao"]
          }
        },
        figuras: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING },
              papel: { type: Type.STRING }
            },
            required: ["nome", "papel"]
          }
        },
        obras_representativas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              artista: { type: Type.STRING },
              ano: { type: Type.STRING },
              importancia: { type: Type.STRING }
            },
            required: ["titulo", "artista", "ano", "importancia"]
          }
        },
        surgiu_de: { type: Type.ARRAY, items: { type: Type.STRING } },
        influenciou: { type: Type.ARRAY, items: { type: Type.STRING } },
        em_paralelo: { type: Type.ARRAY, items: { type: Type.STRING } },
        reacao_contra: { type: Type.ARRAY, items: { type: Type.STRING } },
        ganchos: { type: Type.ARRAY, items: { type: Type.STRING } },
        fontes: { type: Type.STRING }
      },
      required: [
        "tipo", "nome", "periodo", "origem", "tagline", "descricao_geral", 
        "contexto_historico", "caracteristicas", "figuras", "obras_representativas", 
        "surgiu_de", "influenciou", "em_paralelo", "reacao_contra", "ganchos", "fontes"
      ]
    };

    const SchemaMusica = {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING },
        titulo: { type: Type.STRING },
        artista: { type: Type.STRING },
        ano: { type: Type.STRING },
        genero: { type: Type.STRING },
        badge: { type: Type.STRING },
        tagline: { type: Type.STRING },
        por_que_pivo: { type: Type.STRING },
        contexto_criacao: { type: Type.STRING },
        analise_musical: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chave: { type: Type.STRING },
              valor: { type: Type.STRING }
            },
            required: ["chave", "valor"]
          }
        },
        impactos: { type: Type.ARRAY, items: { type: Type.STRING } },
        ganchos: { type: Type.ARRAY, items: { type: Type.STRING } },
        artistas: { type: Type.ARRAY, items: { type: Type.STRING } },
        movimento: { type: Type.ARRAY, items: { type: Type.STRING } },
        influenciou: { type: Type.ARRAY, items: { type: Type.STRING } },
        conceitos_teoricos: { type: Type.ARRAY, items: { type: Type.STRING } },
        fontes: { type: Type.STRING }
      },
      required: [
        "tipo", "titulo", "artista", "ano", "genero", "badge", "tagline", 
        "por_que_pivo", "contexto_criacao", "analise_musical", "impactos", 
        "ganchos", "artistas", "movimento", "influenciou", "conceitos_teoricos", "fontes"
      ]
    };

    const SchemaRoteiro = {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING },
        titulo: { type: Type.STRING },
        formato: { type: Type.STRING },
        era_genero: { type: Type.STRING },
        gancho_30s: { type: Type.STRING },
        tese_central: { type: Type.STRING },
        introducao: { type: Type.STRING },
        desenvolvimento: { type: Type.STRING },
        conclusao: { type: Type.STRING },
        pontos_virada: { type: Type.ARRAY, items: { type: Type.STRING } },
        recursos_visuais: { type: Type.ARRAY, items: { type: Type.STRING } },
        titulos_alternativos: { type: Type.ARRAY, items: { type: Type.STRING } },
        thumbnail_ideia: { type: Type.STRING },
        fontes: { type: Type.STRING }
      },
      required: [
        "tipo", "titulo", "formato", "era_genero", "gancho_30s", "tese_central", 
        "introducao", "desenvolvimento", "conclusao", "pontos_virada", 
        "recursos_visuais", "titulos_alternativos", "thumbnail_ideia", "fontes"
      ]
    };

    const SchemaInstrumento = {
      type: Type.OBJECT,
      properties: {
        tipo: { type: Type.STRING },
        foto_url: { type: Type.STRING },
        nome: { type: Type.STRING },
        familia: { type: Type.STRING },
        classificacao_sachs_hornbostel: { type: Type.STRING },
        origem_historica: { type: Type.STRING },
        construtores_pioneiros: { type: Type.STRING },
        tagline: { type: Type.STRING },
        funcionamento_acustico: { type: Type.STRING },
        caracteristicas_timbristicas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              registro: { type: Type.STRING },
              descricao: { type: Type.STRING }
            },
            required: ["registro", "descricao"]
          }
        },
        pioneiros_virtuoses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING },
              estilo_contribuicao: { type: Type.STRING }
            },
            required: ["nome", "estilo_contribuicao"]
          }
        },
        obras_chave: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              artista: { type: Type.STRING },
              ano: { type: Type.STRING },
              descricao: { type: Type.STRING }
            },
            required: ["titulo", "artista", "ano", "descricao"]
          }
        },
        tecnicas_expressivas: { type: Type.ARRAY, items: { type: Type.STRING } },
        conexoes_historicas: { type: Type.ARRAY, items: { type: Type.STRING } },
        ganchos: { type: Type.ARRAY, items: { type: Type.STRING } },
        fontes: { type: Type.STRING }
      },
      required: [
        "tipo", "foto_url", "nome", "familia", "classificacao_sachs_hornbostel",
        "origem_historica", "construtores_pioneiros", "tagline", "funcionamento_acustico",
        "caracteristicas_timbristicas", "pioneiros_virtuoses", "obras_chave",
        "tecnicas_expressivas", "conexoes_historicas", "ganchos", "fontes"
      ]
    };

    let responseSchema;
    if (tipo === "artista") responseSchema = SchemaArtista;
    else if (tipo === "movimento") responseSchema = SchemaMovimento;
    else if (tipo === "musica") responseSchema = SchemaMusica;
    else if (tipo === "roteiro") responseSchema = SchemaRoteiro;
    else if (tipo === "instrumento") responseSchema = SchemaInstrumento;

    const hasYoutube = Boolean(data?.youtubeUrl);
    const fallbackStrategies = [
      { model: "gemini-3.1-flash-lite", useSchema: false },
      { model: "gemini-3.8-flash", useSchema: false },
      { model: "gemini-flash-latest", useSchema: false },
      { model: "gemini-3.1-flash-lite", useSchema: !hasYoutube },
      { model: "gemini-3.8-flash", useSchema: !hasYoutube },
    ];

    let response = null;
    let lastError = null;

    for (let i = 0; i < fallbackStrategies.length; i++) {
      const strategy = fallbackStrategies[i];
      try {
        console.log(`[Gemini API] Tentando gerar com ${strategy.model} (Esquema: ${strategy.useSchema}) - Estratégia ${i + 1}/${fallbackStrategies.length}...`);
        const config: any = {
          systemInstruction,
          responseMimeType: "application/json",
        };
        if (strategy.useSchema && !hasYoutube) {
          config.responseSchema = responseSchema;
        }
        if (hasYoutube) {
          config.tools = [{ googleSearch: {} }];
        }

        let modelPrompt = prompt;
        if (!strategy.useSchema) {
          modelPrompt += `\n\nATENÇÃO: Responda obrigatoriamente e estritamente em formato JSON válido estruturado para uma ficha do tipo "${tipo}". Não inclua nenhuma frase introdutória, explicações, markdown ou qualquer texto fora do bloco de código JSON principal.`;
        }

        // Utiliza no máximo 1 tentativa rápida de retry com 500ms de delay para evitar timeouts longos no gateway
        response = await generateContentWithRetry(ai, {
          model: strategy.model,
          contents: modelPrompt,
          config,
        }, 1, 500);

        if (response && response.text) {
          console.log(`[Gemini API] Geração concluída com sucesso usando ${strategy.model} (Esquema: ${strategy.useSchema})!`);
          break; // Sucesso, sai do loop
        }
      } catch (err: any) {
        lastError = err;
        console.log(`[Gemini API] Informação: A estratégia ${i + 1}/${fallbackStrategies.length} (${strategy.model}) encontrou um limite ou indisponibilidade temporária. Avançando para a próxima alternativa da lista de fallback.`);
      }
    }

    if (!response) {
      throw lastError || new Error("Todos os modelos de fallback falharam ao tentar gerar o conteúdo.");
    }

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Resposta vazia da IA.");
    }

    const cleanedJson = extractJson(textOutput);

    try {
      const parsed = JSON.parse(cleanedJson);
      res.json(parsed);
    } catch (parseError) {
      console.error("Erro ao analisar JSON da resposta de IA:", cleanedJson);
      res.status(500).json({
        error: "A IA retornou um formato inválido. Por favor, tente novamente.",
        raw: textOutput,
      });
    }
  } catch (error: any) {
    console.error("Erro no processamento da API do Gemini:", error);
    
    const errStr = (JSON.stringify(error) || "") + " " + String(error.message || "") + " " + String(error.stack || "");
    
    const isQuotaError = 
      errStr.includes("RESOURCE_EXHAUSTED") || 
      errStr.includes("quota exceeded") || 
      errStr.includes("429") || 
      errStr.includes("limit") ||
      errStr.includes("QuotaExceeded");

    const isDemandError =
      errStr.includes("503") ||
      errStr.includes("UNAVAILABLE") ||
      errStr.includes("high demand") ||
      errStr.includes("temporary");

    if (isQuotaError) {
      return res.status(429).json({
        error: "⚠️ Limite de cota do Gemini excedido (Quota Exceeded - 429). Como o aplicativo utiliza a chave de uso gratuita do Gemini, há um limite temporário de requisições. Para resolver este limite de vez, é altamente recomendável carregar sua própria chave de API em Settings > Secrets (Configurações > Secrets) no painel do AI Studio para obter limites maiores. Se desejar usar a chave padrão gratuita, aguarde cerca de 15 a 20 segundos e tente gerar novamente!"
      });
    }

    if (isDemandError) {
      return res.status(503).json({
        error: "⚠️ O modelo do Gemini está enfrentando alta demanda temporária no momento (Erro 503). Picos de demanda geralmente duram apenas alguns segundos. Por favor, aguarde breves instantes e clique em gerar novamente!"
      });
    }

    res.status(500).json({ error: error.message || "Erro desconhecido no servidor" });
  }
});

// API Endpoint to suggest Study Tips ("Dicas de Estudo") connecting current file with others
app.post("/api/gemini/study-tip", async (req, res) => {
  try {
    const { ficha, outrashfichas } = req.body;
    if (!ficha) {
      return res.status(400).json({ error: "A ficha de estudo atual é obrigatória." });
    }

    const otherFichasTitles = (outrashfichas || []).map((f: any) => `[[${f.titulo || f.nome || "Outra"}]] (${f.tipo})`);
    
    const ai = getGeminiClient();
    const systemInstruction = "Você é um professor sênior de musicologia e arquiteto de grafos no Obsidian. Seu dever é gerar conexões brilhantes, analogias surpreendentes e caminhos de estudo (Study Paths) ligando a ficha de estudo atual de forma explícita com outras fichas existentes no sistema ou temas de história geral da música correlatos. Suas sugestões devem incentivar a criação de uma rede de conhecimento profunda e tridimensional (links bidirecionais Wiki-Links) perfeita para estudo acadêmico ou para roteiros de documentários sobre música.";

    let prompt = `Analise a seguinte ficha de estudo atual para sugerir uma "Dica de Estudo" (Estudo Conectivo) aprofundada.

[FICHA ATUAL]
- Tipo: ${ficha.tipo}
- Título/Nome: ${ficha.titulo || ficha.data?.nome || ficha.data?.titulo}
- Tagline: ${ficha.data?.tagline || ""}
- Detalhes Relevantes: ${JSON.stringify(ficha.data || {})}

[OUTROS TÓPICOS NO COFRE (Fichas Existentes na base do usuário)]
Aqui estão outros tópicos que o usuário já possui em seu cofre. Tente priorizar conexões explícitas com alguns destes tópicos caso haja qualquer relação histórica, estética, instrumental ou conceitual:
${otherFichasTitles.length > 0 ? otherFichasTitles.join(", ") : "Nenhum tópico existente ainda (sugira conexões gerais da história da música com tópicos clássicos da era)"}

Sua tarefa:
Gere uma recomendação altamente estruturada em formato JSON contendo:
1. "conexoesRecomendadas": Uma lista de 3 conexões ricas. Para cada conexão, use o formato Obsidian Wiki-links para o tema (ex: [[Bossa Nova]], [[Johann Sebastian Bach]], [[Adolphe Sax]], [[Sinfonia]]) de modo que se integre no cofre perfeitamente. Explique de forma profunda, poética e técnica como o tema atual do usuário se conecta com o tema sugerido. Categorize a relação (Ex: "Influência Direta", "Ruptura Estética", "Evolução do Instrumento", "Contraponto Histórico", etc.).
2. "provocacaoEstudo": Uma pergunta instigante ou exercício reflexivo para o usuário aprofundar a pesquisa. Ex: comparar as texturas melódicas ou as tensões sociais dos dois polos de estudo.
3. "ganchoRoteirista": Um gancho de transição de roteiro que conecte os dois temas, pronto para prender o cérebro do público num vídeo ou artigo de divulgação cultural.
4. "percursoEstudo": Um mini-mapa mental com 3 passos ordenados de tópicos sugeridos para o usuário criar/estudar a seguir para expandir essa Teia Histórica.

Gere uma resposta estritamente em JSON válida com a seguinte estrutura física exata (use dados reais e profundos):
{
  "conexoesRecomendadas": [
    {
      "tema": "[[Nome do Tema Sugerido]]",
      "relacao": "Tipo de Relação",
      "exploracao": "Explicação musicológica e histórica de como esses dois mundos colidem ou se alimentam mutuamente."
    }
  ],
  "provocacaoEstudo": "Espaço para uma provocação intelectual profunda que incentiva pesquisa ativa.",
  "ganchoRoteirista": "Estratégia narrativa verbatim de transição para usar num vídeo conectando os tópicos.",
  "percursoEstudo": [
    "Passo 1: Investigar...",
    "Passo 2: Mapear...",
    "Passo 3: Escrever..."
  ]
}

Responda UNICAMENTE o JSON estruturado. Não inclua Markdown, explicações pré/pós, ou delimitadores adicionais fora do próprio objeto JSON.`;

    const SchemaStudyTip = {
      type: Type.OBJECT,
      properties: {
        conexoesRecomendadas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tema: { type: Type.STRING },
              relacao: { type: Type.STRING },
              exploracao: { type: Type.STRING }
            },
            required: ["tema", "relacao", "exploracao"]
          }
        },
        provocacaoEstudo: { type: Type.STRING },
        ganchoRoteirista: { type: Type.STRING },
        percursoEstudo: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["conexoesRecomendadas", "provocacaoEstudo", "ganchoRoteirista", "percursoEstudo"]
    };

    const fallbackStrategies = [
      { model: "gemini-3.1-flash-lite", useSchema: false },
      { model: "gemini-3.8-flash", useSchema: false },
      { model: "gemini-flash-latest", useSchema: false },
      { model: "gemini-3.1-flash-lite", useSchema: true },
      { model: "gemini-3.8-flash", useSchema: true },
    ];

    let response = null;
    let lastError = null;

    for (let i = 0; i < fallbackStrategies.length; i++) {
      const strategy = fallbackStrategies[i];
      try {
        console.log(`[Gemini API - StudyTip] Tentando gerar dica com ${strategy.model} - estratégia ${i+1}/${fallbackStrategies.length}...`);
        const config: any = {
          systemInstruction,
          responseMimeType: "application/json",
        };
        if (strategy.useSchema) {
          config.responseSchema = SchemaStudyTip;
        }

        response = await generateContentWithRetry(ai, {
          model: strategy.model,
          contents: prompt,
          config,
        }, 1, 400);

        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API - StudyTip] Estratégia ${strategy.model} falhou: ${err.message || err}`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Não foi possível gerar a dica de estudo conectiva.");
    }

    const cleanedJson = extractJson(response.text);
    const parsed = JSON.parse(cleanedJson);
    res.json(parsed);

  } catch (error: any) {
    console.error("Erro no processamento da API de Dica de Estudo:", error);
    res.status(500).json({ error: error.message || "Erro interno ao gerar Dica de Estudo" });
  }
});

// Obsidian Vault integration endpoints
app.post("/api/obsidian/save", (req, res) => {
  try {
    const { htmlContent, mdContent, fileNameHtml, fileNameMd, vaultPath, tipo } = req.body;

    if (!htmlContent || !mdContent || !fileNameHtml || !fileNameMd) {
      return res.status(400).json({ error: "Conteúdo ou nomes de arquivo ausentes." });
    }

    // Folder map to separate by category
    const folderMap: Record<string, string> = {
      artista: "Artista",
      movimento: "Movimento",
      musica: "Música",
      roteiro: "Roteiro",
      instrumento: "Instrumento"
    };
    const folderName = folderMap[tipo] || "Outros";

    // Resolve target folder inside Obsidian Vault
    const baseVaultDir = vaultPath ? path.resolve(process.cwd(), vaultPath) : path.join(process.cwd(), "obsidian");
    const targetDir = path.join(baseVaultDir, folderName);

    // Create folder structure if not exists
    fs.mkdirSync(targetDir, { recursive: true });

    // Write files
    const fullMdPath = path.join(targetDir, fileNameMd);
    const fullHtmlPath = path.join(targetDir, fileNameHtml);

    fs.writeFileSync(fullMdPath, mdContent, "utf-8");
    fs.writeFileSync(fullHtmlPath, htmlContent, "utf-8");

    return res.json({
      success: true,
      folderName,
      mdPath: path.relative(process.cwd(), fullMdPath),
      htmlPath: path.relative(process.cwd(), fullHtmlPath),
      absoluteMdPath: fullMdPath,
      absoluteHtmlPath: fullHtmlPath,
    });
  } catch (error: any) {
    console.error("Erro ao salvar no Obsidian:", error);
    return res.status(500).json({ error: error.message || "Erro para salvar arquivos do vault." });
  }
});

app.post("/api/obsidian/status", (req, res) => {
  try {
    const { vaultPath } = req.body;
    const baseVaultDir = vaultPath ? path.resolve(process.cwd(), vaultPath) : path.join(process.cwd(), "obsidian");

    const vaultExists = fs.existsSync(baseVaultDir);
    
    // Check which folders exist in the vault
    const folders = ["Artista", "Movimento", "Música", "Roteiro"];
    const folderStatus: Record<string, boolean> = {};
    for (const f of folders) {
      folderStatus[f] = fs.existsSync(path.join(baseVaultDir, f));
    }

    return res.json({
      success: true,
      vaultPathResolved: baseVaultDir,
      vaultExists,
      folderStatus,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro no status." });
  }
});

// Endpoint to load template files from the server vault
app.post("/api/obsidian/templates", (req, res) => {
  try {
    const { vaultPath } = req.body;
    const baseVaultDir = vaultPath ? path.resolve(process.cwd(), vaultPath) : path.join(process.cwd(), "obsidian");
    const templatesDir = path.join(baseVaultDir, "templates");

    if (!fs.existsSync(templatesDir)) {
      return res.json({
        success: true,
        exists: false,
        templates: {}
      });
    }

    const templates: Record<string, { name: string; content: string }> = {};
    const files = fs.readdirSync(templatesDir);
    
    for (const f of files) {
      if (f.endsWith(".md")) {
        const content = fs.readFileSync(path.join(templatesDir, f), "utf-8");
        const term = f.toLowerCase().replace(".md", "").replace("template", "").trim();
        let tipo = "";
        if (term.includes("artista")) tipo = "artista";
        else if (term.includes("movimento")) tipo = "movimento";
        else if (term.includes("musica") || term.includes("música")) tipo = "musica";
        else if (term.includes("roteiro")) tipo = "roteiro";
        else if (term.includes("instrumento")) tipo = "instrumento";

        if (tipo) {
          templates[tipo] = { name: f, content };
        }
      }
    }

    return res.json({
      success: true,
      exists: true,
      templates
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao carregar templates do servidor." });
  }
});

// Endpoint to create default recommended templates inside the templates folder
app.post("/api/obsidian/templates/create-default", (req, res) => {
  try {
    const { vaultPath } = req.body;
    const baseVaultDir = vaultPath ? path.resolve(process.cwd(), vaultPath) : path.join(process.cwd(), "obsidian");
    const templatesDir = path.join(baseVaultDir, "templates");

    fs.mkdirSync(templatesDir, { recursive: true });

    // Design templates
    const templatesToWrite = {
      "Artista.md": `---
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

      "Movimento.md": `---
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

      "Música.md": `---
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

      "Roteiro.md": `---
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

      "Instrumento.md": `---
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

    for (const [filename, content] of Object.entries(templatesToWrite)) {
      fs.writeFileSync(path.join(templatesDir, filename), content, "utf-8");
    }

    return res.json({
      success: true,
      templatesCreated: Object.keys(templatesToWrite),
      templatesDir,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao criar templates recomendados." });
  }
});

// Endpoint to list workspace directories for interactive folder selection
app.post("/api/obsidian/list-dirs", (req, res) => {
  try {
    const { basePath } = req.body;
    const targetDir = basePath ? path.resolve(process.cwd(), basePath) : process.cwd();
    
    const exists = fs.existsSync(targetDir);
    if (!exists) {
      return res.json({
        success: true,
        exists: false,
        currentPath: targetDir,
        relativeCurrentPath: path.relative(process.cwd(), targetDir) || ".",
        parent: path.relative(process.cwd(), path.dirname(targetDir)),
        dirs: []
      });
    }

    const stats = fs.statSync(targetDir);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "O caminho especificado não é uma pasta válida." });
    }

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    // Filter out hidden folders, common node module directories, and build artifacts
    const dirs = items
      .filter(item => item.isDirectory() && !item.name.startsWith(".") && item.name !== "node_modules" && item.name !== "dist" && item.name !== "assets")
      .map(item => item.name);

    return res.json({
      success: true,
      exists: true,
      currentPath: targetDir,
      relativeCurrentPath: path.relative(process.cwd(), targetDir) || ".",
      parent: path.relative(process.cwd(), path.dirname(targetDir)),
      dirs: dirs.sort(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao carregar lista de pastas." });
  }
});

// Endpoint to create a directory in the workspace
app.post("/api/obsidian/create-dir", (req, res) => {
  try {
    const { parentPath, dirName } = req.body;
    if (!dirName) {
      return res.status(400).json({ error: "Nome da pasta é obrigatório." });
    }

    const baseParent = parentPath ? path.resolve(process.cwd(), parentPath) : process.cwd();
    const newDirPath = path.join(baseParent, dirName.trim());

    fs.mkdirSync(newDirPath, { recursive: true });

    return res.json({
      success: true,
      newDirPath,
      relativeNewDirPath: path.relative(process.cwd(), newDirPath) || ".",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao criar nova pasta." });
  }
});

// Endpoint to compress and download the Obsidian Vault as folder structure
app.get("/api/obsidian/download", (req, res) => {
  try {
    const { vaultPath } = req.query;
    const baseVaultDir = vaultPath ? path.resolve(process.cwd(), String(vaultPath)) : path.join(process.cwd(), "obsidian");

    // Always ensure the base vault directory exists so we never fail with 404
    if (!fs.existsSync(baseVaultDir)) {
      fs.mkdirSync(baseVaultDir, { recursive: true });
    }

    // Always ensure subfolders exist inside the vault path
    const foldersToEnsure = ["Artista", "Movimento", "Música", "Roteiro", "Instrumento"];
    foldersToEnsure.forEach((folder) => {
      const folderPath = path.join(baseVaultDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    });

    // Provide a beautiful, welcoming welcome guide inside the vault root to prevent empty ZIP problems
    const welcomeGuidePath = path.join(baseVaultDir, "Bem-vindo ao seu Cofre.md");
    if (!fs.existsSync(welcomeGuidePath)) {
      const welcomeContent = `# 🎭 Andamento História e Música · Seu Cofre Obsidian

Bem-vindo ao seu cofre de estudos em Artes e Música! Este arquivo foi gerado e estruturado automaticamente para funcionar em harmonia perfeita com o **Obsidian** (https://obsidian.md).

## 📁 Estrutura do Cofre
Toda vez que você estuda e exporta uma ficha no nosso SaaS, ela é catalogada automaticamente aqui nas seguintes pastas correspondentes:

*   \`📁 Artista/\` — Fichas de pintores, compositores, cineastas e criadores.
*   \`📁 Movimento/\` — Fichas de movimentos literários, artísticos e históricos.
*   \`📁 Música/\` — Análises musicais de canções, óperas e sinfonias.
*   \`📁 Roteiro/\` — Roteiros, podcasts e estruturas de conteúdo.
*   \`📁 Instrumento/\` — Fichas de organologia, funcionamento acústico e virtuoses.

## 🚀 Como importar no seu Obsidian
1. Descompacte este arquivo \`.zip\` no seu computador.
2. Abra o aplicativo **Obsidian**.
3. Clique em **"Open folder as vault"** (Abrir pasta como cofre).
4. Selecione a pasta descompactada.
5. Pronto! Todas as suas notas e fichas estarão estilizadas de maneira impecável, conectadas e prontas para alimentar seu cérebro digital!
`;
      fs.writeFileSync(welcomeGuidePath, welcomeContent, "utf-8");
    }

    // Now convert the entire local folder into a standard ZIP
    const zip = new AdmZip();
    zip.addLocalFolder(baseVaultDir);
    const buffer = zip.toBuffer();

    const rawVaultName = path.basename(baseVaultDir) || "obsidian";
    const cleanVaultName = rawVaultName.replace(/[^a-zA-Z0-9_-]/g, "_") || "obsidian_vault";

    // Set headers ONLY after the entire zip is ready and did not throw any error!
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${cleanVaultName}.zip"`);
    res.setHeader("Content-Length", buffer.length);
    
    // Send binary buffer directly as binary data chunk
    return res.end(buffer);
  } catch (error: any) {
    console.error("Erro ao gerar ZIP do vault:", error);
    // Secure fallback if headers aren't sent yet
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(500).send(`Erro ao gerar backup ZIP do seu cofre: ${error.message}`);
    }
    return;
  }
});

// Catch-all 404 handler for any unhandled /api routes to prevent returning index.html
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.path}` });
});

// Global API error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Erro interno no servidor:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ error: err.message || "Erro interno do servidor." });
});

// Configure Vite or Serve static assets
const setupAssetServing = async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando Vite em modo desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando servidor em modo produção...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
};

setupAssetServing().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando com sucesso em http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Falha ao configurar a entrega de assets:", err);
});
