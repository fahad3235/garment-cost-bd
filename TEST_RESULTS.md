# Garment Cost BD — Test Results

Verified 2026-11-07 ~18:10 +06 (run #268, 18:00 slot).

## Unit tests — 15/15 PASS

`node --test tests/unit.test.js`

- Consumption: T-shirt defaults hand-computed (98 cm length req, 56 cm width req,
  0.3659 m/pc, 0.3842 m with 5% wastage, 103.72 g/pc)
- Trouser shape (zero sleeve, zero wastage): 0.3795 m/pc
- Wider fabric needs less length (120 cm → 0.4573 m; 180 cm → 0.3049 m)
- Fabric cost per-metre (৳84.52) and per-kg (৳53.93)
- Full cost sheet hand-computed: trims ৳11.50, subtotal ৳166.02, overhead ৳8.30,
  total cost ৳174.32, profit ৳17.43, FOB ৳191.75/pc, ৳2,301.00/dozen
- Zero overhead/profit sheet; order totals for 5,000 pcs (1,921 m, 518.67 kg,
  cost ৳871,600, value ৳958,750, profit ৳87,150); qty-1 identity
- Validation ranges for consumption, cost sheet and quantity
- Bengali digits, money formatting, 6 presets, i18n key parity, import validation

One genuine bug found and fixed during testing: `validateSheetImport` validated
`d.consumption` (always empty) instead of the sheet data `d` itself, so every
valid import was rejected. Fixed in `js/logic.js`; re-ran green.

## Headless-Chrome smoke — 36/36 PASS

`node tests/smoke.mjs` (headless_shell CDP, file://)

- Default T-shirt render: consumption 0.366 m, FOB ৳191.75, dozen ৳2,301,
  5,000-pc order 1,921 m / ৳958,750; 3 default trim rows; no error banner
- Hoodie preset applies (body 72, sleeve 62, price by kg, FOB ৳269.30)
- Live edit: body 80 cm → consumption 0.403 m; preset flips to Custom
- Invalid body length (5 cm) → error banner, field marked, FOB blanked;
  fixing it restores FOB ৳191.75
- Add trim row (2 × ৳10) → FOB rises to ৳214.85
- বাংলা toggle: title, FOB digits (২১৪.৮৫) and preset names render; language
  persists in localStorage; back to English cleanly
- Save sheet "Smoke Tee" → listed; persists after reload; last inputs persist
- 390 px mobile: no horizontal overflow
- 0 page errors, 0 console errors, 0 failed requests

## Sources

Pure ASCII after escaping (Bengali as `\uXXXX` in JS, numeric entities in HTML):
`grep -rP '[^\x00-\x7F]'` returns no matches. Tests re-run green after escaping.
