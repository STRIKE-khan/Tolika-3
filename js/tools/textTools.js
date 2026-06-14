/* =========================================================
   TEXT & WRITING TOOLS — textTools.js
   ========================================================= */

import { $, $$, el, showToast, copyToClipboard, computeDiff, parseMarkdown } from '../utils.js';

export default [
  // 16. Smart Text Humanizer
  {
    id: 'text-humanizer',
    name: 'Smart Text Humanizer',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="12" r="1"/></svg>',
    description: 'Humanize AI-written text by replacing common robotic terms and sentence structures.',
    keywords: ['humanizer', 'ai text', 'chatgpt filter', 'bypass detector', 'paraphrase'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">AI Text (Input)</label>
              <textarea id="humanizerInput" class="textarea-field" placeholder="Paste your AI text here..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Humanized Text (Output)</label>
              <textarea id="humanizerOutput" class="textarea-field" placeholder="Humanized text will appear here..." readonly></textarea>
            </div>
          </div>
          
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Humanization Intensity</label>
              <select id="humanizerIntensity" class="select-field">
                <option value="light">Light (Slight edits)</option>
                <option value="medium" selected>Medium (Standard filter)</option>
                <option value="aggressive">Aggressive (Heavy rewrite)</option>
              </select>
            </div>
            
            <div class="result-stat" id="readabilityPanel" style="margin-top:24px; display:none">
              <span class="result-stat-label">Readability Score</span>
              <span id="readabilityScore" class="result-stat-value">100 (Easy)</span>
            </div>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="humanizeBtn" class="btn btn-primary">Humanize Text</button>
            <button id="copyHumanizedBtn" class="btn btn-secondary">Copy Result</button>
          </div>
        </div>
      `;

      const buzzwords = {
        'delve': 'explore',
        'testament': 'proof',
        'tapestry': 'complex picture',
        'moreover': 'also',
        'furthermore': 'in addition',
        'revolutionize': 'improve',
        'demystify': 'explain',
        'beacon': 'guide',
        'meticulously': 'carefully',
        'showcased': 'shown',
        'utilize': 'use',
        'multifaceted': 'diverse',
        'leverage': 'use',
        'pivotal': 'critical',
        'underscores': 'shows',
        'in conclusion': 'finally',
        'consequently': 'so',
        'subsequently': 'later',
        'paramount': 'important',
        'encompasses': 'covers',
        'intricate': 'complex',
        'comprehensive': 'complete',
        'robust': 'strong',
        'seamless': 'smooth',
        'streamline': 'simplify',
        'paradigm': 'model',
        'synergy': 'cooperation',
        'holistic': 'whole',
        'groundbreaking': 'new',
        'cutting-edge': 'modern',
        'innovative': 'new',
        'state-of-the-art': 'modern',
        'spearhead': 'lead',
        'harness': 'use',
        'foster': 'help',
        'facilitate': 'help',
        'navigate': 'steer',
        'landscape': 'field',
        'ecosystem': 'network',
        'empower': 'allow',
        'realm': 'area',
        'endeavor': 'effort',
        'embark': 'start',
        'plethora': 'lots of',
        'myriad': 'many',
        'elucidate': 'explain',
        'aforementioned': 'mentioned',
        'henceforth': 'from now on',
        'thereby': 'thus',
        'thus': 'so',
        'commence': 'start'
      };

      function calculateFleschReadingEase(text) {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const sentences = text.trim() ? text.split(/[.!?]+/).filter(Boolean).length : 0;
        
        if (words === 0 || sentences === 0) return 100;
        
        let syllables = 0;
        const wordList = text.trim().toLowerCase().split(/\s+/);
        wordList.forEach(w => {
          const cleanWord = w.replace(/[^a-z]/g, '');
          if (cleanWord.length <= 3) {
            syllables += 1;
            return;
          }
          const matches = cleanWord.match(/[aeiouy]+/g);
          let count = matches ? matches.length : 1;
          if (cleanWord.endsWith('e')) count--;
          syllables += Math.max(1, count);
        });
        
        const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
        return Math.min(100, Math.max(0, score));
      }

      function restructAggressive(text) {
        const sentences = text.split(/([.!?]+)/);
        let result = [];
        
        for (let i = 0; i < sentences.length; i += 2) {
          let sentence = sentences[i];
          let punct = sentences[i+1] || '';
          if (!sentence) continue;
          
          const words = sentence.trim().split(/\s+/);
          if (words.length > 25) {
            const mid = Math.floor(words.length / 2);
            let splitIndex = -1;
            for (let w = mid - 4; w < mid + 4; w++) {
              if (words[w] && (words[w].endsWith(',') || ['and', 'but', 'because', 'which', 'although', 'while'].includes(words[w].toLowerCase()))) {
                splitIndex = w;
                break;
              }
            }
            if (splitIndex !== -1) {
              let s1 = words.slice(0, splitIndex + 1).join(' ').replace(/,$/, '');
              let s2 = words.slice(splitIndex + 1).join(' ');
              s2 = s2.charAt(0).toUpperCase() + s2.slice(1);
              result.push(s1 + '. ' + s2 + punct);
            } else {
              result.push(sentence + punct);
            }
          } else {
            result.push(sentence + punct);
          }
        }
        return result.join('');
      }

      $('#humanizeBtn').addEventListener('click', () => {
        let text = $('#humanizerInput').value;
        if (!text.trim()) {
          showToast('Please enter some text', 'warning');
          return;
        }

        const intensity = $('#humanizerIntensity').value;
        let humanized = text;

        // Apply replacements based on intensity
        const keysToReplace = Object.keys(buzzwords).filter(key => {
          if (intensity === 'light') {
            return ['delve', 'testament', 'tapestry', 'utilize', 'leverage', 'meticulously'].includes(key);
          }
          return true; // Medium and Aggressive replace all 50+
        });

        for (const key of keysToReplace) {
          const replacement = buzzwords[key];
          const regex = new RegExp(`\\b${key}\\b`, 'gi');
          humanized = humanized.replace(regex, (match) => {
            if (match[0] === match[0].toUpperCase()) {
              return replacement[0].toUpperCase() + replacement.slice(1);
            }
            return replacement;
          });
        }

        // Improve sentence flow
        humanized = humanized.replace(/\b(Firstly|Secondly|Thirdly),/gi, (match, word) => {
          const maps = { 'firstly': 'First', 'secondly': 'Second', 'thirdly': 'Third' };
          return maps[word.toLowerCase()] + ',';
        });

        // Aggressive rewriting
        if (intensity === 'aggressive') {
          humanized = restructAggressive(humanized);
          // Remove excessive adverbs
          humanized = humanized.replace(/\b(absolutely|meticulously|completely|extremely|very|totally)\b\s+/gi, '');
        }

        $('#humanizerOutput').value = humanized;
        
        // Calculate and show Flesch score
        const score = calculateFleschReadingEase(humanized);
        const panel = $('#readabilityPanel');
        const scoreVal = $('#readabilityScore');
        
        let label = 'Easy';
        if (score < 30) label = 'Difficult';
        else if (score < 60) label = 'Moderate';
        
        scoreVal.textContent = `${Math.round(score)} (${label})`;
        panel.style.display = 'flex';

        showToast('Text humanized successfully', 'success');
      });

      $('#copyHumanizedBtn').addEventListener('click', () => {
        const out = $('#humanizerOutput').value;
        if (out) copyToClipboard(out);
      });
    }
  },

  // 17. Text Diff Tool
  {
    id: 'text-diff',
    name: 'Text Diff Tool',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
    description: 'Compare two text documents side-by-side to highlight added, removed, or modified lines.',
    keywords: ['diff', 'compare text', 'file compare', 'text diff', 'git diff'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">Original Text</label>
              <textarea id="diffOld" class="textarea-field" placeholder="Original text..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Modified Text</label>
              <textarea id="diffNew" class="textarea-field" placeholder="Modified text..."></textarea>
            </div>
          </div>
          
          <button id="compareDiffBtn" class="btn btn-primary w-full">Compare Texts</button>
          
          <div id="diffOutputContainer" class="hidden diff-container">
            <div class="diff-pane" style="grid-column: span 2;">
              <div class="diff-pane-header">Differences Output</div>
              <div id="diffOutput" class="diff-output"></div>
            </div>
          </div>
        </div>
      `;

      $('#compareDiffBtn').addEventListener('click', () => {
        const oldVal = $('#diffOld').value;
        const newVal = $('#diffNew').value;
        
        const diffs = computeDiff(oldVal, newVal);
        const out = $('#diffOutput');
        out.innerHTML = '';

        diffs.forEach(item => {
          let lineClass = 'diff-unchanged';
          let prefix = '  ';
          if (item.type === 'added') {
            lineClass = 'diff-added';
            prefix = '+ ';
          } else if (item.type === 'removed') {
            lineClass = 'diff-removed';
            prefix = '- ';
          }
          
          const lineEl = el('span', { className: `diff-line ${lineClass}`, textContent: prefix + item.text });
          out.appendChild(lineEl);
        });

        $('#diffOutputContainer').classList.remove('hidden');
        showToast('Diff calculated successfully', 'success');
      });
    }
  },

  // 18. Markdown Editor & Previewer
  {
    id: 'markdown-editor',
    name: 'Markdown Editor & Previewer',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    description: 'Write Markdown with real-time rendered HTML preview.',
    keywords: ['markdown', 'preview', 'editor', 'html renderer', 'md'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <div class="form-group">
              <label class="form-label">Markdown Input</label>
              <textarea id="mdInput" class="textarea-field" style="min-height:300px;" placeholder="# Hello World\n\nStart writing markdown here..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Live HTML Preview</label>
              <div id="mdPreview" style="min-height:300px; padding:12px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-sm); overflow:auto;"></div>
            </div>
          </div>
        </div>
      `;

      const input = $('#mdInput');
      const preview = $('#mdPreview');

      input.addEventListener('input', () => {
        preview.innerHTML = parseMarkdown(input.value);
      });
    }
  },

  // 19. Text-to-Speech (TTS)
  {
    id: 'text-to-speech',
    name: 'Text-to-Speech (TTS)',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/></svg>',
    description: 'Convert written text into human voice speech using HTML5 synthesis.',
    keywords: ['speech', 'voice', 'tts', 'reader', 'audio player'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Text to Speak</label>
            <textarea id="ttsInput" class="textarea-field" placeholder="Type something for the browser to speak..."></textarea>
          </div>
          
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Voice Selection</label>
              <select id="ttsVoice" class="select-field"></select>
            </div>
            <div class="form-group">
              <label class="form-label">Speed / Rate</label>
              <input type="range" id="ttsRate" class="slider-control" min="0.5" max="2" step="0.1" value="1">
            </div>
            <div class="form-group">
              <label class="form-label">Pitch</label>
              <input type="range" id="ttsPitch" class="slider-control" min="0" max="2" step="0.1" value="1">
            </div>
          </div>

          <div class="flex-row gap-sm">
            <button id="ttsPlayBtn" class="btn btn-primary">Speak</button>
            <button id="ttsStopBtn" class="btn btn-secondary">Stop</button>
          </div>
        </div>
      `;

      const voiceSelect = $('#ttsVoice');
      let voices = [];

      function populateVoices() {
        if (typeof speechSynthesis === 'undefined') return;
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        voices.forEach((voice, i) => {
          voiceSelect.appendChild(el('option', { value: i, textContent: `${voice.name} (${voice.lang})` }));
        });
      }

      populateVoices();
      if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
      }

      $('#ttsPlayBtn').addEventListener('click', () => {
        const text = $('#ttsInput').value;
        if (!text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        if (voices.length > 0) {
          utterance.voice = voices[parseInt(voiceSelect.value)];
        }
        utterance.rate = parseFloat($('#ttsRate').value);
        utterance.pitch = parseFloat($('#ttsPitch').value);

        speechSynthesis.speak(utterance);
      });

      $('#ttsStopBtn').addEventListener('click', () => {
        if (typeof speechSynthesis !== 'undefined') {
          speechSynthesis.cancel();
        }
      });
    }
  },

  // 20. Speech-to-Text (Voice Dictation)
  {
    id: 'speech-to-text',
    name: 'Voice Dictation (Speech to Text)',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    description: 'Dictate voice into text utilizing HTML5 Speech Recognition.',
    keywords: ['speech recognition', 'voice to text', 'audio to text', 'dictate'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Dictated Output</label>
            <textarea id="sttOutput" class="textarea-field" placeholder="Dictate voice will show up here..." style="min-height:200px;"></textarea>
          </div>

          <div class="flex-row gap-sm">
            <button id="sttStartBtn" class="btn btn-primary">Start Recording</button>
            <button id="sttStopBtn" class="btn btn-secondary" disabled>Stop</button>
            <button id="sttCopyBtn" class="btn btn-secondary">Copy Text</button>
          </div>
        </div>
      `;

      let recognition = null;
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (e) => {
          let text = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            text += e.results[i][0].transcript;
          }
          $('#sttOutput').value = text;
        };

        recognition.onerror = () => {
          showToast('Speech recognition error', 'error');
          stopRec();
        };

        recognition.onend = () => {
          stopRec();
        };
      }

      function startRec() {
        if (!recognition) {
          showToast('Voice Recognition is not supported in this browser.', 'error');
          return;
        }
        recognition.start();
        $('#sttStartBtn').textContent = 'Listening...';
        $('#sttStartBtn').disabled = true;
        $('#sttStopBtn').disabled = false;
      }

      function stopRec() {
        if (recognition) recognition.stop();
        $('#sttStartBtn').textContent = 'Start Recording';
        $('#sttStartBtn').disabled = false;
        $('#sttStopBtn').disabled = true;
      }

      $('#sttStartBtn').addEventListener('click', startRec);
      $('#sttStopBtn').addEventListener('click', stopRec);
      $('#sttCopyBtn').addEventListener('click', () => {
        copyToClipboard($('#sttOutput').value);
      });
    }
  },

  // 21. Word & Character Counter
  {
    id: 'word-counter',
    name: 'Word & Character Counter',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    description: 'Calculate real-time count of words, characters, sentences, and estimated reading time.',
    keywords: ['word count', 'characters count', 'paragraph count', 'reading time'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Source Text</label>
            <textarea id="counterInput" class="textarea-field" style="min-height:200px;" placeholder="Type or paste text here..."></textarea>
          </div>

          <div class="grid-4">
            <div class="result-stat">
              <span class="result-stat-label">Characters</span>
              <span id="charCount" class="result-stat-value">0</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Words</span>
              <span id="wordCount" class="result-stat-value">0</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Sentences</span>
              <span id="sentenceCount" class="result-stat-value">0</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Reading Time</span>
              <span id="readTime" class="result-stat-value">0m</span>
            </div>
          </div>
        </div>
      `;

      const input = $('#counterInput');
      input.addEventListener('input', () => {
        const text = input.value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const sentences = text.trim() ? text.split(/[.!?]+/).filter(Boolean).length : 0;
        const time = Math.ceil(words / 200);

        $('#charCount').textContent = chars;
        $('#wordCount').textContent = words;
        $('#sentenceCount').textContent = sentences;
        $('#readTime').textContent = `${time}m`;
      });
    }
  },

  // 22. Case Converter
  {
    id: 'case-converter',
    name: 'Case Converter',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
    description: 'Change text case to UPPERCASE, lowercase, camelCase, snake_case, Title Case, etc.',
    keywords: ['case', 'uppercase', 'lowercase', 'camelcase', 'snake_case'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Input Text</label>
            <textarea id="caseInput" class="textarea-field" placeholder="Enter text here..."></textarea>
          </div>

          <div class="btn-group">
            <button id="caseUpper" class="btn">UPPERCASE</button>
            <button id="caseLower" class="btn">lowercase</button>
            <button id="caseTitle" class="btn">Title Case</button>
            <button id="caseCamel" class="btn">camelCase</button>
            <button id="caseSnake" class="btn">snake_case</button>
          </div>
        </div>
      `;

      const input = $('#caseInput');
      
      $('#caseUpper').addEventListener('click', () => {
        input.value = input.value.toUpperCase();
      });

      $('#caseLower').addEventListener('click', () => {
        input.value = input.value.toLowerCase();
      });

      $('#caseTitle').addEventListener('click', () => {
        input.value = input.value.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
      });

      $('#caseCamel').addEventListener('click', () => {
        input.value = input.value.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
      });

      $('#caseSnake').addEventListener('click', () => {
        input.value = input.value.toLowerCase().trim().replace(/\s+/g, '_');
      });
    }
  },

  // 23. Text Cleaner
  {
    id: 'text-cleaner',
    name: 'Text Cleaner',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    description: 'Clean text by removing extra spaces, line breaks, duplicate lines, or formatting.',
    keywords: ['clean', 'trim', 'remove spaces', 'minify text', 'remove formatting'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Text to Clean</label>
            <textarea id="cleanerInput" class="textarea-field" placeholder="Paste dirty text..."></textarea>
          </div>

          <div class="btn-group">
            <button id="cleanSpaces" class="btn">Remove Extra Spaces</button>
            <button id="cleanNewlines" class="btn">Remove Line Breaks</button>
            <button id="cleanDuplicates" class="btn">Remove Duplicate Lines</button>
          </div>
        </div>
      `;

      const input = $('#cleanerInput');

      $('#cleanSpaces').addEventListener('click', () => {
        input.value = input.value.replace(/\s+/g, ' ').trim();
        showToast('Extra spaces removed', 'success');
      });

      $('#cleanNewlines').addEventListener('click', () => {
        input.value = input.value.replace(/\n+/g, ' ');
        showToast('Line breaks removed', 'success');
      });

      $('#cleanDuplicates').addEventListener('click', () => {
        const lines = input.value.split('\n');
        input.value = [...new Set(lines)].join('\n');
        showToast('Duplicate lines removed', 'success');
      });
    }
  },

  // 24. Regex Tester & Explainer
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/></svg>',
    description: 'Write regular expressions, match test cases and get real-time highlighting.',
    keywords: ['regex', 'regular expression', 'regex tester', 'regex helper'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Regex Expression</label>
              <input type="text" id="regexExpr" class="input-field" value="([a-zA-Z0-9]+)">
            </div>
            <div class="form-group">
              <label class="form-label">Regex Flags</label>
              <input type="text" id="regexFlags" class="input-field" value="g">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Test Text</label>
            <textarea id="regexTestText" class="textarea-field" placeholder="Test your regex matches here..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Highlighted Matches</label>
            <div id="regexHighlightOutput" style="min-height:100px; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); white-space:pre-wrap; word-break:break-word;"></div>
          </div>
        </div>
      `;

      function performRegex() {
        const expr = $('#regexExpr').value;
        const flags = $('#regexFlags').value;
        const text = $('#regexTestText').value;
        const out = $('#regexHighlightOutput');

        if (!expr) {
          out.textContent = text;
          return;
        }

        try {
          const r = new RegExp(expr, flags);
          const highlighted = text.replace(r, (match) => {
            return `<mark class="regex-match">${match}</mark>`;
          });
          out.innerHTML = highlighted;
        } catch(e) {
          out.innerHTML = `<span style="color:var(--danger)">Error: ${e.message}</span>`;
        }
      }

      $('#regexExpr').addEventListener('input', performRegex);
      $('#regexFlags').addEventListener('input', performRegex);
      $('#regexTestText').addEventListener('input', performRegex);
    }
  },

  // 25. Lorem Ipsum Generator
  {
    id: 'lorem-generator',
    name: 'Lorem Ipsum Generator',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    description: 'Generate customizable placeholder paragraphs, words, or sentences.',
    keywords: ['lorem ipsum', 'placeholder', 'dummy text', 'lorem text'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Count</label>
              <input type="number" id="loremCount" class="input-field" value="3">
            </div>
            <div class="form-group">
              <label class="form-label">Generate Type</label>
              <select id="loremType" class="select-field">
                <option value="paragraphs">Paragraphs</option>
                <option value="sentences">Sentences</option>
                <option value="words">Words</option>
              </select>
            </div>
          </div>
          
          <button id="loremGenerateBtn" class="btn btn-primary w-full">Generate Lorem Ipsum</button>
          
          <div class="output-area" id="loremOutput" style="display:none"></div>
        </div>
      `;

      const wordsList = [
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
        'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
        'magna', 'aliqua', 'ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
        'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea',
        'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit',
        'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
        'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
        'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
      ];

      function generateWords(n) {
        let res = [];
        for (let i = 0; i < n; i++) {
          res.push(wordsList[Math.floor(Math.random() * wordsList.length)]);
        }
        return res.join(' ');
      }

      function generateSentences(n) {
        let res = [];
        for (let i = 0; i < n; i++) {
          let sentence = generateWords(Math.floor(Math.random() * 8) + 6);
          sentence = sentence.charAt(0).toUpperCase() + sentence.substring(1) + '.';
          res.push(sentence);
        }
        return res.join(' ');
      }

      $('#loremGenerateBtn').addEventListener('click', () => {
        const count = parseInt($('#loremCount').value) || 1;
        const type = $('#loremType').value;
        const out = $('#loremOutput');
        
        let result = '';
        if (type === 'words') {
          result = generateWords(count);
        } else if (type === 'sentences') {
          result = generateSentences(count);
        } else if (type === 'paragraphs') {
          let paras = [];
          for (let i = 0; i < count; i++) {
            paras.push(generateSentences(Math.floor(Math.random() * 4) + 3));
          }
          result = paras.join('\n\n');
        }

        out.textContent = result;
        out.style.display = 'block';
        showToast('Lorem Ipsum generated', 'success');
      });
    }
  },

  // 26. Emoji Searcher & Picker
  {
    id: 'emoji-picker',
    name: 'Emoji Search & Picker',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    description: 'Find emojis by keywords, search tags, and copy them with one click.',
    keywords: ['emoji', 'picker', 'emoji finder', 'copy emoji', 'smileys'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Search Emojis</label>
            <input type="text" id="emojiSearch" class="input-field" placeholder="Search emoji e.g. 'fire', 'heart'...">
          </div>
          
          <div class="emoji-grid" id="emojiContainer"></div>
        </div>
      `;

      const emojis = [
        { char: '😀', tags: 'smile happy joy grin face' },
        { char: '😂', tags: 'joy laugh tears happy' },
        { char: '🤣', tags: 'rofl laugh roll face' },
        { char: '😊', tags: 'blush smile happy' },
        { char: '😍', tags: 'heart eyes love warm' },
        { char: '🔥', tags: 'fire hot lit burn' },
        { char: '👍', tags: 'thumbs up like good ok' },
        { char: '❤️', tags: 'heart love red' },
        { char: '🎉', tags: 'celebration party pop' },
        { char: '✨', tags: 'sparkles shiny clean magic' },
        { char: '💻', tags: 'laptop computer dev tech' },
        { char: '🚀', tags: 'rocket space launch fast speed' }
      ];

      const grid = $('#emojiContainer');

      function displayEmojis(filter = '') {
        grid.innerHTML = '';
        const matches = emojis.filter(e => e.tags.includes(filter.toLowerCase()));
        matches.forEach(item => {
          const cell = el('div', { className: 'emoji-item', textContent: item.char });
          cell.addEventListener('click', () => {
            copyToClipboard(item.char);
          });
          grid.appendChild(cell);
        });
      }

      $('#emojiSearch').addEventListener('input', (e) => displayEmojis(e.target.value));
      displayEmojis();
    }
  },

  // 27. List Shuffler / Randomizer
  {
    id: 'list-randomizer',
    name: 'List Shuffler / Randomizer',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
    description: 'Randomize and shuffle lines of a list or items.',
    keywords: ['shuffle', 'randomize list', 'list shuffler', 'random sort'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Input List (One item per line)</label>
            <textarea id="shuffleInput" class="textarea-field" placeholder="Item 1\nItem 2\nItem 3" style="min-height:200px;"></textarea>
          </div>
          
          <button id="shuffleBtn" class="btn btn-primary w-full">Shuffle List</button>
        </div>
      `;

      $('#shuffleBtn').addEventListener('click', () => {
        const input = $('#shuffleInput');
        const lines = input.value.split('\n').filter(Boolean);
        if (!lines.length) return;

        for (let i = lines.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lines[i], lines[j]] = [lines[j], lines[i]];
        }

        input.value = lines.join('\n');
        showToast('List items shuffled', 'success');
      });
    }
  },

  // 28. List Sorter
  {
    id: 'list-sorter',
    name: 'List Sorter',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="19" y2="12"/><line x1="12" y1="19" x2="19" y2="12"/><line x1="2" y1="12" x2="19" y2="12"/></svg>',
    description: 'Sort lists alphabetically, numerically, in reverse, or by length.',
    keywords: ['sort', 'alphabetical sort', 'list sorter', 'reverse sort'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Input List (One item per line)</label>
            <textarea id="sortInput" class="textarea-field" placeholder="Banana\nApple\nCherry" style="min-height:200px;"></textarea>
          </div>

          <div class="grid-3">
            <button id="sortAlpha" class="btn">Sort A-Z</button>
            <button id="sortAlphaRev" class="btn">Sort Z-A</button>
            <button id="sortLength" class="btn">Sort by Length</button>
          </div>
        </div>
      `;

      const input = $('#sortInput');

      $('#sortAlpha').addEventListener('click', () => {
        const lines = input.value.split('\n').filter(Boolean);
        lines.sort();
        input.value = lines.join('\n');
        showToast('List sorted A-Z', 'success');
      });

      $('#sortAlphaRev').addEventListener('click', () => {
        const lines = input.value.split('\n').filter(Boolean);
        lines.sort().reverse();
        input.value = lines.join('\n');
        showToast('List sorted Z-A', 'success');
      });

      $('#sortLength').addEventListener('click', () => {
        const lines = input.value.split('\n').filter(Boolean);
        lines.sort((a, b) => a.length - b.length);
        input.value = lines.join('\n');
        showToast('List sorted by length', 'success');
      });
    }
  },

  // 29. Find and Replace
  {
    id: 'find-replace',
    name: 'Find and Replace',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    description: 'Find sub-strings or regex patterns in text and swap them out.',
    keywords: ['replace', 'regex swap', 'find and replace', 'string swap'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Source Text</label>
            <textarea id="findReplaceInput" class="textarea-field" placeholder="Paste your text here..." style="min-height:150px;"></textarea>
          </div>
          
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Find String / Pattern</label>
              <input type="text" id="findStr" class="input-field">
            </div>
            <div class="form-group">
              <label class="form-label">Replace With</label>
              <input type="text" id="replaceStr" class="input-field">
            </div>
          </div>
          
          <button id="findReplaceBtn" class="btn btn-primary w-full">Find & Replace</button>
        </div>
      `;

      $('#findReplaceBtn').addEventListener('click', () => {
        const txt = $('#findReplaceInput');
        const find = $('#findStr').value;
        const replace = $('#replaceStr').value;
        if (!find) return;

        txt.value = txt.value.replaceAll(find, replace);
        showToast('Text updated successfully', 'success');
      });
    }
  },

  // 30. String Length Calculator
  {
    id: 'string-length',
    name: 'String Length Calculator',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="4"/><line x1="8" y1="2" x2="8" y2="4"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    description: 'Calculate absolute text string byte length and character sizes.',
    keywords: ['string length', 'bytes', 'string size', 'char check'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Text Input</label>
            <textarea id="strLenInput" class="textarea-field" placeholder="Type text to check sizes..."></textarea>
          </div>
          
          <div class="grid-2">
            <div class="result-stat">
              <span class="result-stat-label">Characters Count</span>
              <span id="strLenChars" class="result-stat-value">0</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Byte Size</span>
              <span id="strLenBytes" class="result-stat-value">0 B</span>
            </div>
          </div>
        </div>
      `;

      const input = $('#strLenInput');
      input.addEventListener('input', () => {
        const txt = input.value;
        const chars = txt.length;
        const bytes = new TextEncoder().encode(txt).length;

        $('#strLenChars').textContent = chars;
        $('#strLenBytes').textContent = `${bytes} B`;
      });
    }
  },

  // 31. Text to ASCII / Binary / Hex
  {
    id: 'text-converter-bin',
    name: 'Text to Binary / Hex / ASCII',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    description: 'Translate raw text strings into Binary, Hexadecimal, and ASCII codes, and vice-versa.',
    keywords: ['hex', 'binary', 'ascii', 'text translation', 'bytes converter'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Text String</label>
            <textarea id="convBinText" class="textarea-field" placeholder="Enter plain text..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Binary Code</label>
            <textarea id="convBinBinary" class="textarea-field" placeholder="e.g. 01000001"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Hexadecimal Code</label>
            <textarea id="convBinHex" class="textarea-field" placeholder="e.g. 41"></textarea>
          </div>
        </div>
      `;

      const txt = $('#convBinText');
      const bin = $('#convBinBinary');
      const hex = $('#convBinHex');

      txt.addEventListener('input', () => {
        const val = txt.value;
        if (!val) {
          bin.value = '';
          hex.value = '';
          return;
        }

        bin.value = val.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        hex.value = val.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
      });

      bin.addEventListener('input', () => {
        const val = bin.value.trim();
        if (!val) {
          txt.value = '';
          hex.value = '';
          return;
        }

        try {
          const codes = val.split(/\s+/);
          txt.value = codes.map(c => String.fromCharCode(parseInt(c, 2))).join('');
          hex.value = txt.value.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
        } catch {
        }
      });

      hex.addEventListener('input', () => {
        const val = hex.value.trim();
        if (!val) {
          txt.value = '';
          bin.value = '';
          return;
        }

        try {
          const codes = val.split(/\s+/);
          txt.value = codes.map(h => String.fromCharCode(parseInt(h, 16))).join('');
          bin.value = txt.value.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        } catch {
        }
      });
    }
  },

  // 32. Password Generator & Tester
  {
    id: 'password-generator',
    name: 'Password Generator & Strength Tester',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    description: 'Bulk-generate cryptographically secure random passwords and measure their strength.',
    keywords: ['password', 'secure generator', 'strength meter', 'entropy'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="password-display">
            <span id="generatedPass" style="flex:1">Click Generate</span>
            <button id="copyPassBtn" class="btn btn-sm btn-secondary">Copy</button>
          </div>

          <div class="strength-meter">
            <div id="strengthFill" class="strength-meter-fill" style="width: 0%"></div>
          </div>
          <div class="text-sm text-muted" id="strengthLabel">Strength: Poor</div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Password Length</label>
              <input type="number" id="passLength" class="input-field" value="16" min="6" max="128">
            </div>
            <div class="form-group" style="margin-top:24px;">
              <label class="checkbox-group">
                <input type="checkbox" id="passSymbols" checked> Include Symbols
              </label>
            </div>
          </div>
          
          <button id="generatePassBtn" class="btn btn-primary w-full">Generate Password</button>
        </div>
      `;

      function generate() {
        const len = parseInt($('#passLength').value) || 16;
        const sym = $('#passSymbols').checked;

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
        let pool = chars;
        if (sym) pool += symbols;

        const arr = new Uint32Array(len);
        crypto.getRandomValues(arr);
        
        let pass = '';
        for (let i = 0; i < len; i++) {
          pass += pool[arr[i] % pool.length];
        }

        $('#generatedPass').textContent = pass;
        checkStrength(pass);
      }

      function checkStrength(pass) {
        let score = 0;
        if (pass.length >= 8) score++;
        if (pass.length >= 14) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        const fill = $('#strengthFill');
        const lbl = $('#strengthLabel');

        const widths = ['20%', '40%', '60%', '80%', '100%'];
        const colors = ['var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)', 'var(--success)'];
        const labels = ['Weak', 'Fair', 'Medium', 'Strong', 'Excellent'];

        fill.style.width = widths[score - 1] || '10%';
        fill.style.backgroundColor = colors[score - 1] || 'var(--danger)';
        lbl.textContent = `Strength: ${labels[score - 1] || 'Poor'}`;
      }

      $('#generatePassBtn').addEventListener('click', generate);
      $('#copyPassBtn').addEventListener('click', () => {
        copyToClipboard($('#generatedPass').textContent);
      });
      
      generate();
    }
  },

  // 33. URL Encoder / Decoder
  {
    id: 'url-encoder',
    name: 'URL Encoder / Decoder',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    description: 'Encode or decode URL query strings client-side.',
    keywords: ['url encode', 'url decode', 'percent encoding', 'query parser'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Source URL / Text</label>
            <textarea id="urlInput" class="textarea-field" placeholder="Enter URL query string..."></textarea>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="urlEncodeBtn" class="btn btn-primary">Encode</button>
            <button id="urlDecodeBtn" class="btn btn-secondary">Decode</button>
          </div>
        </div>
      `;

      const input = $('#urlInput');
      $('#urlEncodeBtn').addEventListener('click', () => {
        input.value = encodeURIComponent(input.value);
        showToast('Encoded URL component', 'success');
      });

      $('#urlDecodeBtn').addEventListener('click', () => {
        try {
          input.value = decodeURIComponent(input.value);
          showToast('Decoded URL component', 'success');
        } catch {
          showToast('Invalid URL component sequence', 'error');
        }
      });
    }
  },

  // 34. Base64 Encoder / Decoder
  {
    id: 'base64-encoder',
    name: 'Base64 Encoder / Decoder',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
    description: 'Convert plain text strings into Base64 format and vice versa.',
    keywords: ['base64', 'encode', 'decode', 'atob', 'btoa'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Plain Text</label>
            <textarea id="base64Plain" class="textarea-field" placeholder="Type plain text..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Base64 Encoded</label>
            <textarea id="base64Encoded" class="textarea-field" placeholder="Type Base64 hash..."></textarea>
          </div>
        </div>
      `;

      const plain = $('#base64Plain');
      const b64 = $('#base64Encoded');

      plain.addEventListener('input', () => {
        try {
          b64.value = btoa(unescape(encodeURIComponent(plain.value)));
        } catch {
        }
      });

      b64.addEventListener('input', () => {
        try {
          plain.value = decodeURIComponent(escape(atob(b64.value)));
        } catch {
        }
      });
    }
  },

  // 35. HTML Beautifier & Minifier
  {
    id: 'html-beautifier',
    name: 'HTML Beautifier & Minifier',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    description: 'Format raw HTML tag structures or compact them into minified scripts.',
    keywords: ['html beautify', 'html minifier', 'html formatter', 'compress html'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">HTML Code</label>
            <textarea id="htmlCodeInput" class="textarea-field" style="min-height:200px;" placeholder="<div>\n<p>Hello</p>\n</div>"></textarea>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="beautifyHtmlBtn" class="btn btn-primary">Beautify HTML</button>
            <button id="minifyHtmlBtn" class="btn btn-secondary">Minify HTML</button>
          </div>
        </div>
      `;

      const code = $('#htmlCodeInput');

      $('#beautifyHtmlBtn').addEventListener('click', () => {
        let val = code.value.trim();
        let formatted = '';
        let reg = /(<[^>]+>)/g;
        let elements = val.replace(reg, '\n$1\n').split('\n');
        let indent = 0;
        
        elements.forEach(elStr => {
          if (!elStr.trim()) return;
          if (elStr.match(/{/)) return;
          
          if (elStr.startsWith('</')) indent--;
          formatted += '  '.repeat(Math.max(0, indent)) + elStr.trim() + '\n';
          if (elStr.startsWith('<') && !elStr.startsWith('</') && !elStr.endsWith('/>')) indent++;
        });

        code.value = formatted.trim();
        showToast('HTML formatted', 'success');
      });

      $('#minifyHtmlBtn').addEventListener('click', () => {
        code.value = code.value.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
        showToast('HTML minified', 'success');
      });
    }
  },

  // 36. CSS Beautifier & Minifier
  {
    id: 'css-beautifier',
    name: 'CSS Beautifier & Minifier',
    category: 'text',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    description: 'Prettify CSS stylesheets or compact them into minified outputs.',
    keywords: ['css beautify', 'css minifier', 'css format', 'compress css'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">CSS Stylesheet</label>
            <textarea id="cssCodeInput" class="textarea-field" style="min-height:200px;" placeholder="body { background: black; }"></textarea>
          </div>
          
          <div class="flex-row gap-sm">
            <button id="beautifyCssBtn" class="btn btn-primary">Beautify CSS</button>
            <button id="minifyCssBtn" class="btn btn-secondary">Minify CSS</button>
          </div>
        </div>
      `;

      const code = $('#cssCodeInput');

      $('#beautifyCssBtn').addEventListener('click', () => {
        let val = code.value.replace(/\s+/g, ' ').trim();
        let formatted = '';
        let indent = 0;
        
        for (let i = 0; i < val.length; i++) {
          const char = val[i];
          if (char === '{') {
            indent++;
            formatted += ' {\n' + '  '.repeat(indent);
          } else if (char === '}') {
            indent--;
            formatted = formatted.trimEnd() + '\n' + '  '.repeat(indent) + '}\n' + '  '.repeat(indent);
          } else if (char === ';') {
            formatted += ';\n' + '  '.repeat(indent);
          } else {
            formatted += char;
          }
        }
        
        code.value = formatted.replace(/\n\s*\n/g, '\n').trim();
        showToast('CSS formatted', 'success');
      });

      $('#minifyCssBtn').addEventListener('click', () => {
        code.value = code.value
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ')
          .replace(/\s*([{\}:;])\s*/g, '$1')
          .trim();
        showToast('CSS minified', 'success');
      });
    }
  }
];
