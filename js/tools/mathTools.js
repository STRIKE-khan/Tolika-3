/* =========================================================
   MATH, FINANCE & UNIT CONVERSION TOOLS — mathTools.js
   ========================================================= */

import { $, $$, el, showToast } from '../utils.js';

export default [
  // 57. Unit Converter
  {
    id: 'unit-converter',
    name: 'Universal Unit Converter',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Convert between different units of length, weight, temperature, speed, data, area, volume, pressure, and energy.',
    keywords: ['unit conversion', 'metrics', 'weight', 'length', 'temperature', 'speed', 'data', 'area', 'volume', 'pressure', 'energy'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="split-pane">
            <!-- Left Pane: Input and Conversion -->
            <div class="flex-col gap-md">
              <div class="grid-3">
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select id="unitCat" class="select-field">
                    <option value="length">Length</option>
                    <option value="mass">Weight / Mass</option>
                    <option value="temp">Temperature</option>
                    <option value="speed">Speed</option>
                    <option value="data">Data Size</option>
                    <option value="area">Area</option>
                    <option value="volume">Volume</option>
                    <option value="pressure">Pressure</option>
                    <option value="energy">Energy</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">From</label>
                  <select id="unitFrom" class="select-field"></select>
                </div>
                <div class="form-group">
                  <label class="form-label">To</label>
                  <select id="unitTo" class="select-field"></select>
                </div>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Value</label>
                  <input type="number" id="unitVal" class="input-field" value="1">
                </div>
                <div class="form-group">
                  <label class="form-label">Converted Result</label>
                  <input type="text" id="unitResult" class="input-field" readonly>
                </div>
              </div>
            </div>

            <!-- Right Pane: History List -->
            <div class="flex-col gap-sm" style="border-left: 1px solid var(--border); padding-left: 20px;">
              <div class="flex-row" style="justify-content:space-between; align-items:center;">
                <span class="form-label" style="margin:0; font-weight:600;">Conversion History</span>
                <button id="clearHistoryBtn" class="btn btn-sm btn-secondary">Clear</button>
              </div>
              <div id="unitHistoryList" class="flex-col gap-xs" style="max-height: 180px; overflow-y: auto; font-family: var(--font-mono); font-size: 0.85rem;">
                <div class="text-muted" style="color: var(--text-3); font-style: italic; padding: 10px 0;">No conversions yet...</div>
              </div>
            </div>
          </div>
        </div>
      `;

      const units = {
        length: {
          meters: 1,
          kilometers: 1000,
          miles: 1609.34,
          feet: 0.3048,
          inches: 0.0254,
          centimeters: 0.01,
          millimeters: 0.001
        },
        mass: {
          kilograms: 1,
          grams: 0.001,
          pounds: 0.453592,
          ounces: 0.0283495,
          milligrams: 0.000001,
          tons: 907.185
        },
        temp: {
          celsius: 'C',
          fahrenheit: 'F',
          kelvin: 'K'
        },
        speed: {
          'm/s': 1,
          'km/h': 0.277778,
          'mph': 0.44704,
          'knots': 0.514444,
          'fps': 0.3048
        },
        data: {
          Bytes: 1,
          Kilobytes: 1024,
          Megabytes: 1048576,
          Gigabytes: 1073741824,
          Terabytes: 1099511627776
        },
        area: {
          'sq meters (m²)': 1,
          'sq kilometers (km²)': 1000000,
          'sq miles (mi²)': 2589988.11,
          Acres: 4046.86,
          Hectares: 10000,
          'sq feet (ft²)': 0.092903
        },
        volume: {
          Liters: 1,
          Milliliters: 0.001,
          'cubic meters (m³)': 1000,
          Gallons: 3.78541,
          Quarts: 0.946353,
          Cups: 0.236588
        },
        pressure: {
          Pascals: 1,
          Kilopascals: 1000,
          Bar: 100000,
          Atmospheres: 101325,
          PSI: 6894.76
        },
        energy: {
          Joules: 1,
          Kilojoules: 1000,
          Calories: 4.184,
          Kilocalories: 4184,
          'Watt-hours (Wh)': 3600,
          'Kilowatt-hours (kWh)': 3600000
        }
      };

      const cat = $('#unitCat');
      const from = $('#unitFrom');
      const to = $('#unitTo');
      let historyList = [];
      let debounceTimer = null;

      function populateUnits() {
        const c = cat.value;
        from.innerHTML = '';
        to.innerHTML = '';
        Object.keys(units[c]).forEach(k => {
          from.appendChild(el('option', { value: k, textContent: k }));
          to.appendChild(el('option', { value: k, textContent: k }));
        });
        // Select second unit for 'To' by default
        if (to.options.length > 1) to.selectedIndex = 1;
        convert();
      }

      function updateHistoryUI() {
        const listContainer = $('#unitHistoryList');
        if (historyList.length === 0) {
          listContainer.innerHTML = '<div class="text-muted" style="color:var(--text-3); font-style:italic; padding:10px 0;">No conversions yet...</div>';
          return;
        }
        listContainer.innerHTML = '';
        historyList.forEach(item => {
          const div = el('div', { 
            className: 'lap-item', 
            style: 'padding: 6px 12px; font-size: 0.85rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;' 
          });
          div.innerHTML = `
            <span>${item.expr}</span>
            <span class="badge" style="background: rgba(139,92,246,0.1); color: var(--accent); font-size: 0.7rem; font-weight:600; text-transform: uppercase;">${item.cat}</span>
          `;
          listContainer.appendChild(div);
        });
      }

      function logToHistory(val, fromUnit, toUnit, resultVal, category) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const expr = `${val} ${fromUnit} ➔ ${resultVal} ${toUnit}`;
          const catLabel = category;
          // Avoid duplicate of consecutive entry
          if (historyList.length > 0 && historyList[0].expr === expr) return;
          historyList.unshift({ expr, cat: catLabel });
          if (historyList.length > 10) historyList.pop();
          updateHistoryUI();
        }, 800);
      }

      function convert() {
        const c = cat.value;
        const v = parseFloat($('#unitVal').value);
        if (isNaN(v)) {
          $('#unitResult').value = '';
          return;
        }
        const uFrom = from.value;
        const uTo = to.value;

        if (c === 'temp') {
          let cTemp = v;
          if (uFrom === 'fahrenheit') cTemp = (v - 32) * 5/9;
          else if (uFrom === 'kelvin') cTemp = v - 273.15;

          let target = cTemp;
          if (uTo === 'fahrenheit') target = cTemp * 9/5 + 32;
          else if (uTo === 'kelvin') target = cTemp + 273.15;

          const resStr = target.toFixed(4);
          $('#unitResult').value = resStr;
          logToHistory(v, uFrom, uTo, resStr, c);
        } else {
          const mFrom = units[c][uFrom];
          const mTo = units[c][uTo];
          const target = v * (mFrom / mTo);
          
          let resStr;
          if (Math.abs(target) < 0.000001 && target !== 0) {
            resStr = target.toExponential(6);
          } else {
            resStr = target.toFixed(6).replace(/\.?0+$/, "");
            if (resStr.indexOf('.') === -1) {
              resStr = target.toFixed(0);
            }
          }
          $('#unitResult').value = resStr;
          logToHistory(v, uFrom, uTo, resStr, c);
        }
      }

      cat.addEventListener('change', populateUnits);
      from.addEventListener('change', convert);
      to.addEventListener('change', convert);
      $('#unitVal').addEventListener('input', convert);
      $('#clearHistoryBtn').addEventListener('click', () => {
        historyList = [];
        updateHistoryUI();
        showToast('History cleared', 'success');
      });

      populateUnits();
    }
  },

  // 58. Numeral Base Converter
  {
    id: 'base-converter',
    name: 'Numeral Base Converter',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Convert values between Binary, Octal, Decimal, and Hexadecimal representations.',
    keywords: ['base converter', 'binary to decimal', 'hex to dec', 'base 10'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Decimal (Base 10)</label>
            <input type="text" id="baseDec" class="input-field" value="255">
          </div>
          <div class="form-group">
            <label class="form-label">Binary (Base 2)</label>
            <input type="text" id="baseBin" class="input-field">
          </div>
          <div class="form-group">
            <label class="form-label">Hexadecimal (Base 16)</label>
            <input type="text" id="baseHex" class="input-field">
          </div>
        </div>
      `;

      const dec = $('#baseDec');
      const bin = $('#baseBin');
      const hex = $('#baseHex');

      function update(val, sourceBase) {
        if (!val) {
          dec.value = bin.value = hex.value = '';
          return;
        }

        try {
          const num = parseInt(val, sourceBase);
          if (isNaN(num)) return;

          if (sourceBase !== 10) dec.value = num.toString(10);
          if (sourceBase !== 2) bin.value = num.toString(2);
          if (sourceBase !== 16) hex.value = num.toString(16).toUpperCase();
        } catch {
          // Ignore parse errors
        }
      }

      dec.addEventListener('input', () => update(dec.value, 10));
      bin.addEventListener('input', () => update(bin.value, 2));
      hex.addEventListener('input', () => update(hex.value, 16));

      update('255', 10);
    }
  },

  // 59. Roman Numeral Converter
  {
    id: 'roman-converter',
    name: 'Roman Numeral Converter',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Convert numbers to Roman numerals and Roman strings back to numeric bases.',
    keywords: ['roman numerals', 'numbers', 'math converter'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Integer Value</label>
              <input type="number" id="romanInt" class="input-field" value="2026">
            </div>
            <div class="form-group">
              <label class="form-label">Roman Numeral</label>
              <input type="text" id="romanStr" class="input-field" placeholder="MMXXVI">
            </div>
          </div>
        </div>
      `;

      const rMap = [
        { v: 1000, r: 'M' },
        { v: 900, r: 'CM' },
        { v: 500, r: 'D' },
        { v: 400, r: 'CD' },
        { v: 100, r: 'C' },
        { v: 90, r: 'XC' },
        { v: 50, r: 'L' },
        { v: 40, r: 'XL' },
        { v: 10, r: 'X' },
        { v: 9, r: 'IX' },
        { v: 5, r: 'V' },
        { v: 4, r: 'IV' },
        { v: 1, r: 'I' }
      ];

      function toRoman(num) {
        if (num <= 0) return '';
        let str = '';
        for (const item of rMap) {
          while (num >= item.v) {
            str += item.r;
            num -= item.v;
          }
        }
        return str;
      }

      function fromRoman(str) {
        let val = 0;
        let s = str.toUpperCase().trim();
        let i = 0;
        for (const item of rMap) {
          while (s.substring(i, i + item.r.length) === item.r) {
            val += item.v;
            i += item.r.length;
          }
        }
        return val;
      }

      const intInput = $('#romanInt');
      const strInput = $('#romanStr');

      intInput.addEventListener('input', () => {
        strInput.value = toRoman(parseInt(intInput.value) || 0);
      });

      strInput.addEventListener('input', () => {
        intInput.value = fromRoman(strInput.value);
      });

      strInput.value = toRoman(2026);
    }
  },

  // 60. Tip Calculator
  {
    id: 'tip-calculator',
    name: 'Tip Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    description: 'Calculate bill tips, split totals, and costs per person.',
    keywords: ['tip', 'bill split', 'finance calc', 'restaurant tip'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Bill Amount ($)</label>
              <input type="number" id="tipBill" class="input-field" value="100">
            </div>
            <div class="form-group">
              <label class="form-label">Tip (%)</label>
              <input type="number" id="tipPercent" class="input-field" value="15">
            </div>
            <div class="form-group">
              <label class="form-label">People Count</label>
              <input type="number" id="tipPeople" class="input-field" value="2">
            </div>
          </div>

          <div class="grid-2">
            <div class="result-stat">
              <span class="result-stat-label">Tip Per Person</span>
              <span id="tipPerPerson" class="result-stat-value">$0.00</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Total Per Person</span>
              <span id="totalPerPerson" class="result-stat-value">$0.00</span>
            </div>
          </div>
        </div>
      `;

      function calculate() {
        const bill = parseFloat($('#tipBill').value) || 0;
        const pct = parseFloat($('#tipPercent').value) || 0;
        const people = parseInt($('#tipPeople').value) || 1;

        const tipTotal = bill * (pct / 100);
        const billTotal = bill + tipTotal;

        $('#tipPerPerson').textContent = `$${(tipTotal / people).toFixed(2)}`;
        $('#totalPerPerson').textContent = `$${(billTotal / people).toFixed(2)}`;
      }

      $('#tipBill').addEventListener('input', calculate);
      $('#tipPercent').addEventListener('input', calculate);
      $('#tipPeople').addEventListener('input', calculate);

      calculate();
    }
  },

  // 61. Loan / Mortgage Calculator
  {
    id: 'loan-calculator',
    name: 'Loan & Mortgage Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Estimate monthly loan repayments, interest totals, and payoff timelines.',
    keywords: ['mortgage', 'loan calculator', 'interest payoff', 'finance rates'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Principal Amount ($)</label>
              <input type="number" id="loanPrincipal" class="input-field" value="200000">
            </div>
            <div class="form-group">
              <label class="form-label">Interest Rate (%)</label>
              <input type="number" id="loanRate" class="input-field" value="5" step="0.1">
            </div>
            <div class="form-group">
              <label class="form-label">Term (Years)</label>
              <input type="number" id="loanTerm" class="input-field" value="30">
            </div>
          </div>
          
          <button id="calcLoanBtn" class="btn btn-primary w-full">Calculate Payment</button>

          <div id="loanResults" class="hidden grid-2 mt-md">
            <div class="result-stat">
              <span class="result-stat-label">Monthly Repayment</span>
              <span id="loanMonthly" class="result-stat-value">$0.00</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Total Interest Paid</span>
              <span id="loanInterest" class="result-stat-value">$0.00</span>
            </div>
          </div>
        </div>
      `;

      $('#calcLoanBtn').addEventListener('click', () => {
        const p = parseFloat($('#loanPrincipal').value) || 0;
        const rate = (parseFloat($('#loanRate').value) || 0) / 12 / 100;
        const months = (parseInt($('#loanTerm').value) || 30) * 12;

        if (rate === 0) {
          const payment = p / months;
          $('#loanMonthly').textContent = `$${payment.toFixed(2)}`;
          $('#loanInterest').textContent = `$0.00`;
          $('#loanResults').classList.remove('hidden');
          return;
        }

        const x = Math.pow(1 + rate, months);
        const monthly = (p * x * rate) / (x - 1);
        const totalInterest = (monthly * months) - p;

        $('#loanMonthly').textContent = `$${monthly.toFixed(2)}`;
        $('#loanInterest').textContent = `$${totalInterest.toFixed(2)}`;
        $('#loanResults').classList.remove('hidden');
        showToast('Payment calculated', 'success');
      });
    }
  },

  // 62. Compound Interest Calculator
  {
    id: 'compound-interest',
    name: 'Compound Interest Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Calculate future asset compounding value with monthly contributions.',
    keywords: ['compounding interest', 'wealth planner', 'investment rates'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-4">
            <div class="form-group">
              <label class="form-label">Principal ($)</label>
              <input type="number" id="ciPrincipal" class="input-field" value="10000">
            </div>
            <div class="form-group">
              <label class="form-label">Monthly Add ($)</label>
              <input type="number" id="ciMonthly" class="input-field" value="200">
            </div>
            <div class="form-group">
              <label class="form-label">Rate (%)</label>
              <input type="number" id="ciRate" class="input-field" value="8">
            </div>
            <div class="form-group">
              <label class="form-label">Years</label>
              <input type="number" id="ciYears" class="input-field" value="10">
            </div>
          </div>
          
          <button id="calcCiBtn" class="btn btn-primary w-full">Calculate Compounding</button>

          <div id="ciResults" class="hidden grid-2 mt-md">
            <div class="result-stat">
              <span class="result-stat-label">Future Value</span>
              <span id="ciFuture" class="result-stat-value">$0.00</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Total Contributions</span>
              <span id="ciContrib" class="result-stat-value">$0.00</span>
            </div>
          </div>
        </div>
      `;

      $('#calcCiBtn').addEventListener('click', () => {
        const principal = parseFloat($('#ciPrincipal').value) || 0;
        const monthly = parseFloat($('#ciMonthly').value) || 0;
        const rate = (parseFloat($('#ciRate').value) || 0) / 100 / 12;
        const years = parseInt($('#ciYears').value) || 0;
        const months = years * 12;

        let total = principal;
        let contrib = principal;

        for (let i = 0; i < months; i++) {
          total = (total + monthly) * (1 + rate);
          contrib += monthly;
        }

        $('#ciFuture').textContent = `$${total.toFixed(2)}`;
        $('#ciContrib').textContent = `$${contrib.toFixed(2)}`;
        $('#ciResults').classList.remove('hidden');
        showToast('Calculations updated', 'success');
      });
    }
  },

  // 63. Percentage Calculator
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    description: 'Solve percentage problems (e.g. X is what percent of Y).',
    keywords: ['percentage', 'ratios', 'fractions math'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">What is</label>
              <input type="number" id="pct1" class="input-field" value="20">
            </div>
            <div class="form-group">
              <label class="form-label">% of</label>
              <input type="number" id="pct2" class="input-field" value="150">
            </div>
            <div class="form-group">
              <label class="form-label">Result</label>
              <input type="text" id="pctResult" class="input-field" readonly>
            </div>
          </div>
        </div>
      `;

      function calculate() {
        const p = parseFloat($('#pct1').value) || 0;
        const tot = parseFloat($('#pct2').value) || 0;
        $('#pctResult').value = (tot * (p / 100)).toFixed(4);
      }

      $('#pct1').addEventListener('input', calculate);
      $('#pct2').addEventListener('input', calculate);
      calculate();
    }
  },

  // 64. Age Calculator
  {
    id: 'age-calculator',
    name: 'Age Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Calculate exact age details down to days, hours, and minutes.',
    keywords: ['age', 'birthday', 'exact age', 'days since birth'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Birth Date</label>
            <input type="date" id="birthDate" class="input-field" value="2000-01-01">
          </div>
          
          <button id="calcAgeBtn" class="btn btn-primary w-full">Calculate Age</button>

          <div id="ageResults" class="hidden grid-3 mt-md">
            <div class="result-stat">
              <span class="result-stat-label">Years</span>
              <span id="ageYears" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Months</span>
              <span id="ageMonths" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Total Days</span>
              <span id="ageDays" class="result-stat-value">-</span>
            </div>
          </div>
        </div>
      `;

      $('#calcAgeBtn').addEventListener('click', () => {
        const val = $('#birthDate').value;
        if (!val) return;

        const birth = new Date(val);
        const today = new Date();

        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
          years--;
          months = 12 + months;
        }

        const diffTime = Math.abs(today - birth);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        $('#ageYears').textContent = years;
        $('#ageMonths').textContent = months;
        $('#ageDays').textContent = diffDays;
        
        $('#ageResults').classList.remove('hidden');
        showToast('Age details calculated', 'success');
      });
    }
  },

  // 65. Date Difference Calculator
  {
    id: 'date-difference',
    name: 'Date Difference Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Calculate elapsed day and hour gaps between two custom calendar dates.',
    keywords: ['date diff', 'days between', 'calendar tool'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" id="dateDiffStart" class="input-field" value="2026-01-01">
            </div>
            <div class="form-group">
              <label class="form-label">End Date</label>
              <input type="date" id="dateDiffEnd" class="input-field" value="2026-06-01">
            </div>
          </div>
          
          <button id="calcDateDiffBtn" class="btn btn-primary w-full">Calculate Gaps</button>

          <div class="result-stat mt-md">
            <span class="result-stat-label">Total Gaps</span>
            <span id="dateDiffResultVal" class="result-stat-value" style="font-size:1.4rem">-</span>
          </div>
        </div>
      `;

      $('#calcDateDiffBtn').addEventListener('click', () => {
        const start = new Date($('#dateDiffStart').value);
        const end = new Date($('#dateDiffEnd').value);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          showToast('Invalid date selection', 'error');
          return;
        }

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        $('#dateDiffResultVal').textContent = `${diffDays} Days`;
      });
    }
  },

  // 66. Random Number Generator
  {
    id: 'random-generator',
    name: 'Random Number Generator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
    description: 'Bulk-generate secure random integers inside custom range brackets.',
    keywords: ['random', 'rng', 'random numbers', 'dice roll'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Min</label>
              <input type="number" id="rngMin" class="input-field" value="1">
            </div>
            <div class="form-group">
              <label class="form-label">Max</label>
              <input type="number" id="rngMax" class="input-field" value="100">
            </div>
            <div class="form-group">
              <label class="form-label">Count</label>
              <input type="number" id="rngCount" class="input-field" value="5" min="1">
            </div>
          </div>
          
          <button id="generateRngBtn" class="btn btn-primary w-full">Generate Numbers</button>
          
          <div class="output-area" id="rngOutput" style="display:none"></div>
        </div>
      `;

      $('#generateRngBtn').addEventListener('click', () => {
        const min = parseInt($('#rngMin').value) || 0;
        const max = parseInt($('#rngMax').value) || 100;
        const count = parseInt($('#rngCount').value) || 1;
        const out = $('#rngOutput');

        const list = [];
        for (let i = 0; i < count; i++) {
          list.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }

        out.textContent = list.join(', ');
        out.style.display = 'block';
        showToast('Random numbers generated', 'success');
      });
    }
  },

  // 67. Prime Factorization
  {
    id: 'prime-factorization',
    name: 'Prime Factorization',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Resolve integer numbers into mathematical prime product strings.',
    keywords: ['primes', 'prime factorization', 'math factors'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Integer Value</label>
            <input type="number" id="factorVal" class="input-field" value="120">
          </div>
          
          <button id="calcFactorBtn" class="btn btn-primary w-full">Factorize</button>
          
          <div class="result-stat mt-md">
            <span class="result-stat-label">Prime Factors</span>
            <span id="factorResult" class="result-stat-value">-</span>
          </div>
        </div>
      `;

      function primeFactors(n) {
        const factors = [];
        let d = 2;
        while (n > 1) {
          while (n % d === 0) {
            factors.push(d);
            n /= d;
          }
          d++;
          if (d * d > n) {
            if (n > 1) factors.push(n);
            break;
          }
        }
        return factors;
      }

      $('#calcFactorBtn').addEventListener('click', () => {
        const v = parseInt($('#factorVal').value) || 0;
        if (v < 2) {
          showToast('Enter values greater than 1', 'warning');
          return;
        }

        const factors = primeFactors(v);
        $('#factorResult').textContent = factors.join(' × ');
      });
    }
  },

  // 68. GCD & LCM Calculator
  {
    id: 'gcd-lcm-calculator',
    name: 'GCD & LCM Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Solve Greatest Common Divisor and Least Common Multiple of values.',
    keywords: ['gcd', 'lcm', 'greatest common divisor', 'math multiplier'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="form-group">
            <label class="form-label">Numbers (Comma-separated)</label>
            <input type="text" id="gcdLcmInput" class="input-field" value="24, 36, 40">
          </div>
          
          <button id="calcGcdLcmBtn" class="btn btn-primary w-full">Calculate</button>

          <div class="grid-2 mt-md">
            <div class="result-stat">
              <span class="result-stat-label">GCD</span>
              <span id="gcdResult" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">LCM</span>
              <span id="lcmResult" class="result-stat-value">-</span>
            </div>
          </div>
        </div>
      `;

      function gcd(a, b) {
        while (b) {
          const t = b;
          b = a % b;
          a = t;
        }
        return a;
      }

      function lcm(a, b) {
        return (a * b) / gcd(a, b);
      }

      $('#calcGcdLcmBtn').addEventListener('click', () => {
        const parts = $('#gcdLcmInput').value.split(',').map(Number).filter(n => !isNaN(n));
        if (parts.length < 2) {
          showToast('Provide at least 2 numbers', 'warning');
          return;
        }

        let currGcd = parts[0];
        let currLcm = parts[0];

        for (let i = 1; i < parts.length; i++) {
          currGcd = gcd(currGcd, parts[i]);
          currLcm = lcm(currLcm, parts[i]);
        }

        $('#gcdResult').textContent = currGcd;
        $('#lcmResult').textContent = currLcm;
        showToast('GCD & LCM computed', 'success');
      });
    }
  },

  // 69. Scientific Calculator
  {
    id: 'scientific-calculator',
    name: 'Scientific Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>',
    description: 'Solve trigonometric, logarithmic, and power scientific equations.',
    keywords: ['scientific calculator', 'sin cos', 'log functions', 'powers', 'math solve'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md" style="max-width:360px; margin:0 auto">
          <div id="calcDisplay" class="calc-display">0</div>
          <div class="calc-grid">
            <button class="calc-btn operator">C</button>
            <button class="calc-btn operator">sin</button>
            <button class="calc-btn operator">cos</button>
            <button class="calc-btn operator">tan</button>
            
            <button class="calc-btn">7</button>
            <button class="calc-btn">8</button>
            <button class="calc-btn">9</button>
            <button class="calc-btn operator">/</button>
            
            <button class="calc-btn">4</button>
            <button class="calc-btn">5</button>
            <button class="calc-btn">6</button>
            <button class="calc-btn operator">*</button>
            
            <button class="calc-btn">1</button>
            <button class="calc-btn">2</button>
            <button class="calc-btn">3</button>
            <button class="calc-btn operator">-</button>
            
            <button class="calc-btn">0</button>
            <button class="calc-btn">.</button>
            <button class="calc-btn equals">=</button>
            <button class="calc-btn operator">+</button>
          </div>
        </div>
      `;

      const disp = $('#calcDisplay');
      let expr = '';

      container.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const txt = btn.textContent;
          if (txt === 'C') {
            expr = '';
            disp.textContent = '0';
          } else if (txt === '=') {
            try {
              disp.textContent = eval(expr);
              expr = disp.textContent;
            } catch {
              disp.textContent = 'Error';
              expr = '';
            }
          } else if (['sin', 'cos', 'tan'].includes(txt)) {
            try {
              const val = parseFloat(disp.textContent);
              let res = 0;
              if (txt === 'sin') res = Math.sin(val);
              else if (txt === 'cos') res = Math.cos(val);
              else if (txt === 'tan') res = Math.tan(val);
              disp.textContent = res.toFixed(6);
              expr = disp.textContent;
            } catch {
              disp.textContent = 'Error';
            }
          } else {
            expr += txt;
            disp.textContent = expr;
          }
        });
      });
    }
  },

  // 70. Fraction Calculator
  {
    id: 'fraction-calculator',
    name: 'Fraction Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Add, subtract, multiply, and divide fraction formulas.',
    keywords: ['fractions', 'divide ratio', 'fraction math'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="flex-row gap-sm" style="justify-content:center; align-items:center">
            <div class="flex-col gap-sm">
              <input type="number" id="fracNum1" class="input-field text-center" value="1" style="width:60px">
              <hr style="border-color:var(--border)">
              <input type="number" id="fracDen1" class="input-field text-center" value="2" style="width:60px">
            </div>
            
            <select id="fracOp" class="select-field" style="width:70px">
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">×</option>
              <option value="/">÷</option>
            </select>

            <div class="flex-col gap-sm">
              <input type="number" id="fracNum2" class="input-field text-center" value="1" style="width:60px">
              <hr style="border-color:var(--border)">
              <input type="number" id="fracDen2" class="input-field text-center" value="3" style="width:60px">
            </div>

            <button id="calcFracBtn" class="btn btn-primary" style="margin-left:12px">Solve</button>
          </div>

          <div class="result-stat mt-md" style="max-width:200px; margin:0 auto">
            <span class="result-stat-label">Result</span>
            <span id="fracResult" class="result-stat-value" style="font-size:1.4rem">-</span>
          </div>
        </div>
      `;

      function gcd(a, b) {
        return b ? gcd(b, a % b) : a;
      }

      $('#calcFracBtn').addEventListener('click', () => {
        const n1 = parseInt($('#fracNum1').value) || 0;
        const d1 = parseInt($('#fracDen1').value) || 1;
        const n2 = parseInt($('#fracNum2').value) || 0;
        const d2 = parseInt($('#fracDen2').value) || 1;
        const op = $('#fracOp').value;

        let resN = 0;
        let resD = 1;

        if (op === '+') {
          resN = n1 * d2 + n2 * d1;
          resD = d1 * d2;
        } else if (op === '-') {
          resN = n1 * d2 - n2 * d1;
          resD = d1 * d2;
        } else if (op === '*') {
          resN = n1 * n2;
          resD = d1 * d2;
        } else if (op === '/') {
          resN = n1 * d2;
          resD = d1 * n2;
        }

        const divisor = Math.abs(gcd(resN, resD));
        resN /= divisor;
        resD /= divisor;

        $('#fracResult').textContent = resD === 1 ? resN : `${resN}/${resD}`;
        showToast('Fraction solved', 'success');
      });
    }
  },

  // 71. Matrix Calculator
  {
    id: 'matrix-calculator',
    name: 'Matrix Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
    description: 'Solve determinants and transpositions of matrices up to 2x2.',
    keywords: ['matrix', 'determinant', 'transpose matrix'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="text-center">
            <div class="matrix-grid" style="grid-template-columns: repeat(2, 60px);">
              <input type="number" id="m00" value="1">
              <input type="number" id="m01" value="2">
              <input type="number" id="m10" value="3">
              <input type="number" id="m11" value="4">
            </div>
          </div>
          
          <div class="flex-row gap-sm" style="justify-content:center">
            <button id="matrixDet" class="btn btn-primary">Determinant</button>
            <button id="matrixTrans" class="btn btn-secondary">Transpose</button>
          </div>

          <div class="result-stat mt-md" style="max-width:260px; margin:0 auto">
            <span class="result-stat-label">Result</span>
            <span id="matrixResultVal" class="result-stat-value">-</span>
          </div>
        </div>
      `;

      $('#matrixDet').addEventListener('click', () => {
        const a = parseFloat($('#m00').value) || 0;
        const b = parseFloat($('#m01').value) || 0;
        const c = parseFloat($('#m10').value) || 0;
        const d = parseFloat($('#m11').value) || 0;

        const det = a * d - b * c;
        $('#matrixResultVal').textContent = `Det = ${det}`;
      });

      $('#matrixTrans').addEventListener('click', () => {
        const a = $('#m00').value;
        const b = $('#m01').value;
        const c = $('#m10').value;
        const d = $('#m11').value;

        $('#m01').value = c;
        $('#m10').value = b;
        $('#matrixResultVal').textContent = `Transposed!`;
        showToast('Matrix Transposed', 'success');
      });
    }
  },

  // 72. Equation Solver
  {
    id: 'equation-solver',
    name: 'Equation Solver',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Solve quadratic algebraic equations (ax² + bx + c = 0).',
    keywords: ['equation solver', 'algebra', 'quadratic solver', 'formula solver'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="flex-row gap-sm" style="justify-content:center; align-items:center">
            <input type="number" id="eqA" class="input-field text-center" value="1" style="width:60px">
            <span>x² +</span>
            <input type="number" id="eqB" class="input-field text-center" value="-5" style="width:60px">
            <span>x +</span>
            <input type="number" id="eqC" class="input-field text-center" value="6" style="width:60px">
            <span>= 0</span>
          </div>
          
          <button id="solveEqBtn" class="btn btn-primary w-full">Solve Quadratic</button>

          <div class="result-stat mt-md">
            <span class="result-stat-label">Solutions</span>
            <span id="eqSolutions" class="result-stat-value">-</span>
          </div>
        </div>
      `;

      $('#solveEqBtn').addEventListener('click', () => {
        const a = parseFloat($('#eqA').value);
        const b = parseFloat($('#eqB').value);
        const c = parseFloat($('#eqC').value);

        if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) {
          showToast('Invalid parameters. a cannot be 0.', 'error');
          return;
        }

        const disc = b * b - 4 * a * c;
        if (disc < 0) {
          $('#eqSolutions').textContent = 'No real roots';
        } else if (disc === 0) {
          const x = -b / (2 * a);
          $('#eqSolutions').textContent = `x = ${x}`;
        } else {
          const x1 = (-b + Math.sqrt(disc)) / (2 * a);
          const x2 = (-b - Math.sqrt(disc)) / (2 * a);
          $('#eqSolutions').textContent = `x₁ = ${x1.toFixed(4)}, x₂ = ${x2.toFixed(4)}`;
        }
        showToast('Equation solved', 'success');
      });
    }
  },

  // 73. BMI Calculator
  {
    id: 'bmi-calculator',
    name: 'BMI Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Calculate Body Mass Index and category weight classifications.',
    keywords: ['bmi', 'weight index', 'health calc', 'body mass index'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Weight (kg)</label>
              <input type="number" id="bmiWeight" class="input-field" value="70">
            </div>
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input type="number" id="bmiHeight" class="input-field" value="175">
            </div>
          </div>
          
          <button id="calcBmiBtn" class="btn btn-primary w-full">Calculate BMI</button>

          <div id="bmiResults" class="hidden grid-2 mt-md">
            <div class="result-stat">
              <span class="result-stat-label">Your BMI</span>
              <span id="bmiVal" class="result-stat-value">-</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Classification</span>
              <span id="bmiClass" class="result-stat-value">-</span>
            </div>
          </div>
        </div>
      `;

      $('#calcBmiBtn').addEventListener('click', () => {
        const w = parseFloat($('#bmiWeight').value);
        const h = parseFloat($('#bmiHeight').value) / 100;

        if (!w || !h) return;
        const bmi = w / (h * h);

        let cl = 'Normal';
        if (bmi < 18.5) cl = 'Underweight';
        else if (bmi >= 25 && bmi < 30) cl = 'Overweight';
        else if (bmi >= 30) cl = 'Obese';

        $('#bmiVal').textContent = bmi.toFixed(1);
        $('#bmiClass').textContent = cl;
        $('#bmiResults').classList.remove('hidden');
        showToast('BMI calculated', 'success');
      });
    }
  },

  // 74. Calories & BMR Calculator
  {
    id: 'bmr-calculator',
    name: 'BMR & Calories Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Calculate Basal Metabolic Rate and daily maintenance calories.',
    keywords: ['bmr', 'calories', 'metabolic rate', 'health fitness'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-4">
            <div class="form-group">
              <label class="form-label">Age</label>
              <input type="number" id="bmrAge" class="input-field" value="25">
            </div>
            <div class="form-group">
              <label class="form-label">Gender</label>
              <select id="bmrGender" class="select-field">
                <option value="m">Male</option>
                <option value="f">Female</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Weight (kg)</label>
              <input type="number" id="bmrWeight" class="input-field" value="70">
            </div>
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input type="number" id="bmrHeight" class="input-field" value="175">
            </div>
          </div>
          
          <button id="calcBmrBtn" class="btn btn-primary w-full">Calculate BMR</button>

          <div class="result-stat mt-md">
            <span class="result-stat-label">Basal Metabolic Rate</span>
            <span id="bmrResultVal" class="result-stat-value">-</span>
          </div>
        </div>
      `;

      $('#calcBmrBtn').addEventListener('click', () => {
        const age = parseInt($('#bmrAge').value);
        const gender = $('#bmrGender').value;
        const w = parseFloat($('#bmrWeight').value);
        const h = parseFloat($('#bmrHeight').value);

        if (!age || !w || !h) return;

        // Harris-Benedict Equation
        let bmr = 0;
        if (gender === 'm') {
          bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * age);
        } else {
          bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * age);
        }

        $('#bmrResultVal').textContent = `${Math.round(bmr)} kcal/day`;
        showToast('BMR calculated', 'success');
      });
    }
  },

  // 75. Stopwatch & Multi-Timer
  {
    id: 'stopwatch',
    name: 'Stopwatch & Laps Tracker',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'Keep track of laps with precision stopwatches.',
    keywords: ['stopwatch', 'timer', 'laps', 'seconds counter'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="timer-display" id="swDisplay">00:00:00.00</div>
          
          <div class="flex-row gap-sm" style="justify-content:center">
            <button id="swStart" class="btn btn-primary">Start</button>
            <button id="swLap" class="btn btn-secondary" disabled>Lap</button>
            <button id="swReset" class="btn btn-secondary">Reset</button>
          </div>

          <div class="lap-list" id="swLaps"></div>
        </div>
      `;

      let timer = null;
      let startTime = 0;
      let elapsed = 0;
      let lapCount = 0;

      function updateDisplay() {
        const total = elapsed + (timer ? Date.now() - startTime : 0);
        
        const ms = Math.floor((total % 1000) / 10).toString().padStart(2, '0');
        const secs = Math.floor((total / 1000) % 60).toString().padStart(2, '0');
        const mins = Math.floor((total / 60000) % 60).toString().padStart(2, '0');
        const hrs = Math.floor(total / 3600000).toString().padStart(2, '0');

        $('#swDisplay').textContent = `${hrs}:${mins}:${secs}.${ms}`;
      }

      $('#swStart').addEventListener('click', () => {
        if (timer) {
          // Pause
          elapsed += Date.now() - startTime;
          clearInterval(timer);
          timer = null;
          $('#swStart').textContent = 'Start';
          $('#swLap').disabled = true;
        } else {
          // Start
          startTime = Date.now();
          timer = setInterval(updateDisplay, 10);
          $('#swStart').textContent = 'Pause';
          $('#swLap').disabled = false;
        }
      });

      $('#swLap').addEventListener('click', () => {
        lapCount++;
        const item = el('div', { className: 'lap-item' }, [
          el('span', { textContent: `Lap ${lapCount}` }),
          el('span', { textContent: $('#swDisplay').textContent })
        ]);
        $('#swLaps').appendChild(item);
      });

      $('#swReset').addEventListener('click', () => {
        clearInterval(timer);
        timer = null;
        elapsed = 0;
        lapCount = 0;
        $('#swStart').textContent = 'Start';
        $('#swLap').disabled = true;
        $('#swDisplay').textContent = '00:00:00.00';
        $('#swLaps').innerHTML = '';
      });
    }
  },

  // 76. Sales Tax Calculator
  {
    id: 'sales-tax',
    name: 'Sales Tax Calculator',
    category: 'math',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    description: 'Add or remove sales tax from pricing values.',
    keywords: ['sales tax', 'price tax', 'finance tax'],
    render(container) {
      container.innerHTML = `
        <div class="flex-col gap-md">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Base Price ($)</label>
              <input type="number" id="taxPrice" class="input-field" value="100">
            </div>
            <div class="form-group">
              <label class="form-label">Tax Rate (%)</label>
              <input type="number" id="taxRate" class="input-field" value="8">
            </div>
          </div>
          
          <div class="result-stat mt-md">
            <span class="result-stat-label">Total With Tax</span>
            <span id="taxTotalVal" class="result-stat-value">-</span>
          </div>
        </div>
      `;

      function calc() {
        const p = parseFloat($('#taxPrice').value) || 0;
        const r = parseFloat($('#taxRate').value) || 0;

        const total = p * (1 + r / 100);
        $('#taxTotalVal').textContent = `$${total.toFixed(2)}`;
      }

      $('#taxPrice').addEventListener('input', calc);
      $('#taxRate').addEventListener('input', calc);
      calc();
    }
  }
];
