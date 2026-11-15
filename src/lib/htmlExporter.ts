import { Ficha, ArtistaData, MovimentoData, MusicaData, RoteiroData, InstrumentoData } from "../types";

export function getFichaHtmlString(ficha: Ficha, reviewerName?: string): string {
  const d = ficha.data;
  
  // Basic security escaping helper
  const e = (text?: string) => {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const reviewerInfo = reviewerName ? `Revisto por ${e(reviewerName)}` : "Revisado pelo Usuário";

  // Common Header & Fonts Setup
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0b0b0b;
      --bg2: #111111;
      --bg3: #181818;
      --line: #242424;
      --gold: #c4a35a;
      --gold2: #a8883f;
      --txt: #e8e0d4;
      --txt2: #a09585;
      --txt3: #555555;
    }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--txt);
      min-height: 100vh;
      padding: 3rem 2rem;
    }

    .ficha-output {
      max-width: 900px;
      margin: 0 auto;
      background: var(--bg2);
      border: 1px solid var(--line);
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }

    .ficha-header {
      padding: 2.5rem 3rem 1.8rem;
      border-bottom: 1px solid var(--line);
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2rem;
      align-items: start;
    }

    .header-layout {
      display: flex;
      gap: 1.8rem;
      align-items: start;
    }

    .foto-moldura {
      width: 140px;
      height: 185px;
      border-radius: 8px;
      border: 2px solid var(--gold);
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      background: #0d0d10;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .foto-moldura img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    @media (max-width: 768px) {
      .ficha-header {
        grid-template-columns: 1fr;
      }
      .header-layout {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .foto-moldura {
        width: 130px;
        height: 170px;
        margin-bottom: 1rem;
      }
    }

    .ficha-tipo {
      font-family: 'DM Mono', monospace;
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      color: var(--gold);
      text-transform: uppercase;
      margin-bottom: 0.6rem;
    }

    .ficha-nome {
      font-family: 'Playfair Display', serif;
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1.15;
      color: #f0ebe3;
      margin-bottom: 0.4rem;
    }

    .ficha-sub {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      font-size: 1rem;
      color: var(--txt3);
      margin-bottom: 1rem;
    }

    .ficha-tagline {
      font-size: 0.9rem;
      color: #7a7060;
      line-height: 1.6;
      max-width: 520px;
      border-left: 2px solid var(--gold);
      padding-left: 1.2rem;
      margin-top: 1rem;
    }

    .ficha-meta {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      min-width: 220px;
      background: var(--bg3);
      padding: 1.2rem;
      border: 1px solid var(--line);
    }

    .meta-row { 
      display: flex; 
      flex-direction: column; 
      gap: 4px; 
    }

    .meta-lbl {
      font-family: 'DM Mono', monospace;
      font-size: 0.58rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--txt3);
    }

    .meta-val {
      font-size: 0.82rem;
      color: var(--txt2);
    }

    .tags-row { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 6px; 
      margin-top: 4px; 
    }

    .tag {
      font-family: 'DM Mono', monospace;
      font-size: 0.55rem;
      padding: 2px 8px;
      border: 1px solid var(--line);
      color: var(--txt2);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: var(--bg);
    }

    .ficha-body {
      padding: 2rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .sec-titulo {
      font-family: 'DM Mono', monospace;
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 0.8rem;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .sec-titulo::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--line);
    }

    .prose {
      font-size: 0.9rem;
      line-height: 1.8;
      color: var(--txt2);
      text-align: justify;
      white-space: pre-line;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    @media (max-width: 768px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: #141414;
      border: 1px solid #222;
      padding: 1.2rem;
      transition: border-color 0.2s;
    }

    .card-titulo {
      font-family: 'Playfair Display', serif;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--txt);
      margin-bottom: 4px;
    }

    .card-ano {
      font-family: 'DM Mono', monospace;
      font-size: 0.62rem;
      color: var(--gold);
      margin-bottom: 8px;
    }

    .card-desc {
      font-size: 0.78rem;
      color: var(--txt2);
      line-height: 1.5;
    }

    .analise-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 600px) {
      .analise-grid {
        grid-template-columns: 1fr;
      }
    }

    .analise-item {
      background: #141414;
      border: 1px solid #222;
      padding: 1rem 1.2rem;
    }

    .analise-key {
      font-family: 'DM Mono', monospace;
      font-size: 0.6rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--txt3);
      margin-bottom: 0.4rem;
    }

    .analise-val {
      font-size: 0.85rem;
      color: var(--txt2);
      line-height: 1.6;
    }

    .ganchos { 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
    }

    .gancho {
      display: flex;
      gap: 12px;
      background: #141414;
      border-left: 3px solid var(--gold);
      padding: 0.9rem 1.2rem;
      font-size: 0.88rem;
      color: var(--txt2);
      line-height: 1.6;
    }

    .gancho-icon { 
      flex-shrink: 0; 
      color: var(--gold); 
    }

    .conexoes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 600px) {
      .conexoes-grid {
        grid-template-columns: 1fr;
      }
    }

    .conexao-group { 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
    }

    .conexao-label {
      font-family: 'DM Mono', monospace;
      font-size: 0.58rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--txt3);
    }

    .chips-wrap { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 6px; 
    }

    .chip {
      font-size: 0.78rem;
      padding: 4px 12px;
      background: #161616;
      border: 1px solid #282828;
      color: var(--txt2);
    }

    .chip.gold { 
      border-color: var(--gold2); 
      color: var(--gold); 
      background: #1c1810; 
    }

    .carac-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .carac-table td {
      padding: 0.8rem 1rem;
      border: 1px solid var(--line);
      color: var(--txt2);
      vertical-align: top;
    }

    .carac-table td:first-child {
      font-family: 'DM Mono', monospace;
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--txt3);
      width: 160px;
      background: #131313;
    }

    .figuras { 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
    }

    .figura {
      display: flex;
      gap: 16px;
      align-items: baseline;
      padding: 0.8rem 1.2rem;
      background: #141414;
      border: 1px solid var(--line);
    }

    .figura-nome {
      font-family: 'Playfair Display', serif;
      font-size: 1rem;
      font-weight: bold;
      color: var(--txt);
      min-width: 180px;
      flex-shrink: 0;
    }

    .figura-papel {
      font-size: 0.85rem;
      color: var(--txt2);
      line-height: 1.5;
    }

    .gancho-principal {
      background: #0e0e0a;
      border: 1px solid var(--line);
      border-left: 4px solid var(--gold);
      padding: 1.5rem 1.8rem;
      display: flex;
      gap: 1.5rem;
      align-items: start;
    }

    .gancho-num {
      font-family: 'DM Mono', monospace;
      font-size: 2.2rem;
      color: #242424;
      line-height: 1;
    }

    .gancho-lbl {
      font-family: 'DM Mono', monospace;
      font-size: 0.58rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 0.5rem;
    }

    .gancho-txt {
      font-size: 0.95rem;
      color: var(--txt);
      line-height: 1.7;
      font-style: italic;
    }

    .estrutura {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    @media (max-width: 768px) {
      .estrutura {
        grid-template-columns: 1fr;
      }
    }

    .est-bloco {
      background: #131313;
      border: 1px solid var(--line);
      padding: 1.2rem;
    }

    .est-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 0.6rem;
    }

    .est-icone {
      width: 25px;
      height: 25px;
      background: var(--gold);
      color: #0b0b0b;
      font-size: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    .est-titulo-bloco {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--txt);
    }

    .est-pct {
      font-family: 'DM Mono', monospace;
      font-size: 0.62rem;
      color: var(--txt3);
      margin-bottom: 0.8rem;
    }

    .est-texto {
      font-size: 0.82rem;
      color: var(--txt2);
      line-height: 1.6;
      white-space: pre-line;
    }

    .ficha-rodape {
      padding: 1.2rem 3rem;
      border-top: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #090909;
    }

    .fontes-txt {
      font-family: 'DM Mono', monospace;
      font-size: 0.58rem;
      color: var(--txt3);
      line-height: 1.8;
      max-width: 650px;
    }

    .status-dot-sm {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--gold);
      box-shadow: 0 0 10px var(--gold);
    }

    .exported-watermark {
      text-align: center;
      margin-top: 2.5rem;
      font-family: 'DM Mono', monospace;
      font-size: 0.65rem;
      color: var(--txt3);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  `;

  let innerContent = "";

  if (ficha.tipo === "artista") {
    const art = d as ArtistaData;
    const obrasHtml = (art.obras || []).map(o => `
      <div class="card">
        <div class="card-titulo">${e(o.titulo)}</div>
        <div class="card-ano">${e(o.ano)}</div>
        <div class="card-desc">${e(o.descricao)}</div>
      </div>
    `).join("");

    const analiseHtml = (art.analise || []).map(a => `
      <div class="analise-item">
        <div class="analise-key">${e(a.chave)}</div>
        <div class="analise-val">${e(a.valor)}</div>
      </div>
    `).join("");

    const ganchosHtml = (art.ganchos || []).map(g => `
      <div class="gancho">
        <span class="gancho-icon">🎣</span>
        <span>${e(g)}</span>
      </div>
    `).join("");

    const influenciouChips = (art.influenciou || []).map(c => `<span class="chip gold">${e(c)}</span>`).join("");
    const inflPorChips = (art.influenciado_por || []).map(c => `<span class="chip">${e(c)}</span>`).join("");
    const movChips = (art.movimento || []).map(c => `<span class="chip">${e(c)}</span>`).join("");
    const conexoesChips = (art.conexoes_inesperadas || []).map(c => `<span class="chip">${e(c)}</span>`).join("");

    innerContent = `
      <div class="ficha-header">
        <div class="header-layout">
          ${art.foto_url ? `
          <div class="foto-moldura">
            <img src="${e(art.foto_url)}" alt="${e(art.nome)}" referrerpolicy="no-referrer">
          </div>
          ` : ""}
          <div>
            <div class="ficha-tipo">Artista · #${e(art.numero)}</div>
            <div class="ficha-nome">${e(art.nome)}</div>
            <div class="ficha-sub">${e(art.nome_original)}</div>
            <div class="ficha-tagline">${e(art.tagline)}</div>
          </div>
        </div>
        <div class="ficha-meta">
          <div class="meta-row">
            <div class="meta-lbl">Era / Período</div>
            <div class="meta-val">${e(art.era_badge)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Nome completo</div>
            <div class="meta-val">${e(art.nome_completo || art.nome)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Nascimento · Morte</div>
            <div class="meta-val">${e(art.nascimento_morte)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Nacionalidade</div>
            <div class="meta-val">${e(art.nacionalidade)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Instrumentos</div>
            <div class="meta-val">${e(art.instrumentos)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Gêneros</div>
            <div class="tags-row">
              ${(art.generos || []).map(g => `<span class="tag">${e(g)}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="ficha-body">
        <div>
          <div class="sec-titulo">Biografia Essencial</div>
          <div class="prose">${e(art.biografia)}</div>
        </div>
        
        <div>
          <div class="sec-titulo">Obras Essenciais para o Canal</div>
          <div class="cards-grid">
            ${obrasHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Análise Técnica</div>
          <div class="analise-grid">
            ${analiseHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Ganchos para Vídeo (Retenção)</div>
          <div class="ganchos">
            ${ganchosHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Conexões Estéticas</div>
          <div class="conexoes-grid">
            <div class="conexao-group">
              <div class="conexao-label">Influenciou</div>
              <div class="chips-wrap">${influenciouChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Foi Influenciado Por</div>
              <div class="chips-wrap">${inflPorChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Movimento Associado</div>
              <div class="chips-wrap">${movChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Conexões Inesperadas</div>
              <div class="chips-wrap">${conexoesChips}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (ficha.tipo === "movimento") {
    const mov = d as MovimentoData;
    const caracteristicasHtml = (mov.caracteristicas || []).map(c => `
      <tr>
        <td>${e(c.aspecto)}</td>
        <td>${e(c.descricao)}</td>
      </tr>
    `).join("");

    const figurasHtml = (mov.figuras || []).map(f => `
      <div class="figura">
        <span class="figura-nome">${e(f.nome)}</span>
        <span class="figura-papel">${e(f.papel)}</span>
      </div>
    `).join("");

    const obrasHtml = (mov.obras_representativas || []).map(o => `
      <div class="card">
        <div class="card-titulo">${e(o.titulo)}</div>
        <div class="card-ano">${e(o.artista)} · ${e(o.ano)}</div>
        <div class="card-desc">${e(o.importancia)}</div>
      </div>
    `).join("");

    const ganchosHtml = (mov.ganchos || []).map(g => `
      <div class="gancho">
        <span class="gancho-icon">🎣</span>
        <span>${e(g)}</span>
      </div>
    `).join("");

    const deChips = (mov.surgiu_de || []).map(c => `<span class="chip">${e(c)}</span>`).join("");
    const paraChips = (mov.influenciou || []).map(c => `<span class="chip gold">${e(c)}</span>`).join("");
    const paralChips = (mov.em_paralelo || []).map(c => `<span class="chip">${e(c)}</span>`).join("");
    const reacaoChips = (mov.reacao_contra || []).map(c => `<span class="chip">${e(c)}</span>`).join("");

    const fotoUrl = (mov as any).foto_url;
    innerContent = `
      <div class="ficha-header">
        <div class="header-layout">
          ${fotoUrl ? `
          <div class="foto-moldura">
            <img src="${e(fotoUrl)}" alt="${e(mov.nome)}" referrerpolicy="no-referrer">
          </div>
          ` : ""}
          <div>
            <div class="ficha-tipo">Movimento Musical</div>
            <div class="ficha-nome">${e(mov.nome)}</div>
            <div class="ficha-sub">${e(mov.periodo)} · ${e(mov.origem)}</div>
            <div class="ficha-tagline">${e(mov.tagline)}</div>
          </div>
        </div>
        <div class="ficha-meta">
          <div class="meta-row">
            <div class="meta-lbl">Período Ativo</div>
            <div class="meta-val">${e(mov.periodo)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Origem Geográfica</div>
            <div class="meta-val">${e(mov.origem)}</div>
          </div>
        </div>
      </div>
      <div class="ficha-body">
        <div>
          <div class="sec-titulo">Visão Geral Estética</div>
          <div class="prose">${e(mov.descricao_geral)}</div>
        </div>

        <div>
          <div class="sec-titulo">Contexto Histórico e Geopolítico</div>
          <div class="prose">${e(mov.contexto_historico)}</div>
        </div>

        <div>
          <div class="sec-titulo">Características Teóricas & Práticas</div>
          <table class="carac-table">
            <tbody>
              ${caracteristicasHtml}
            </tbody>
          </table>
        </div>

        <div>
          <div class="sec-titulo">Figuras Centrais</div>
          <div class="figuras">
            ${figurasHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Obras e Discos Fundamentais</div>
          <div class="cards-grid">
            ${obrasHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Filiações e Reações</div>
          <div class="conexoes-grid">
            <div class="conexao-group">
              <div class="conexao-label">Surgiu De</div>
              <div class="chips-wrap">${deChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Influenciou</div>
              <div class="chips-wrap">${paraChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Manifestos em Paralelo</div>
              <div class="chips-wrap">${paralChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Reação Estética Contra</div>
              <div class="chips-wrap">${reacaoChips}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="sec-titulo">Ganchos para Vídeo (Visual Essay)</div>
          <div class="ganchos">
            ${ganchosHtml}
          </div>
        </div>
      </div>
    `;
  } else if (ficha.tipo === "musica") {
    const mus = d as MusicaData;
    const analiseHtml = (mus.analise_musical || []).map(a => `
      <div class="analise-item">
        <div class="analise-key">${e(a.chave)}</div>
        <div class="analise-val">${e(a.valor)}</div>
      </div>
    `).join("");

    const impactosHtml = (mus.impactos || []).map(i => `
      <div class="gancho">
        <span class="gancho-icon">◆</span>
        <span>${e(i)}</span>
      </div>
    `).join("");

    const ganchosHtml = (mus.ganchos || []).map(g => `
      <div class="gancho">
        <span class="gancho-icon">🎣</span>
        <span>${e(g)}</span>
      </div>
    `).join("");

    const artChips = (mus.artistas || []).map(c => `<span class="chip gold">${e(c)}</span>`).join("");
    const movChips = (mus.movimento || []).map(c => `<span class="chip">${e(c)}</span>`).join("");
    const infChips = (mus.influenciou || []).map(c => `<span class="chip">${e(c)}</span>`).join("");
    const teoChips = (mus.conceitos_teoricos || []).map(c => `<span class="chip">${e(c)}</span>`).join("");

    const fotoUrl = (mus as any).foto_url;
    innerContent = `
      <div class="ficha-header">
        <div class="header-layout">
          ${fotoUrl ? `
          <div class="foto-moldura">
            <img src="${e(fotoUrl)}" alt="${e(mus.titulo)}" referrerpolicy="no-referrer">
          </div>
          ` : ""}
          <div>
            <div class="ficha-tipo">Música Pivô · ${e(mus.badge)}</div>
            <div class="ficha-nome">${e(mus.titulo)}</div>
            <div class="ficha-sub">${e(mus.artista)} · ${e(mus.ano)}</div>
            <div class="ficha-tagline">${e(mus.tagline)}</div>
          </div>
        </div>
        <div class="ficha-meta">
          <div class="meta-row">
            <div class="meta-lbl">Artista</div>
            <div class="meta-val">${e(mus.artista)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Ano de Lançamento</div>
            <div class="meta-val">${e(mus.ano)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Gênero Principal</div>
            <div class="meta-val">${e(mus.genero)}</div>
          </div>
        </div>
      </div>
      <div class="ficha-body">
        <div>
          <div class="sec-titulo">Por que é uma Música Pivô?</div>
          <div class="prose">${e(mus.por_que_pivo)}</div>
        </div>

        <div>
          <div class="sec-titulo">Contexto Criativo e Estúdio</div>
          <div class="prose">${e(mus.contexto_criacao)}</div>
        </div>

        <div>
          <div class="sec-titulo">Análise Musical Estestrutural</div>
          <div class="analise-grid">
            ${analiseHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Impacto Imediato & Legado</div>
          <div class="ganchos">
            ${impactosHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Ganchos para Vídeo (Visual Essay)</div>
          <div class="ganchos">
            ${ganchosHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Linhas de Conexão</div>
          <div class="conexoes-grid">
            <div class="conexao-group">
              <div class="conexao-label">Artistas Envolvidos</div>
              <div class="chips-wrap">${artChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Movimento Vinculado</div>
              <div class="chips-wrap">${movChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Inovações que Herdou / Influenciou</div>
              <div class="chips-wrap">${infChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Conceitos Teóricos Próprios</div>
              <div class="chips-wrap">${teoChips}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (ficha.tipo === "roteiro") {
    const rot = d as RoteiroData;
    const viradaHtml = (rot.pontos_virada || []).map(p => `
      <div class="gancho">
        <span class="gancho-icon">↯</span>
        <span>${e(p)}</span>
      </div>
    `).join("");

    const visuaisHtml = (rot.recursos_visuais || []).map(r => `
      <div class="gancho">
        <span class="gancho-icon">🎬</span>
        <span>${e(r)}</span>
      </div>
    `).join("");

    const altHtml = (rot.titulos_alternativos || []).map(t => `
      <div class="gancho">
        <span class="gancho-icon">✦</span>
        <span>${e(t)}</span>
      </div>
    `).join("");

    const fotoUrl = (rot as any).foto_url;
    innerContent = `
      <div class="ficha-header">
        <div class="header-layout">
          ${fotoUrl ? `
          <div class="foto-moldura">
            <img src="${e(fotoUrl)}" alt="${e(rot.titulo)}" referrerpolicy="no-referrer">
          </div>
          ` : ""}
          <div>
            <div class="ficha-tipo">Roteiro · Ensaio para Vídeo</div>
            <div class="ficha-nome">${e(rot.titulo)}</div>
            <div class="ficha-sub">${e(rot.tese_central)}</div>
          </div>
        </div>
        <div class="ficha-meta">
          <div class="meta-row">
            <div class="meta-lbl">Formato Estimado</div>
            <div class="meta-val">${e(rot.formato)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Era / Gênero Temático</div>
            <div class="meta-val">${e(rot.era_genero)}</div>
          </div>
        </div>
      </div>
      <div class="ficha-body">
        <div>
          <div class="gancho-principal">
            <div class="gancho-num">▶</div>
            <div>
              <div class="gancho-lbl">Gancho de Entrada — Primeiros 30 Segundos</div>
              <div class="gancho-txt">${e(rot.gancho_30s)}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="sec-titulo">Estrutura Narrativa do Vídeo</div>
          <div class="estrutura">
            <div class="est-bloco">
              <div class="est-header">
                <div class="est-icone">1</div>
                <div class="est-titulo-bloco">Introdução</div>
              </div>
              <div class="est-pct">~10% do vídeo</div>
              <div class="est-texto">${e(rot.introducao)}</div>
            </div>
            
            <div class="est-bloco">
              <div class="est-header">
                <div class="est-icone">2</div>
                <div class="est-titulo-bloco">Argumentação</div>
              </div>
              <div class="est-pct">~75% do vídeo</div>
              <div class="est-texto">${e(rot.desenvolvimento)}</div>
            </div>

            <div class="est-bloco">
              <div class="est-header">
                <div class="est-icone">3</div>
                <div class="est-titulo-bloco">Conclusão</div>
              </div>
              <div class="est-pct">~15% do vídeo</div>
              <div class="est-texto">${e(rot.conclusao)}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="sec-titulo">Pontos de Virada Dramáticos</div>
          <div class="ganchos">
            ${viradaHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Sugestões de Direção & Recursos Visuais</div>
          <div class="ganchos">
            ${visuaisHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Sugestões para Títulos (High CTR)</div>
          <div class="ganchos">
            ${altHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Concepção Visual da Thumbnail</div>
          <div class="prose">${e(rot.thumbnail_ideia)}</div>
        </div>
      </div>
    `;
  } else if (ficha.tipo === "instrumento") {
    const inst = d as InstrumentoData;
    const timbricasHtml = (inst.caracteristicas_timbristicas || []).map(t => `
      <tr>
        <td>${e(t.registro)}</td>
        <td>${e(t.descricao)}</td>
      </tr>
    `).join("");

    const virtuosesHtml = (inst.pioneiros_virtuoses || []).map(v => `
      <div class="figura">
        <span class="figura-nome">${e(v.nome)}</span>
        <span class="figura-papel">${e(v.estilo_contribuicao)}</span>
      </div>
    `).join("");

    const obrasHtml = (inst.obras_chave || []).map(o => `
      <div class="card">
        <div class="card-titulo">${e(o.titulo)}</div>
        <div class="card-ano">${e(o.artista)} · ${e(o.ano)}</div>
        <div class="card-desc">${e(o.descricao)}</div>
      </div>
    `).join("");

    const ganchosHtml = (inst.ganchos || []).map(g => `
      <div class="gancho">
        <span class="gancho-icon">🎣</span>
        <span>${e(g)}</span>
      </div>
    `).join("");

    const tecnicasChips = (inst.tecnicas_expressivas || []).map(c => `<span class="chip gold">${e(c)}</span>`).join("");
    const conexoesChips = (inst.conexoes_historicas || []).map(c => `<span class="chip">${e(c)}</span>`).join("");

    const fotoUrl = inst.foto_url;
    innerContent = `
      <div class="ficha-header">
        <div class="header-layout">
          ${fotoUrl ? `
          <div class="foto-moldura">
            <img src="${e(fotoUrl)}" alt="${e(inst.nome)}" referrerpolicy="no-referrer">
          </div>
          ` : ""}
          <div>
            <div class="ficha-tipo">Cofre de Instrumento</div>
            <div class="ficha-nome">${e(inst.nome)}</div>
            <div class="ficha-sub">Família: ${e(inst.familia)} · Clas: ${e(inst.classificacao_sachs_hornbostel)}</div>
            <div class="ficha-tagline">${e(inst.tagline)}</div>
          </div>
        </div>
        <div class="ficha-meta">
          <div class="meta-row">
            <div class="meta-lbl">Família Acústica</div>
            <div class="meta-val">${e(inst.familia)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Sachs-Hornbostel</div>
            <div class="meta-val">${e(inst.classificacao_sachs_hornbostel)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Origem Histórica</div>
            <div class="meta-val">${e(inst.origem_historica)}</div>
          </div>
          <div class="meta-row">
            <div class="meta-lbl">Criadores e Pioneiros</div>
            <div class="meta-val">${e(inst.construtores_pioneiros)}</div>
          </div>
        </div>
      </div>
      <div class="ficha-body">
        <div>
          <div class="sec-titulo">Mecânica de Funcionamento Acústico</div>
          <div class="prose">${e(inst.funcionamento_acustico)}</div>
        </div>

        <div>
          <div class="sec-titulo">Registros e Características Timbrísticas</div>
          <table class="carac-table">
            <tbody>
              ${timbricasHtml}
            </tbody>
          </table>
        </div>

        <div>
          <div class="sec-titulo">Mestres & Virtuoses do Instrumento</div>
          <div class="figuras">
            ${virtuosesHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Obras Chave de Referência</div>
          <div class="cards-grid">
            ${obrasHtml}
          </div>
        </div>

        <div>
          <div class="sec-titulo">Técnicas Expressivas Avançadas</div>
          <div class="conexoes-grid">
            <div class="conexao-group">
              <div class="conexao-label">Técnicas</div>
              <div class="chips-wrap">${tecnicasChips}</div>
            </div>
            <div class="conexao-group">
              <div class="conexao-label">Contextos e Relações</div>
              <div class="chips-wrap">${conexoesChips}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="sec-titulo">Ganchos Biográficos & Curiosidades</div>
          <div class="ganchos">
            ${ganchosHtml}
          </div>
        </div>
      </div>
    `;
  }

  // Create full stand-alone HTML document string
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(ficha.titulo)} — Ficha do Canal de Música</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="ficha-output">
    ${innerContent}
    <div class="ficha-rodape">
      <div class="fontes-txt">
        <strong>Fontes de pesquisa recomendadas:</strong><br/>
        ${e(d.fontes)}
      </div>
      <div class="status-dot-sm"></div>
    </div>
  </div>
  <div class="exported-watermark">
    Ficha de estudo gerada via Fichas Musicais SaaS · ${reviewerInfo}
  </div>
</body>
</html>`;
}

// Client Helper to Trigger Browser Safe HTML File Download
export function downloadFichaAsHtml(ficha: Ficha, reviewerName?: string) {
  const htmlContent = getFichaHtmlString(ficha, reviewerName);
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  // Clean file name
  const safeName = (ficha.titulo || "ficha_musical")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_+|_+$)/g, "");

  link.download = `ficha_${ficha.tipo}_${safeName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
