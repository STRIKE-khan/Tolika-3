/* =========================================================
   SHARED UTILITIES — utils.js
   Common helper functions used across all tool modules.
   ========================================================= */

// ── File I/O ──────────────────────────────────────────────
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Canvas Helpers ────────────────────────────────────────
export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

// ── UI Helpers ────────────────────────────────────────────
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}
export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') elem.className = val;
    else if (key === 'innerHTML') elem.innerHTML = val;
    else if (key === 'textContent') elem.textContent = val;
    else if (key === 'style' && typeof val === 'object') Object.assign(elem.style, val);
    else if (key.startsWith('on')) elem.addEventListener(key.slice(2).toLowerCase(), val);
    else elem.setAttribute(key, val);
  }
  for (const child of children) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const iconMap = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  const toast = el('div', { 
    className: `toast toast-${type}`,
    style: { '--duration': `${duration}ms` } 
  }, [
    el('div', { className: 'toast-content' }, [
      el('span', { className: 'toast-icon', innerHTML: iconMap[type] || iconMap.info }),
      el('span', { textContent: message })
    ]),
    el('div', { className: 'toast-progress' }, [
      el('div', { className: 'toast-progress-bar' })
    ])
  ]);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard!', 'success');
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatNumber(n) {
  return n.toLocaleString();
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ── Dynamic Script Loader ─────────────────────────────────
const loadedScripts = new Set();
export function loadScript(src) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { loadedScripts.add(src); resolve(); };
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

// ── Drop Zone Factory ─────────────────────────────────────
export function createDropZone(container, { accept = '*', multiple = false, onFiles, label = 'Drop files here or click to browse', hint = '' }) {
  const zone = el('div', { className: 'drop-zone' }, [
    el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
    el('div', { className: 'drop-zone-text', textContent: label }),
    hint ? el('div', { className: 'drop-zone-hint', textContent: hint }) : null,
  ].filter(Boolean));

  const input = el('input', { type: 'file', accept, ...(multiple ? { multiple: 'true' } : {}) });
  zone.appendChild(input);

  input.addEventListener('change', () => {
    if (input.files.length) onFiles([...input.files]);
  });

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  });

  container.appendChild(zone);
  return zone;
}

// ── Crypto Helpers ────────────────────────────────────────
export async function hashText(text, algorithm = 'SHA-256') {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashFile(file, algorithm = 'SHA-256') {
  const buffer = await readFileAsArrayBuffer(file);
  const hash = await crypto.subtle.digest(algorithm, buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureRandom(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

// ── Color Helpers ─────────────────────────────────────────
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── WCAG Contrast ─────────────────────────────────────────
export function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1), rgb2 = hexToRgb(hex2);
  const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── CSV/XML Parsers ───────────────────────────────────────
export function parseCSV(text, delimiter = ',') {
  const lines = text.trim().split('\n');
  const result = [];
  for (const line of lines) {
    const row = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === delimiter) { row.push(current.trim()); current = ''; }
        else current += ch;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  return result;
}

export function jsonToCSV(jsonArray) {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) return '';
  const headers = Object.keys(jsonArray[0]);
  const rows = jsonArray.map(obj =>
    headers.map(h => {
      let val = obj[h] ?? '';
      val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function jsonToXML(obj, rootName = 'root') {
  function toXML(data, name) {
    if (Array.isArray(data)) {
      return data.map(item => toXML(item, 'item')).join('\n');
    }
    if (typeof data === 'object' && data !== null) {
      const children = Object.entries(data).map(([k, v]) => toXML(v, k)).join('\n');
      return `<${name}>\n${children}\n</${name}>`;
    }
    return `<${name}>${escapeXML(String(data))}</${name}>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXML(obj, rootName)}`;
}

function escapeXML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Simple Diff Engine (Myers) ────────────────────────────
export function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result = [];
  let oi = 0, ni = 0;

  // Simple LCS-based diff
  const lcs = [];
  const m = oldLines.length, n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  let i = m, j = n;
  const common = [];
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      common.unshift({ oi: i - 1, ni: j - 1 });
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  oi = 0; ni = 0;
  for (const c of common) {
    while (oi < c.oi) { result.push({ type: 'removed', text: oldLines[oi] }); oi++; }
    while (ni < c.ni) { result.push({ type: 'added', text: newLines[ni] }); ni++; }
    result.push({ type: 'unchanged', text: oldLines[oi] });
    oi++; ni++;
  }
  while (oi < m) { result.push({ type: 'removed', text: oldLines[oi] }); oi++; }
  while (ni < n) { result.push({ type: 'added', text: newLines[ni] }); ni++; }

  return result;
}

// ── Markdown Parser (lightweight) ─────────────────────────
export function parseMarkdown(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  return `<p>${html}</p>`;
}

// ── New Enhancements for Tolika ───────────────────────────
export function animateValue(element, start, end, duration) {
  if (!element) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    element.textContent = Math.floor(progress * (end - start) + start).toLocaleString();
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

export function staggeredReveal(selector, baseDelay = 50) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el, index) => {
    el.style.setProperty('--delay', `${index * baseDelay}ms`);
  });
}

export function rippleEffect(event) {
  const btn = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;
  
  const rect = btn.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');
  
  const ripple = btn.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }
  btn.appendChild(circle);
}
