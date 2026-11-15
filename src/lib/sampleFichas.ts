import { Ficha } from "../types";

export const SAMPLE_FICHAS: Ficha[] = [
  {
    id: "sample-bach-01",
    userId: "guest",
    tipo: "artista",
    titulo: "Johann Sebastian Bach",
    subtitulo: "Mestre Supremo do Contraponto e da Polifonia Barroca",
    isFavorite: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    data: {
      tipo: "artista",
      numero: "001",
      nome: "Johann Sebastian Bach",
      nome_original: "Johann Sebastian Bach",
      era_badge: "Barroco Tardio (1685–1750)",
      nome_completo: "Johann Sebastian Bach",
      nascimento_morte: "1685 – 1750 (Eisenach – Leipzig, Alemanha)",
      nacionalidade: "Alemã",
      instrumentos: "Órgão, Cravo, Clavicórdio, Violino, Viola",
      generos: ["Música Sacra", "Cantata", "Fuga", "Prelúdio", "Concerto Grosso", "Paixão"],
      tagline: "O arquiteto sagrado da polifonia ocidental",
      biografia: "Compositor e organista alemão do período barroco. Sua obra representa o ápice técnico e espiritual do contraponto renascentista e barroco, influenciando desde Mozart e Beethoven até mestres modernos como Villa-Lobos e jazzistas contemporâneos.",
      obras: [
        {
          titulo: "O Cravo Bem Temperado (BWV 846–893)",
          ano: "1722 / 1742",
          descricao: "Monumento pedagógico e artístico explorando todas as 24 tonalidades maiores e menores em prelúdios e fugas magistrais."
        },
        {
          titulo: "Concertos de Brandemburgo (BWV 1046–1051)",
          ano: "1721",
          descricao: "Seis concertos que revolucionaram a instrumentação do concerto grosso com combinações tímbricas inéditas."
        },
        {
          titulo: "Paixão Segundo São Mateus (BWV 244)",
          ano: "1727",
          descricao: "Obra monumental sacra para coro duplo e orquestra dupla, ápice dramático do oratório barroco."
        }
      ],
      analise: [
        { chave: "Técnica Contrapontística", valor: "Uso rigoroso e engenhoso de imitação, cânones retrógrados e aumentações." },
        { chave: "Temperamento Igual", valor: "Popularizou e demonstrou a viabilidade da afinação temperada em todas as tonalidades." },
        { chave: "Simbolismo Teológico", valor: "Numerologia sacra cifrada nos compassos e figuras retórico-musicais." }
      ],
      ganchos: [
        "Bach teve 20 filhos e vários se tornaram compositores célebres como C.P.E. Bach.",
        "Após sua morte, sua música foi considerada 'antiquada' e só foi redescoberta amplamente por Mendelssohn em 1829."
      ],
      influenciou: ["W.A. Mozart", "L. van Beethoven", "Felix Mendelssohn", "Heitor Villa-Lobos"],
      influenciado_por: ["Dietrich Buxtehude", "Antonio Vivaldi", "Girolamo Frescobaldi"],
      movimento: ["Barroco", "Polifonia Luterana"],
      conexoes_inesperadas: ["Jazz moderno (Jacques Loussier)", "Bachianas Brasileiras"],
      fontes: "Christoph Wolff - Johann Sebastian Bach: The Learned Musician; Grove Music Online."
    }
  },
  {
    id: "sample-impressionismo-02",
    userId: "guest",
    tipo: "movimento",
    titulo: "Impressionismo Musical",
    subtitulo: "A Revolução Tímbrica e das Harmonias Flutuantes em Paris",
    isFavorite: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    data: {
      tipo: "movimento",
      nome: "Impressionismo Musical",
      periodo: "c. 1890 – 1920 (Fin de Siècle)",
      origem: "Paris, França",
      tagline: "A libertação da cor harmônica e a sugestão poética da atmosfera",
      descricao_geral: "Movimento artístico surgido na França no final do século XIX que buscou traduzir em sons sensações instantâneas, luzes e atmosferas através de escalas exóticas, timbres etéreos e acordes paralelos sem resolução funcional tradicional.",
      contexto_historico: "Fim do século XIX (Belle Époque), ascensão da pintura impressionista (Monet, Renoir) e da poesia simbolista (Mallarmé, Verlaine). Reação ao sentimentalismo e gigantismo do romantismo germânico de Wagner.",
      caracteristicas: [
        { aspecto: "Escalas Exóticas", descricao: "Uso frequente de escalas pentatônicas e de tons inteiros (hexafônica)." },
        { aspecto: "Harmonia Colorística", descricao: "Acordes de 9ª, 11ª e 13ª usados pelo seu valor tímbrico e não apenas por função tonal." },
        { aspecto: "Ritmo Fluido", descricao: "Compassos que dissolvem o pulso métrico rígido, criando sensação de suspensão temporal." }
      ],
      figuras: [
        { nome: "Claude Debussy", papel: "Pioneiro e figura central da estética impressionista e simbolista." },
        { nome: "Maurice Ravel", papel: "Mestre da orquestração refinada e formas límpidas impressionistas." },
        { nome: "Erik Satie", papel: "Precursor vanguardista das harmonias estáticas e modais." }
      ],
      obras_representativas: [
        { titulo: "Prélude à l'après-midi d'un faune", artista: "Claude Debussy", ano: "1894", importancia: "Considerada por Pierre Boulez o despertar da música moderna." },
        { titulo: "La Mer", artista: "Claude Debussy", ano: "1905", importancia: "Três esboços sinfônicos que redefiniram o uso dos naipes orquestrais." },
        { titulo: "Daphnis et Chloé", artista: "Maurice Ravel", ano: "1912", importancia: "Sinfonia coreográfica célebre pela riqueza monumental do colorido orquestral." }
      ],
      surgiu_de: ["Simbolismo Francês", "Gamelo Javanês (Exposição Universal de Paris 1889)"],
      influenciou: ["Música do Século XX", "Jazz Modal (Miles Davis, Bill Evans)", "Trilhas Sonoras de Cinema"],
      em_paralelo: ["Pintura Impressionista (Claude Monet)", "Pós-Impressionismo"],
      reacao_contra: ["Gigantismo Wagneriano", "Funcionalismo Harmônico Estrito Alemão"],
      ganchos: ["Debussy rejeitava o rótulo de 'impressionista', preferindo ser associado à poesia simbolista."],
      fontes: "Paul Griffiths - A Concise History of Western Music; François Lesure - Claude Debussy."
    }
  },
  {
    id: "sample-garota-ipanema-03",
    userId: "guest",
    tipo: "musica",
    titulo: "Garota de Ipanema",
    subtitulo: "O Hino da Bossa Nova que Conquistou a Harmonia Global",
    isFavorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    data: {
      tipo: "musica",
      titulo: "Garota de Ipanema",
      artista: "Antônio Carlos Jobim & Vinicius de Moraes",
      ano: "1962",
      genero: "Bossa Nova / Jazz Latino",
      badge: "Clássico Universal (1962)",
      tagline: "A síntese lírica e harmônica do modernismo musical brasileiro",
      por_que_pivo: "Segunda canção mais gravada da história da música ocidental, responsável pela consolidação global da Bossa Nova e pela aproximação definitiva entre o samba e o jazz moderno.",
      contexto_criacao: "Composta no Bar Veloso (atual Garota de Ipanema) no bairro de Ipanema, Rio de Janeiro, inspirada na passagem da jovem Helô Pinheiro a caminho do mar em 1962.",
      analise_musical: [
        { chave: "Estrutura Formal", valor: "Forma AABA ampliada de 40 compassos com ponte modulante espetacular." },
        { chave: "Harmonia da Ponte (Seção B)", valor: "Modulações audaciosas por terças (Fá# Maior -> Ré Maior -> Mi bemol Maior) voltando com maestria a Fá Maior." },
        { chave: "Batida Sincopada", valor: "Violão de João Gilberto traduzindo a polirritmia da escola de samba em violão de náilon despojado." }
      ],
      impactos: [
        "Venceu o Grammy de Gravação do Ano em 1965 (versão com Stan Getz e Astrud Gilberto).",
        "Abriu as portas do Carnegie Hall e da indústria internacional para a música popular brasileira."
      ],
      ganchos: [
        "Frank Sinatra insistiu em gravar a canção com Tom Jobim sussurrando ao microfone, fascinado pela sutileza melódica."
      ],
      artistas: ["Tom Jobim", "Vinicius de Moraes", "João Gilberto", "Astrud Gilberto", "Frank Sinatra"],
      movimento: ["Bossa Nova", "Samba-Jazz"],
      influenciou: ["Jazz Contemporâneo", "Pop Sofisticado Internacional"],
      conceitos_teoricos: ["SubV7", "Acordes de Tensão (9ª, 13ª)", "Síncope Brasileira"],
      fontes: "Ruy Castro - Chega de Saudade; Zuza Homem de Mello - A Era dos Festivais."
    }
  },
  {
    id: "sample-stradivarius-04",
    userId: "guest",
    tipo: "instrumento",
    titulo: "Violino Stradivarius",
    subtitulo: "O Pináculo da Luteria Cremonesa e da Acústica Musical",
    isFavorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    data: {
      tipo: "instrumento",
      nome: "Violino Stradivarius",
      familia: "Cordas Friccionadas",
      classificacao_sachs_hornbostel: "321.322 (Cordofone composto com caixa de ressonância e braço)",
      origem_historica: "Cremona, Itália (Séculos XVII–XVIII)",
      construtores_pioneiros: "Antonio Stradivari (c. 1644 – 1737), Andrea Amati, Giuseppe Guarneri del Gesù",
      tagline: "O ápice histórico da ressonância, projeção tímbrica e nobreza harmônica",
      funcionamento_acustico: "A vibração das cordas sob o arco é transmitida pelo cavalete ao tampo de abeto (spruce), equalizada pela alma de madeira e irradiada pelo fundo de bordo (maple) e aberturas em 'f'.",
      caracteristicas_timbristicas: [
        { registro: "Agudo (Corda Mi)", descricao: "Brilhante, cristalino, com imensa projeção sem aspereza estridencial." },
        { registro: "Médio (Cordas Lá e Ré)", descricao: "Aveludado, rico em sobretons harmônicos médios e clareza de articulação vocal." },
        { registro: "Grave (Corda Sol)", descricao: "Profundo, ressonante, encorpado e com resposta dinâmica imediata." }
      ],
      pioneiros_virtuoses: [
        { nome: "Niccolò Paganini", estilo_contribuicao: "Expandiu os limites de virtuosismo e extensão técnica do instrumento." },
        { nome: "Itzhak Perlman", estilo_contribuicao: "Célebre pelo som caloroso ao tocar no Stradivarius Soil de 1714." }
      ],
      obras_chave: [
        { titulo: "24 Caprichos para Violino Solo", artista: "Niccolò Paganini", ano: "1802-1817", descricao: "Bíblia da técnica do violino solista moderno." },
        { titulo: "Concerto para Violino em Ré Maior, Op. 61", artista: "Ludwig van Beethoven", ano: "1806", descricao: "Elevou o violino ao diálogo sinfônico supremo." }
      ],
      tecnicas_expressivas: ["Spiccato", "Col legno", "Harmônicos Artificiais", "Vibrato Contínuo"],
      conexoes_historicas: ["Renascimento Italiano", "Pequena Idade do Gelo (densidade da madeira dos Alpes)"],
      ganchos: ["Cientistas acreditam que o clima excepcionalmente frio do século XVII gerou anéis de crescimento da madeira mais densos e uniformes."],
      fontes: "Hill, W. Henry - Antonio Stradivari: His Life and Work; The Strad Magazine."
    }
  },
  {
    id: "sample-roteiro-blues-rock-05",
    userId: "guest",
    tipo: "roteiro",
    titulo: "Como o Delta Blues Gerou o Rock Moderno",
    subtitulo: "Estrutura Narrativa para Vídeo Documentário / Ensaio Audiovisual",
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      tipo: "roteiro",
      titulo: "Como o Delta Blues Gerou o Rock Moderno",
      formato: "Vídeo longo · YouTube (15 a 20 min)",
      era_genero: "Século XX · História do Blues e Raízes do Rock",
      gancho_30s: "Você sabia que a maior revolução musical do século XX nasceu em uma encruzilhada de terra no Mississippi, com apenas 3 acordes e uma garrafa quebrada?",
      tese_central: "O rock não foi uma invenção britânica ou dos anos 60; foi a eletrificação direta da dor, do ritmo sincopado e da escala pentatônica menor criada pelos trabalhadores rurais negros do Delta do Mississippi.",
      introducao: "Abertura dramática com sons de trens e violão acústico slide. Apresentação do mito de Robert Johnson na encruzilhada (crossroads) e a transição migratória para os clubes elétricos de Chicago.",
      desenvolvimento: "Bloco 1: A escala de Blues e as Blue Notes. Bloco 2: A migração para Chicago e a amplificação com Muddy Waters. Bloco 3: O choque britânico — como Keith Richards, Eric Clapton e Jimmy Page obsessivamente copiaram os mestres do blues para criar o classic rock.",
      conclusao: "Síntese reflexiva mostrando que por trás de cada distorção de guitarra em estádio reside o clamor ancestral de liberdade e resiliência do Delta Blues.",
      pontos_virada: [
        "1943: Muddy Waters compra sua primeira guitarra elétrica em Chicago para ser ouvido sobre o barulho do bar.",
        "1968: Jimi Hendrix e Led Zeppelin redefinem o volume e peso do blues para as massas globais."
      ],
      recursos_visuais: [
        "Mapas animados da Rota 61 do Mississippi até Chicago.",
        "Gráficos interativos da escala pentatônica com a Blue Note (b5).",
        "Trechos sonoros comparativos A/B entre Muddy Waters e Rolling Stones."
      ],
      titulos_alternativos: [
        "A Encruzilhada Secreta da História da Música",
        "De Robert Johnson ao Led Zeppelin: O DNA Oculto do Rock"
      ],
      thumbnail_ideia: "Contraste visual dramático: Metade do rosto de Robert Johnson em sépia 1930 e metade Jimi Hendrix em cores elétricas vibrantes.",
      fontes: "Robert Palmer - Deep Blues; Peter Guralnick - Searching for Robert Johnson."
    }
  }
];
