# Garment Cost BD

Offline bilingual (English / বাংলা) RMG garment costing tool: fabric consumption,
cost sheet, FOB price per piece, and order totals. Runs entirely in the browser —
no sign-in, no server, no data leaves the device.

Live demo: https://fahad3235.github.io/garment-cost-bd/

## Problem

A merchandiser or small factory owner quoting a buyer needs, in minutes, an
answer to three questions: how much fabric does one piece need, what does one
piece cost, and what is the order worth at a given FOB price? Spreadsheets get
copied around, formulas get mistyped, and trims get forgotten. Garment Cost BD
puts the whole chain — consumption → cost sheet → FOB → order totals — in one
offline page with saved sheets.

## Features

1. **Fabric consumption calculator** — body length, sleeve length, chest/hip
   width, fabric width, GSM and wastage % → consumption per piece (m),
   consumption with wastage, and fabric weight per piece (g).
2. **Garment presets** — T-Shirt, Polo, Hoodie, Woven Shirt, Trouser, Jacket
   with typical starting values (editable; your buyer tech pack always wins).
3. **Cost sheet (per piece)** — fabric cost by the metre or by the kg, editable
   trims & accessories table, CM, washing, print/embroidery, freight, overhead
   % and profit margin % → total cost, profit, **FOB price per piece** and FOB
   per dozen.
4. **Order totals** — quantity → total fabric (m and kg), total cost, total FOB
   value and total profit.
5. **Saved cost sheets** — name and save sheets in localStorage, load or delete
   them, load a sample sheet; JSON export / strict import; typed-DELETE erase-all.
6. **Bilingual UI** — English / বাংলা toggle persisted, Bengali digits in
   বাংলা mode; responsive down to 390 px; zero network requests.

## The consumption formula

Rectangular-cut estimate, documented on screen:

```
length required = body length + sleeve length + 6 cm allowance
width required  = chest + 4 cm seam allowance
consumption (m) = length required × width required ÷ fabric width ÷ 100
with wastage    = consumption × (1 + wastage % / 100)
weight / pc (g) = consumption with wastage (m) × fabric width (m) × GSM
```

This is an estimate for quoting and practice, **not** a marker plan. A real
marker (nesting pattern pieces on the fabric width) always consumes less than
the rectangle estimate. Verify against the buyer tech pack and actual supplier
quotes before quoting a price.

## Stack

- Vanilla HTML / CSS / JavaScript, no build step, no dependencies
- `localStorage` for saved sheets, language and last-used inputs
- Node's built-in test runner + raw-CDP headless-Chrome smoke tests

## Prerequisites

Any modern browser. For tests: Node.js 18+.

## Install & run

```bash
# just open it — no install, no server needed
open index.html
# or serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Testing

```bash
node --test tests/unit.test.js   # logic unit tests
node tests/smoke.mjs             # headless-Chrome UI smoke tests
```

## Deployment

Static site — publish the repo root on GitHub Pages (main branch, root).

## Limitations

- Rectangular-cut consumption estimate; not a marker/CAD plan.
- Preset values are typical starting points, not standards — always use the
  buyer tech pack.
- Currency is BDT only; no live fabric prices (enter your supplier's quote).
- Saved sheets live in the browser's localStorage on one device.

## Status

MVP complete. See [TEST_RESULTS.md](TEST_RESULTS.md) for the latest verified
test run.
