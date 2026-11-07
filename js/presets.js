// Garment presets \u2014 typical STARTING values only (editable, not standards).
// A buyer tech pack always overrides these. Lengths in cm.
const PRESETS = [
  { id: 'tshirt', nameEn: 'T-Shirt', nameBn: '\u099f\u09bf-\u09b6\u09be\u09b0\u09cd\u099f', bodyLen: 70, sleeveLen: 22, chest: 52, gsm: 180, fabricWidth: 150, priceMode: 'metre', priceValue: 220 },
  { id: 'polo', nameEn: 'Polo Shirt', nameBn: '\u09aa\u09cb\u09b2\u09cb \u09b6\u09be\u09b0\u09cd\u099f', bodyLen: 72, sleeveLen: 24, chest: 54, gsm: 200, fabricWidth: 150, priceMode: 'metre', priceValue: 260 },
  { id: 'hoodie', nameEn: 'Hoodie', nameBn: '\u09b9\u09c1\u09a1\u09bf', bodyLen: 72, sleeveLen: 62, chest: 58, gsm: 320, fabricWidth: 150, priceMode: 'kg', priceValue: 520 },
  { id: 'shirt', nameEn: 'Woven Shirt', nameBn: '\u0993\u09ad\u09c7\u09a8 \u09b6\u09be\u09b0\u09cd\u099f', bodyLen: 76, sleeveLen: 60, chest: 56, gsm: 140, fabricWidth: 148, priceMode: 'metre', priceValue: 180 },
  { id: 'trouser', nameEn: 'Trouser', nameBn: '\u099f\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0', bodyLen: 102, sleeveLen: 0, chest: 48, gsm: 220, fabricWidth: 148, priceMode: 'metre', priceValue: 240 },
  { id: 'jacket', nameEn: 'Jacket', nameBn: '\u099c\u09cd\u09af\u09be\u0995\u09c7\u099f', bodyLen: 70, sleeveLen: 62, chest: 60, gsm: 280, fabricWidth: 150, priceMode: 'kg', priceValue: 560 },
];

const DEFAULT_TRIMS = [
  { name: 'Button', nameBn: '\u09ac\u09cb\u09a4\u09be\u09ae', qty: 4, unitPrice: 1.5 },
  { name: 'Label', nameBn: '\u09b2\u09c7\u09ac\u09c7\u09b2', qty: 1, unitPrice: 3 },
  { name: 'Poly bag', nameBn: '\u09aa\u09b2\u09bf \u09ac\u09cd\u09af\u09be\u0997', qty: 1, unitPrice: 2.5 },
];

if (typeof module !== 'undefined') {
  module.exports = { PRESETS, DEFAULT_TRIMS };
}
if (typeof window !== 'undefined') {
  window.GarmentPresets = { PRESETS, DEFAULT_TRIMS };
}
