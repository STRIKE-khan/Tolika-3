/* =========================================================
   FILES & DOCUMENTS UTILITIES — fileTools.js
   ========================================================= */

import { $, $$, el, showToast, downloadBlob, loadScript } from '../utils.js';

export default [
  // 77. PDF Merger
  {
    id: 'pdf-merger',
    name: 'PDF Merger',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Combine multiple PDF documents client-side into a single file.',
    keywords: ['pdf merge', 'combine pdf', 'pdf joiner', 'documents'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="pdfMergeZone">
            <input type="file" id="pdfMergeFiles" accept="application/pdf" multiple style="display:none">
            <div class="drop-zone-icon" innerHTML='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'></div>
            <div class="drop-zone-text">Click or drag multiple PDF files to merge</div>
          </div>

          <div id="pdfFileList" class="flex-col gap-sm"></div>

          <div id="pdfMergeProgress" class="hidden flex-col gap-xs mt-sm">
            <div class="flex-row" style="justify-content:space-between">
              <span class="text-sm font-medium" style="color:var(--text-2);">Merging files...</span>
              <span id="pdfMergeProgressPercent" class="text-sm font-bold" style="color:var(--text-1);">0%</span>
            </div>
            <div class="progress-container">
              <div id="pdfMergeProgressBar" class="progress-bar-fill" style="width:0%"></div>
            </div>
          </div>

          <button id="mergePdfBtn" class="btn btn-primary w-full hidden">Merge & Download PDF</button>
        </div>
      `;

      let activeFiles = [];

      async function getPdfLib() {
        await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js');
      }

      const zone = $('#pdfMergeZone');
      const input = $('#pdfMergeFiles');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => handleFiles([...e.target.files]));

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          const pdfs = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
          if (pdfs.length > 0) {
            handleFiles(pdfs);
          }
        }
      });

      function handleFiles(files) {
        activeFiles = [...activeFiles, ...files];
        renderFileList();
      }

      function renderFileList() {
        const list = $('#pdfFileList');
        list.innerHTML = '';
        activeFiles.forEach((file, idx) => {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          const item = el('div', { 
            className: 'draggable-list-item',
            style: 'user-select: none;'
          });
          
          item.setAttribute('draggable', 'true');
          
          // Drag handle
          const handle = el('div', { className: 'draggable-handle', textContent: '☰' });
          item.appendChild(handle);
          
          // Label with details
          const label = el('div', { style: 'flex:1; display:flex; flex-direction:column; gap:2px;' });
          label.appendChild(el('span', { textContent: file.name, style: 'font-weight:500; font-size:0.9rem; color:var(--text-1);' }));
          label.appendChild(el('span', { textContent: `${sizeMB} MB`, style: 'font-size:0.75rem; color:var(--text-3); font-family:var(--font-mono);' }));
          item.appendChild(label);
          
          // Remove button
          const removeBtn = el('button', {
            className: 'btn btn-sm btn-danger',
            textContent: 'Remove',
            onclick: (e) => {
              e.stopPropagation();
              activeFiles.splice(idx, 1);
              renderFileList();
            }
          });
          item.appendChild(removeBtn);
          
          // Drag events
          item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', idx);
            item.classList.add('dragging');
          });

          item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
          });

          item.addEventListener('dragover', (e) => {
            e.preventDefault();
          });

          item.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIdx = idx;
            if (fromIdx !== toIdx && !isNaN(fromIdx)) {
              const draggedFile = activeFiles[fromIdx];
              activeFiles.splice(fromIdx, 1);
              activeFiles.splice(toIdx, 0, draggedFile);
              renderFileList();
            }
          });

          list.appendChild(item);
        });

        const btn = $('#mergePdfBtn');
        if (activeFiles.length > 1) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      }

      $('#mergePdfBtn').addEventListener('click', async () => {
        if (activeFiles.length < 2) return;
        const btn = $('#mergePdfBtn');
        const progressEl = $('#pdfMergeProgress');
        const bar = $('#pdfMergeProgressBar');
        const percentText = $('#pdfMergeProgressPercent');

        btn.disabled = true;
        progressEl.classList.remove('hidden');
        bar.style.width = '0%';
        percentText.textContent = '0%';

        showToast('Loading PDF engine...', 'info');

        try {
          await getPdfLib();
          const { PDFDocument } = window.PDFLib;
          const mergedPdf = await PDFDocument.create();

          const total = activeFiles.length;
          for (let i = 0; i < total; i++) {
            const file = activeFiles[i];
            const arr = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arr);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));

            // update progress
            const pct = Math.round(((i + 1) / total) * 100);
            bar.style.width = pct + '%';
            percentText.textContent = pct + '%';
            
            // Allow paint
            await new Promise(r => setTimeout(r, 80));
          }

          const mergedBytes = await mergedPdf.save();
          const blob = new Blob([mergedBytes], { type: 'application/pdf' });
          downloadBlob(blob, 'merged_document.pdf');
          showToast('PDFs merged successfully', 'success');
        } catch(e) {
          showToast('Failed to merge PDFs: ' + e.message, 'error');
        } finally {
          btn.disabled = false;
          progressEl.classList.add('hidden');
        }
      });
    }
  },

  // 78. PDF Splitter
  {
    id: 'pdf-splitter',
    name: 'PDF Splitter',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Split specific page ranges from an uploaded PDF document.',
    keywords: ['pdf split', 'pdf pages', 'pdf slice'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="pdfSplitZone">
            <input type="file" id="pdfSplitFile" accept="application/pdf" style="display:none">
            <div class="drop-zone-text">Click or drag a PDF file to split</div>
          </div>

          <div id="pdfSplitControls" class="hidden flex-col gap-md">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Start Page</label>
                <input type="number" id="splitStart" class="input-field" value="1" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">End Page</label>
                <input type="number" id="splitEnd" class="input-field" value="2" min="1">
              </div>
            </div>
            
            <button id="splitPdfBtn" class="btn btn-primary w-full">Split & Download PDF</button>
          </div>
        </div>
      `;

      let activeFile = null;

      async function getPdfLib() {
        await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js');
      }

      const zone = $('#pdfSplitZone');
      const input = $('#pdfSplitFile');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        if (e.target.files.length) {
          activeFile = e.target.files[0];
          $('#pdfSplitControls').classList.remove('hidden');
          showToast('PDF uploaded', 'success');
        }
      });

      $('#splitPdfBtn').addEventListener('click', async () => {
        if (!activeFile) return;
        const start = parseInt($('#splitStart').value) - 1;
        const end = parseInt($('#splitEnd').value) - 1;

        if (start < 0 || end < start) {
          showToast('Invalid page ranges', 'error');
          return;
        }

        showToast('Processing PDF...', 'info');

        try {
          await getPdfLib();
          const { PDFDocument } = window.PDFLib;
          const srcBytes = await activeFile.arrayBuffer();
          const srcPdf = await PDFDocument.load(srcBytes);
          
          const maxPages = srcPdf.getPageCount();
          if (end >= maxPages) {
            showToast(`Target document only has ${maxPages} pages`, 'error');
            return;
          }

          const splitPdf = await PDFDocument.create();
          const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          const copiedPages = await splitPdf.copyPages(srcPdf, indices);
          copiedPages.forEach((page) => splitPdf.addPage(page));

          const splitBytes = await splitPdf.save();
          const blob = new Blob([splitBytes], { type: 'application/pdf' });
          downloadBlob(blob, 'split_document.pdf');
          showToast('PDF split successfully', 'success');
        } catch(e) {
          showToast('Failed to split PDF: ' + e.message, 'error');
        }
      });
    }
  },

  // 79. PDF Organizer
  {
    id: 'pdf-organizer',
    name: 'PDF Page Organizer',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Rearrange, delete, or rotate pages of an uploaded PDF.',
    keywords: ['pdf organizer', 'pdf pages', 'rotate pdf', 'delete pages'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="pdfOrgZone">
            <input type="file" id="pdfOrgFile" accept="application/pdf" style="display:none">
            <div class="drop-zone-text">Click or drag a PDF file to organize</div>
          </div>

          <div id="pdfOrgControls" class="hidden flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Sequence (e.g. 1, 3, 2 to swap page order)</label>
              <input type="text" id="orgSequence" class="input-field" placeholder="e.g. 1, 3, 2">
            </div>
            
            <button id="orgPdfBtn" class="btn btn-primary w-full">Reorganize & Download PDF</button>
          </div>
        </div>
      `;

      let activeFile = null;

      async function getPdfLib() {
        await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js');
      }

      const zone = $('#pdfOrgZone');
      const input = $('#pdfOrgFile');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        if (e.target.files.length) {
          activeFile = e.target.files[0];
          $('#pdfOrgControls').classList.remove('hidden');
          showToast('PDF uploaded', 'success');
        }
      });

      $('#orgPdfBtn').addEventListener('click', async () => {
        if (!activeFile) return;
        const seqStr = $('#orgSequence').value.trim();
        const indices = seqStr.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n));

        if (indices.length === 0) {
          showToast('Please enter a valid page sequence', 'warning');
          return;
        }

        showToast('Reorganizing pages...', 'info');

        try {
          await getPdfLib();
          const { PDFDocument } = window.PDFLib;
          const srcBytes = await activeFile.arrayBuffer();
          const srcPdf = await PDFDocument.load(srcBytes);
          
          const maxPages = srcPdf.getPageCount();
          if (indices.some(idx => idx >= maxPages || idx < 0)) {
            showToast('Page index out of document range', 'error');
            return;
          }

          const orgPdf = await PDFDocument.create();
          const copiedPages = await orgPdf.copyPages(srcPdf, indices);
          copiedPages.forEach((page) => orgPdf.addPage(page));

          const orgBytes = await orgPdf.save();
          const blob = new Blob([orgBytes], { type: 'application/pdf' });
          downloadBlob(blob, 'organized_document.pdf');
          showToast('PDF reorganized successfully', 'success');
        } catch(e) {
          showToast('Failed to organize PDF: ' + e.message, 'error');
        }
      });
    }
  },

  // 80. ZIP Creator
  {
    id: 'zip-creator',
    name: 'ZIP Archive Creator',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    description: 'Compress multiple files client-side into a standard ZIP archive.',
    keywords: ['zip', 'compress zip', 'archive creator', 'zip files'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="zipCreateZone">
            <input type="file" id="zipCreateFiles" multiple style="display:none">
            <div class="drop-zone-text">Click or drag files to package as ZIP</div>
          </div>

          <div id="zipFileList" class="flex-col gap-sm"></div>

          <button id="createZipBtn" class="btn btn-primary w-full hidden">Create & Download ZIP</button>
        </div>
      `;

      let activeFiles = [];

      async function getJsZip() {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      }

      const zone = $('#zipCreateZone');
      const input = $('#zipCreateFiles');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        activeFiles = [...activeFiles, ...e.target.files];
        renderList();
      });

      function renderList() {
        const list = $('#zipFileList');
        list.innerHTML = '';
        activeFiles.forEach((f, idx) => {
          list.appendChild(el('div', { className: 'result-stat' }, [
            el('span', { textContent: f.name, className: 'result-stat-label' }),
            el('button', {
              className: 'btn btn-sm btn-danger',
              textContent: 'Remove',
              onclick: () => {
                activeFiles.splice(idx, 1);
                renderList();
              }
            })
          ]));
        });

        const btn = $('#createZipBtn');
        if (activeFiles.length > 0) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
      }

      $('#createZipBtn').addEventListener('click', async () => {
        if (!activeFiles.length) return;
        showToast('Compressing files...', 'info');

        try {
          await getJsZip();
          const zip = new window.JSZip();
          activeFiles.forEach(file => {
            zip.file(file.name, file);
          });

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipBlob, 'archive.zip');
          showToast('ZIP created successfully', 'success');
        } catch(e) {
          showToast('ZIP creation failed: ' + e.message, 'error');
        }
      });
    }
  },

  // 81. ZIP Extractor
  {
    id: 'zip-extractor',
    name: 'ZIP Archive Extractor',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    description: 'Extract and view files inside a standard ZIP archive client-side.',
    keywords: ['zip extract', 'unzip', 'zip unpack', 'decompress'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="zipExtractZone">
            <input type="file" id="zipExtractFile" accept=".zip" style="display:none">
            <div class="drop-zone-text">Click or drag a ZIP file to extract</div>
          </div>

          <div id="extractedFileList" class="flex-col gap-sm"></div>
        </div>
      `;

      async function getJsZip() {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      }

      const zone = $('#zipExtractZone');
      const input = $('#zipExtractFile');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        showToast('Extracting ZIP...', 'info');

        try {
          await getJsZip();
          const zip = await window.JSZip.loadAsync(file);
          const list = $('#extractedFileList');
          list.innerHTML = '';

          zip.forEach((relPath, zipEntry) => {
            if (zipEntry.dir) return; // Skip directories
            
            const row = el('div', { className: 'result-stat' }, [
              el('span', { textContent: relPath, className: 'result-stat-label' }),
              el('button', {
                className: 'btn btn-sm btn-primary',
                textContent: 'Download',
                onclick: async () => {
                  const blob = await zipEntry.async('blob');
                  downloadBlob(blob, zipEntry.name);
                }
              })
            ]);
            list.appendChild(row);
          });
          showToast('ZIP archive unpacked', 'success');
        } catch(e) {
          showToast('Decompression failed: ' + e.message, 'error');
        }
      });
    }
  },

  // 82. TXT / CSV File Splitter
  {
    id: 'text-splitter',
    name: 'Text & CSV File Splitter',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Split massive text files into chunks by line count or size.',
    keywords: ['file splitter', 'csv splitter', 'split file', 'text chunker'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="textSplitZone">
            <input type="file" id="textSplitFile" accept=".txt,.csv" style="display:none">
            <div class="drop-zone-text">Click or drag a text or CSV file to split</div>
          </div>

          <div id="textSplitControls" class="hidden flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Lines Per File Chunk</label>
              <input type="number" id="splitLines" class="input-field" value="100" min="1">
            </div>
            
            <button id="splitTextBtn" class="btn btn-primary w-full">Split File</button>
          </div>
        </div>
      `;

      let activeFile = null;
      const zone = $('#textSplitZone');
      const input = $('#textSplitFile');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        if (e.target.files.length) {
          activeFile = e.target.files[0];
          $('#textSplitControls').classList.remove('hidden');
          showToast('Text file loaded', 'success');
        }
      });

      $('#splitTextBtn').addEventListener('click', () => {
        if (!activeFile) return;
        const linesLimit = parseInt($('#splitLines').value) || 100;
        const reader = new FileReader();

        reader.onload = (evt) => {
          const lines = evt.target.result.split('\n');
          let chunkIndex = 1;
          for (let i = 0; i < lines.length; i += linesLimit) {
            const chunkLines = lines.slice(i, i + linesLimit).join('\n');
            const blob = new Blob([chunkLines], { type: 'text/plain' });
            
            const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.'));
            const ext = activeFile.name.split('.').pop();
            downloadBlob(blob, `${baseName}_part${chunkIndex}.${ext}`);
            chunkIndex++;
          }
          showToast('File split completed', 'success');
        };
        reader.readAsText(activeFile);
      });
    }
  },

  // 83. Excel (XLSX) to JSON/CSV
  {
    id: 'xlsx-converter',
    name: 'Excel to JSON/CSV Converter',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Read spreadsheet XLSX data client-side and export it to JSON or CSV.',
    keywords: ['xlsx converter', 'excel to csv', 'excel to json', 'xlsx reader'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="drop-zone" id="xlsxZone">
            <input type="file" id="xlsxFile" accept=".xlsx,.xls" style="display:none">
            <div class="drop-zone-text">Click or drag an Excel file to convert</div>
          </div>

          <div id="xlsxControls" class="hidden flex-col gap-md">
            <div class="flex-row gap-sm">
              <button id="xlsxToJsonBtn" class="btn btn-primary">Export to JSON</button>
              <button id="xlsxToCsvBtn" class="btn btn-secondary">Export to CSV</button>
            </div>
            
            <div class="form-group">
              <label class="form-label">Converted Output</label>
              <textarea id="xlsxOutputText" class="textarea-field" style="min-height:200px;" readonly></textarea>
            </div>
          </div>
        </div>
      `;

      let activeFile = null;

      async function getXlsxLib() {
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js');
      }

      const zone = $('#xlsxZone');
      const input = $('#xlsxFile');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => {
        if (e.target.files.length) {
          activeFile = e.target.files[0];
          $('#xlsxControls').classList.remove('hidden');
          showToast('Spreadsheet loaded', 'success');
        }
      });

      async function processWorkbook(format) {
        if (!activeFile) return;
        showToast('Loading spreadsheet engine...', 'info');

        try {
          await getXlsxLib();
          const reader = new FileReader();
          
          reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];

            let output = '';
            if (format === 'json') {
              const json = window.XLSX.utils.sheet_to_json(worksheet);
              output = JSON.stringify(json, null, 2);
            } else if (format === 'csv') {
              output = window.XLSX.utils.sheet_to_csv(worksheet);
            }

            $('#xlsxOutputText').value = output;
            showToast('Conversion completed', 'success');
          };
          reader.readAsArrayBuffer(activeFile);
        } catch(e) {
          showToast('Spreadsheet parse error: ' + e.message, 'error');
        }
      }

      $('#xlsxToJsonBtn').addEventListener('click', () => processWorkbook('json'));
      $('#xlsxToCsvBtn').addEventListener('click', () => processWorkbook('csv'));
    }
  },

  // 84. Audio Waveform Recorder
  {
    id: 'audio-recorder',
    name: 'Audio Waveform Recorder',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    description: 'Record audio via microphone and display a live visual waveform.',
    keywords: ['audio recorder', 'microphone record', 'voice recorder', 'waveform'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="waveform-container">
            <canvas id="waveCanvas"></canvas>
          </div>
          
          <div class="flex-row gap-sm" style="justify-content:center">
            <button id="recStart" class="btn btn-primary">Start Recording</button>
            <button id="recStop" class="btn btn-secondary" disabled>Stop</button>
            <button id="recDownload" class="btn btn-secondary" disabled>Download Audio</button>
          </div>
        </div>
      `;

      let mediaRecorder = null;
      let audioChunks = [];
      let audioCtx = null;
      let analyser = null;
      let animId = null;

      const canvas = $('#waveCanvas');
      const ctx = canvas.getContext('2d');

      function drawWave() {
        if (!analyser) return;
        animId = requestAnimationFrame(drawWave);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#07080f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#a855f7';
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      $('#recStart').addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            $('#recDownload').disabled = false;
            cancelAnimationFrame(animId);
            showToast('Recording stopped', 'success');
          };

          // Setup Audio Visualizer
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          source.connect(analyser);
          analyser.fftSize = 2048;

          mediaRecorder.start();
          $('#recStart').disabled = true;
          $('#recStop').disabled = false;
          drawWave();
          showToast('Recording started...', 'info');
        } catch(e) {
          showToast('Microphone access denied: ' + e.message, 'error');
        }
      });

      $('#recStop').addEventListener('click', () => {
        if (mediaRecorder) {
          mediaRecorder.stop();
          $('#recStart').disabled = false;
          $('#recStop').disabled = true;
        }
      });

      $('#recDownload').addEventListener('click', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        downloadBlob(audioBlob, 'recording.webm');
      });
    }
  },

  // 85. Barcode Generator
  {
    id: 'barcode-generator',
    name: 'Barcode Generator',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="5" x2="3" y2="19"/><line x1="8" y1="5" x2="8" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/><line x1="21" y1="5" x2="21" y2="19"/></svg>',
    description: 'Generate standard CODE128, EAN, or UPC barcodes and export them as vector SVGs.',
    keywords: ['barcode', 'code128', 'ean barcode', 'upc barcode', 'product codes'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Barcode Value / Text</label>
              <input type="text" id="barcodeValue" class="input-field" value="AuraTools123">
            </div>
            <div class="form-group">
              <label class="form-label">Format</label>
              <select id="barcodeFormat" class="select-field">
                <option value="CODE128">CODE128 (Standard alphanumeric)</option>
                <option value="EAN13">EAN-13 (Standard retail numbers)</option>
              </select>
            </div>
          </div>
          
          <button id="genBarcodeBtn" class="btn btn-primary w-full">Generate Barcode</button>

          <div class="barcode-display mt-md">
            <svg id="barcodeOutput"></svg>
          </div>
        </div>
      `;

      async function getJsBarcode() {
        await loadScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js');
      }

          showToast('Failed to generate barcode: ' + e.message, 'error');
        }
      });
    }
  },

  // 86. Video to GIF Converter
  {
    id: 'video-to-gif',
    name: 'Video to GIF Converter',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    description: 'Convert short video clips into high-quality animated GIFs client-side.',
    keywords: ['video to gif', 'convert gif', 'gif converter', 'animation', 'create gif'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div id="vgifDropzone" class="drop-zone" style="min-height:100px">
              <input type="file" id="vgifFile" accept="video/*" style="display:none">
              <div class="drop-zone-text" style="font-size:0.9rem">Upload video for GIF conversion</div>
            </div>

            <div id="vgifControls" class="hidden flex-col gap-sm">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Start Position (sec)</label>
                  <input type="number" id="vgifStart" class="input-field" value="0" step="0.5" min="0">
                </div>
                <div class="form-group">
                  <label class="form-label">End Position (sec)</label>
                  <input type="number" id="vgifEnd" class="input-field" value="3" step="0.5">
                </div>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">FPS (Frame Rate)</label>
                  <select id="vgifFps" class="select-field">
                    <option value="10">10 FPS (Small size)</option>
                    <option value="15" selected>15 FPS (Standard)</option>
                    <option value="20">20 FPS (Smooth)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Resolution Width</label>
                  <select id="vgifWidth" class="select-field">
                    <option value="320">320px (Compact)</option>
                    <option value="480" selected>480px (Standard)</option>
                    <option value="640">640px (High Quality)</option>
                  </select>
                </div>
              </div>

              <div id="gifProgress" class="hidden flex-col gap-sm mt-sm">
                <div class="progress-container">
                  <div id="gifBar" class="progress-bar-fill" style="width:0%"></div>
                </div>
                <span class="text-xs text-muted text-center" id="gifProgressText">Compiling frames into GIF...</span>
              </div>

              <button id="convertGifBtn" class="btn btn-primary w-full mt-xs">Compile GIF Animation</button>
            </div>
          </div>

          <div class="text-center flex-col gap-sm" style="justify-content:center; align-items:center;">
            <video id="vgifPreview" muted style="max-width:100%; border-radius:var(--radius-md); border:1px solid var(--border); display:none; max-height:200px;"></video>
            <div id="gifResultWrapper" class="hidden flex-col gap-sm">
              <span class="badge badge-success">GIF Created Successfully</span>
              <img id="gifOutputImage" style="max-width:100%; border-radius:var(--radius-md); border:1px solid var(--border); box-shadow:var(--shadow-md);">
              <button id="downloadGifBtn" class="btn btn-primary">Download GIF</button>
            </div>
          </div>
        </div>
      `;

      let activeVideoFile = null;
      const zone = $('#vgifDropzone');
      const input = $('#vgifFile');
      const video = $('#vgifPreview');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => loadVideo(e.target.files[0]));

      function loadVideo(file) {
        if (!file) return;
        activeVideoFile = file;
        video.src = URL.createObjectURL(file);
        video.style.display = 'block';
        video.onloadedmetadata = () => {
          $('#vgifEnd').value = Math.min(video.duration, 5).toFixed(1);
          $('#vgifControls').classList.remove('hidden');
          $('#gifResultWrapper').classList.add('hidden');
        };
      }

      $('#convertGifBtn').addEventListener('click', async () => {
        if (!activeVideoFile) return;

        showToast('Loading GIF Engine...', 'info');
        $('#gifProgress').classList.remove('hidden');
        $('#gifBar').style.width = '10%';
        $('#gifProgressText').textContent = 'Loading compiler...';

        try {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js');
          
          $('#gifBar').style.width = '30%';
          $('#gifProgressText').textContent = 'Extracting video frames...';

          const start = parseFloat($('#vgifStart').value) || 0;
          const end = parseFloat($('#vgifEnd').value) || 3;
          const fps = parseInt($('#vgifFps').value) || 15;
          const gifW = parseInt($('#vgifWidth').value) || 480;

          const frames = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const aspect = video.videoHeight / video.videoWidth;
          canvas.width = gifW;
          canvas.height = gifW * aspect;

          const duration = end - start;
          const numFrames = Math.floor(duration * fps);
          const frameStep = duration / numFrames;

          let currentOffset = start;
          video.pause();

          for (let f = 0; f < numFrames; f++) {
            video.currentTime = currentOffset;
            await new Promise(r => {
              const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                r();
              };
              video.addEventListener('seeked', onSeek);
            });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.8));
            currentOffset += frameStep;

            const pct = 30 + (f / numFrames) * 40;
            $('#gifBar').style.width = `${pct}%`;
            $('#gifProgressText').textContent = `Capturing frames: ${f+1}/${numFrames}`;
          }

          $('#gifProgressText').textContent = 'Generating animated GIF...';
          window.gifshot.createGIF({
            images: frames,
            gifWidth: canvas.width,
            gifHeight: canvas.height,
            interval: 1 / fps,
            numFrames: frames.length
          }, (obj) => {
            if (!obj.error) {
              $('#gifBar').style.width = '100%';
              $('#gifProgressText').textContent = 'Complete!';
              
              $('#gifOutputImage').src = obj.image;
              $('#gifResultWrapper').classList.remove('hidden');
              showToast('GIF compiled successfully', 'success');
              
              setTimeout(() => {
                $('#gifProgress').classList.add('hidden');
              }, 1200);

              $('#downloadGifBtn').onclick = () => {
                const a = document.createElement('a');
                a.href = obj.image;
                a.download = 'animated_clip.gif';
                a.click();
              };
            } else {
              showToast('GIF generation failed', 'error');
              $('#gifProgress').classList.add('hidden');
            }
          });

        } catch (e) {
          showToast('Failed to compile GIF: ' + e.message, 'error');
          $('#gifProgress').classList.add('hidden');
        }
      });
    }
  },

  // 87. Universal Document Text Extractor
  {
    id: 'text-extractor',
    name: 'Document Text Extractor',
    category: 'file',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Upload PDF or DOCX files client-side to instantly parse, review, and copy their text contents.',
    keywords: ['text extractor', 'pdf to text', 'docx to text', 'document reader', 'pdf parse', 'extract docx'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="extractorDropzone" class="drop-zone">
            <input type="file" id="extractorFile" accept=".pdf,.docx,.txt,.csv,.json" style="display:none">
            <div class="drop-zone-icon" innerHTML='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'></div>
            <div class="drop-zone-text">Drop PDF, DOCX, TXT, CSV, or JSON here</div>
          </div>

          <div id="extractorResults" class="hidden flex-col gap-sm">
            <div class="flex-between">
              <span id="extractorFileDetails" class="text-sm font-medium" style="color:var(--text-2)">Document.pdf</span>
              <button id="copyExtractedTextBtn" class="btn btn-secondary btn-sm">Copy Text</button>
            </div>
            
            <textarea id="extractedTextOutput" class="textarea-field" style="min-height:300px; font-family:var(--font-mono); font-size:0.9rem;" readonly></textarea>
            
            <div class="grid-3">
              <div class="result-stat" style="margin-bottom:0">
                <span class="result-stat-label">Characters</span>
                <span id="extCharCount" class="result-stat-value">0</span>
              </div>
              <div class="result-stat" style="margin-bottom:0">
                <span class="result-stat-label">Words</span>
                <span id="extWordCount" class="result-stat-value">0</span>
              </div>
              <div class="result-stat" style="margin-bottom:0">
                <span class="result-stat-label">Lines</span>
                <span id="extLineCount" class="result-stat-value">0</span>
              </div>
            </div>
          </div>
        </div>
      `;

      const zone = $('#extractorDropzone');
      const input = $('#extractorFile');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => processDoc(e.target.files[0]));

      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) processDoc(e.dataTransfer.files[0]);
      });

      async function processDoc(file) {
        if (!file) return;
        
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        showToast('Reading document structure...', 'info');

        try {
          let text = '';
          
          if (ext === '.pdf') {
            text = await extractPdfText(file);
          } else if (ext === '.docx') {
            text = await extractDocxText(file);
          } else {
            text = await new Promise((resolve) => {
              const r = new FileReader();
              r.onload = (e) => resolve(e.target.result);
              r.readAsText(file);
            });
          }

          $('#extractedTextOutput').value = text;
          
          const cleanText = text.trim();
          $('#extCharCount').textContent = cleanText.length.toLocaleString();
          $('#extWordCount').textContent = (cleanText ? cleanText.split(/\s+/).length : 0).toLocaleString();
          $('#extLineCount').textContent = (cleanText ? cleanText.split('\n').length : 0).toLocaleString();
          
          $('#extractorFileDetails').textContent = `${file.name} (${formatFileSize(file.size)})`;
          $('#extractorResults').classList.remove('hidden');
          showToast('Text extracted successfully', 'success');
        } catch (e) {
          showToast('Failed to parse document: ' + e.message, 'error');
        }
      }

      async function extractPdfText(file) {
        showToast('Loading PDF engine...', 'info');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        return fullText;
      }

      async function extractDocxText(file) {
        showToast('Loading DOCX engine...', 'info');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }

      $('#copyExtractedTextBtn').addEventListener('click', () => {
        const txt = $('#extractedTextOutput').value;
        if (txt) {
          navigator.clipboard.writeText(txt);
          showToast('Copied to clipboard!', 'success');
        }
      });
    }
  }
];
