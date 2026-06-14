/* =========================================================
   DEVELOPER & CODING UTILITIES — devTools.js
   ========================================================= */

import { $, $$, el, showToast, copyToClipboard, hashText, parseCSV, jsonToCSV, jsonToXML, loadScript } from '../utils.js';

export default [
  // 37. JSON Formatter & Minifier
  {
    id: 'json-formatter',
    name: 'JSON Formatter & Minifier',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>',
    description: 'Beautify, minify JSON/YAML, or visualize with collapsible Tree View.',
    keywords: ['json', 'formatter', 'minify', 'pretty print', 'json format', 'yaml', 'tree view'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <!-- Left Pane: Input and Controls -->
            <div class="flex-col gap-md">
              <div class="form-group">
                <label class="form-label">JSON or YAML Input</label>
                <textarea id="jsonText" class="textarea-field" style="min-height:300px; font-family:var(--font-mono);" placeholder='{"name":"Tolika","version":"16.0"}'></textarea>
              </div>

              <div class="grid-2 gap-sm">
                <div class="form-group">
                  <label class="form-label">Tab Size</label>
                  <select id="jsonTab" class="select-field">
                    <option value="2">2 Spaces</option>
                    <option value="4">4 Spaces</option>
                  </select>
                </div>
                <div class="flex-row gap-xs" style="margin-top:24px;">
                  <button id="beautifyJson" class="btn btn-primary" style="flex:1;">Format JSON</button>
                  <button id="minifyJson" class="btn btn-secondary" style="flex:1;">Minify JSON</button>
                </div>
              </div>

              <div class="grid-2 gap-sm">
                <button id="jsonToYamlBtn" class="btn btn-secondary">Convert to YAML</button>
                <button id="yamlToJsonBtn" class="btn btn-secondary">Convert to JSON</button>
              </div>
            </div>

            <!-- Right Pane: Output and Visualizer -->
            <div class="flex-col gap-md">
              <div class="flex-row" style="justify-content:space-between; align-items:center;">
                <label class="form-label" style="margin:0;">Output</label>
                <div class="flex-row gap-xs">
                  <button id="tabRaw" class="btn btn-sm btn-primary">Raw Text</button>
                  <button id="tabTree" class="btn btn-sm btn-secondary">Tree View</button>
                </div>
              </div>

              <div id="rawOutputWrapper" class="form-group" style="margin:0;">
                <textarea id="jsonOutputText" class="textarea-field" style="min-height:300px; font-family:var(--font-mono);" readonly placeholder="Output will appear here..."></textarea>
              </div>

              <div id="treeOutputWrapper" class="json-tree-container hidden" style="min-height:300px; max-height:300px; overflow:auto;">
                <span class="text-muted" style="color:var(--text-3);">Format JSON to see the visual tree...</span>
              </div>

              <button id="copyOutputBtn" class="btn btn-secondary w-full">Copy Output</button>
            </div>
          </div>
        </div>
      `;

      const txt = $('#jsonText');
      const outTxt = $('#jsonOutputText');
      const treeOut = $('#treeOutputWrapper');
      const tabRaw = $('#tabRaw');
      const tabTree = $('#tabTree');
      const rawWrapper = $('#rawOutputWrapper');

      async function getJsYaml() {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js');
      }

      function switchTab(showRaw) {
        if (showRaw) {
          tabRaw.className = 'btn btn-sm btn-primary';
          tabTree.className = 'btn btn-sm btn-secondary';
          rawWrapper.classList.remove('hidden');
          treeOut.classList.add('hidden');
        } else {
          tabRaw.className = 'btn btn-sm btn-secondary';
          tabTree.className = 'btn btn-sm btn-primary';
          rawWrapper.classList.add('hidden');
          treeOut.classList.remove('hidden');
        }
      }

      tabRaw.addEventListener('click', () => switchTab(true));
      tabTree.addEventListener('click', () => switchTab(false));

      function renderTree(obj, targetEl) {
        targetEl.innerHTML = '';
        
        function buildNode(val, key = null, isLast = true) {
          const node = el('div', { className: 'json-tree-node' });
          
          let keySpan = null;
          if (key !== null) {
            keySpan = el('span', { className: 'json-tree-key', textContent: `"${key}": ` });
          }

          if (val === null) {
            if (keySpan) node.appendChild(keySpan);
            node.appendChild(el('span', { className: 'json-tree-val-null', textContent: 'null' + (isLast ? '' : ',') }));
          } else if (typeof val === 'object') {
            const isArray = Array.isArray(val);
            const startBrac = isArray ? '[' : '{';
            const endBrac = isArray ? ']' : '}';
            const keys = Object.keys(val);

            const header = el('div', { style: 'display:inline-flex; align-items:center;' });
            
            if (keys.length > 0) {
              const toggle = el('span', { className: 'json-tree-toggle', textContent: '▼' });
              header.appendChild(toggle);
              if (keySpan) header.appendChild(keySpan);
              header.appendChild(el('span', { textContent: startBrac }));
              node.appendChild(header);

              const childrenContainer = el('div', { className: 'json-tree-children', style: 'margin-left: 20px;' });
              keys.forEach((k, idx) => {
                const isLastChild = idx === keys.length - 1;
                childrenContainer.appendChild(buildNode(val[k], isArray ? null : k, isLastChild));
              });
              node.appendChild(childrenContainer);

              node.appendChild(el('div', { textContent: endBrac + (isLast ? '' : ',') }));

              toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = childrenContainer.classList.toggle('hidden');
                toggle.classList.toggle('collapsed', isCollapsed);
              });
            } else {
              if (keySpan) node.appendChild(keySpan);
              node.appendChild(el('span', { textContent: startBrac + endBrac + (isLast ? '' : ',') }));
            }
          } else {
            if (keySpan) node.appendChild(keySpan);
            const type = typeof val;
            let valClass = '';
            let valText = val;
            if (type === 'string') {
              valClass = 'json-tree-val-string';
              valText = `"${val}"`;
            } else if (type === 'number') {
              valClass = 'json-tree-val-number';
            } else if (type === 'boolean') {
              valClass = 'json-tree-val-boolean';
            }
            node.appendChild(el('span', { className: valClass, textContent: valText + (isLast ? '' : ',') }));
          }
          return node;
        }

        targetEl.appendChild(buildNode(obj, null, true));
      }

      $('#beautifyJson').addEventListener('click', () => {
        try {
          const parsed = JSON.parse(txt.value);
          const tab = parseInt($('#jsonTab').value);
          const formatted = JSON.stringify(parsed, null, tab);
          outTxt.value = formatted;
          renderTree(parsed, treeOut);
          showToast('JSON Formatted', 'success');
        } catch(e) {
          showToast('Invalid JSON structure', 'error');
        }
      });

      $('#minifyJson').addEventListener('click', () => {
        try {
          const parsed = JSON.parse(txt.value);
          const minified = JSON.stringify(parsed);
          outTxt.value = minified;
          renderTree(parsed, treeOut);
          showToast('JSON Minified', 'success');
        } catch(e) {
          showToast('Invalid JSON structure', 'error');
        }
      });

      $('#jsonToYamlBtn').addEventListener('click', async () => {
        try {
          showToast('Loading YAML Parser...', 'info');
          await getJsYaml();
          const parsed = JSON.parse(txt.value);
          outTxt.value = window.jsyaml.dump(parsed);
          renderTree(parsed, treeOut);
          showToast('Converted to YAML', 'success');
        } catch(e) {
          showToast('Conversion failed: ' + e.message, 'error');
        }
      });

      $('#yamlToJsonBtn').addEventListener('click', async () => {
        try {
          showToast('Loading YAML Parser...', 'info');
          await getJsYaml();
          const parsed = window.jsyaml.load(txt.value);
          const tab = parseInt($('#jsonTab').value);
          outTxt.value = JSON.stringify(parsed, null, tab);
          renderTree(parsed, treeOut);
          showToast('Converted to JSON', 'success');
        } catch(e) {
          showToast('Conversion failed: ' + e.message, 'error');
        }
      });

      $('#copyOutputBtn').addEventListener('click', () => {
        if (outTxt.value) {
          copyToClipboard(outTxt.value);
          showToast('Copied output', 'success');
        } else {
          showToast('No output to copy', 'warning');
        }
      });
    }
  },

  // 38. JSON Validator & Repairer
  {
    id: 'json-validator',
    name: 'JSON Validator & Repairer',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    description: 'Validate JSON structures, highlight errors, and auto-repair trailing commas or unquoted keys.',
    keywords: ['json check', 'json validation', 'json repair', 'json fix'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">JSON string</label>
            <textarea id="jsonCheckText" class="textarea-field" style="min-height:200px;" placeholder='{name: "AuraTools",}'></textarea>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="validateJsonBtn" class="btn btn-primary">Validate</button>
            <button id="repairJsonBtn" class="btn btn-secondary">Auto Repair</button>
          </div>

          <div id="validationResult" class="hidden result-stat">
            <span class="result-stat-label">Validation Status</span>
            <span id="validationStatus" class="badge">Checking</span>
          </div>
        </div>
      `;

      const txt = $('#jsonCheckText');
      
      $('#validateJsonBtn').addEventListener('click', () => {
        const res = $('#validationResult');
        const badge = $('#validationStatus');
        res.classList.remove('hidden');

        try {
          JSON.parse(txt.value);
          badge.textContent = 'VALID JSON';
          badge.className = 'badge badge-success';
          showToast('Valid JSON', 'success');
        } catch(e) {
          badge.textContent = 'INVALID: ' + e.message;
          badge.className = 'badge badge-danger';
          showToast('JSON Errors detected', 'error');
        }
      });

      $('#repairJsonBtn').addEventListener('click', () => {
        let val = txt.value.trim();
        if (!val) return;

        // Simple repair rules:
        // 1. Wrap unquoted keys in double quotes
        val = val.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
        // 2. Replace single quotes with double quotes
        val = val.replace(/'/g, '"');
        // 3. Remove trailing commas
        val = val.replace(/,\s*([}\]])/g, '$1');

        try {
          const parsed = JSON.parse(val);
          txt.value = JSON.stringify(parsed, null, 2);
          showToast('JSON Repaired and Formatted', 'success');
        } catch {
          showToast('Auto-repair failed. Please fix manually.', 'error');
        }
      });
    }
  },

  // 39. JSON to CSV / CSV to JSON
  {
    id: 'json-csv-converter',
    name: 'JSON to CSV Converter',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4M3 22v-6a6 6 0 0 1 6-6h12"/></svg>',
    description: 'Bidirectional converter between tabular CSV data and structured JSON arrays.',
    keywords: ['csv to json', 'json to csv', 'converter', 'data parser'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">JSON Array</label>
              <textarea id="jsonCsvText" class="textarea-field" placeholder='[{"name":"John", "age":30}]'></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">CSV Output</label>
              <textarea id="csvJsonText" class="textarea-field" placeholder="name,age\nJohn,30"></textarea>
            </div>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="jsonToCsvBtn" class="btn btn-primary">JSON to CSV</button>
            <button id="csvToJsonBtn" class="btn btn-secondary">CSV to JSON</button>
          </div>
        </div>
      `;

      $('#jsonToCsvBtn').addEventListener('click', () => {
        try {
          const parsed = JSON.parse($('#jsonCsvText').value);
          $('#csvJsonText').value = jsonToCSV(parsed);
          showToast('Converted JSON to CSV', 'success');
        } catch {
          showToast('Invalid JSON structure. Needs array of objects.', 'error');
        }
      });

      $('#csvToJsonBtn').addEventListener('click', () => {
        try {
          const parsed = parseCSV($('#csvJsonText').value);
          if (parsed.length < 2) return;
          const headers = parsed[0];
          const rows = parsed.slice(1);
          
          const jsonArr = rows.map(row => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = row[i] || '';
            });
            return obj;
          });

          $('#jsonCsvText').value = JSON.stringify(jsonArr, null, 2);
          showToast('Converted CSV to JSON', 'success');
        } catch {
          showToast('Invalid CSV format', 'error');
        }
      });
    }
  },

  // 40. JSON to XML / XML to JSON
  {
    id: 'json-xml-converter',
    name: 'JSON to XML Converter',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Convert JSON config objects into XML documents and vice versa.',
    keywords: ['xml converter', 'json to xml', 'xml to json'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">JSON Object</label>
              <textarea id="jsonXmlText" class="textarea-field" placeholder='{"user": {"name":"John"}}'></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">XML Document</label>
              <textarea id="xmlJsonText" class="textarea-field" placeholder="<user><name>John</name></user>"></textarea>
            </div>
          </div>
          
          <button id="jsonToXmlBtn" class="btn btn-primary w-full">JSON to XML</button>
        </div>
      `;

      $('#jsonToXmlBtn').addEventListener('click', () => {
        try {
          const parsed = JSON.parse($('#jsonXmlText').value);
          $('#xmlJsonText').value = jsonToXML(parsed);
          showToast('Converted JSON to XML', 'success');
        } catch {
          showToast('Invalid JSON structure', 'error');
        }
      });
    }
  },

  // 41. JSON to YAML / YAML to JSON
  {
    id: 'json-yaml-converter',
    name: 'JSON to YAML Converter',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><polyline points="12 21 12 14 12 3"/><polyline points="20 21 20 14 20 3"/></svg>',
    description: 'Convert JSON configurations to YAML configurations and vice versa using js-yaml.',
    keywords: ['yaml', 'json to yaml', 'yaml to json', 'configuration converter'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">JSON Config</label>
              <textarea id="jsonYamlText" class="textarea-field" placeholder='{"theme":"dark", "debug":true}'></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">YAML Config</label>
              <textarea id="yamlJsonText" class="textarea-field" placeholder="theme: dark\ndebug: true"></textarea>
            </div>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="jsonToYamlBtn" class="btn btn-primary">JSON to YAML</button>
            <button id="yamlToJsonBtn" class="btn btn-secondary">YAML to JSON</button>
          </div>
        </div>
      `;

      async function getJsYaml() {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js');
      }

      $('#jsonToYamlBtn').addEventListener('click', async () => {
        try {
          showToast('Loading YAML Parser...', 'info');
          await getJsYaml();
          const parsed = JSON.parse($('#jsonYamlText').value);
          $('#yamlJsonText').value = window.jsyaml.dump(parsed);
          showToast('Converted JSON to YAML', 'success');
        } catch(e) {
          showToast('Conversion failed: ' + e.message, 'error');
        }
      });

      $('#yamlToJsonBtn').addEventListener('click', async () => {
        try {
          showToast('Loading YAML Parser...', 'info');
          await getJsYaml();
          const parsed = window.jsyaml.load($('#yamlJsonText').value);
          $('#jsonYamlText').value = JSON.stringify(parsed, null, 2);
          showToast('Converted YAML to JSON', 'success');
        } catch(e) {
          showToast('Conversion failed: ' + e.message, 'error');
        }
      });
    }
  },

  // 42. XML Formatter & Minifier
  {
    id: 'xml-formatter',
    name: 'XML Formatter & Minifier',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Format XML configurations or minify XML code client-side.',
    keywords: ['xml formatter', 'minify xml', 'format xml', 'xml prettify'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">XML Code</label>
            <textarea id="xmlText" class="textarea-field" style="min-height:200px;" placeholder="<note><to>Tove</to></note>"></textarea>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="formatXmlBtn" class="btn btn-primary">Format XML</button>
            <button id="minifyXmlBtn" class="btn btn-secondary">Minify XML</button>
          </div>
        </div>
      `;

      const code = $('#xmlText');

      $('#formatXmlBtn').addEventListener('click', () => {
        let val = code.value.trim();
        let formatted = '';
        let reg = /(<[^>]+>)/g;
        let elements = val.replace(reg, '\n$1\n').split('\n');
        let indent = 0;
        
        elements.forEach(elStr => {
          if (!elStr.trim()) return;
          if (elStr.startsWith('</')) indent--;
          formatted += '  '.repeat(Math.max(0, indent)) + elStr.trim() + '\n';
          if (elStr.startsWith('<') && !elStr.startsWith('</') && !elStr.endsWith('/>') && !elStr.startsWith('<?')) indent++;
        });

        code.value = formatted.trim();
        showToast('XML Formatted', 'success');
      });

      $('#minifyXmlBtn').addEventListener('click', () => {
        code.value = code.value.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
        showToast('XML Minified', 'success');
      });
    }
  },

  // 43. CSV Viewer & Editor
  {
    id: 'csv-viewer',
    name: 'CSV Viewer & Editor',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Render CSV structures into interactive filterable tabular data grids.',
    keywords: ['csv viewer', 'csv editor', 'csv table', 'tabular view'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">CSV Source String</label>
            <textarea id="csvInput" class="textarea-field" placeholder="name,age,city\nJohn,30,New York\nJane,25,Paris" style="min-height:120px"></textarea>
          </div>
          
          <button id="renderCsvBtn" class="btn btn-primary w-full">Render Table</button>
          
          <div id="csvTableContainer" class="csv-table-wrapper hidden">
            <table class="data-table" id="csvDataTable"></table>
          </div>
        </div>
      `;

      $('#renderCsvBtn').addEventListener('click', () => {
        const val = $('#csvInput').value;
        const parsed = parseCSV(val);
        if (parsed.length === 0) return;

        const table = $('#csvDataTable');
        table.innerHTML = '';

        // Render headers
        const trH = el('tr');
        parsed[0].forEach(h => {
          trH.appendChild(el('th', { textContent: h }));
        });
        table.appendChild(trH);

        // Render rows
        parsed.slice(1).forEach(row => {
          const trR = el('tr');
          row.forEach(cell => {
            trR.appendChild(el('td', { textContent: cell }));
          });
          table.appendChild(trR);
        });

        $('#csvTableContainer').classList.remove('hidden');
        showToast('CSV Rendered', 'success');
      });
    }
  },

  // 44. SQL Formatter
  {
    id: 'sql-formatter',
    name: 'SQL Formatter',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Pretty-print messy SQL queries with clean indentations and structure rules.',
    keywords: ['sql formatter', 'sql prettifier', 'format sql', 'db queries'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">SQL Query</label>
            <textarea id="sqlQueryText" class="textarea-field" style="min-height:200px;" placeholder="SELECT * FROM users WHERE age > 20 ORDER BY name ASC;"></textarea>
          </div>
          
          <button id="formatSqlBtn" class="btn btn-primary w-full">Format SQL</button>
        </div>
      `;

      $('#formatSqlBtn').addEventListener('click', () => {
        let val = $('#sqlQueryText').value.trim();
        if (!val) return;

        // Simple formatter
        let formatted = val
          .replace(/\s+/g, ' ')
          .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ORDER BY|GROUP BY|HAVING|LIMIT|AND|OR)\b/gi, '\n$1')
          .replace(/,/g, ',\n  ');
        
        $('#sqlQueryText').value = formatted.trim();
        showToast('SQL Formatted', 'success');
      });
    }
  },

  // 45. JWT Decoder
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    description: 'Decode JSON Web Token headers, payloads, and signatures client-side.',
    keywords: ['jwt decoder', 'jwt token', 'decode jwt', 'jwt claims'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">JWT Token</label>
            <textarea id="jwtInput" class="textarea-field" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea>
          </div>
          
          <button id="decodeJwtBtn" class="btn btn-primary w-full">Decode JWT</button>

          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">Header</label>
              <textarea id="jwtHeader" class="textarea-field" readonly></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Payload Claims</label>
              <textarea id="jwtPayload" class="textarea-field" readonly></textarea>
            </div>
          </div>
        </div>
      `;

      $('#decodeJwtBtn').addEventListener('click', () => {
        const token = $('#jwtInput').value.trim();
        const parts = token.split('.');
        if (parts.length !== 3) {
          showToast('Invalid JWT Token format', 'error');
          return;
        }

        try {
          const header = JSON.parse(atob(parts[0]));
          const payload = JSON.parse(atob(parts[1]));

          $('#jwtHeader').value = JSON.stringify(header, null, 2);
          $('#jwtPayload').value = JSON.stringify(payload, null, 2);
          showToast('Token decoded', 'success');
        } catch {
          showToast('Failed to parse token payload', 'error');
        }
      });
    }
  },

  // 46. Epoch/Unix Timestamp Converter
  {
    id: 'epoch-converter',
    name: 'Epoch / Unix Timestamp Converter',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Convert Unix epoch timestamps to human-readable dates and vice-versa.',
    keywords: ['epoch', 'timestamp', 'unix time', 'date converter'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Epoch Timestamp</label>
              <input type="text" id="epochInput" class="input-field" value="1718360000">
            </div>
            <div class="form-group">
              <label class="form-label">Human-Readable Date</label>
              <input type="text" id="dateInput" class="input-field" placeholder="YYYY-MM-DD HH:MM:SS">
            </div>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="epochToDateBtn" class="btn btn-primary">Epoch to Date</button>
            <button id="dateToEpochBtn" class="btn btn-secondary">Date to Epoch</button>
          </div>
        </div>
      `;

      $('#epochToDateBtn').addEventListener('click', () => {
        const val = parseInt($('#epochInput').value) * 1000;
        if (!val) return;
        const d = new Date(val);
        $('#dateInput').value = d.toISOString().replace('T', ' ').replace(/\..+/, '');
      });

      $('#dateToEpochBtn').addEventListener('click', () => {
        const val = $('#dateInput').value;
        if (!val) return;
        const d = new Date(val);
        $('#epochInput').value = Math.floor(d.getTime() / 1000);
      });
    }
  },

  // 47. Cron Expression Generator
  {
    id: 'cron-generator',
    name: 'Cron Expression Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Generate cron schedules interactively and read cron pattern explanations.',
    keywords: ['cron schedule', 'cron pattern', 'cron build', 'task scheduler'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="cron-fields">
            <div class="cron-field">
              <label>Minute</label>
              <input type="text" id="cronMin" class="input-field text-center" value="*">
            </div>
            <div class="cron-field">
              <label>Hour</label>
              <input type="text" id="cronHour" class="input-field text-center" value="*">
            </div>
            <div class="cron-field">
              <label>Day</label>
              <input type="text" id="cronDay" class="input-field text-center" value="*">
            </div>
            <div class="cron-field">
              <label>Month</label>
              <input type="text" id="cronMonth" class="input-field text-center" value="*">
            </div>
            <div class="cron-field">
              <label>Weekday</label>
              <input type="text" id="cronWeekday" class="input-field text-center" value="*">
            </div>
          </div>
          
          <div class="password-display">
            <span id="cronPattern" style="flex:1">* * * * *</span>
            <button id="copyCronBtn" class="btn btn-sm btn-secondary">Copy</button>
          </div>
        </div>
      `;

      function updateCron() {
        const m = $('#cronMin').value || '*';
        const h = $('#cronHour').value || '*';
        const d = $('#cronDay').value || '*';
        const mo = $('#cronMonth').value || '*';
        const w = $('#cronWeekday').value || '*';

        $('#cronPattern').textContent = `${m} ${h} ${d} ${mo} ${w}`;
      }

      container.querySelectorAll('.cron-field input').forEach(inp => {
        inp.addEventListener('input', updateCron);
      });

      $('#copyCronBtn').addEventListener('click', () => {
        copyToClipboard($('#cronPattern').textContent);
      });
    }
  },

  // 48. Hash Generator
  {
    id: 'hash-generator',
    name: 'Cryptographic Hash Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Calculate cryptographic hash checksums (SHA-256, SHA-512, MD5) on input text strings.',
    keywords: ['sha-256', 'sha-512', 'hash finder', 'md5 generator', 'checksums'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Input Plain Text</label>
            <textarea id="hashInputText" class="textarea-field" placeholder="Type text here..."></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Hashing Algorithm</label>
            <select id="hashAlgo" class="select-field">
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-512">SHA-512</option>
              <option value="SHA-1">SHA-1</option>
            </select>
          </div>

          <button id="calcHashBtn" class="btn btn-primary w-full">Generate Hash</button>
          
          <div class="password-display mt-md">
            <span id="hashResultVal" style="flex:1; word-break:break-all">Generate to view hash</span>
            <button id="copyHashBtn" class="btn btn-sm btn-secondary">Copy</button>
          </div>
        </div>
      `;

      $('#calcHashBtn').addEventListener('click', async () => {
        const text = $('#hashInputText').value;
        const algo = $('#hashAlgo').value;
        const hash = await hashText(text, algo);
        
        $('#hashResultVal').textContent = hash;
      });

      $('#copyHashBtn').addEventListener('click', () => {
        copyToClipboard($('#hashResultVal').textContent);
      });
    }
  },

  // 49. HMAC Generator
  {
    id: 'hmac-generator',
    name: 'HMAC Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Generate cryptographic key-hashed message authentication codes client-side.',
    keywords: ['hmac', 'sha hmac', 'signature key', 'message authentication'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Message Text</label>
            <textarea id="hmacMsg" class="textarea-field" placeholder="Message content..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">HMAC Secret Key</label>
            <input type="text" id="hmacKey" class="input-field" placeholder="Secret key">
          </div>
          
          <button id="genHmacBtn" class="btn btn-primary w-full">Calculate HMAC</button>

          <div class="password-display mt-md">
            <span id="hmacOutput" style="flex:1; word-break:break-all">Generate to view HMAC</span>
            <button id="copyHmacBtn" class="btn btn-sm btn-secondary">Copy</button>
          </div>
        </div>
      `;

      async function generateHMAC(keyStr, messageStr) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw', enc.encode(keyStr),
          { name: 'HMAC', hash: 'SHA-256' },
          false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, enc.encode(messageStr));
        return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      $('#genHmacBtn').addEventListener('click', async () => {
        const msg = $('#hmacMsg').value;
        const key = $('#hmacKey').value;
        if (!msg || !key) return;

        const signature = await generateHMAC(key, msg);
        $('#hmacOutput').textContent = signature;
      });

      $('#copyHmacBtn').addEventListener('click', () => {
        copyToClipboard($('#hmacOutput').textContent);
      });
    }
  },

  // 50. UUID Generator
  {
    id: 'uuid-generator',
    name: 'UUID / GUID Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    description: 'Bulk-generate random UUID v4 strings client-side.',
    keywords: ['uuid', 'guid', 'unique identifier', 'uuid v4'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Number of UUIDs</label>
            <input type="number" id="uuidCount" class="input-field" value="5" min="1">
          </div>
          
          <button id="generateUuidBtn" class="btn btn-primary w-full">Generate UUIDs</button>
          
          <div class="output-area" id="uuidOutput" style="display:none"></div>
        </div>
      `;

      function uuidv4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
      }

      $('#generateUuidBtn').addEventListener('click', () => {
        const count = parseInt($('#uuidCount').value) || 1;
        const out = $('#uuidOutput');
        
        let list = [];
        for (let i = 0; i < count; i++) {
          list.push(uuidv4());
        }

        out.textContent = list.join('\n');
        out.style.display = 'block';
        showToast('UUIDs generated', 'success');
      });
    }
  },

  // 51. User Agent Parser
  {
    id: 'user-agent-parser',
    name: 'User Agent Parser',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    description: 'Inspect and parse your browser or any custom User Agent string.',
    keywords: ['user agent', 'browser', 'os checker', 'agent header'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">User Agent String</label>
            <textarea id="uaInput" class="textarea-field"></textarea>
          </div>
          
          <div class="grid-3">
            <div class="result-stat">
              <span class="result-stat-label">OS</span>
              <span id="uaOs" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Browser</span>
              <span id="uaBrowser" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Engine</span>
              <span id="uaEngine" class="result-stat-value">-</span>
            </div>
          </div>
        </div>
      `;

      const input = $('#uaInput');
      input.value = navigator.userAgent;

      function parseUA() {
        const ua = input.value.toLowerCase();
        let os = 'Unknown OS';
        let browser = 'Unknown Browser';
        let engine = 'Unknown Engine';

        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('macintosh')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
        else if (ua.includes('android')) os = 'Android';

        if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('chrome')) browser = 'Chrome';
        else if (ua.includes('safari')) browser = 'Safari';
        else if (ua.includes('edge')) browser = 'Edge';

        if (ua.includes('webkit')) engine = 'WebKit';
        else if (ua.includes('gecko')) engine = 'Gecko';

        $('#uaOs').textContent = os;
        $('#uaBrowser').textContent = browser;
        $('#uaEngine').textContent = engine;
      }

      input.addEventListener('input', parseUA);
      parseUA();
    }
  },

  // 52. CSS Shadow Generator
  {
    id: 'css-shadow-gen',
    name: 'CSS Shadow Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Design CSS Box Shadow styles visually and grab the styled output.',
    keywords: ['box shadow', 'css shadow', 'visual shadows', 'shadow editor'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Horizontal Offset (px)</label>
              <div class="slider-group">
                <input type="range" id="shOffsetX" class="slider-control" min="-50" max="50" value="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Vertical Offset (px)</label>
              <div class="slider-group">
                <input type="range" id="shOffsetY" class="slider-control" min="-50" max="50" value="10">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Blur Radius (px)</label>
              <div class="slider-group">
                <input type="range" id="shBlur" class="slider-control" min="0" max="100" value="20">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Spread Radius (px)</label>
              <div class="slider-group">
                <input type="range" id="shSpread" class="slider-control" min="-50" max="50" value="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Shadow Color</label>
              <input type="color" id="shColor" class="input-field" value="#000000" style="height:40px; padding:0;">
            </div>
          </div>

          <div class="flex-col gap-md" style="align-items:center; justify-content:center; border:1px solid var(--border); border-radius:var(--radius-md); min-height:280px">
            <div id="shadowTarget" style="width:120px; height:120px; background:var(--accent); border-radius:var(--radius-md)"></div>
            <div class="code-editor w-full">
              <textarea id="shadowCode" readonly style="min-height:80px;"></textarea>
            </div>
          </div>
        </div>
      `;

      function updateShadow() {
        const x = $('#shOffsetX').value;
        const y = $('#shOffsetY').value;
        const blur = $('#shBlur').value;
        const spread = $('#shSpread').value;
        const color = $('#shColor').value;

        const val = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
        $('#shadowTarget').style.boxShadow = val;
        $('#shadowCode').value = `box-shadow: ${val};`;
      }

      container.querySelectorAll('.slider-control').forEach(sl => {
        sl.addEventListener('input', updateShadow);
      });
      $('#shColor').addEventListener('input', updateShadow);

      updateShadow();
    }
  },

  // 53. CSS Grid Generator
  {
    id: 'css-grid-gen',
    name: 'CSS Grid Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
    description: 'Design CSS grids visually by setting columns, rows, and gap sizes.',
    keywords: ['css grid', 'grid layout', 'visual grid', 'grid columns'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Columns</label>
              <input type="number" id="gridCols" class="input-field" value="3" min="1" max="12">
            </div>
            <div class="form-group">
              <label class="form-label">Rows</label>
              <input type="number" id="gridRows" class="input-field" value="2" min="1" max="12">
            </div>
            <div class="form-group">
              <label class="form-label">Gap (px)</label>
              <input type="number" id="gridGap" class="input-field" value="8" min="0" max="50">
            </div>
          </div>
          
          <div class="flex-col gap-md">
            <div id="gridPreview" style="display:grid; border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px; min-height:150px"></div>
            <div class="code-editor">
              <textarea id="gridCssCode" readonly style="min-height:100px;"></textarea>
            </div>
          </div>
        </div>
      `;

      function updateGrid() {
        const cols = parseInt($('#gridCols').value) || 3;
        const rows = parseInt($('#gridRows').value) || 2;
        const gap = parseInt($('#gridGap').value) || 8;

        const preview = $('#gridPreview');
        preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        preview.style.gap = `${gap}px`;

        preview.innerHTML = '';
        for (let i = 0; i < cols * rows; i++) {
          preview.appendChild(el('div', {
            style: { background: 'rgba(168,85,247,0.15)', border: '1px dashed var(--accent)', height: '40px' }
          }));
        }

        $('#gridCssCode').value = `display: grid;\ngrid-template-columns: repeat(${cols}, 1fr);\ngrid-template-rows: repeat(${rows}, 1fr);\ngap: ${gap}px;`;
      }

      $('#gridCols').addEventListener('input', updateGrid);
      $('#gridRows').addEventListener('input', updateGrid);
      $('#gridGap').addEventListener('input', updateGrid);

      updateGrid();
    }
  },

  // 54. CSS Flexbox Generator
  {
    id: 'css-flex-gen',
    name: 'CSS Flexbox Generator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    description: 'Configure CSS Flexbox parameters and preview items alignments dynamically.',
    keywords: ['flexbox', 'css flex', 'flex layout', 'justify content', 'align items'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Flex Direction</label>
              <select id="flexDir" class="select-field">
                <option value="row">row</option>
                <option value="column">column</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Justify Content</label>
              <select id="flexJustify" class="select-field">
                <option value="flex-start">flex-start</option>
                <option value="center">center</option>
                <option value="flex-end">flex-end</option>
                <option value="space-between">space-between</option>
                <option value="space-around">space-around</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Align Items</label>
              <select id="flexAlign" class="select-field">
                <option value="stretch">stretch</option>
                <option value="center">center</option>
                <option value="flex-start">flex-start</option>
                <option value="flex-end">flex-end</option>
              </select>
            </div>
          </div>

          <div class="flex-col gap-md">
            <div id="flexPreview" style="display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px; min-height:150px; gap:8px">
              <div style="background:var(--accent); width:40px; height:40px; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#fff">1</div>
              <div style="background:var(--accent); width:40px; height:60px; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#fff">2</div>
              <div style="background:var(--accent); width:40px; height:50px; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#fff">3</div>
            </div>
            <div class="code-editor">
              <textarea id="flexCssCode" readonly style="min-height:100px;"></textarea>
            </div>
          </div>
        </div>
      `;

      function updateFlex() {
        const dir = $('#flexDir').value;
        const justify = $('#flexJustify').value;
        const align = $('#flexAlign').value;

        const preview = $('#flexPreview');
        preview.style.flexDirection = dir;
        preview.style.justifyContent = justify;
        preview.style.alignItems = align;

        $('#flexCssCode').value = `display: flex;\nflex-direction: ${dir};\njustify-content: ${justify};\nalign-items: ${align};`;
      }

      $('#flexDir').addEventListener('change', updateFlex);
      $('#flexJustify').addEventListener('change', updateFlex);
      $('#flexAlign').addEventListener('change', updateFlex);

      updateFlex();
    }
  },

  // 55. HTML Entity Encoder/Decoder
  {
    id: 'html-entity-encoder',
    name: 'HTML Entity Encoder / Decoder',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    description: 'Encode characters into HTML entities (e.g. < to &lt;) or decode them back.',
    keywords: ['html entities', 'html encode', 'entities decode', 'special chars'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Plain Text / Decoded</label>
            <textarea id="entityDecoded" class="textarea-field" placeholder="Type plain text e.g. <div>"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">HTML Entities / Encoded</label>
            <textarea id="entityEncoded" class="textarea-field" placeholder="Type HTML entities e.g. &amp;lt;div&amp;gt;"></textarea>
          </div>
        </div>
      `;

      const dec = $('#entityDecoded');
      const enc = $('#entityEncoded');

      dec.addEventListener('input', () => {
        const temp = document.createElement('div');
        temp.textContent = dec.value;
        enc.value = temp.innerHTML;
      });

      enc.addEventListener('input', () => {
        const temp = document.createElement('div');
        temp.innerHTML = enc.value;
        dec.value = temp.textContent;
      });
    }
  },

  // 56. IPv4 Subnet Calculator
  {
    id: 'subnet-calculator',
    name: 'IPv4 Subnet Calculator',
    category: 'dev',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    description: 'Input IP and CIDR mask to compute subnet addresses, broadcast ranges, and host counts.',
    keywords: ['subnet', 'ip calculator', 'cidr mask', 'ipv4 subnet', 'networking'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">IP Address</label>
              <input type="text" id="subnetIp" class="input-field" value="192.168.1.1">
            </div>
            <div class="form-group">
              <label class="form-label">CIDR Subnet Mask</label>
              <select id="subnetCidr" class="select-field">
                <option value="24">/24 (255.255.255.0 - 256 hosts)</option>
                <option value="16">/16 (255.255.0.0 - 65,536 hosts)</option>
                <option value="30">/30 (255.255.255.252 - 4 hosts)</option>
              </select>
            </div>
          </div>
          
          <button id="calcSubnetBtn" class="btn btn-primary w-full">Calculate Subnet</button>

          <div id="subnetResults" class="hidden flex-col gap-sm">
            <div class="result-stat">
              <span class="result-stat-label">Network Address</span>
              <span id="subNetAddr" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Usable Host Range</span>
              <span id="subHostRange" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Total Usable Hosts</span>
              <span id="subHostCount" class="result-stat-value">-</span>
            </div>
          </div>
        </div>
      `;

      $('#calcSubnetBtn').addEventListener('click', () => {
        const ipStr = $('#subnetIp').value.trim();
        const cidr = parseInt($('#subnetCidr').value);

        const parts = ipStr.split('.').map(Number);
        if (parts.length !== 4 || parts.some(isNaN)) {
          showToast('Invalid IP format', 'error');
          return;
        }

        const ipNum = (parts[0] << 24) >>> 0 | (parts[1] << 16) | (parts[2] << 8) | parts[3];
        const mask = (0xffffffff << (32 - cidr)) >>> 0;
        
        const netAddr = ipNum & mask;
        const broadAddr = netAddr | ~mask;

        const netStr = [
          (netAddr >>> 24) & 255,
          (netAddr >>> 16) & 255,
          (netAddr >>> 8) & 255,
          netAddr & 255
        ].join('.');

        const hostMinStr = [
          (netAddr >>> 24) & 255,
          (netAddr >>> 16) & 255,
          (netAddr >>> 8) & 255,
          (netAddr & 255) + 1
        ].join('.');

        const hostMaxStr = [
          (broadAddr >>> 24) & 255,
          (broadAddr >>> 16) & 255,
          (broadAddr >>> 8) & 255,
          (broadAddr & 255) - 1
        ].join('.');

        $('#subNetAddr').textContent = netStr;
        $('#subHostRange').textContent = `${hostMinStr} - ${hostMaxStr}`;
        $('#subHostCount').textContent = Math.max(0, Math.pow(2, 32 - cidr) - 2);

        $('#subnetResults').classList.remove('hidden');
        showToast('Subnet calculated', 'success');
      });
    }
  }
];
