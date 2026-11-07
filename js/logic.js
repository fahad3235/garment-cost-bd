// Garment Cost BD \u2014 pure costing logic (no DOM). Works in Node and browser.
// Money is BDT; lengths are centimetres; fabric width is centimetres.

const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

function toBnDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

function fmtNum(n, lang, decimals) {
  const d = decimals === undefined ? 2 : decimals;
  const s = Number(n).toFixed(d);
  return lang === 'bn' ? toBnDigits(s) : s;
}

function fmtMoney(n, lang) {
  return fmtNum(n, lang, 2);
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---- validation ---------------------------------------------------------
// Returns an array of error keys (empty = valid).
function validateConsumption(inp) {
  const errs = [];
  const range = (v, lo, hi, key) => { if (!isNum(v) || v < lo || v > hi) errs.push(key); };
  range(inp.bodyLen, 20, 150, 'bodyLen');
  range(inp.sleeveLen, 0, 100, 'sleeveLen');
  range(inp.chest, 20, 200, 'chest');
  range(inp.fabricWidth, 100, 220, 'fabricWidth');
  range(inp.gsm, 80, 600, 'gsm');
  range(inp.wastage, 0, 25, 'wastage');
  return errs;
}

function validateCostSheet(inp) {
  const errs = [];
  const nonNeg = (v, key) => { if (!isNum(v) || v < 0) errs.push(key); };
  nonNeg(inp.fabricCostPerPc, 'fabricCostPerPc');
  nonNeg(inp.cm, 'cm');
  nonNeg(inp.washing, 'washing');
  nonNeg(inp.printEmb, 'printEmb');
  nonNeg(inp.freight, 'freight');
  if (!isNum(inp.overheadPct) || inp.overheadPct < 0 || inp.overheadPct > 100) errs.push('overheadPct');
  if (!isNum(inp.profitPct) || inp.profitPct < 0 || inp.profitPct > 100) errs.push('profitPct');
  if (!Array.isArray(inp.trims)) { errs.push('trims'); return errs; }
  inp.trims.forEach((t, i) => {
    if (!isNum(t.qty) || t.qty < 0 || t.qty > 100) errs.push('trims[' + i + '].qty');
    if (!isNum(t.unitPrice) || t.unitPrice < 0) errs.push('trims[' + i + '].unitPrice');
  });
  return errs;
}

function validateQty(qty) {
  return isNum(qty) && qty >= 1 && qty <= 1000000 && Number.isInteger(qty);
}

// ---- fabric consumption -------------------------------------------------
// Rectangular-cut estimate (documented in README):
//   lengthReq = bodyLen + sleeveLen + 6 cm allowance
//   widthReq  = chest + 4 cm seam allowance
//   consumption (m) = lengthReq * widthReq / fabricWidth / 100
//   with wastage: consumption * (1 + wastage/100)
//   weight per piece (g) = consumption(m) * fabricWidth(m) * GSM
function calcConsumption(inp) {
  const lengthReq = inp.bodyLen + inp.sleeveLen + 6;
  const widthReq = inp.chest + 4;
  const consumptionM = (lengthReq * widthReq) / inp.fabricWidth / 100;
  const consumptionWastageM = consumptionM * (1 + inp.wastage / 100);
  const weightG = consumptionWastageM * (inp.fabricWidth / 100) * inp.gsm;
  return {
    lengthReq: round2(lengthReq),
    widthReq: round2(widthReq),
    consumptionM: round4(consumptionM),
    consumptionWastageM: round4(consumptionWastageM),
    weightG: round2(weightG),
  };
}

// Fabric cost per piece. mode 'metre': pricePerMetre (BDT/m).
// mode 'kg': pricePerKg (BDT/kg) using weight per piece.
function calcFabricCost(consumption, mode, pricePerMetre, pricePerKg) {
  if (mode === 'kg') return round2((consumption.weightG / 1000) * pricePerKg);
  return round2(consumption.consumptionWastageM * pricePerMetre);
}

// ---- cost sheet ---------------------------------------------------------
function calcCostSheet(inp) {
  const trimsTotal = round2(inp.trims.reduce((s, t) => s + t.qty * t.unitPrice, 0));
  const subtotal = round2(inp.fabricCostPerPc + trimsTotal + inp.cm + inp.washing + inp.printEmb + inp.freight);
  const overhead = round2((subtotal * inp.overheadPct) / 100);
  const totalCost = round2(subtotal + overhead);
  const profit = round2((totalCost * inp.profitPct) / 100);
  const fob = round2(totalCost + profit);
  return {
    trimsTotal,
    subtotal,
    overhead,
    totalCost,
    profit,
    fob,
    perDozen: round2(fob * 12),
  };
}

// ---- order totals -------------------------------------------------------
function calcOrder(sheet, consumption, fabricWidth, gsm, qty) {
  const totalFabricM = round2(consumption.consumptionWastageM * qty);
  const totalFabricKg = round2((totalFabricM * (fabricWidth / 100) * gsm) / 1000);
  const totalCost = round2(sheet.totalCost * qty);
  const totalValue = round2(sheet.fob * qty);
  const totalProfit = round2((sheet.fob - sheet.totalCost) * qty);
  return { totalFabricM, totalFabricKg, totalCost, totalValue, totalProfit };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

// ---- saved-sheet import validation --------------------------------------
function validateSheetImport(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 'not-object';
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0 || obj.name.length > 60) return 'name';
  const d = obj.data;
  if (!d || typeof d !== 'object') return 'data';
  if (validateConsumption(d).length) return 'consumption';
  if (!['metre', 'kg'].includes(d.priceMode)) return 'priceMode';
  if (!isNum(d.priceValue) || d.priceValue < 0) return 'priceValue';
  const sheet = {
    fabricCostPerPc: 0, cm: d.cm, washing: d.washing, printEmb: d.printEmb,
    freight: d.freight, overheadPct: d.overheadPct, profitPct: d.profitPct, trims: d.trims || [],
  };
  if (validateCostSheet(sheet).length) return 'costsheet';
  if (!validateQty(d.qty)) return 'qty';
  return null;
}

if (typeof module !== 'undefined') {
  module.exports = {
    toBnDigits, fmtNum, fmtMoney, isNum,
    validateConsumption, validateCostSheet, validateQty,
    calcConsumption, calcFabricCost, calcCostSheet, calcOrder,
    validateSheetImport, round2, round4,
  };
}
if (typeof window !== 'undefined') {
  window.GarmentLogic = {
    toBnDigits, fmtNum, fmtMoney, isNum,
    validateConsumption, validateCostSheet, validateQty,
    calcConsumption, calcFabricCost, calcCostSheet, calcOrder,
    validateSheetImport, round2, round4,
  };
}
