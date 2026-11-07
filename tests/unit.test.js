// Garment Cost BD \u2014 unit tests. Run: node --test tests/unit.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logic.js');
const { I18N } = require('../js/i18n.js');
const { PRESETS, DEFAULT_TRIMS } = require('../js/presets.js');

const TSHIRT = { bodyLen: 70, sleeveLen: 22, chest: 52, fabricWidth: 150, gsm: 180, wastage: 5 };

test('consumption: T-shirt defaults (hand-computed)', () => {
  const c = L.calcConsumption(TSHIRT);
  assert.equal(c.lengthReq, 98);          // 70 + 22 + 6 allowance
  assert.equal(c.widthReq, 56);           // 52 + 4 seam allowance
  assert.equal(c.consumptionM, 0.3659);   // 98*56/150/100
  assert.equal(c.consumptionWastageM, 0.3842); // *1.05
  assert.equal(c.weightG, 103.72);        // 0.38416 * 1.5m * 180gsm
});

test('consumption: zero wastage and zero sleeve (trouser shape)', () => {
  const c = L.calcConsumption({ bodyLen: 102, sleeveLen: 0, chest: 48, fabricWidth: 148, gsm: 220, wastage: 0 });
  assert.equal(c.lengthReq, 108);
  assert.equal(c.widthReq, 52);
  assert.equal(c.consumptionM, 0.3795);   // 108*52/148/100 = 0.37945...
  assert.equal(c.consumptionWastageM, 0.3795);
});

test('consumption: wider fabric needs less length', () => {
  const narrow = L.calcConsumption({ ...TSHIRT, fabricWidth: 120 });
  const wide = L.calcConsumption({ ...TSHIRT, fabricWidth: 180 });
  assert.ok(wide.consumptionM < narrow.consumptionM);
  assert.equal(narrow.consumptionM, 0.4573);
  assert.equal(wide.consumptionM, 0.3049);
});

test('fabric cost: per-metre and per-kg modes', () => {
  const c = L.calcConsumption(TSHIRT);
  assert.equal(L.calcFabricCost(c, 'metre', 220, 0), 84.52); // 0.3842 * 220
  assert.equal(L.calcFabricCost(c, 'kg', 0, 520), 53.93);    // 103.72g/1000 * 520
  assert.equal(L.calcFabricCost(c, 'metre', 0, 0), 0);
});

test('cost sheet: full T-shirt sheet (hand-computed)', () => {
  const sheet = L.calcCostSheet({
    fabricCostPerPc: 84.52, cm: 45, washing: 12, printEmb: 8, freight: 5,
    overheadPct: 5, profitPct: 10,
    trims: [
      { qty: 4, unitPrice: 1.5 },
      { qty: 1, unitPrice: 3 },
      { qty: 1, unitPrice: 2.5 },
    ],
  });
  assert.equal(sheet.trimsTotal, 11.5);
  assert.equal(sheet.subtotal, 166.02);
  assert.equal(sheet.overhead, 8.3);
  assert.equal(sheet.totalCost, 174.32);
  assert.equal(sheet.profit, 17.43);
  assert.equal(sheet.fob, 191.75);
  assert.equal(sheet.perDozen, 2301);
});

test('cost sheet: zero overhead and zero profit', () => {
  const sheet = L.calcCostSheet({
    fabricCostPerPc: 100, cm: 50, washing: 0, printEmb: 0, freight: 0,
    overheadPct: 0, profitPct: 0, trims: [],
  });
  assert.equal(sheet.subtotal, 150);
  assert.equal(sheet.totalCost, 150);
  assert.equal(sheet.fob, 150);
  assert.equal(sheet.perDozen, 1800);
});

test('order totals: 5000 pcs (hand-computed)', () => {
  const c = L.calcConsumption(TSHIRT);
  const sheet = { totalCost: 174.32, fob: 191.75 };
  const o = L.calcOrder(sheet, c, 150, 180, 5000);
  assert.equal(o.totalFabricM, 1921);
  assert.equal(o.totalFabricKg, 518.67);
  assert.equal(o.totalCost, 871600);
  assert.equal(o.totalValue, 958750);
  assert.equal(o.totalProfit, 87150);
});

test('order totals: qty 1 equals per-piece values', () => {
  const c = L.calcConsumption(TSHIRT);
  const sheet = { totalCost: 174.32, fob: 191.75 };
  const o = L.calcOrder(sheet, c, 150, 180, 1);
  assert.equal(o.totalCost, 174.32);
  assert.equal(o.totalValue, 191.75);
  assert.equal(o.totalProfit, 17.43);
});

test('validation: consumption ranges', () => {
  assert.deepEqual(L.validateConsumption(TSHIRT), []);
  assert.ok(L.validateConsumption({ ...TSHIRT, bodyLen: 10 }).includes('bodyLen'));
  assert.ok(L.validateConsumption({ ...TSHIRT, bodyLen: 200 }).includes('bodyLen'));
  assert.ok(L.validateConsumption({ ...TSHIRT, sleeveLen: -1 }).includes('sleeveLen'));
  assert.ok(L.validateConsumption({ ...TSHIRT, chest: 5 }).includes('chest'));
  assert.ok(L.validateConsumption({ ...TSHIRT, fabricWidth: 90 }).includes('fabricWidth'));
  assert.ok(L.validateConsumption({ ...TSHIRT, gsm: 50 }).includes('gsm'));
  assert.ok(L.validateConsumption({ ...TSHIRT, wastage: 30 }).includes('wastage'));
  assert.ok(L.validateConsumption({ ...TSHIRT, wastage: NaN }).includes('wastage'));
});

test('validation: cost sheet ranges', () => {
  const good = {
    fabricCostPerPc: 84.52, cm: 45, washing: 12, printEmb: 8, freight: 5,
    overheadPct: 5, profitPct: 10, trims: [{ qty: 4, unitPrice: 1.5 }],
  };
  assert.deepEqual(L.validateCostSheet(good), []);
  assert.ok(L.validateCostSheet({ ...good, cm: -1 }).includes('cm'));
  assert.ok(L.validateCostSheet({ ...good, overheadPct: 101 }).includes('overheadPct'));
  assert.ok(L.validateCostSheet({ ...good, profitPct: -5 }).includes('profitPct'));
  assert.ok(L.validateCostSheet({ ...good, trims: [{ qty: -1, unitPrice: 1 }] }).length > 0);
  assert.ok(L.validateCostSheet({ ...good, trims: 'nope' }).includes('trims'));
});

test('validation: qty must be an integer 1..1000000', () => {
  assert.equal(L.validateQty(1), true);
  assert.equal(L.validateQty(5000), true);
  assert.equal(L.validateQty(1000000), true);
  assert.equal(L.validateQty(0), false);
  assert.equal(L.validateQty(1000001), false);
  assert.equal(L.validateQty(2.5), false);
  assert.equal(L.validateQty(NaN), false);
});

test('Bengali digits and money formatting', () => {
  assert.equal(L.toBnDigits('0123456789'), '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef');
  assert.equal(L.fmtNum(191.75, 'bn'), '\u09e7\u09ef\u09e7.\u09ed\u09eb');
  assert.equal(L.fmtNum(191.75, 'en'), '191.75');
  assert.equal(L.fmtMoney(0, 'bn'), '\u09e6.\u09e6\u09e6');
});

test('presets: 6 unique garments with sane values', () => {
  assert.equal(PRESETS.length, 6);
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, 6);
  for (const p of PRESETS) {
    assert.ok(p.nameEn && p.nameBn && p.bodyLen > 0 && p.chest > 0);
    assert.deepEqual(L.validateConsumption({ ...p, wastage: 5 }), [], p.id);
    assert.ok(['metre', 'kg'].includes(p.priceMode), p.id);
    assert.ok(p.priceValue > 0, p.id);
  }
  assert.equal(DEFAULT_TRIMS.length, 3);
  assert.ok(DEFAULT_TRIMS.every((x) => x.qty > 0 && x.unitPrice > 0));
});

test('i18n: EN and BN have identical key sets, no empty values', () => {
  assert.deepEqual(Object.keys(I18N.en).sort(), Object.keys(I18N.bn).sort());
  for (const k of Object.keys(I18N.en)) {
    assert.ok(I18N.en[k].length > 0, 'en:' + k);
    assert.ok(I18N.bn[k].length > 0, 'bn:' + k);
  }
});

test('import validation: accepts a good sheet, rejects bad ones', () => {
  const good = {
    name: 'Tee 5000',
    data: {
      ...TSHIRT, priceMode: 'metre', priceValue: 220,
      cm: 45, washing: 12, printEmb: 8, freight: 5,
      overheadPct: 5, profitPct: 10, qty: 5000,
      trims: [{ name: 'Button', qty: 4, unitPrice: 1.5 }],
    },
  };
  assert.equal(L.validateSheetImport(good), null);
  assert.equal(L.validateSheetImport(null), 'not-object');
  assert.equal(L.validateSheetImport({ ...good, name: '' }), 'name');
  assert.equal(L.validateSheetImport({ ...good, data: { ...good.data, wastage: 99 } }), 'consumption');
  assert.equal(L.validateSheetImport({ ...good, data: { ...good.data, priceMode: 'yard' } }), 'priceMode');
  assert.equal(L.validateSheetImport({ ...good, data: { ...good.data, qty: 0 } }), 'qty');
  assert.equal(L.validateSheetImport({ ...good, data: { ...good.data, cm: -3 } }), 'costsheet');
});
