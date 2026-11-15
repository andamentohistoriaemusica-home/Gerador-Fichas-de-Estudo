export type FichaTipo = "artista" | "movimento" | "musica" | "roteiro" | "instrumento";

export interface ArtistaData {
  tipo: "artista";
  foto_url?: string;
  numero: string;
  nome: string;
  nome_original: string;
  era_badge: string;
  nome_completo: string;
  nascimento_morte: string;
  nacionalidade: string;
  instrumentos: string;
  generos: string[];
  tagline: string;
  biografia: string;
  obras: Array<{
    titulo: string;
    ano: string;
    descricao: string;
  }>;
  analise: Array<{
    chave: string;
    valor: string;
  }>;
  ganchos: string[];
  influenciou: string[];
  influenciado_por: string[];
  movimento: string[];
  conexoes_inesperadas: string[];
  fontes: string;
}

export interface MovimentoData {
  tipo: "movimento";
  foto_url?: string;
  nome: string;
  periodo: string;
  origem: string;
  tagline: string;
  descricao_geral: string;
  contexto_historico: string;
  caracteristicas: Array<{
    aspecto: string;
    descricao: string;
  }>;
  figuras: Array<{
    nome: string;
    papel: string;
  }>;
  obras_representativas: Array<{
    titulo: string;
    artista: string;
    ano: string;
    importancia: string;
  }>;
  surgiu_de: string[];
  influenciou: string[];
  em_paralelo: string[];
  reacao_contra: string[];
  ganchos: string[];
  fontes: string;
}

export interface MusicaData {
  tipo: "musica";
  foto_url?: string;
  titulo: string;
  artista: string;
  ano: string;
  genero: string;
  badge: string;
  tagline: string;
  por_que_pivo: string;
  contexto_criacao: string;
  analise_musical: Array<{
    chave: string;
    valor: string;
  }>;
  impactos: string[];
  ganchos: string[];
  artistas: string[];
  movimento: string[];
  influenciou: string[];
  conceitos_teoricos: string[];
  fontes: string;
}

export interface RoteiroData {
  tipo: "roteiro";
  foto_url?: string;
  titulo: string;
  formato: string;
  era_genero: string;
  gancho_30s: string;
  tese_central: string;
  introducao: string;
  desenvolvimento: string;
  conclusao: string;
  pontos_virada: string[];
  recursos_visuais: string[];
  titulos_alternativos: string[];
  thumbnail_ideia: string;
  fontes: string;
}

export interface InstrumentoData {
  tipo: "instrumento";
  foto_url?: string;
  nome: string;
  familia: string;
  classificacao_sachs_hornbostel: string;
  origem_historica: string;
  construtores_pioneiros: string;
  tagline: string;
  funcionamento_acustico: string;
  caracteristicas_timbristicas: Array<{
    registro: string;
    descricao: string;
  }>;
  pioneiros_virtuoses: Array<{
    nome: string;
    estilo_contribuicao: string;
  }>;
  obras_chave: Array<{
    titulo: string;
    artista: string;
    ano: string;
    descricao: string;
  }>;
  tecnicas_expressivas: string[];
  conexoes_historicas: string[];
  ganchos: string[];
  fontes: string;
}

export type FichaContent = ArtistaData | MovimentoData | MusicaData | RoteiroData | InstrumentoData;

export interface Ficha {
  id: string;
  userId: string;
  tipo: FichaTipo;
  titulo: string;
  subtitulo: string;
  data: FichaContent;
  isFavorite?: boolean;
  createdAt: any; // Date representation or timestamp
  updatedAt: any;
}
