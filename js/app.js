// Garment Cost BD \u2014 UI. All text via I18N; all maths via GarmentLogic.
(function () {
  'use strict';
  var L = window.GarmentLogic;
  var I18N = window.GarmentI18N.I18N;
  var PRESETS = window.GarmentPresets.PRESETS;
  var DEFAULT_TRIMS = window.GarmentPresets.DEFAULT_TRIMS;

  var LS_LANG = 'gcb_lang_v1';
  var LS_SHEETS = 'gcb_sheets_v1';
  var LS_STATE = 'gcb_state_v1';

  var lang = localStorage.getItem(LS_LANG) || 'en';
  var trims = [];
  var state = null;

  function t(key) { return I18N[lang][key] || I18N.en[key] || key; }
  function $(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat($(id).value); return Number.isFinite(v) ? v : NaN; }
  function setText(id, s) { $(id).textContent = s; }
  function money(n) { return t('taka') + L.fmtMoney(n, lang); }
  function numFmt(n, d) { return L.fmtNum(n, lang, d === undefined ? 2 : d); }

  function defaultState() {
    return {
      preset: 'tshirt', bodyLen: 70, sleeveLen: 22, chest: 52,
      fabricWidth: 150, gsm: 180, wastage: 5,
      priceMode: 'metre', priceValue: 220,
      cm: 45, washing: 12, printEmb: 8, freight: 5,
      overheadPct: 5, profitPct: 10, qty: 5000,
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_STATE);
      if (raw) { var s = JSON.parse(raw); if (s && typeof s === 'object') return Object.assign(defaultState(), s); }
    } catch (e) { /* corrupted state: fall through to defaults */ }
    return defaultState();
  }

  function saveState() {
    try { localStorage.setItem(LS_STATE, JSON.stringify(collectInputs())); } catch (e) { /* storage full/blocked */ }
  }

  function collectInputs() {
    return {
      preset: $('preset').value,
      bodyLen: num('bodyLen'), sleeveLen: num('sleeveLen'), chest: num('chest'),
      fabricWidth: num('fabricWidth'), gsm: num('gsm'), wastage: num('wastage'),
      priceMode: $('priceMode').value, priceValue: num('priceValue'),
      cm: num('cm'), washing: num('washing'), printEmb: num('printEmb'), freight: num('freight'),
      overheadPct: num('overheadPct'), profitPct: num('profitPct'), qty: num('qty'),
    };
  }

  function applyStateToForm(s) {
    $('preset').value = s.preset;
    $('bodyLen').value = s.bodyLen; $('sleeveLen').value = s.sleeveLen; $('chest').value = s.chest;
    $('fabricWidth').value = s.fabricWidth; $('gsm').value = s.gsm; $('wastage').value = s.wastage;
    $('priceMode').value = s.priceMode; $('priceValue').value = s.priceValue;
    $('cm').value = s.cm; $('washing').value = s.washing; $('printEmb').value = s.printEmb;
    $('freight').value = s.freight; $('overheadPct').value = s.overheadPct; $('profitPct').value = s.profitPct;
    $('qty').value = s.qty;
  }

  function applyPreset(id) {
    var p = null;
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) p = PRESETS[i];
    if (!p) return;
    $('bodyLen').value = p.bodyLen; $('sleeveLen').value = p.sleeveLen; $('chest').value = p.chest;
    $('fabricWidth').value = p.fabricWidth; $('gsm').value = p.gsm;
    $('priceMode').value = p.priceMode; $('priceValue').value = p.priceValue;
    recalc();
  }

  function renderTrims() {
    var tb = $('trimsBody');
    tb.innerHTML = '';
    trims.forEach(function (tr, i) {
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      var nameInput = document.createElement('input');
      nameInput.type = 'text'; nameInput.value = tr.name; nameInput.setAttribute('aria-label', t('trimName'));
      nameInput.addEventListener('input', function () { tr.name = nameInput.value; recalc(); });
      nameCell.appendChild(nameInput);
      var qtyCell = document.createElement('td');
      var qtyInput = document.createElement('input');
      qtyInput.type = 'number'; qtyInput.min = '0'; qtyInput.step = '1'; qtyInput.value = tr.qty;
      qtyInput.setAttribute('aria-label', t('trimQty'));
      qtyInput.addEventListener('input', function () { tr.qty = parseFloat(qtyInput.value) || 0; recalc(); });
      qtyCell.appendChild(qtyInput);
      var priceCell = document.createElement('td');
      var priceInput = document.createElement('input');
      priceInput.type = 'number'; priceInput.min = '0'; priceInput.step = '0.01'; priceInput.value = tr.unitPrice;
      priceInput.setAttribute('aria-label', t('trimPrice'));
      priceInput.addEventListener('input', function () { tr.unitPrice = parseFloat(priceInput.value) || 0; recalc(); });
      priceCell.appendChild(priceInput);
      var delCell = document.createElement('td');
      var delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'mini danger'; delBtn.textContent = '\u00d7';
      delBtn.setAttribute('aria-label', t('del'));
      delBtn.addEventListener('click', function () { trims.splice(i, 1); renderTrims(); recalc(); });
      delCell.appendChild(delBtn);
      row.appendChild(nameCell); row.appendChild(qtyCell); row.appendChild(priceCell); row.appendChild(delCell);
      tb.appendChild(row);
    });
  }

  function markInvalid(id, bad) {
    var el = $(id);
    if (el) el.classList.toggle('invalid', !!bad);
  }

  function recalc() {
    var inp = collectInputs();
    var cErrs = L.validateConsumption(inp);
    var bad = {};
    cErrs.forEach(function (k) { bad[k] = true; });
    ['bodyLen', 'sleeveLen', 'chest', 'fabricWidth', 'gsm', 'wastage'].forEach(function (k) { markInvalid(k, bad[k]); });
    var priceBad = !L.isNum(inp.priceValue) || inp.priceValue < 0;
    markInvalid('priceValue', priceBad);
    markInvalid('qty', !L.validateQty(inp.qty));

    var cons = null, fabricCost = 0;
    if (!cErrs.length) {
      cons = L.calcConsumption(inp);
      setText('outLengthReq', numFmt(cons.lengthReq, 1) + ' cm');
      setText('outWidthReq', numFmt(cons.widthReq, 1) + ' cm');
      setText('outConsumption', numFmt(cons.consumptionM, 3) + ' ' + t('metres'));
      setText('outConsumptionW', numFmt(cons.consumptionWastageM, 3) + ' ' + t('metres'));
      setText('outWeight', numFmt(cons.weightG, 1) + ' ' + t('grams'));
      if (!priceBad) {
        fabricCost = L.calcFabricCost(cons, inp.priceMode, inp.priceValue, inp.priceValue);
        setText('outFabricCost', money(fabricCost));
      } else { setText('outFabricCost', t('empty')); }
    } else {
      ['outLengthReq', 'outWidthReq', 'outConsumption', 'outConsumptionW', 'outWeight', 'outFabricCost']
        .forEach(function (id) { setText(id, t('empty')); });
    }

    var sheetIn = {
      fabricCostPerPc: fabricCost, cm: inp.cm, washing: inp.washing, printEmb: inp.printEmb,
      freight: inp.freight, overheadPct: inp.overheadPct, profitPct: inp.profitPct, trims: trims,
    };
    var sErrs = L.validateCostSheet(sheetIn);
    ['cm', 'washing', 'printEmb', 'freight', 'overheadPct', 'profitPct'].forEach(function (k) {
      markInvalid(k, sErrs.indexOf(k) !== -1);
    });
    var sheet = null;
    if (cons && !priceBad && !sErrs.length) {
      sheet = L.calcCostSheet(sheetIn);
      setText('outTrimsTotal', money(sheet.trimsTotal));
      setText('outSubtotal', money(sheet.subtotal));
      setText('outOverhead', money(sheet.overhead));
      setText('outTotalCost', money(sheet.totalCost));
      setText('outProfit', money(sheet.profit));
      setText('outFob', money(sheet.fob));
      setText('outPerDozen', money(sheet.perDozen));
    } else {
      ['outTrimsTotal', 'outSubtotal', 'outOverhead', 'outTotalCost', 'outProfit', 'outFob', 'outPerDozen']
        .forEach(function (id) { setText(id, t('empty')); });
    }

    if (sheet && cons && L.validateQty(inp.qty)) {
      var ord = L.calcOrder(sheet, cons, inp.fabricWidth, inp.gsm, inp.qty);
      setText('outTotalFabricM', numFmt(ord.totalFabricM, 2) + ' ' + t('metres'));
      setText('outTotalFabricKg', numFmt(ord.totalFabricKg, 2) + ' ' + t('kg'));
      setText('outTotalCostOrder', money(ord.totalCost));
      setText('outTotalValue', money(ord.totalValue));
      setText('outTotalProfit', money(ord.totalProfit));
    } else {
      ['outTotalFabricM', 'outTotalFabricKg', 'outTotalCostOrder', 'outTotalValue', 'outTotalProfit']
        .forEach(function (id) { setText(id, t('empty')); });
    }

    var anyBad = cErrs.length || priceBad || sErrs.length || !L.validateQty(inp.qty);
    $('errBanner').hidden = !anyBad;
    if (anyBad) $('errBanner').textContent = t('invalid');
    saveState();
    return { cons: cons, sheet: sheet, inp: inp };
  }

  // ---- saved sheets -----------------------------------------------------
  function getSheets() {
    try { return JSON.parse(localStorage.getItem(LS_SHEETS) || '[]'); } catch (e) { return []; }
  }
  function setSheets(list) {
    try { localStorage.setItem(LS_SHEETS, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function renderSaved() {
    var list = getSheets();
    var ul = $('savedList');
    ul.innerHTML = '';
    if (!list.length) {
      var li = document.createElement('li');
      li.className = 'muted'; li.textContent = t('savedEmpty');
      ul.appendChild(li);
      return;
    }
    list.forEach(function (sh) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = sh.name + ' \u2014 ' + (sh.data && sh.data.preset ? sh.data.preset : '');
      var loadBtn = document.createElement('button');
      loadBtn.type = 'button'; loadBtn.className = 'mini'; loadBtn.textContent = t('load');
      loadBtn.addEventListener('click', function () { loadSheet(sh); });
      var delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'mini danger'; delBtn.textContent = t('del');
      delBtn.addEventListener('click', function () {
        setSheets(getSheets().filter(function (x) { return x.id !== sh.id; }));
        renderSaved(); showMsg(t('deletedOk'));
      });
      li.appendChild(name); li.appendChild(loadBtn); li.appendChild(delBtn);
      ul.appendChild(li);
    });
  }

  function currentSheetData() {
    var r = recalc();
    var inp = r.inp;
    return {
      name: $('sheetName').value.trim(),
      data: {
        preset: inp.preset, bodyLen: inp.bodyLen, sleeveLen: inp.sleeveLen, chest: inp.chest,
        fabricWidth: inp.fabricWidth, gsm: inp.gsm, wastage: inp.wastage,
        priceMode: inp.priceMode, priceValue: inp.priceValue,
        cm: inp.cm, washing: inp.washing, printEmb: inp.printEmb, freight: inp.freight,
        overheadPct: inp.overheadPct, profitPct: inp.profitPct, qty: inp.qty,
        trims: trims.map(function (x) { return { name: x.name, qty: x.qty, unitPrice: x.unitPrice }; }),
      },
    };
  }

  function loadSheet(sh) {
    var d = sh.data;
    var s = Object.assign(defaultState(), d);
    applyStateToForm(s);
    trims = (d.trims || []).map(function (x) { return { name: x.name, qty: x.qty, unitPrice: x.unitPrice }; });
    renderTrims();
    recalc();
    showMsg(t('loadedOk'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showMsg(msg) {
    var el = $('msg');
    el.textContent = msg;
    el.hidden = !msg;
    if (msg) setTimeout(function () { el.hidden = true; }, 4000);
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    $('langToggle').textContent = t('langToggle');
    var sel = $('preset');
    var keepPreset = sel.value || state.preset || 'tshirt';
    sel.innerHTML = '';
    PRESETS.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id; o.textContent = lang === 'bn' ? p.nameBn : p.nameEn;
      sel.appendChild(o);
    });
    var custom = document.createElement('option');
    custom.value = 'custom'; custom.textContent = t('presetCustom');
    sel.appendChild(custom);
    sel.value = keepPreset;
    var pm = $('priceMode');
    var keepMode = pm.value || state.priceMode || 'metre';
    pm.innerHTML = '';
    [['metre', 'priceMetre'], ['kg', 'priceKg']].forEach(function (pair) {
      var o = document.createElement('option');
      o.value = pair[0]; o.textContent = t(pair[1]);
      pm.appendChild(o);
    });
    pm.value = keepMode;
  }

  function init() {
    state = loadState();
    trims = DEFAULT_TRIMS.map(function (x) { return { name: x.name, qty: x.qty, unitPrice: x.unitPrice }; });
    applyI18n();
    applyStateToForm(state);
    renderTrims();
    renderSaved();
    recalc();

    $('preset').addEventListener('change', function () {
      if ($('preset').value !== 'custom') applyPreset($('preset').value);
      recalc();
    });
    ['bodyLen', 'sleeveLen', 'chest', 'fabricWidth', 'gsm', 'wastage', 'priceValue',
     'cm', 'washing', 'printEmb', 'freight', 'overheadPct', 'profitPct', 'qty'
    ].forEach(function (id) {
      $(id).addEventListener('input', function () { if (id !== 'qty') $('preset').value = 'custom'; recalc(); });
    });
    $('priceMode').addEventListener('change', recalc);
    $('addTrim').addEventListener('click', function () {
      trims.push({ name: '', qty: 1, unitPrice: 0 });
      renderTrims(); recalc();
    });
    $('langToggle').addEventListener('click', function () {
      lang = lang === 'en' ? 'bn' : 'en';
      localStorage.setItem(LS_LANG, lang);
      applyI18n(); renderTrims(); renderSaved(); recalc();
    });
    $('saveSheet').addEventListener('click', function () {
      var sh = currentSheetData();
      if (!sh.name) { showMsg(t('sheetName')); return; }
      var err = L.validateSheetImport(sh);
      if (err) { showMsg(t('invalid')); return; }
      var list = getSheets();
      list.push({ id: 's' + Date.now(), name: sh.name, data: sh.data });
      setSheets(list);
      renderSaved(); showMsg(t('savedOk'));
    });
    $('loadSample').addEventListener('click', function () {
      var s = defaultState();
      applyStateToForm(s);
      trims = DEFAULT_TRIMS.map(function (x) { return { name: x.name, qty: x.qty, unitPrice: x.unitPrice }; });
      renderTrims(); recalc();
      showMsg(t('sampleLoaded'));
    });
    $('exportJson').addEventListener('click', function () {
      var sh = currentSheetData();
      if (!sh.name) sh.name = 'garment-cost-sheet';
      var blob = new Blob([JSON.stringify(sh, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = sh.name.replace(/[^a-z0-9-_]+/gi, '-') + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('importJson').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(reader.result);
          var err = L.validateSheetImport(obj);
          if (err) { showMsg(t('importBad')); return; }
          loadSheet({ name: obj.name, data: obj.data });
          showMsg(t('importOk'));
        } catch (e) { showMsg(t('importBad')); }
      };
      reader.readAsText(f);
      ev.target.value = '';
    });
    $('eraseAll').addEventListener('click', function () {
      var ans = window.prompt(t('eraseConfirm'));
      if (ans === 'DELETE') {
        localStorage.removeItem(LS_SHEETS);
        localStorage.removeItem(LS_STATE);
        state = defaultState();
        applyStateToForm(state);
        trims = DEFAULT_TRIMS.map(function (x) { return { name: x.name, qty: x.qty, unitPrice: x.unitPrice }; });
        renderTrims(); renderSaved(); recalc();
        showMsg(t('eraseDone'));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
