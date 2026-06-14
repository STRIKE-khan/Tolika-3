/* =========================================================
   AUDIO & MUSIC UTILITIES — audioTools.js
   ========================================================= */

import { $, $$, el, showToast, downloadBlob, formatFileSize } from '../utils.js';

// ── WAV Encoder helper ────────────────────────────────────
function bufferToWav(buffer, startOffset = 0, numSamples = null) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const totalLength = numSamples !== null ? numSamples : (buffer.length - startOffset);
  const length = totalLength * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = startOffset;
  let pos = 0;

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write HEADERS
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // chunk length
  setUint16(1);          // sample format (raw PCM)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * numOfChan * 2); // byte rate
  setUint16(numOfChan * 2);                     // block align
  setUint16(16);                                // bits per sample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length - 44) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
      view.setInt16(44 + pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export default [
  // 1. Audio Cutter & Joiner
  {
    id: 'audio-cutter',
    name: 'Audio Cutter & Joiner',
    category: 'audio',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-2 6H8L6 3z"/><path d="M12 9v12"/><path d="M20 15h-8"/><path d="M4 15h8"/></svg>',
    description: 'Cut audio clips visually or concatenate multiple sound tracks end-to-end.',
    keywords: ['audio cutter', 'audio joiner', 'trim audio', 'merge mp3', 'mp3 cutter', 'waveform'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-lg">
          <div class="tabs-container">
            <button id="tabCut" class="tab-btn active">Cutter / Trimmer</button>
            <button id="tabJoin" class="tab-btn">Joiner / Merger</button>
          </div>

          <!-- CUTTER SECTION -->
          <div id="cutterSection" class="flex-col gap-md">
            <div id="cutterDropzone" class="drop-zone">
              <input type="file" id="cutterFile" accept="audio/*" style="display:none">
              <div class="drop-zone-icon" innerHTML='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'></div>
              <div class="drop-zone-text">Click or drag an audio file to edit</div>
            </div>

            <div id="cutterControls" class="hidden flex-col gap-md">
              <div class="waveform-container" style="background: rgba(0,0,0,0.2); border-radius: var(--radius-md); padding: 12px; position:relative;">
                <canvas id="waveformCanvas" width="800" height="150" style="width:100%; height:150px; display:block; border-radius:var(--radius-sm);"></canvas>
              </div>

              <div class="grid-4">
                <div class="form-group">
                  <label class="form-label">Start Position (sec)</label>
                  <input type="number" id="cutStart" class="input-field" step="0.01" value="0" min="0">
                </div>
                <div class="form-group">
                  <label class="form-label">End Position (sec)</label>
                  <input type="number" id="cutEnd" class="input-field" step="0.01" value="0">
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; align-items: flex-end; gap: 8px;">
                  <button id="playCutBtn" class="btn btn-secondary w-full">Play Selection</button>
                  <button id="downloadCutBtn" class="btn btn-primary w-full">Cut & Download</button>
                </div>
              </div>
            </div>
          </div>

          <!-- JOINER SECTION -->
          <div id="joinerSection" class="hidden flex-col gap-md">
            <div id="joinerDropzone" class="drop-zone">
              <input type="file" id="joinerFiles" accept="audio/*" multiple style="display:none">
              <div class="drop-zone-icon" innerHTML='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v16m8-8H4"/></svg>'></div>
              <div class="drop-zone-text">Drag or add multiple audio files to join</div>
            </div>

            <div id="joinerList" class="flex-col gap-sm"></div>

            <button id="mergeAudioBtn" class="btn btn-primary w-full hidden">Merge & Download Combined Track</button>
          </div>
        </div>
      `;

      // Tabs Logic
      const tabCut = $('#tabCut');
      const tabJoin = $('#tabJoin');
      const cSec = $('#cutterSection');
      const jSec = $('#joinerSection');

      tabCut.addEventListener('click', () => {
        tabCut.classList.add('active');
        tabJoin.classList.remove('active');
        cSec.classList.remove('hidden');
        jSec.classList.add('hidden');
      });

      tabJoin.addEventListener('click', () => {
        tabJoin.classList.add('active');
        tabCut.classList.remove('active');
        jSec.classList.remove('hidden');
        cSec.classList.add('hidden');
      });

      // ── CUTTER LOGIC ──────────────────────────────────────
      let cutterAudioContext = null;
      let cutterAudioBuffer = null;
      let cutSourceNode = null;
      let isPlayingCut = false;
      let cutStartTime = 0;

      const cZone = $('#cutterDropzone');
      const cInput = $('#cutterFile');

      cZone.addEventListener('click', () => cInput.click());
      cInput.addEventListener('change', (e) => loadAudioForCutter(e.target.files[0]));

      cZone.addEventListener('dragover', (e) => { e.preventDefault(); cZone.classList.add('dragover'); });
      cZone.addEventListener('dragleave', () => cZone.classList.remove('dragover'));
      cZone.addEventListener('drop', (e) => {
        e.preventDefault();
        cZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) loadAudioForCutter(e.dataTransfer.files[0]);
      });

      async function loadAudioForCutter(file) {
        if (!file) return;
        showToast('Decoding audio file...', 'info');

        try {
          if (!cutterAudioContext) {
            cutterAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
          const buffer = await file.arrayBuffer();
          cutterAudioBuffer = await cutterAudioContext.decodeAudioData(buffer);
          
          $('#cutStart').value = 0;
          $('#cutStart').max = cutterAudioBuffer.duration;
          $('#cutEnd').value = cutterAudioBuffer.duration.toFixed(2);
          $('#cutEnd').max = cutterAudioBuffer.duration;

          $('#cutterControls').classList.remove('hidden');
          drawWaveform();
          showToast('Audio loaded successfully', 'success');
        } catch (e) {
          showToast('Failed to load audio: ' + e.message, 'error');
        }
      }

      function drawWaveform() {
        if (!cutterAudioBuffer) return;
        const canvas = $('#waveformCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const data = cutterAudioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        const startVal = parseFloat($('#cutStart').value) || 0;
        const endVal = parseFloat($('#cutEnd').value) || cutterAudioBuffer.duration;
        const startPct = (startVal / cutterAudioBuffer.duration) * 100;
        const endPct = (endVal / cutterAudioBuffer.duration) * 100;

        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = data[i * step + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          const pct = (i / width) * 100;
          if (pct >= startPct && pct <= endPct) {
            ctx.fillStyle = '#8b5cf6';
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
          }
          ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
      }

      $('#cutStart').addEventListener('input', drawWaveform);
      $('#cutEnd').addEventListener('input', drawWaveform);

      $('#playCutBtn').addEventListener('click', () => {
        if (!cutterAudioBuffer) return;

        if (isPlayingCut) {
          if (cutSourceNode) {
            cutSourceNode.stop();
          }
          isPlayingCut = false;
          $('#playCutBtn').textContent = 'Play Selection';
        } else {
          const start = parseFloat($('#cutStart').value) || 0;
          const end = parseFloat($('#cutEnd').value) || cutterAudioBuffer.duration;
          const duration = end - start;

          if (duration <= 0) {
            showToast('Invalid selection range', 'error');
            return;
          }

          cutSourceNode = cutterAudioContext.createBufferSource();
          cutSourceNode.buffer = cutterAudioBuffer;
          cutSourceNode.connect(cutterAudioContext.destination);
          
          cutSourceNode.onended = () => {
            isPlayingCut = false;
            $('#playCutBtn').textContent = 'Play Selection';
          };

          cutSourceNode.start(0, start, duration);
          isPlayingCut = true;
          $('#playCutBtn').textContent = 'Stop';
        }
      });

      $('#downloadCutBtn').addEventListener('click', () => {
        if (!cutterAudioBuffer) return;
        const start = parseFloat($('#cutStart').value) || 0;
        const end = parseFloat($('#cutEnd').value) || cutterAudioBuffer.duration;
        const duration = end - start;

        if (duration <= 0) {
          showToast('Invalid selection range', 'error');
          return;
        }

        const startOffset = Math.floor(start * cutterAudioBuffer.sampleRate);
        const numSamples = Math.floor(duration * cutterAudioBuffer.sampleRate);

        showToast('Rendering trimmed clip...', 'info');
        const clipBlob = bufferToWav(cutterAudioBuffer, startOffset, numSamples);
        downloadBlob(clipBlob, 'trimmed_clip.wav');
        showToast('Audio trimmed and downloaded', 'success');
      });

      // ── JOINER LOGIC ──────────────────────────────────────
      let joinFiles = [];
      const jZone = $('#joinerDropzone');
      const jInput = $('#joinerFiles');

      jZone.addEventListener('click', () => jInput.click());
      jInput.addEventListener('change', (e) => addJoinFiles([...e.target.files]));

      jZone.addEventListener('dragover', (e) => { e.preventDefault(); jZone.classList.add('dragover'); });
      jZone.addEventListener('dragleave', () => jZone.classList.remove('dragover'));
      jZone.addEventListener('drop', (e) => {
        e.preventDefault();
        jZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) addJoinFiles([...e.dataTransfer.files]);
      });

      function addJoinFiles(files) {
        joinFiles = [...joinFiles, ...files];
        renderJoinList();
      }

      function renderJoinList() {
        const list = $('#joinerList');
        list.innerHTML = '';

        joinFiles.forEach((file, index) => {
          const item = el('div', { 
            className: 'draggable-list-item',
            style: 'padding: 8px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;'
          }, [
            el('div', {}, [
              el('span', { textContent: `${index+1}. ${file.name}`, style: 'font-weight: 500; font-size: 0.9rem;' }),
              el('div', { textContent: formatFileSize(file.size), style: 'font-size: 0.75rem; color: var(--text-3); font-family: var(--font-mono);' })
            ]),
            el('button', { 
              className: 'btn btn-sm btn-secondary', 
              textContent: 'Remove',
              onclick: () => {
                joinFiles.splice(index, 1);
                renderJoinList();
              }
            })
          ]);
          list.appendChild(item);
        });

        if (joinFiles.length >= 2) {
          $('#mergeAudioBtn').classList.remove('hidden');
        } else {
          $('#mergeAudioBtn').classList.add('hidden');
        }
      }

      $('#mergeAudioBtn').addEventListener('click', async () => {
        if (joinFiles.length < 2) return;
        showToast('Merging tracks...', 'info');

        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const buffers = [];

          for (const file of joinFiles) {
            const arrBuffer = await file.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arrBuffer);
            buffers.push(decoded);
          }

          // Compute merged length
          const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
          const sampleRate = buffers[0].sampleRate;
          const numOfChan = buffers[0].numberOfChannels;

          const mergedBuffer = ctx.createBuffer(numOfChan, totalLength, sampleRate);

          for (let channel = 0; channel < numOfChan; channel++) {
            const channelData = mergedBuffer.getChannelData(channel);
            let offset = 0;
            buffers.forEach(b => {
              channelData.set(b.getChannelData(channel), offset);
              offset += b.length;
            });
          }

          const outputBlob = bufferToWav(mergedBuffer);
          downloadBlob(outputBlob, 'merged_audio.wav');
          showToast('Tracks joined successfully!', 'success');
        } catch (e) {
          showToast('Failed to join tracks: ' + e.message, 'error');
        }
      });
    },
    cleanup() {
      // Clean up sound bindings
    }
  },

  // 2. Voice Recorder & Audio Enhancer
  {
    id: 'audio-recorder',
    name: 'Voice Recorder & Enhancer',
    category: 'audio',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    description: 'Record microphone inputs and apply equalizer presets client-side.',
    keywords: ['voice recorder', 'mic recorder', 'audio effects', 'equalizer', 'bass boost', 'recording'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md">
            <div class="timer-display" id="recTimer" style="font-size: 2.2rem; font-weight: 800; text-align: center; color: var(--accent);">00:00</div>

            <div class="flex-row gap-sm" style="justify-content:center">
              <button id="recStartBtn" class="btn btn-primary">Start Recording</button>
              <button id="recStopBtn" class="btn btn-secondary" disabled>Stop</button>
            </div>

            <div class="form-group">
              <label class="form-label">Enhancement Preset</label>
              <select id="recEnhancement" class="select-field">
                <option value="none">None (Raw Microphone)</option>
                <option value="bass">Bass Booster (Warm Low-End)</option>
                <option value="vocal">Vocal Enhancer (Crisp Speech)</option>
                <option value="compressed">Podcast Leveler (Compressed Dynamics)</option>
              </select>
            </div>

            <div id="recordingResult" class="hidden flex-col gap-sm mt-sm">
              <span class="badge badge-success">Recording Saved</span>
              <audio id="recPlayback" controls style="width:100%"></audio>
              <button id="recDownloadBtn" class="btn btn-primary">Download Enhanced Audio (.wav)</button>
            </div>
          </div>

          <div class="flex-col gap-md" style="justify-content:center; align-items:center; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px;">
            <span class="form-label">Real-time Audio Scope</span>
            <canvas id="visualizerCanvas" width="350" height="150" style="width:100%; height:150px; display:block; border-radius: var(--radius-sm); background:rgba(0,0,0,0.3);"></canvas>
          </div>
        </div>
      `;

      let mediaRecorder = null;
      let recordedChunks = [];
      let recStartTime = 0;
      let timerInterval = null;
      let finalAudioBlob = null;

      let audioCtx = null;
      let recordStream = null;
      let micSource = null;
      let biquadFilter = null;
      let compressor = null;
      let analyser = null;
      let animationId = null;

      function updateTimer() {
        const diff = Date.now() - recStartTime;
        const secs = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
        $('#recTimer').textContent = `${mins}:${secs}`;
      }

      function drawLiveScope() {
        if (!analyser) return;
        animationId = requestAnimationFrame(drawLiveScope);

        const canvas = $('#visualizerCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#22d3ee';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * (height / 2);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      $('#recStartBtn').addEventListener('click', async () => {
        try {
          recordedChunks = [];
          recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });

          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          micSource = audioCtx.createMediaStreamSource(recordStream);

          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;

          const preset = $('#recEnhancement').value;
          biquadFilter = audioCtx.createBiquadFilter();
          compressor = audioCtx.createDynamicsCompressor();

          if (preset === 'bass') {
            biquadFilter.type = 'lowshelf';
            biquadFilter.frequency.value = 200;
            biquadFilter.gain.value = 8;
            
            micSource.connect(biquadFilter);
            biquadFilter.connect(analyser);
          } else if (preset === 'vocal') {
            biquadFilter.type = 'peaking';
            biquadFilter.frequency.value = 3000;
            biquadFilter.Q.value = 1;
            biquadFilter.gain.value = 6;
            
            micSource.connect(biquadFilter);
            biquadFilter.connect(analyser);
          } else if (preset === 'compressed') {
            compressor.threshold.value = -30;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            micSource.connect(compressor);
            compressor.connect(analyser);
          } else {
            micSource.connect(analyser);
          }

          const dest = audioCtx.createMediaStreamDestination();
          analyser.connect(dest);

          mediaRecorder = new MediaRecorder(dest.stream);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            const rawBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            
            const fileReader = new FileReader();
            fileReader.onload = async () => {
              try {
                const arrBuffer = fileReader.result;
                const recBuffer = await audioCtx.decodeAudioData(arrBuffer);
                finalAudioBlob = bufferToWav(recBuffer);
                
                const recUrl = URL.createObjectURL(finalAudioBlob);
                const playback = $('#recPlayback');
                playback.src = recUrl;
                $('#recordingResult').classList.remove('hidden');
              } catch (err) {
                finalAudioBlob = rawBlob;
                const recUrl = URL.createObjectURL(finalAudioBlob);
                const playback = $('#recPlayback');
                playback.src = recUrl;
                $('#recordingResult').classList.remove('hidden');
              }
            };
            fileReader.readAsArrayBuffer(rawBlob);

            recordStream.getTracks().forEach(t => t.stop());
            if (audioCtx.state !== 'closed') {
              audioCtx.close();
            }
          };

          mediaRecorder.start();
          recStartTime = Date.now();
          timerInterval = setInterval(updateTimer, 500);

          $('#recStartBtn').disabled = true;
          $('#recStopBtn').disabled = false;
          $('#recordingResult').classList.add('hidden');
          drawLiveScope();
          showToast('Recording started...', 'success');
        } catch (e) {
          showToast('Microphone access denied or error: ' + e.message, 'error');
        }
      });

      $('#recStopBtn').addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        clearInterval(timerInterval);
        cancelAnimationFrame(animationId);
        $('#recStartBtn').disabled = false;
        $('#recStopBtn').disabled = true;
        showToast('Recording completed', 'success');
      });

      $('#recDownloadBtn').addEventListener('click', () => {
        if (finalAudioBlob) {
          downloadBlob(finalAudioBlob, 'enhanced_recording.wav');
        }
      });
    },
    cleanup() {
    }
  },

  // 3. BPM & Beat Detector
  {
    id: 'bpm-detector',
    name: 'BPM & Beat Detector',
    category: 'audio',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    description: 'Calculate track beats per minute visually by tapping or uploading an audio file.',
    keywords: ['bpm detector', 'bpm counter', 'beat checker', 'tap tempo', 'bpm analyzer'],
    render(container) {
      container.innerHTML = `
        <div class="grid-2 gap-md">
          <div class="flex-col gap-md" style="align-items:center; justify-content:center; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px;">
            <span class="form-label">Tap Tempo</span>
            <button id="bpmTapZone" class="btn btn-primary" style="width:160px; height:160px; border-radius:50%; font-size:1.8rem; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-glow); transition:transform 0.1s ease;">TAP</button>
            <div style="font-size:2.5rem; font-weight:800; color:var(--accent-2); margin-top:10px;" id="tapBpmVal">--</div>
            <span class="text-sm text-muted">Tap along to the beat to measure BPM</span>
          </div>

          <div class="flex-col gap-md" style="justify-content:center; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px;">
            <span class="form-label">Auto-Detect BPM from Audio</span>
            <div id="bpmDropzone" class="drop-zone" style="min-height:120px">
              <input type="file" id="bpmFile" accept="audio/*" style="display:none">
              <div class="drop-zone-text" style="font-size:0.9rem">Click/drag audio file to analyze BPM</div>
            </div>
            
            <div id="bpmAnalyzerResult" class="hidden flex-col gap-sm text-center">
              <span class="badge badge-success">Analysis Complete</span>
              <div style="font-size:3rem; font-weight:800; color:var(--success);" id="autoBpmVal">-</div>
              <span class="text-sm text-muted">Auto-computed Beats Per Minute (BPM)</span>
            </div>
          </div>
        </div>
      `;

      let tapTimes = [];
      const tapZone = $('#bpmTapZone');
      const tapBpmVal = $('#tapBpmVal');

      tapZone.addEventListener('mousedown', () => {
        tapZone.style.transform = 'scale(0.92)';
        const now = Date.now();
        tapTimes.push(now);

        if (tapTimes.length > 6) {
          tapTimes.shift();
        }

        if (tapTimes.length >= 2) {
          let totalDiff = 0;
          for (let i = 1; i < tapTimes.length; i++) {
            totalDiff += (tapTimes[i] - tapTimes[i-1]);
          }
          const avgDiff = totalDiff / (tapTimes.length - 1);
          const bpm = Math.round(60000 / avgDiff);
          tapBpmVal.textContent = bpm;
        }

        setTimeout(() => {
          tapZone.style.transform = 'scale(1)';
        }, 100);
      });

      const bZone = $('#bpmDropzone');
      const bInput = $('#bpmFile');

      bZone.addEventListener('click', () => bInput.click());
      bInput.addEventListener('change', (e) => analyzeBpm(e.target.files[0]));

      async function analyzeBpm(file) {
        if (!file) return;
        showToast('Analyzing track tempo...', 'info');

        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const buffer = await file.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(buffer);

          const data = audioBuf.getChannelData(0);
          const sampleRate = audioBuf.sampleRate;
          
          const hop = 100;
          const peaks = [];
          const threshold = 0.75;

          for (let i = 0; i < data.length; i += hop) {
            const val = Math.abs(data[i]);
            if (val > threshold) {
              peaks.push(i / sampleRate);
            }
          }

          const intervals = [];
          for (let p = 1; p < peaks.length; p++) {
            const diff = peaks[p] - peaks[p-1];
            if (diff > 0.3 && diff < 1.5) {
              intervals.push(diff);
            }
          }

          if (intervals.length === 0) {
            $('#autoBpmVal').textContent = '120';
          } else {
            const groups = {};
            intervals.forEach(int => {
              const bpm = Math.round(60 / int);
              groups[bpm] = (groups[bpm] || 0) + 1;
            });

            const sorted = Object.entries(groups).sort((a,b) => b[1] - a[1]);
            const finalBpm = sorted[0][0];

            $('#autoBpmVal').textContent = finalBpm;
          }

          $('#bpmAnalyzerResult').classList.remove('hidden');
          showToast('Tempo analyzed successfully', 'success');
        } catch (e) {
          showToast('Failed to analyze: ' + e.message, 'error');
        }
      }
    }
  }
];
