/* =========================================================
   VIDEO & MOTION UTILITIES — videoTools.js
   ========================================================= */

import { $, $$, el, showToast, downloadBlob, formatFileSize } from '../utils.js';

export default [
  // 1. Video Metadata Analyzer & Frame Extractor
  {
    id: 'video-analyzer',
    name: 'Video Metadata Analyzer',
    category: 'video',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    description: 'Inspect video dimensions, duration, and extract precise frames as high-res PNG downloads.',
    keywords: ['video analyzer', 'video metadata', 'frame extractor', 'aspect ratio', 'video frame'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div id="videoDropzone" class="drop-zone">
              <input type="file" id="videoFile" accept="video/*" style="display:none">
              <div class="drop-zone-icon" innerHTML='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/><polyline points="23 7 16 12 23 17"/></svg>'></div>
              <div class="drop-zone-text">Click/drag video file to analyze</div>
            </div>

            <div id="videoMetaPanel" class="hidden flex-col gap-sm" style="background:rgba(139, 92, 246, 0.05); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
              <h3>Video Specifications</h3>
              <div class="grid-2 gap-sm" style="margin-top:8px;">
                <div class="result-stat" style="margin-bottom:0">
                  <span class="result-stat-label">Resolution</span>
                  <span id="vMetaRes" class="result-stat-value">-</span>
                </div>
                <div class="result-stat" style="margin-bottom:0">
                  <span class="result-stat-label">Duration</span>
                  <span id="vMetaDuration" class="result-stat-value">-</span>
                </div>
                <div class="result-stat" style="margin-bottom:0">
                  <span class="result-stat-label">Aspect Ratio</span>
                  <span id="vMetaAspect" class="result-stat-value">-</span>
                </div>
                <div class="result-stat" style="margin-bottom:0">
                  <span class="result-stat-label">File Size</span>
                  <span id="vMetaSize" class="result-stat-value">-</span>
                </div>
              </div>
            </div>

            <div id="extractorControls" class="hidden flex-col gap-md">
              <div class="form-group">
                <label class="form-label">Extract Frame (Seek Timeline)</label>
                <div class="slider-group">
                  <input type="range" id="frameSeeker" class="slider-control" min="0" max="100" value="0" step="0.01">
                  <span id="seekerTimeVal" class="slider-value" style="font-family:var(--font-mono)">0.00s</span>
                </div>
              </div>
              <button id="extractFrameBtn" class="btn btn-primary w-full">Extract Frame (Download PNG)</button>
            </div>
          </div>

          <div class="text-center flex-col gap-sm" style="justify-content:center; align-items:center;">
            <video id="analyzerVideo" controls style="max-width:100%; border-radius:var(--radius-md); border:1px solid var(--border); background:#000; display:none; max-height:300px;"></video>
            <canvas id="extractorCanvas" style="display:none"></canvas>
          </div>
        </div>
      `;

      let videoFileObj = null;
      const zone = $('#videoDropzone');
      const input = $('#videoFile');
      const video = $('#analyzerVideo');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => loadVideo(e.target.files[0]));

      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) loadVideo(e.dataTransfer.files[0]);
      });

      function loadVideo(file) {
        if (!file || !file.type.startsWith('video/')) {
          showToast('Please select a valid video file', 'error');
          return;
        }
        showToast('Parsing video structure...', 'info');

        videoFileObj = file;
        const url = URL.createObjectURL(file);
        video.src = url;
        video.style.display = 'block';

        video.onloadedmetadata = () => {
          const w = video.videoWidth;
          const h = video.videoHeight;
          const duration = video.duration.toFixed(2);
          
          function gcd(a, b) {
            return b === 0 ? a : gcd(b, a % b);
          }
          const divisor = gcd(w, h);
          const ratio = `${w / divisor}:${h / divisor}`;

          $('#vMetaRes').textContent = `${w} x ${h}`;
          $('#vMetaDuration').textContent = `${duration}s`;
          $('#vMetaAspect').textContent = ratio;
          $('#vMetaSize').textContent = formatFileSize(file.size);

          $('#frameSeeker').max = video.duration;
          $('#frameSeeker').value = 0;

          $('#videoMetaPanel').classList.remove('hidden');
          $('#extractorControls').classList.remove('hidden');
          showToast('Video processed successfully', 'success');
        };
      }

      $('#frameSeeker').addEventListener('input', (e) => {
        const time = parseFloat(e.target.value);
        video.currentTime = time;
        $('#seekerTimeVal').textContent = `${time.toFixed(2)}s`;
      });

      video.addEventListener('timeupdate', () => {
        if (video.paused) {
          $('#frameSeeker').value = video.currentTime;
          $('#seekerTimeVal').textContent = `${video.currentTime.toFixed(2)}s`;
        }
      });

      $('#extractFrameBtn').addEventListener('click', () => {
        if (!videoFileObj) return;

        const canvas = $('#extractorCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          const baseName = videoFileObj.name.substring(0, videoFileObj.name.lastIndexOf('.'));
          const timestamp = video.currentTime.toFixed(2);
          downloadBlob(blob, `${baseName}_frame_${timestamp}s.png`);
          showToast('Frame extracted!', 'success');
        }, 'image/png');
      });
    }
  },

  // 2. Video Filters & Enhancer
  {
    id: 'video-enhancer',
    name: 'Video Filters & Enhancer',
    category: 'video',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 18a6 6 0 1 0 0-12v12z"/></svg>',
    description: 'Apply live color filters, adjustments, and save the enhanced video clip client-side.',
    keywords: ['video filters', 'color grading', 'enhance video', 'video adjust', 'video recording'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div id="enhancerDropzone" class="drop-zone" style="min-height:100px">
              <input type="file" id="enhancerFile" accept="video/*" style="display:none">
              <div class="drop-zone-text" style="font-size:0.9rem">Upload video file to edit</div>
            </div>

            <div id="filterSliders" class="hidden flex-col gap-sm">
              <div class="form-group">
                <label class="form-label">Brightness</label>
                <input type="range" id="vBright" class="slider-control" min="50" max="150" value="100">
              </div>
              <div class="form-group">
                <label class="form-label">Contrast</label>
                <input type="range" id="vContrast" class="slider-control" min="50" max="150" value="100">
              </div>
              <div class="form-group">
                <label class="form-label">Saturation</label>
                <input type="range" id="vSaturate" class="slider-control" min="0" max="200" value="100">
              </div>
              <div class="form-group">
                <label class="form-label">Sepia</label>
                <input type="range" id="vSepia" class="slider-control" min="0" max="100" value="0">
              </div>

              <div id="enhancerProgress" class="hidden flex-col gap-sm mt-sm">
                <div class="progress-container">
                  <div id="enhancerBar" class="progress-bar-fill" style="width:0%"></div>
                </div>
                <span class="text-xs text-muted text-center" id="enhancerProgressText">Rendering enhanced frames...</span>
              </div>

              <button id="renderVideoBtn" class="btn btn-primary w-full mt-xs">Record & Download Filtered Video</button>
            </div>
          </div>

          <div class="text-center flex-col gap-sm" style="justify-content:center; align-items:center;">
            <video id="enhancerVideo" loop style="max-width:100%; border-radius:var(--radius-md); border:1px solid var(--border); background:#000; display:none; max-height:280px;"></video>
            <canvas id="renderCanvas" style="display:none"></canvas>
          </div>
        </div>
      `;

      let videoFileObj = null;
      let isRecording = false;
      let recordedChunks = [];
      let mediaRecorder = null;
      let animationId = null;

      const zone = $('#enhancerDropzone');
      const input = $('#enhancerFile');
      const video = $('#enhancerVideo');

      zone.addEventListener('click', () => input.click());
      input.addEventListener('change', (e) => loadVideo(e.target.files[0]));

      function loadVideo(file) {
        if (!file) return;
        videoFileObj = file;
        const url = URL.createObjectURL(file);
        video.src = url;
        video.style.display = 'block';
        video.play();
        $('#filterSliders').classList.remove('hidden');
        showToast('Video playing in loop mode', 'info');
      }

      function updateFilters() {
        const b = $('#vBright').value;
        const c = $('#vContrast').value;
        const s = $('#vSaturate').value;
        const sep = $('#vSepia').value;

        video.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%)`;
      }

      container.querySelectorAll('.slider-control').forEach(sl => {
        sl.addEventListener('input', updateFilters);
      });

      $('#renderVideoBtn').addEventListener('click', () => {
        if (!videoFileObj || isRecording) return;

        const canvas = $('#renderCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const b = $('#vBright').value;
        const c = $('#vContrast').value;
        const s = $('#vSaturate').value;
        const sep = $('#vSepia').value;
        const filterStr = `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%)`;

        try {
          // Setup canvas stream and media recorder
          const stream = canvas.captureStream(25); // 25 fps
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
          
          recordedChunks = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            downloadBlob(blob, 'enhanced_video.webm');
            showToast('Enhanced video saved!', 'success');
            
            // UI cleanup
            isRecording = false;
            video.currentTime = 0;
            video.play();
            $('#enhancerProgress').classList.add('hidden');
            $('#renderVideoBtn').disabled = false;
            $('#renderVideoBtn').textContent = 'Record & Download Filtered Video';
          };

          isRecording = true;
          $('#renderVideoBtn').disabled = true;
          $('#renderVideoBtn').textContent = 'Processing...';
          $('#enhancerProgress').classList.remove('hidden');

          video.currentTime = 0;
          video.play();
          mediaRecorder.start();

          function drawFrame() {
            if (!isRecording) return;
            ctx.filter = filterStr;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const progress = (video.currentTime / video.duration) * 100;
            $('#enhancerBar').style.width = `${progress}%`;
            $('#enhancerProgressText').textContent = `Rendering frame: ${progress.toFixed(0)}%`;

            if (!video.ended && video.currentTime < video.duration - 0.1) {
              animationId = requestAnimationFrame(drawFrame);
            } else {
              mediaRecorder.stop();
            }
          }
          drawFrame();
          showToast('Recording filtered frame buffer...', 'info');
        } catch (e) {
          showToast('Recording not supported on this browser: ' + e.message, 'error');
        }
      });
    },
    cleanup() {
      // Release video loops
    }
  }
];
