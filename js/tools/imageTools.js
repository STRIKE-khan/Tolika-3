/* =========================================================
   IMAGE & GRAPHICS TOOLS — imageTools.js
   ========================================================= */

import { $, $$, el, showToast, copyToClipboard, readFileAsDataURL, loadImage, createCanvas, canvasToBlob, downloadBlob, formatFileSize } from '../utils.js';

export default [
  // 1. AI Image Upscaler (Ultra)
  {
    id: 'image-upscaler',
    name: 'AI Image Upscaler (Ultra)',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"><animate attributeName="stroke-dasharray" values="0 40;40 0" dur="2s" repeatCount="indefinite"/></polygon><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    description: 'Upscale images up to 16x using multi-pass bicubic refinement and unsharp mask sharpening.',
    keywords: ['upscale', 'zoom', 'resolution', 'enhance', 'image', '16x', '8x'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="upscaleControls" class="hidden flex-col gap-md">
            <div id="imageInfoPanel" class="grid-4" style="background:rgba(139, 92, 246, 0.05); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
              <!-- Populated dynamically -->
            </div>

            <!-- Batch Queue List -->
            <div id="batchQueueWrapper" class="hidden flex-col gap-sm" style="max-height: 250px; overflow-y: auto; padding: 4px; border: 1px solid var(--border); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
              <!-- Rendered batch files -->
            </div>
            
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">Scale Factor</label>
                <select id="scaleFactor" class="select-field">
                  <option value="2">2x (Double Resolution)</option>
                  <option value="4">4x (Quad Resolution)</option>
                  <option value="8">8x (Ultra Resolution)</option>
                  <option value="16">16x (Maximum 16x)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Algorithm</label>
                <select id="upscaleAlgo" class="select-field">
                  <option value="bicubic">Bicubic Smoothening</option>
                  <option value="lanczos">Lanczos-3 (High Quality)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Edge Sharpening</label>
                <div class="slider-group" style="margin-top:6px;">
                  <input type="range" id="sharpenAmount" class="slider-control" min="0" max="100" value="30">
                  <span id="sharpenAmountVal" class="slider-value">30%</span>
                </div>
              </div>
            </div>
            
            <div id="upscaleProgress" class="hidden flex-col gap-sm">
              <div class="flex-between">
                <span id="progressText" class="text-sm text-muted">Processing...</span>
                <span id="progressPercent" class="text-sm font-bold text-mono">0%</span>
              </div>
              <div class="progress-container">
                <div id="progressBarFill" class="progress-bar-fill" style="width:0%"></div>
              </div>
            </div>
            
            <button id="processUpscaleBtn" class="btn btn-primary w-full">Upscale Images</button>
          </div>

          <div id="upscaleResult" class="hidden flex-col gap-md">
            <div class="flex-between">
              <span class="badge badge-success">Upscale Complete</span>
              <button id="downloadUpscaledBtn" class="btn btn-primary btn-sm">Download Upscaled</button>
            </div>
            
            <div class="comparison-container" id="comparisonSlider">
              <img id="originalImg" src="" alt="Original">
              <div class="comparison-overlay">
                <img id="upscaledImg" src="" alt="Upscaled">
              </div>
              <div class="comparison-slider-handle"></div>
              <span class="comparison-label comparison-label-left">Original</span>
              <span class="comparison-label comparison-label-right">Upscaled</span>
            </div>
          </div>

          <div id="batchResult" class="hidden flex-col gap-md">
            <div class="flex-between">
              <span class="badge badge-success">Batch Upscale Complete</span>
              <button id="downloadAllZipBtn" class="btn btn-primary btn-sm">Download All as ZIP</button>
            </div>
            <div id="batchDownloadList" class="flex-col gap-sm" style="max-height: 300px; overflow-y: auto;">
              <!-- Individual upscaled items -->
            </div>
          </div>
        </div>
      `;

      let activeFiles = [];
      let processedResults = [];
      let singleOriginalDataUrl = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image(s) here or click to browse' }),
        el('div', { className: 'drop-zone-hint', textContent: 'Supports PNG, JPEG, WebP up to 10MB (Multiple allowed)' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFiles([...e.target.files]));
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFiles([...e.dataTransfer.files]);
      });

      $('#sharpenAmount').addEventListener('input', (e) => {
        $('#sharpenAmountVal').textContent = e.target.value + '%';
      });

      async function handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
          showToast('No valid images found', 'error');
          return;
        }

        activeFiles = imageFiles;
        processedResults = [];

        $('#upscaleResult').classList.add('hidden');
        $('#batchResult').classList.add('hidden');
        $('#batchQueueWrapper').classList.add('hidden');
        
        if (activeFiles.length === 1) {
          const file = activeFiles[0];
          singleOriginalDataUrl = await readFileAsDataURL(file);
          
          const img = await loadImage(singleOriginalDataUrl);
          const originalWidth = img.width;
          const originalHeight = img.height;

          const info = $('#imageInfoPanel');
          info.innerHTML = `
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Width</span>
              <span class="result-stat-value">${originalWidth} px</span>
            </div>
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Height</span>
              <span class="result-stat-value">${originalHeight} px</span>
            </div>
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">File Size</span>
              <span class="result-stat-value">${formatFileSize(file.size)}</span>
            </div>
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Format</span>
              <span class="result-stat-value">${file.type.split('/')[1].toUpperCase()}</span>
            </div>
          `;
          showToast('Image uploaded successfully', 'success');
        } else {
          const info = $('#imageInfoPanel');
          const totalSize = activeFiles.reduce((acc, f) => acc + f.size, 0);
          info.innerHTML = `
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Mode</span>
              <span class="result-stat-value" style="color:var(--accent)">Batch Upscaler</span>
            </div>
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Total Images</span>
              <span class="result-stat-value">${activeFiles.length}</span>
            </div>
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Total Size</span>
              <span class="result-stat-value">${formatFileSize(totalSize)}</span>
            </div>
            <div class="result-stat" style="margin-bottom:0">
              <span class="result-stat-label">Status</span>
              <span class="result-stat-value">Ready</span>
            </div>
          `;

          const queue = $('#batchQueueWrapper');
          queue.innerHTML = '';
          activeFiles.forEach((file, idx) => {
            const sizeMB = formatFileSize(file.size);
            const item = el('div', { 
              className: 'draggable-list-item', 
              style: 'padding: 8px 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;'
            }, [
              el('span', { textContent: `${idx+1}. ${file.name}`, style: 'font-weight: 500; font-size: 0.85rem; color: var(--text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;' }),
              el('span', { textContent: sizeMB, style: 'font-size: 0.75rem; color: var(--text-3); font-family: var(--font-mono);' })
            ]);
            queue.appendChild(item);
          });
          queue.classList.remove('hidden');
          showToast(`${activeFiles.length} images loaded for batch upscale`, 'success');
        }

        $('#upscaleControls').classList.remove('hidden');
      }

      function applySharpen(ctx, width, height, amount) {
        if (amount <= 0) return;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const copy = new Uint8ClampedArray(data);
        const factor = amount / 100;
        
        const center = 1 + factor;
        const surrounding = -factor / 4;
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              const idx = (y * width + x) * 4 + c;
              const up = ((y - 1) * width + x) * 4 + c;
              const down = ((y + 1) * width + x) * 4 + c;
              const left = (y * width + (x - 1)) * 4 + c;
              const right = (y * width + (x + 1)) * 4 + c;
              
              let val = copy[idx] * center + 
                        (copy[up] + copy[down] + copy[left] + copy[right]) * surrounding;
                        
              data[idx] = Math.min(255, Math.max(0, val));
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      async function upscaleSingleImage(dataUrl, scale, algo, sharpen, fileType, onProgress) {
        onProgress('Loading photo...', 5);
        await new Promise(r => setTimeout(r, 50));

        const img = await loadImage(dataUrl);
        let currentSrc = img;
        const passes = scale === 2 ? 1 : scale === 4 ? 2 : scale === 8 ? 3 : 4;
        
        for (let p = 1; p <= passes; p++) {
          onProgress(`Processing pass ${p}/${passes}...`, 5 + (p / passes) * 75);
          await new Promise(r => setTimeout(r, 80));

          const w = currentSrc.width * 2;
          const h = currentSrc.height * 2;
          const { canvas, ctx } = createCanvas(w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = algo === 'lanczos' ? 'high' : 'medium';
          ctx.drawImage(currentSrc, 0, 0, w, h);
          currentSrc = canvas;
        }

        if (sharpen > 0) {
          onProgress('Sharpening edges...', 90);
          await new Promise(r => setTimeout(r, 50));
          const ctx = currentSrc.getContext('2d');
          applySharpen(ctx, currentSrc.width, currentSrc.height, sharpen);
        }

        onProgress('Generating result...', 98);
        await new Promise(r => setTimeout(r, 50));

        const blob = await canvasToBlob(currentSrc, fileType);
        return blob;
      }

      $('#processUpscaleBtn').addEventListener('click', async () => {
        if (activeFiles.length === 0) return;
        const scale = parseInt($('#scaleFactor').value);
        const algo = $('#upscaleAlgo').value;
        const sharpen = parseInt($('#sharpenAmount').value);

        $('#upscaleProgress').classList.remove('hidden');
        const progressText = $('#progressText');
        const progressPercent = $('#progressPercent');
        const barFill = $('#progressBarFill');

        const updateProgress = (text, percent) => {
          progressText.textContent = text;
          progressPercent.textContent = Math.round(percent) + '%';
          barFill.style.width = percent + '%';
        };

        if (activeFiles.length === 1) {
          try {
            const file = activeFiles[0];
            const upscaledBlob = await upscaleSingleImage(singleOriginalDataUrl, scale, algo, sharpen, file.type, updateProgress);
            const upscaledUrl = URL.createObjectURL(upscaledBlob);

            $('#originalImg').src = singleOriginalDataUrl;
            $('#upscaledImg').src = upscaledUrl;

            processedResults = [{ name: file.name, blob: upscaledBlob, url: upscaledUrl }];

            $('#upscaleResult').classList.remove('hidden');
            initSlider();
            updateProgress('Upscale Completed!', 100);
            showToast('Image upscaled successfully', 'success');
            
            setTimeout(() => {
              $('#upscaleProgress').classList.add('hidden');
            }, 1500);
          } catch (e) {
            showToast('Upscaling failed: ' + e.message, 'error');
            $('#upscaleProgress').classList.add('hidden');
          }
        } else {
          try {
            processedResults = [];
            const queueItems = $$('.draggable-list-item', $('#batchQueueWrapper'));

            for (let i = 0; i < activeFiles.length; i++) {
              const file = activeFiles[i];
              const itemEl = queueItems[i];
              if (itemEl) {
                itemEl.style.border = '1px solid var(--accent)';
                itemEl.style.background = 'rgba(139, 92, 246, 0.08)';
              }

              updateProgress(`Upscaling image ${i+1}/${activeFiles.length}: ${file.name}`, (i / activeFiles.length) * 100);
              
              const fileDataUrl = await readFileAsDataURL(file);
              const upscaledBlob = await upscaleSingleImage(fileDataUrl, scale, algo, sharpen, file.type, (text, pct) => {
                const stepProgress = (i / activeFiles.length) * 100 + (pct / activeFiles.length);
                updateProgress(`Image ${i+1}/${activeFiles.length}: ${text}`, stepProgress);
              });
              
              const upscaledUrl = URL.createObjectURL(upscaledBlob);
              processedResults.push({ name: file.name, blob: upscaledBlob, url: upscaledUrl });

              if (itemEl) {
                itemEl.style.border = '1px solid var(--success)';
                itemEl.style.background = 'rgba(16, 185, 129, 0.08)';
                const statusSpan = el('span', { textContent: '✓ Done', style: 'color: var(--success); font-size: 0.85rem; font-weight: bold;' });
                itemEl.appendChild(statusSpan);
              }
            }

            updateProgress('Batch processing completed!', 100);
            showToast('All images upscaled successfully', 'success');

            const batchList = $('#batchDownloadList');
            batchList.innerHTML = '';
            processedResults.forEach((res, index) => {
              const baseName = res.name.substring(0, res.name.lastIndexOf('.'));
              const item = el('div', { 
                className: 'draggable-list-item', 
                style: 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 6px;' 
              }, [
                el('div', { style: 'display: flex; flex-direction: column; gap: 2px;' }, [
                  el('span', { textContent: `${index+1}. ${res.name}`, style: 'font-weight: 500; font-size: 0.85rem; color: var(--text-1);' }),
                  el('span', { textContent: formatFileSize(res.blob.size), style: 'font-size: 0.75rem; color: var(--text-3); font-family: var(--font-mono);' })
                ]),
                el('button', { 
                  className: 'btn btn-secondary btn-sm', 
                  textContent: 'Download',
                  onclick: () => {
                    downloadBlob(res.blob, `${baseName}_upscaled.png`);
                  }
                })
              ]);
              batchList.appendChild(item);
            });

            $('#batchResult').classList.remove('hidden');

            setTimeout(() => {
              $('#upscaleProgress').classList.add('hidden');
            }, 1500);

          } catch (e) {
            showToast('Batch upscaling failed: ' + e.message, 'error');
            $('#upscaleProgress').classList.add('hidden');
          }
        }
      });

      $('#downloadUpscaledBtn').addEventListener('click', () => {
        if (processedResults.length === 0) return;
        const res = processedResults[0];
        const baseName = res.name.substring(0, res.name.lastIndexOf('.'));
        downloadBlob(res.blob, `${baseName}_upscaled.png`);
      });

      $('#downloadAllZipBtn').addEventListener('click', async () => {
        if (processedResults.length === 0) return;
        try {
          showToast('Generating ZIP package...', 'info');
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
          const zip = new window.JSZip();

          processedResults.forEach(res => {
            const baseName = res.name.substring(0, res.name.lastIndexOf('.'));
            zip.file(`${baseName}_upscaled.png`, res.blob);
          });

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipBlob, 'tolika_upscaled_batch.zip');
          showToast('ZIP package downloaded!', 'success');
        } catch (e) {
          showToast('Failed to create ZIP: ' + e.message, 'error');
        }
      });

      function initSlider() {
        const slider = $('#comparisonSlider');
        const handle = slider.querySelector('.comparison-slider-handle');
        const overlay = slider.querySelector('.comparison-overlay');
        
        let active = false;
        
        const move = (x) => {
          const rect = slider.getBoundingClientRect();
          let pos = ((x - rect.left) / rect.width) * 100;
          if (pos < 0) pos = 0;
          if (pos > 100) pos = 100;
          handle.style.left = `${pos}%`;
          overlay.style.clipPath = `polygon(${pos}% 0, 100% 0, 100% 100%, ${pos}% 100%)`;
        };

        slider.addEventListener('mousedown', () => active = true);
        window.addEventListener('mouseup', () => active = false);
        window.addEventListener('mousemove', (e) => {
          if (!active) return;
          move(e.clientX);
        });

        slider.addEventListener('touchstart', () => active = true);
        window.addEventListener('touchend', () => active = false);
        window.addEventListener('touchmove', (e) => {
          if (!active) return;
          move(e.touches[0].clientX);
        });

        handle.style.left = '50%';
        overlay.style.clipPath = 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)';
      }
    }
  },

  // 2. Image Resizer
  {
    id: 'image-resizer',
    name: 'Image Resizer',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="10" y1="2" x2="10" y2="22"/></svg>',
    description: 'Resize images by width, height, or percentage, with aspect ratio locking.',
    keywords: ['resize', 'compress', 'width', 'height', 'scale'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="resizerControls" class="hidden flex-col gap-md">
            <div class="grid-3">
              <div class="form-group">
                <label class="form-label">Width (px)</label>
                <input type="number" id="resizeWidth" class="input-field">
              </div>
              <div class="form-group">
                <label class="form-label">Height (px)</label>
                <input type="number" id="resizeHeight" class="input-field">
              </div>
              <div class="form-group">
                <label class="form-label">Aspect Ratio</label>
                <label class="checkbox-group" style="margin-top: 10px;">
                  <input type="checkbox" id="lockRatio" checked> Lock Ratio
                </label>
              </div>
            </div>
            
            <button id="downloadResizedBtn" class="btn btn-primary w-full">Resize & Download</button>
            <div class="text-center">
              <img id="resizedPreview" class="preview-image" style="display:none">
            </div>
          </div>
        </div>
      `;

      let activeFile = null;
      let imgObj = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const dataUrl = await readFileAsDataURL(file);
        imgObj = await loadImage(dataUrl);
        
        $('#resizeWidth').value = imgObj.width;
        $('#resizeHeight').value = imgObj.height;
        $('#resizerControls').classList.remove('hidden');

        const preview = $('#resizedPreview');
        preview.src = dataUrl;
        preview.style.display = 'inline-block';
      }

      $('#resizeWidth').addEventListener('input', () => {
        if ($('#lockRatio').checked && imgObj) {
          $('#resizeHeight').value = Math.round(imgObj.height * ($('#resizeWidth').value / imgObj.width));
        }
      });

      $('#resizeHeight').addEventListener('input', () => {
        if ($('#lockRatio').checked && imgObj) {
          $('#resizeWidth').value = Math.round(imgObj.width * ($('#resizeHeight').value / imgObj.height));
        }
      });

      $('#downloadResizedBtn').addEventListener('click', async () => {
        if (!imgObj) return;
        const w = parseInt($('#resizeWidth').value);
        const h = parseInt($('#resizeHeight').value);
        
        const { canvas, ctx } = createCanvas(w, h);
        ctx.drawImage(imgObj, 0, 0, w, h);
        
        const blob = await canvasToBlob(canvas, activeFile.type);
        const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.'));
        downloadBlob(blob, `${baseName}_resized.png`);
        showToast('Image resized successfully', 'success');
      });
    }
  },

  // 3. Image Compressor
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>',
    description: 'Compress PNG, JPEG, and WebP images client-side with a quality slider.',
    keywords: ['compress', 'optimize', 'file size', 'minify', 'jpeg', 'webp'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="compressControls" class="hidden flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Compression Quality</label>
              <div class="slider-group">
                <input type="range" id="compressQuality" class="slider-control" min="5" max="100" value="80">
                <span class="slider-value" id="qualityValue">80%</span>
              </div>
            </div>

            <div class="grid-2">
              <div class="result-stat">
                <span class="result-stat-label">Original Size</span>
                <span id="originalSizeVal" class="result-stat-value">0 KB</span>
              </div>
              <div class="result-stat">
                <span class="result-stat-label">Estimated Size</span>
                <span id="compressedSizeVal" class="result-stat-value">0 KB</span>
              </div>
            </div>

            <button id="downloadCompressedBtn" class="btn btn-primary w-full">Compress & Download</button>
          </div>
        </div>
      `;

      let activeFile = null;
      let imgObj = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const dataUrl = await readFileAsDataURL(file);
        imgObj = await loadImage(dataUrl);

        $('#originalSizeVal').textContent = formatBytes(file.size);
        $('#compressControls').classList.remove('hidden');
        updateSizeEstimate();
      }

      $('#compressQuality').addEventListener('input', (e) => {
        $('#qualityValue').textContent = e.target.value + '%';
        updateSizeEstimate();
      });

      async function updateSizeEstimate() {
        if (!imgObj) return;
        const q = parseInt($('#compressQuality').value) / 100;
        const { canvas } = createCanvas(imgObj.width, imgObj.height);
        canvas.getContext('2d').drawImage(imgObj, 0, 0);
        
        const blob = await canvasToBlob(canvas, activeFile.type || 'image/jpeg', q);
        $('#compressedSizeVal').textContent = formatBytes(blob.size);
      }

      $('#downloadCompressedBtn').addEventListener('click', async () => {
        if (!imgObj) return;
        const q = parseInt($('#compressQuality').value) / 100;
        const { canvas } = createCanvas(imgObj.width, imgObj.height);
        canvas.getContext('2d').drawImage(imgObj, 0, 0);

        const blob = await canvasToBlob(canvas, activeFile.type || 'image/jpeg', q);
        const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.'));
        downloadBlob(blob, `${baseName}_compressed.jpg`);
        showToast('Image compressed successfully', 'success');
      });

      function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
    }
  },

  // 4. Image Converter
  {
    id: 'image-converter',
    name: 'Image Converter',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.1l4 4-4 4M3 22v-6a6 6 0 0 1 6-6h12"/></svg>',
    description: 'Convert images to WebP, PNG, JPEG, BMP, or ICO format client-side.',
    keywords: ['converter', 'png', 'jpeg', 'webp', 'ico', 'format'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="converterControls" class="hidden flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Target Format</label>
              <select id="targetFormat" class="select-field">
                <option value="image/png">PNG (.png)</option>
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/webp">WebP (.webp)</option>
                <option value="image/bmp">BMP (.bmp)</option>
              </select>
            </div>
            
            <button id="convertBtn" class="btn btn-primary w-full">Convert & Download</button>
          </div>
        </div>
      `;

      let activeFile = null;
      let originalDataUrl = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        originalDataUrl = await readFileAsDataURL(file);
        $('#converterControls').classList.remove('hidden');
      }

      $('#convertBtn').addEventListener('click', async () => {
        if (!originalDataUrl) return;
        const format = $('#targetFormat').value;
        const img = await loadImage(originalDataUrl);
        
        const { canvas } = createCanvas(img.width, img.height);
        canvas.getContext('2d').drawImage(img, 0, 0);
        
        const blob = await canvasToBlob(canvas, format);
        const ext = format.split('/')[1];
        const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.'));
        downloadBlob(blob, `${baseName}.${ext === 'jpeg' ? 'jpg' : ext}`);
        showToast('Image converted successfully', 'success');
      });
    }
  },

  // 5. SVG to PNG/JPEG Converter
  {
    id: 'svg-converter',
    name: 'SVG to Image Converter',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Convert SVGs to PNG or JPEG at custom scaling factors (e.g. 2x, 4x, 10x) for high resolution outputs.',
    keywords: ['svg', 'png', 'converter', 'scale', 'vector', 'raster'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="svgControls" class="hidden flex-col gap-md">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Scale Factor (Resolution Multiplier)</label>
                <select id="svgScale" class="select-field">
                  <option value="1">1x (Original Size)</option>
                  <option value="2">2x (High Quality)</option>
                  <option value="4">4x (Super Resolution)</option>
                  <option value="8">8x (Print Quality)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Output Format</label>
                <select id="svgFormat" class="select-field">
                  <option value="image/png">PNG (Transparency preserved)</option>
                  <option value="image/jpeg">JPEG (Solid background)</option>
                </select>
              </div>
            </div>
            
            <button id="convertSvgBtn" class="btn btn-primary w-full">Convert SVG</button>
          </div>
        </div>
      `;

      let activeFile = null;
      let svgText = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop SVG file here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: '.svg,image/svg+xml', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const reader = new FileReader();
        reader.onload = (evt) => {
          svgText = evt.target.result;
          $('#svgControls').classList.remove('hidden');
          showToast('SVG parsed successfully', 'success');
        };
        reader.readAsText(file);
      }

      $('#convertSvgBtn').addEventListener('click', async () => {
        if (!svgText) return;
        const scale = parseInt($('#svgScale').value);
        const format = $('#svgFormat').value;

        // Parse SVG to find width/height
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = svgDoc.documentElement;
        
        let width = parseFloat(svgEl.getAttribute('width')) || 300;
        let height = parseFloat(svgEl.getAttribute('height')) || 150;
        
        if (svgEl.getAttribute('viewBox')) {
          const parts = svgEl.getAttribute('viewBox').split(/\s+/);
          if (parts.length === 4) {
            if (!svgEl.getAttribute('width')) width = parseFloat(parts[2]);
            if (!svgEl.getAttribute('height')) height = parseFloat(parts[3]);
          }
        }

        const canvasWidth = width * scale;
        const canvasHeight = height * scale;

        const img = new Image();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = async () => {
          const { canvas, ctx } = createCanvas(canvasWidth, canvasHeight);
          if (format === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          }
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          
          const blob = await canvasToBlob(canvas, format);
          const ext = format === 'image/png' ? 'png' : 'jpg';
          const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.'));
          
          downloadBlob(blob, `${baseName}_converted.${ext}`);
          URL.revokeObjectURL(url);
          showToast('Vector converted successfully', 'success');
        };
        img.src = url;
      });
    }
  },

  // 6. EXIF Metadata Viewer
  {
    id: 'exif-viewer',
    name: 'EXIF Metadata Viewer',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    description: 'Read EXIF metadata from photos including camera model, ISO, lens settings, and GPS coordinates.',
    keywords: ['exif', 'metadata', 'camera', 'gps', 'photo details'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="exifResult" class="hidden flex-col gap-md">
            <h3>EXIF Meta Information</h3>
            <div class="csv-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tag / Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody id="exifTableBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/jpeg', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        
        try {
          showToast('Reading Metadata...', 'info');
          await import('https://cdn.jsdelivr.net/npm/exif-js/+esm');
          
          const reader = new FileReader();
          reader.onload = function(e) {
            const arr = e.target.result;
            const exifData = window.EXIF.readFromBinaryFile(arr);
            
            if (exifData) {
              populateExifTable(exifData);
            } else {
              showToast('No EXIF metadata found in this image', 'warning');
            }
          };
          reader.readAsArrayBuffer(file);
        } catch (err) {
          showToast('Failed to parse EXIF metadata', 'error');
          console.error(err);
        }
      }

      function populateExifTable(data) {
        const body = $('#exifTableBody');
        body.innerHTML = '';
        
        let found = false;
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'object' || typeof val === 'function') continue;
          found = true;
          body.appendChild(el('tr', {}, [
            el('td', { textContent: key, style: { fontWeight: '600' } }),
            el('td', { textContent: String(val) })
          ]));
        }

        if (found) {
          $('#exifResult').classList.remove('hidden');
        } else {
          showToast('No readable metadata tags found', 'warning');
        }
      }
    }
  },

  // 7. CSS Glassmorphism Generator
  {
    id: 'glass-generator',
    name: 'CSS Glassmorphism Generator',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    description: 'Design interactive glassmorphic cards and copy custom generated CSS code.',
    keywords: ['glassmorphism', 'css design', 'blur', 'backdrop-filter', 'glass'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Blur (px)</label>
              <div class="slider-group">
                <input type="range" id="glassBlur" class="slider-control" min="0" max="40" value="16">
                <span class="slider-value" id="blurValue">16px</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Opacity (Glass background)</label>
              <div class="slider-group">
                <input type="range" id="glassOpacity" class="slider-control" min="0" max="100" value="30">
                <span class="slider-value" id="opacityValue">0.3</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Border Opacity</label>
              <div class="slider-group">
                <input type="range" id="glassBorder" class="slider-control" min="0" max="100" value="15">
                <span class="slider-value" id="borderValue">0.15</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Card Color</label>
              <input type="color" id="glassColor" class="input-field" value="#ffffff" style="height:40px; padding:0;">
            </div>

            <div class="code-editor">
              <div class="code-editor-header">
                <span>Generated CSS Rules</span>
                <button id="copyCssBtn" class="btn btn-sm btn-primary">Copy CSS</button>
              </div>
              <textarea id="cssTextOutput" readonly></textarea>
            </div>
          </div>

          <div class="glass-preview-area">
            <div class="glass-preview-card" id="previewCard">
              <h3 style="margin-bottom:8px">Tolika Glass</h3>
              <p style="font-size:.85rem; opacity:.9">Client-side generation with CSS backdrop filters.</p>
            </div>
          </div>
        </div>
      `;

      function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
      }

      function updateUI() {
        const blurVal = $('#glassBlur').value;
        const opacityVal = $('#glassOpacity').value / 100;
        const borderVal = $('#glassBorder').value / 100;
        const colorHex = $('#glassColor').value;
        const rgb = hexToRgb(colorHex);

        $('#blurValue').textContent = `${blurVal}px`;
        $('#opacityValue').textContent = opacityVal;
        $('#borderValue').textContent = borderVal;

        const card = $('#previewCard');
        card.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacityVal})`;
        card.style.backdropFilter = `blur(${blurVal}px)`;
        card.style.webkitBackdropFilter = `blur(${blurVal}px)`;
        card.style.border = `1px solid rgba(255, 255, 255, ${borderVal})`;

        const css = `background: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacityVal});\nbackdrop-filter: blur(${blurVal}px);\n-webkit-backdrop-filter: blur(${blurVal}px);\nborder-radius: 16px;\nborder: 1px solid rgba(255, 255, 255, ${borderVal});`;
        $('#cssTextOutput').value = css;
      }

      $('#glassBlur').addEventListener('input', updateUI);
      $('#glassOpacity').addEventListener('input', updateUI);
      $('#glassBorder').addEventListener('input', updateUI);
      $('#glassColor').addEventListener('input', updateUI);
      $('#copyCssBtn').addEventListener('click', () => {
        copyToClipboard($('#cssTextOutput').value);
      });

      updateUI();
    }
  },

  // 8. Color Palette Generator
  {
    id: 'color-palette',
    name: 'Color Palette Generator',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02845 19.1699 5.27845 19.2399 5.50857 19.1699C5.73869 19.0999 5.91869 18.9099 5.97869 18.6799L6.5 16.5C6.63807 15.9477 7.13807 15.5 7.7 15.5H10.5C11.0523 15.5 11.5 15.0523 11.5 14.5V12.5C11.5 11.9477 11.9477 11.5 12.5 11.5H16.5C17.0523 11.5 17.5 11.0523 17.5 10.5V9.5C17.5 8.94772 17.9477 8.5 18.5 8.5C19.0523 8.5 19.5 8.05228 19.5 7.5V6.5"/></svg>',
    description: 'Create customized analogous, complementary, triadic, and monochromatic schemes.',
    keywords: ['color', 'palette', 'complementary', 'analogous', 'triadic', 'hex'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Seed Color</label>
              <input type="color" id="paletteSeed" class="input-field" value="#8b5cf6" style="height:40px; padding:0;">
            </div>
            <div class="form-group">
              <label class="form-label">Palette Mode</label>
              <select id="paletteMode" class="select-field">
                <option value="complementary">Complementary</option>
                <option value="analogous">Analogous</option>
                <option value="triadic">Triadic</option>
                <option value="monochromatic">Monochromatic</option>
              </select>
            </div>
          </div>
          
          <button id="generatePaletteBtn" class="btn btn-primary w-full">Generate Scheme</button>
          
          <div class="palette-strip" id="paletteOutput"></div>
        </div>
      `;

      function hexToHsl(hex) {
        let r = parseInt(hex.substring(1,3), 16) / 255;
        let g = parseInt(hex.substring(3,5), 16) / 255;
        let b = parseInt(hex.substring(5,7), 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
          let d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      }

      function hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
          const k = (n + h / 30) % 12;
          const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
          return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
      }

      function generate() {
        const seed = $('#paletteSeed').value;
        const mode = $('#paletteMode').value;
        const hsl = hexToHsl(seed);
        const colors = [];

        if (mode === 'complementary') {
          colors.push(seed);
          colors.push(hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));
          colors.push(hslToHex(hsl.h, Math.max(0, hsl.s - 20), Math.min(100, hsl.l + 10)));
          colors.push(hslToHex((hsl.h + 180) % 360, Math.max(0, hsl.s - 20), Math.min(100, hsl.l + 10)));
        } else if (mode === 'analogous') {
          colors.push(hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l));
          colors.push(hslToHex((hsl.h + 345) % 360, hsl.s, hsl.l));
          colors.push(seed);
          colors.push(hslToHex((hsl.h + 15) % 360, hsl.s, hsl.l));
          colors.push(hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l));
        } else if (mode === 'triadic') {
          colors.push(seed);
          colors.push(hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
          colors.push(hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));
        } else if (mode === 'monochromatic') {
          colors.push(hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 30)));
          colors.push(hslToHex(hsl.h, hsl.s, Math.max(20, hsl.l - 15)));
          colors.push(seed);
          colors.push(hslToHex(hsl.h, hsl.s, Math.min(90, hsl.l + 15)));
          colors.push(hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 30)));
        }

        const out = $('#paletteOutput');
        out.innerHTML = '';
        colors.forEach(col => {
          const block = el('div', { className: 'palette-color', style: { background: col } }, [
            el('span', { className: 'palette-color-label', textContent: col })
          ]);
          block.addEventListener('click', () => {
            copyToClipboard(col);
          });
          out.appendChild(block);
        });
      }

      $('#generatePaletteBtn').addEventListener('click', generate);
      generate();
    }
  },

  // 9. Image Color Extractor
  {
    id: 'color-extractor',
    name: 'Image Color Extractor',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    description: 'Upload an image to extract its dominant color scheme and color palette.',
    keywords: ['color extractor', 'scheme', 'palette finder', 'image colors'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="extractionResults" class="hidden flex-col gap-md">
            <h3>Extracted Colors</h3>
            <div id="swatchList" class="flex-row flex-wrap gap-sm"></div>
            <div class="text-center">
              <canvas id="extractorCanvas" style="max-width:100%; border-radius:var(--radius-sm); border:1px solid var(--border)"></canvas>
            </div>
          </div>
        </div>
      `;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImage(dataUrl);

        const canvas = $('#extractorCanvas');
        const ctx = canvas.getContext('2d');
        
        const maxDim = 300;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h).data;
        const colorCounts = {};

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const hex = '#' + [qr, qg, qb].map(v => v.toString(16).padStart(2, '0')).join('');
          
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(entry => entry[0]);

        const list = $('#swatchList');
        list.innerHTML = '';
        sortedColors.forEach(col => {
          const swatch = el('div', { className: 'color-swatch', style: { background: col } });
          swatch.addEventListener('click', () => {
            copyToClipboard(col);
          });
          list.appendChild(swatch);
        });

        $('#extractionResults').classList.remove('hidden');
      }
    }
  },

  // 10. WCAG Contrast Checker
  {
    id: 'contrast-checker',
    name: 'WCAG Contrast Checker',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 1 0 0-12v12z"/></svg>',
    description: 'Verify color contrast compliance against Web Content Accessibility Guidelines (WCAG).',
    keywords: ['wcag', 'accessibility', 'contrast', 'checker', 'color check'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Text Color (Foreground)</label>
              <input type="color" id="contrastFg" class="input-field" value="#8b5cf6" style="height:40px; padding:0;">
            </div>
            <div class="form-group">
              <label class="form-label">Background Color</label>
              <input type="color" id="contrastBg" class="input-field" value="#050510" style="height:40px; padding:0;">
            </div>
            
            <div class="result-stat">
              <span class="result-stat-label">Contrast Ratio</span>
              <span id="ratioResult" class="result-stat-value" style="font-size:1.4rem">1:1</span>
            </div>

            <div class="flex-col gap-sm">
              <div class="flex-between">
                <span>Normal Text (WCAG AA)</span>
                <span id="normalAA" class="badge">Checking</span>
              </div>
              <div class="flex-between">
                <span>Normal Text (WCAG AAA)</span>
                <span id="normalAAA" class="badge">Checking</span>
              </div>
              <div class="flex-between">
                <span>Large Text (WCAG AA)</span>
                <span id="largeAA" class="badge">Checking</span>
              </div>
              <div class="flex-between">
                <span>Large Text (WCAG AAA)</span>
                <span id="largeAAA" class="badge">Checking</span>
              </div>
            </div>
          </div>

          <div class="flex-col gap-md" style="justify-content:center; align-items:center; border:1px solid var(--border); border-radius:var(--radius-md); padding:24px;" id="contrastPreviewContainer">
            <span id="contrastPreviewText" style="font-size:1.2rem; font-weight:600">Sample Heading Text</span>
            <span id="contrastPreviewSubtext" style="font-size:.85rem">Sample body text paragraph.</span>
          </div>
        </div>
      `;

      function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
      }

      function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      }

      function updateContrast() {
        const fg = $('#contrastFg').value;
        const bg = $('#contrastBg').value;

        const rgbFg = hexToRgb(fg);
        const rgbBg = hexToRgb(bg);

        const lFg = getLuminance(rgbFg.r, rgbFg.g, rgbFg.b);
        const lBg = getLuminance(rgbBg.r, rgbBg.g, rgbBg.b);

        const ratio = (Math.max(lFg, lBg) + 0.05) / (Math.min(lFg, lBg) + 0.05);
        $('#ratioResult').textContent = `${ratio.toFixed(2)}:1`;

        const pContainer = $('#contrastPreviewContainer');
        pContainer.style.backgroundColor = bg;
        $('#contrastPreviewText').style.color = fg;
        $('#contrastPreviewSubtext').style.color = fg;

        const setBadge = (el, pass) => {
          el.textContent = pass ? 'PASS' : 'FAIL';
          el.className = `badge badge-${pass ? 'success' : 'danger'}`;
        };

        setBadge($('#normalAA'), ratio >= 4.5);
        setBadge($('#normalAAA'), ratio >= 7);
        setBadge($('#largeAA'), ratio >= 3);
        setBadge($('#largeAAA'), ratio >= 4.5);
      }

      $('#contrastFg').addEventListener('input', updateContrast);
      $('#contrastBg').addEventListener('input', updateContrast);
      updateContrast();
    }
  },

  // 11. Meme Generator
  {
    id: 'meme-generator',
    name: 'Meme Generator',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10h-10V2z"/></svg>',
    description: 'Add top and bottom texts to custom images with layout scaling.',
    keywords: ['meme', 'creator', 'custom meme', 'caption', 'image maker'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div id="dropzoneContainer"></div>
            
            <div id="memeControls" class="hidden flex-col gap-md">
              <div class="form-group">
                <label class="form-label">Top Text</label>
                <input type="text" id="memeTopText" class="input-field" placeholder="Top caption">
              </div>
              <div class="form-group">
                <label class="form-label">Bottom Text</label>
                <input type="text" id="memeBottomText" class="input-field" placeholder="Bottom caption">
              </div>
              <div class="form-group">
                <label class="form-label">Font Size</label>
                <input type="number" id="memeFontSize" class="input-field" value="40">
              </div>
              
              <button id="downloadMemeBtn" class="btn btn-primary w-full">Download Meme</button>
            </div>
          </div>
          
          <div class="text-center">
            <div class="meme-canvas-wrapper">
              <canvas id="memeCanvas" style="display:none; max-width:100%"></canvas>
            </div>
          </div>
        </div>
      `;

      let activeFile = null;
      let imgObj = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const dataUrl = await readFileAsDataURL(file);
        imgObj = await loadImage(dataUrl);
        
        $('#memeCanvas').style.display = 'block';
        $('#memeControls').classList.remove('hidden');
        drawMeme();
      }

      function drawMeme() {
        if (!imgObj) return;
        const canvas = $('#memeCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imgObj.width;
        canvas.height = imgObj.height;
        ctx.drawImage(imgObj, 0, 0);

        const fontSize = parseInt($('#memeFontSize').value) || 40;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = fontSize / 8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const top = $('#memeTopText').value.toUpperCase();
        if (top) {
          ctx.fillText(top, canvas.width / 2, 20);
          ctx.strokeText(top, canvas.width / 2, 20);
        }

        const bottom = $('#memeBottomText').value.toUpperCase();
        if (bottom) {
          ctx.textBaseline = 'bottom';
          ctx.fillText(bottom, canvas.width / 2, canvas.height - 20);
          ctx.strokeText(bottom, canvas.width / 2, canvas.height - 20);
        }
      }

      $('#memeTopText').addEventListener('input', drawMeme);
      $('#memeBottomText').addEventListener('input', drawMeme);
      $('#memeFontSize').addEventListener('input', drawMeme);

      $('#downloadMemeBtn').addEventListener('click', async () => {
        const canvas = $('#memeCanvas');
        const blob = await canvasToBlob(canvas, 'image/png');
        downloadBlob(blob, 'meme.png');
      });
    }
  },

  // 12. Image Cropper
  {
    id: 'image-cropper',
    name: 'Image Cropper',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
    description: 'Crop images easily client-side with visual cropping boxes.',
    keywords: ['crop', 'image crop', 'cutting', 'ratio helper'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="cropperControls" class="hidden flex-col gap-md">
            <button id="downloadCropBtn" class="btn btn-primary w-full">Crop & Download</button>
            <div class="text-center" style="position:relative; display:inline-block; max-width:100%">
              <canvas id="cropCanvas" style="max-width:100%; border:1px solid var(--border)"></canvas>
            </div>
          </div>
        </div>
      `;

      let activeFile = null;
      let imgObj = null;
      let startX, startY, endX, endY;
      let isDrawing = false;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const dataUrl = await readFileAsDataURL(file);
        imgObj = await loadImage(dataUrl);

        $('#cropperControls').classList.remove('hidden');
        initCropperCanvas();
      }

      function initCropperCanvas() {
        const canvas = $('#cropCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imgObj.width;
        canvas.height = imgObj.height;
        ctx.drawImage(imgObj, 0, 0);

        startX = 50; startY = 50;
        endX = canvas.width - 50; endY = canvas.height - 50;
        drawSelection();

        canvas.addEventListener('mousedown', (e) => {
          const rect = canvas.getBoundingClientRect();
          startX = ((e.clientX - rect.left) / rect.width) * canvas.width;
          startY = ((e.clientY - rect.top) / rect.height) * canvas.height;
          isDrawing = true;
        });

        canvas.addEventListener('mousemove', (e) => {
          if (!isDrawing) return;
          const rect = canvas.getBoundingClientRect();
          endX = ((e.clientX - rect.left) / rect.width) * canvas.width;
          endY = ((e.clientY - rect.top) / rect.height) * canvas.height;
          drawSelection();
        });

        canvas.addEventListener('mouseup', () => {
          isDrawing = false;
        });
      }

      function drawSelection() {
        const canvas = $('#cropCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgObj, 0, 0);
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);
        
        ctx.drawImage(imgObj, x, y, w, h, x, y, w, h);
        
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      }

      $('#downloadCropBtn').addEventListener('click', async () => {
        if (!imgObj) return;
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);

        if (w < 5 || h < 5) {
          showToast('Selection too small', 'error');
          return;
        }

        const { canvas, ctx } = createCanvas(w, h);
        ctx.drawImage(imgObj, x, y, w, h, 0, 0, w, h);

        const blob = await canvasToBlob(canvas, activeFile.type);
        downloadBlob(blob, 'cropped_image.png');
        showToast('Image cropped successfully', 'success');
      });
    }
  },

  // 13. Image Filters
  {
    id: 'image-filters',
    name: 'Image Filters',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 18a6 6 0 1 0 0-12v12z"/></svg>',
    description: 'Apply basic enhancements like Grayscale, Sepia, Blur, and Brightness adjustments.',
    keywords: ['filter', 'sepia', 'blur', 'brightness', 'grayscale', 'invert'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div id="dropzoneContainer"></div>
            
            <div id="filterControls" class="hidden flex-col gap-md">
              <div class="form-group">
                <label class="form-label">Brightness</label>
                <div class="slider-group">
                  <input type="range" id="fBrightness" class="slider-control" min="0" max="200" value="100">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Contrast</label>
                <div class="slider-group">
                  <input type="range" id="fContrast" class="slider-control" min="0" max="200" value="100">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Blur</label>
                <div class="slider-group">
                  <input type="range" id="fBlur" class="slider-control" min="0" max="20" value="0">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Grayscale</label>
                <div class="slider-group">
                  <input type="range" id="fGrayscale" class="slider-control" min="0" max="100" value="0">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Sepia</label>
                <div class="slider-group">
                  <input type="range" id="fSepia" class="slider-control" min="0" max="100" value="0">
                </div>
              </div>
              <button id="downloadFilteredBtn" class="btn btn-primary w-full">Download Image</button>
            </div>
          </div>
          
          <div class="text-center">
            <img id="filterPreview" class="preview-image" style="display:none">
          </div>
        </div>
      `;

      let activeFile = null;
      let originalUrl = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        originalUrl = await readFileAsDataURL(file);
        
        const preview = $('#filterPreview');
        preview.src = originalUrl;
        preview.style.display = 'inline-block';
        $('#filterControls').classList.remove('hidden');
        applyFilters();
      }

      function applyFilters() {
        const b = $('#fBrightness').value;
        const c = $('#fContrast').value;
        const bl = $('#fBlur').value;
        const g = $('#fGrayscale').value;
        const s = $('#fSepia').value;

        const preview = $('#filterPreview');
        preview.style.filter = `brightness(${b}%) contrast(${c}%) blur(${bl}px) grayscale(${g}%) sepia(${s}%)`;
      }

      container.querySelectorAll('.slider-control').forEach(sl => {
        sl.addEventListener('input', applyFilters);
      });

      $('#downloadFilteredBtn').addEventListener('click', async () => {
        if (!originalUrl) return;
        const img = await loadImage(originalUrl);
        const { canvas, ctx } = createCanvas(img.width, img.height);
        
        ctx.filter = $('#filterPreview').style.filter;
        ctx.drawImage(img, 0, 0);

        const blob = await canvasToBlob(canvas, activeFile.type);
        downloadBlob(blob, 'filtered_image.png');
      });
    }
  },

  // 14. Color Blindness Simulator
  {
    id: 'colorblind-simulator',
    name: 'Color Blindness Simulator',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    description: 'Simulate Deuteranopia, Protanopia, Tritanopia, and Monochromacy color visions.',
    keywords: ['colorblind', 'vision', 'deuteranopia', 'protanopia', 'accessibility'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="simulatorControls" class="hidden flex-col gap-md">
            <div class="form-group">
              <label class="form-label">Simulation Type</label>
              <select id="blindnessType" class="select-field">
                <option value="normal">Normal Vision</option>
                <option value="protanopia">Protanopia (Red Weakness)</option>
                <option value="deuteranopia">Deuteranopia (Green Weakness)</option>
                <option value="tritanopia">Tritanopia (Blue Weakness)</option>
                <option value="monochromacy">Monochromacy (Total Color Blindness)</option>
              </select>
            </div>
            
            <div class="text-center">
              <canvas id="blindnessCanvas" style="max-width:100%; border:1px solid var(--border); border-radius:var(--radius-sm);"></canvas>
            </div>
          </div>
        </div>
      `;

      let activeFile = null;
      let imgObj = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const dataUrl = await readFileAsDataURL(file);
        imgObj = await loadImage(dataUrl);

        $('#simulatorControls').classList.remove('hidden');
        simulate();
      }

      function simulate() {
        if (!imgObj) return;
        const type = $('#blindnessType').value;
        const canvas = $('#blindnessCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imgObj.width;
        canvas.height = imgObj.height;
        ctx.drawImage(imgObj, 0, 0);

        if (type === 'normal') return;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];

          let nr = r, ng = g, nb = b;

          if (type === 'protanopia') {
            nr = 0.567 * r + 0.433 * g;
            ng = 0.558 * r + 0.442 * g;
            nb = 0.242 * g + 0.758 * b;
          } else if (type === 'deuteranopia') {
            nr = 0.625 * r + 0.375 * g;
            ng = 0.7 * r + 0.3 * g;
            nb = 0.3 * g + 0.7 * b;
          } else if (type === 'tritanopia') {
            nr = 0.95 * r + 0.05 * g;
            ng = 0.433 * g + 0.567 * b;
            nb = 0.475 * g + 0.525 * b;
          } else if (type === 'monochromacy') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            nr = ng = nb = gray;
          }

          data[i] = nr;
          data[i+1] = ng;
          data[i+2] = nb;
        }

        ctx.putImageData(imgData, 0, 0);
      }

      $('#blindnessType').addEventListener('change', simulate);
    }
  },

  // 15. Favicon Generator
  {
    id: 'favicon-generator',
    name: 'Favicon Generator',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    description: 'Upload PNGs and generate standard browser compatible Favicon (.ico) packages.',
    keywords: ['favicon', 'ico', 'generator', 'icon', 'shortcut icon'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div id="dropzoneContainer"></div>
          
          <div id="faviconControls" class="hidden flex-col gap-md">
            <button id="downloadFaviconBtn" class="btn btn-primary w-full">Generate & Download .ico</button>
            <div class="text-center">
              <canvas id="faviconPreview" width="32" height="32" style="border:1px solid var(--border); display:inline-block; border-radius:4px; padding:4px"></canvas>
            </div>
          </div>
        </div>
      `;

      let activeFile = null;
      let imgObj = null;

      const dz = container.querySelector('#dropzoneContainer');
      const dropzone = el('div', { className: 'drop-zone' }, [
        el('div', { className: 'drop-zone-icon', innerHTML: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' }),
        el('div', { className: 'drop-zone-text', textContent: 'Drop image here or click to browse' })
      ]);
      const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg', style: { display: 'none' } });
      dropzone.appendChild(fileInput);
      dz.appendChild(dropzone);

      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

      async function handleFile(file) {
        if (!file) return;
        activeFile = file;
        const dataUrl = await readFileAsDataURL(file);
        imgObj = await loadImage(dataUrl);

        const canvas = $('#faviconPreview');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,32,32);
        ctx.drawImage(imgObj, 0, 0, 32, 32);

        $('#faviconControls').classList.remove('hidden');
      }

      $('#downloadFaviconBtn').addEventListener('click', async () => {
        if (!imgObj) return;
        const canvas = $('#faviconPreview');
        const blob = await canvasToBlob(canvas, 'image/png');
        downloadBlob(blob, 'favicon.ico');
        showToast('Favicon.ico package created', 'success');
      });
    }
  },

  // 16. Image to Logo Maker
  {
    id: 'logo-maker',
    name: 'Image to Logo Maker',
    category: 'image',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    description: 'Remove background from photos, wrap text in badges, and compile a high-res custom brand logo.',
    keywords: ['logo maker', 'logo generator', 'make logo', 'badge creator', 'transparent png'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div id="logoDropzone" class="drop-zone" style="min-height:100px">
              <input type="file" id="logoFile" accept="image/*" style="display:none">
              <div class="drop-zone-text" style="font-size:0.9rem">Upload base logo image</div>
            </div>

            <div id="logoControls" class="hidden flex-col gap-sm">
              <div class="form-group">
                <label class="form-label">Background Tolerance (Remove White)</label>
                <input type="range" id="logoTolerance" class="slider-control" min="0" max="255" value="30">
              </div>
              <div class="form-group">
                <label class="form-label">Badge Frame Shape</label>
                <select id="logoShape" class="select-field">
                  <option value="circle">Circle Shield</option>
                  <option value="shield">Classic Knight Shield</option>
                  <option value="hexagon">Modern Hexagon</option>
                  <option value="none">None (Raw Transparent Image)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Top Logo Text</label>
                <input type="text" id="logoTopText" class="input-field" placeholder="EST. 2026">
              </div>
              <div class="form-group">
                <label class="form-label">Bottom Logo Text</label>
                <input type="text" id="logoBottomText" class="input-field" placeholder="TOLIKA BRAND">
              </div>
              <div class="form-group">
                <label class="form-label">Branding Color</label>
                <input type="color" id="logoColor" class="input-field" value="#8b5cf6" style="height:40px; padding:0;">
              </div>

              <button id="downloadLogoBtn" class="btn btn-primary w-full mt-xs">Download Logo (PNG)</button>
            </div>
          </div>

          <div class="text-center flex-col gap-sm" style="justify-content:center; align-items:center;">
            <canvas id="logoCanvas" width="400" height="400" style="max-width:100%; border:1px solid var(--border); border-radius:var(--radius-md); background:rgba(0,0,0,0.15)"></canvas>
          </div>
        </div>
      `;

      let activeFileObj = null;
      let logoImage = null;

      const zone = $('#logoDropzone');
      const input = $('#logoFile');
      const canvas = $('#logoCanvas');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => loadLogoBase(e.target.files[0]));

      async function loadLogoBase(file) {
        if (!file) return;
        activeFileObj = file;
        const dataUrl = await readFileAsDataURL(file);
        logoImage = await loadImage(dataUrl);
        
        $('#logoControls').classList.remove('hidden');
        drawLogo();
      }

      function drawLogo() {
        if (!logoImage) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const color = $('#logoColor').value;
        const shape = $('#logoShape').value;
        const tolerance = parseInt($('#logoTolerance').value);

        // 1. Draw Badge Shape
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.fillStyle = 'rgba(139,92,246,0.05)';

        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 160, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 145, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (shape === 'shield') {
          ctx.beginPath();
          ctx.moveTo(100, 80);
          ctx.lineTo(300, 80);
          ctx.quadraticCurveTo(300, 260, 200, 340);
          ctx.quadraticCurveTo(100, 260, 100, 80);
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'hexagon') {
          ctx.beginPath();
          for (let side = 0; side < 6; side++) {
            const angle = (side * Math.PI) / 3;
            const x = width / 2 + 160 * Math.cos(angle);
            const y = height / 2 + 160 * Math.sin(angle);
            if (side === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 2. Draw Image (Remove white background)
        const offCanvas = document.createElement('canvas');
        offCanvas.width = logoImage.width;
        offCanvas.height = logoImage.height;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(logoImage, 0, 0);

        const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2];
          if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
            d[i+3] = 0;
          }
        }
        offCtx.putImageData(imgData, 0, 0);

        const maxImgDim = 150;
        let w = logoImage.width, h = logoImage.height;
        if (w > maxImgDim || h > maxImgDim) {
          if (w > h) { h = (h * maxImgDim) / w; w = maxImgDim; }
          else { w = (w * maxImgDim) / h; h = maxImgDim; }
        }
        ctx.drawImage(offCanvas, (width - w) / 2, (height - h) / 2, w, h);

        // 3. Draw Branding Text
        ctx.fillStyle = color;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';

        const topText = $('#logoTopText').value;
        const bottomText = $('#logoBottomText').value;

        if (shape === 'circle') {
          ctx.textBaseline = 'middle';
          if (topText) drawCircularText(ctx, topText.toUpperCase(), width/2, height/2, 120, -Math.PI/2);
          if (bottomText) drawCircularText(ctx, bottomText.toUpperCase(), width/2, height/2, 120, Math.PI/2);
        } else {
          ctx.textBaseline = 'top';
          if (topText) ctx.fillText(topText.toUpperCase(), width / 2, 30);
          ctx.textBaseline = 'bottom';
          if (bottomText) ctx.fillText(bottomText.toUpperCase(), width / 2, height - 30);
        }
      }

      function drawCircularText(ctx, text, x, y, radius, startAngle) {
        const numChars = text.length;
        ctx.save();
        ctx.translate(x, y);
        const charSpacing = 0.14; 
        const totalAngle = numChars * charSpacing;
        let currentAngle = startAngle - (totalAngle / 2);

        for (let i = 0; i < numChars; i++) {
          ctx.save();
          ctx.rotate(currentAngle);
          ctx.translate(0, startAngle > 0 ? radius : -radius);
          if (startAngle > 0) ctx.rotate(Math.PI);
          ctx.fillText(text[i], 0, 0);
          ctx.restore();
          currentAngle += charSpacing;
        }
        ctx.restore();
      }

      $('#logoTolerance').addEventListener('input', drawLogo);
      $('#logoShape').addEventListener('change', drawLogo);
      $('#logoTopText').addEventListener('input', drawLogo);
      $('#logoBottomText').addEventListener('input', drawLogo);
      $('#logoColor').addEventListener('input', drawLogo);

      $('#downloadLogoBtn').addEventListener('click', async () => {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        downloadBlob(blob, 'brand_logo.png');
        showToast('Logo downloaded successfully', 'success');
      });
    }
  }
];
