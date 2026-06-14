/* =========================================================
   APP CONTROLLER — app.js
   Main router, intelligent fuzzy search, sidebar builder,
   theme switcher, and landing page renderer.
   ========================================================= */

import { $, $$, el, showToast, debounce } from './utils.js';

// ── Import Tool Modules ───────────────────────────────────
let allTools = [];

async function loadToolModules() {
  const modules = await Promise.all([
    import('./tools/imageTools.js'),
    import('./tools/textTools.js'),
    import('./tools/devTools.js'),
    import('./tools/mathTools.js'),
    import('./tools/fileTools.js'),
    import('./tools/videoTools.js'),
    import('./tools/audioTools.js'),
  ]);
  allTools = modules.flatMap(m => m.default);
  return allTools;
}

// ── Category Metadata ─────────────────────────────────────
const CATEGORIES = {
  image: {
    label: 'Image & Graphics',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
  },
  text: {
    label: 'Text & Writing',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
  },
  dev: {
    label: 'Developer Tools',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
  },
  math: {
    label: 'Math & Finance',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>'
  },
  file: {
    label: 'Files & Documents',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
  },
  video: {
    label: 'Video & Motion',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>'
  },
  audio: {
    label: 'Audio & Music',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
  }
};

// ══════════════════════════════════════════════════════════
// ── INTELLIGENT FUZZY SEARCH ─────────────────────────────
// ══════════════════════════════════════════════════════════

function fuzzySearch(query, tools) {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  if (q.length === 0) return [];

  const scored = [];

  for (const tool of tools) {
    let score = 0;
    const name = tool.name.toLowerCase();
    const desc = (tool.description || '').toLowerCase();
    const keywords = (tool.keywords || []).map(k => k.toLowerCase());
    const category = (CATEGORIES[tool.category]?.label || '').toLowerCase();

    // 1. Exact name match (highest)
    if (name === q) { score += 1000; }
    // 2. Name starts with query
    else if (name.startsWith(q)) { score += 500; }
    // 3. Name contains query
    else if (name.includes(q)) { score += 300; }

    // 4. Exact keyword match
    for (const kw of keywords) {
      if (kw === q) { score += 400; break; }
      if (kw.startsWith(q)) { score += 250; break; }
      if (kw.includes(q)) { score += 150; break; }
    }

    // 5. Category match
    if (category.includes(q)) { score += 80; }

    // 6. Description contains
    if (desc.includes(q)) { score += 50; }

    // 7. Fuzzy: Levenshtein distance to name words and keywords
    if (score === 0) {
      const allTargets = [name, ...name.split(/\s+/), ...keywords];
      let bestLev = Infinity;
      for (const target of allTargets) {
        const d = levenshtein(q, target);
        bestLev = Math.min(bestLev, d);
        // Also check if q is close to the start of target
        if (target.length >= q.length) {
          const sub = target.substring(0, q.length);
          bestLev = Math.min(bestLev, levenshtein(q, sub));
        }
      }
      // Accept fuzzy matches within edit distance of 2 (or 3 for longer queries)
      const threshold = q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3;
      if (bestLev <= threshold) {
        score += Math.max(1, 100 - bestLev * 30);
      }
    }

    // 8. Trigram similarity bonus
    if (score === 0 || score < 100) {
      const triScore = trigramSimilarity(q, name + ' ' + keywords.join(' '));
      if (triScore > 0.2) {
        score += Math.round(triScore * 80);
      }
    }

    if (score > 0) {
      scored.push({ tool, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 12).map(s => s.tool);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function trigrams(s) {
  const set = new Set();
  const padded = `  ${s} `;
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.substring(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a, b) {
  const ta = trigrams(a.toLowerCase());
  const tb = trigrams(b.toLowerCase());
  let intersection = 0;
  for (const t of ta) { if (tb.has(t)) intersection++; }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ══════════════════════════════════════════════════════════
// ── SIDEBAR BUILDER ──────────────────────────────────────
// ══════════════════════════════════════════════════════════

function buildSidebar(tools) {
  const nav = $('#sidebarNav');
  nav.innerHTML = '';

  const grouped = {};
  for (const tool of tools) {
    if (!grouped[tool.category]) grouped[tool.category] = [];
    grouped[tool.category].push(tool);
  }

  const categoryOrder = ['image', 'video', 'audio', 'text', 'dev', 'math', 'file'];
  for (const catKey of categoryOrder) {
    const catTools = grouped[catKey];
    if (!catTools || catTools.length === 0) continue;
    const catMeta = CATEGORIES[catKey];

    const categoryEl = el('div', { className: 'nav-category', 'data-category': catKey });

    const header = el('div', { className: 'nav-category-header' }, [
      el('div', { className: 'flex-row gap-sm', style: { flex: '1', minWidth: '0' } }, [
        el('span', { className: 'nav-category-label', textContent: catMeta.label }),
        el('span', { className: 'nav-category-count', textContent: String(catTools.length) }),
      ]),
      el('svg', {
        className: 'nav-category-chevron',
        innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
      }),
    ]);

    header.addEventListener('click', () => {
      categoryEl.classList.toggle('collapsed');
    });

    const itemsContainer = el('div', { className: 'nav-category-items' });

    for (const tool of catTools) {
      const item = el('div', {
        className: 'nav-item',
        'data-tool-id': tool.id,
      }, [
        el('span', { className: 'nav-item-icon', innerHTML: tool.icon }),
        el('span', { textContent: tool.name }),
      ]);
      item.addEventListener('click', () => navigateTo(tool.id));
      itemsContainer.appendChild(item);
    }

    categoryEl.appendChild(header);
    categoryEl.appendChild(itemsContainer);
    nav.appendChild(categoryEl);
  }

  // Update tool count
  $('#toolCount').textContent = `${tools.length} Tools`;
}

// ══════════════════════════════════════════════════════════
// ── SEARCH UI ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

function initSearch() {
  const input = $('#searchInput');
  const results = $('#searchResults');
  let activeIndex = -1;

  const doSearch = debounce((q) => {
    const matches = fuzzySearch(q, allTools);
    activeIndex = -1;
    if (q.trim().length === 0) {
      results.classList.remove('active');
      results.innerHTML = '';
      return;
    }

    if (matches.length === 0) {
      results.innerHTML = '<div class="search-no-results">No tools found</div>';
      results.classList.add('active');
      return;
    }

    results.innerHTML = '';
    for (const tool of matches) {
      const catLabel = CATEGORIES[tool.category]?.label || tool.category;
      // Highlight matching portion in name
      const nameHtml = highlightMatch(tool.name, q.trim());
      const item = el('div', { className: 'search-result-item', 'data-tool-id': tool.id }, [
        el('div', { className: 'search-result-icon', innerHTML: tool.icon }),
        el('div', { className: 'search-result-info' }, [
          el('div', { className: 'search-result-name', innerHTML: nameHtml }),
          el('div', { className: 'search-result-category', textContent: catLabel }),
        ]),
      ]);
      item.addEventListener('click', () => {
        navigateTo(tool.id);
        input.value = '';
        results.classList.remove('active');
      });
      results.appendChild(item);
    }
    results.classList.add('active');
  }, 150);

  input.addEventListener('input', () => doSearch(input.value));

  input.addEventListener('keydown', (e) => {
    const items = $$('.search-result-item', results);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      }
    } else if (e.key === 'Escape') {
      input.value = '';
      results.classList.remove('active');
      input.blur();
    }
  });

  // Global "/" shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      input.focus();
    }
  });

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      results.classList.remove('active');
    }
  });
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.substring(0, idx);
  const match = text.substring(idx, idx + query.length);
  const after = text.substring(idx + query.length);
  return `${before}<mark>${match}</mark>${after}`;
}

// ══════════════════════════════════════════════════════════
// ── ROUTING ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

let currentTool = null;

function navigateTo(toolId) {
  window.location.hash = toolId ? `#${toolId}` : '';
}

function renderTool(toolId) {
  const container = $('#toolContainer');

  // Add exiting class for smooth transition
  container.classList.add('exiting');

  setTimeout(() => {
    // Cleanup previous tool
    if (currentTool && currentTool.cleanup) {
      try { currentTool.cleanup(); } catch (e) { console.warn('Cleanup error:', e); }
    }
    currentTool = null;

    // Clear container
    container.innerHTML = '';

    if (!toolId) {
      renderLanding(container);
      updateBreadcrumb(null);
      updateActiveNav(null);
      container.classList.remove('exiting');
      return;
    }

    const tool = allTools.find(t => t.id === toolId);
    if (!tool) {
      renderLanding(container);
      updateBreadcrumb(null);
      updateActiveNav(null);
      container.classList.remove('exiting');
      return;
    }

    currentTool = tool;
    updateBreadcrumb(tool);
    updateActiveNav(tool.id);

    // Create tool wrapper
    const wrapper = el('div', { className: 'glass-card', style: { animation: 'fadeInUp .45s cubic-bezier(0.16, 1, 0.3, 1)' } });
    const header = el('div', { className: 'tool-header' }, [
      el('h2', { innerHTML: `${tool.icon} <span style="margin-left:8px">${tool.name}</span>`, style: { display: 'flex', alignItems: 'center' } }),
      tool.description ? el('p', { textContent: tool.description }) : null,
    ].filter(Boolean));
    wrapper.appendChild(header);

    const content = el('div', { className: 'tool-content' });
    wrapper.appendChild(content);
    container.appendChild(wrapper);

    // Render tool
    try {
      tool.render(content);
    } catch (err) {
      content.innerHTML = `<p style="color:var(--danger)">Error loading tool: ${err.message}</p>`;
      console.error(err);
    }

    // Close sidebar on mobile
    closeMobileSidebar();
    container.classList.remove('exiting');
  }, 150);
}

function updateBreadcrumb(tool) {
  const bc = $('#breadcrumb');
  if (!tool) {
    bc.innerHTML = '<span class="breadcrumb-item breadcrumb-home">Home</span>';
  } else {
    const catLabel = CATEGORIES[tool.category]?.label || '';
    bc.innerHTML = `
      <a href="#" class="breadcrumb-item breadcrumb-home" style="cursor:pointer">Home</a>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item" style="color:var(--text-2)">${catLabel}</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item breadcrumb-current">${tool.name}</span>
    `;
  }
}

function updateActiveNav(toolId) {
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.toolId === toolId);
  });

  // Expand the parent category if collapsed
  if (toolId) {
    const activeItem = $(`.nav-item[data-tool-id="${toolId}"]`);
    if (activeItem) {
      const category = activeItem.closest('.nav-category');
      if (category && category.classList.contains('collapsed')) {
        category.classList.remove('collapsed');
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
// ── LANDING PAGE ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════

function renderLanding(container) {
  const landing = el('div', { className: 'landing' });

  // Hero
  const hero = el('div', { className: 'landing-hero' }, [
    el('div', { className: 'hero-badge' }, [
      el('span', { className: 'hero-badge-dot' }),
      el('span', { textContent: '100% Client-Side · Zero Data Leaks' }),
    ]),
    el('h1', {}, [
      document.createTextNode('Your Ultimate '),
      el('span', { className: 'text-gradient', textContent: 'Toolbox' }),
    ]),
    el('p', { textContent: `${allTools.length}+ premium tools for developers, creators, and students. Image editing, text processing, dev utilities, calculators, and file converters — running locally in your browser.` }),
  ]);
  landing.appendChild(hero);

  // Categories grid
  const catSection = el('div', { className: 'landing-categories' });
  const categoryOrder = ['image', 'video', 'audio', 'text', 'dev', 'math', 'file'];

  for (const catKey of categoryOrder) {
    const catMeta = CATEGORIES[catKey];
    const catTools = allTools.filter(t => t.category === catKey);
    if (catTools.length === 0) continue;

    const title = el('div', { className: 'landing-category-title' }, [
      el('span', { innerHTML: catMeta.icon, style: { display: 'flex' } }),
      el('span', { textContent: `${catMeta.label} (${catTools.length})` }),
    ]);
    catSection.appendChild(title);

    const grid = el('div', { className: 'tools-grid' });
    
    // Add staggered delay to each card
    catTools.forEach((tool, index) => {
      const card = el('div', { 
        className: 'tool-card', 
        'data-tool-id': tool.id,
        style: { '--delay': `${index * 0.04}s` }
      }, [
        el('div', { className: 'tool-card-icon', innerHTML: tool.icon }),
        el('div', { className: 'tool-card-info' }, [
          el('div', { className: 'tool-card-name', textContent: tool.name }),
          tool.description ? el('div', { className: 'tool-card-desc', textContent: tool.description }) : null,
        ].filter(Boolean)),
      ]);
      card.addEventListener('click', () => navigateTo(tool.id));
      grid.appendChild(card);
    });
    
    catSection.appendChild(grid);
  }
  landing.appendChild(catSection);
  container.appendChild(landing);
}

// ══════════════════════════════════════════════════════════
// ── THEME SWITCHER ───────────────────────────────────────
// ══════════════════════════════════════════════════════════

function initTheme() {
  const saved = localStorage.getItem('tolika-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  $('#themeBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tolika-theme', next);
  });
}

// ══════════════════════════════════════════════════════════
// ── MOBILE SIDEBAR ───────────────────────────────────────
// ══════════════════════════════════════════════════════════

function initMobileSidebar() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebarOverlay');

  $('#menuBtn').addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  });

  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  };

  $('#sidebarCloseBtn').addEventListener('click', close);
  overlay.addEventListener('click', close);
}

function closeMobileSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('active');
}

// ══════════════════════════════════════════════════════════
// ── HASH ROUTER ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════

function handleHash() {
  const hash = window.location.hash.replace('#', '');
  renderTool(hash || null);
}

// ══════════════════════════════════════════════════════════
// ── INIT ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

async function init() {
  try {
    await loadToolModules();
  } catch (err) {
    console.error('Failed to load tool modules:', err);
    showToast('Some tools failed to load', 'warning');
  }

  buildSidebar(allTools);
  initSearch();
  initTheme();
  initMobileSidebar();

  // Logo click → home
  $('#logoLink').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(null);
  });

  // Hash routing
  window.addEventListener('hashchange', handleHash);
  handleHash();
}

init();
