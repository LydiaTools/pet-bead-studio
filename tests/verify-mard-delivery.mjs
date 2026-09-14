import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const paletteCode = readFileSync(new URL('palette/mard-221-v2026-09-14.js', root), 'utf8');
const context = { atob };
vm.runInNewContext(`${paletteCode}; globalThis.result = MARD_221;`, context);
const palette = context.result;

assert.equal(palette.brand, 'MARD');
assert.equal(palette.beadSizeMm, 2.6);
assert.equal(palette.colors.length, 221);
assert.equal(new Set(palette.colors.map(color => color.code)).size, 221);
assert.ok(palette.colors.every(color => /^([A-H]|M)\d+$/.test(color.code) && color.rgb.length === 3 && color.rgb.every(value => Number.isInteger(value) && value >= 0 && value <= 255)));

const fixture = JSON.parse(readFileSync(new URL('fixtures/demo-mard-221-cells.json', root), 'utf8'));
const visible = fixture.cells.filter(Boolean);
const knownCodes = new Set(palette.colors.map(color => color.code));
assert.ok(visible.every(code => knownCodes.has(code)), 'every non-background fixture cell must map to a real MARD code');

const csv = readFileSync(new URL('examples/demo-mard-221-shopping-list.csv', root), 'utf8').trim().split('\n');
const header = csv.shift().split(',');
assert.deepEqual(header, ['brand', 'series', 'bead_size_mm', 'code', 'name', 'quantity', 'palette_id']);
const rows = csv.map(line => line.split(','));
assert.ok(rows.every(row => row[0] === 'MARD' && row[2] === '2.6' && knownCodes.has(row[3]) && !row.join(',').includes('通用色')));
assert.equal(rows.reduce((total, row) => total + Number(row[5]), 0), visible.length, 'shopping-list count must equal visible cells');

const app = readFileSync(new URL('app.js', root), 'utf8');
assert.ok(app.includes('assertDelivery(values, colors)'));
assert.ok(app.includes('pet-bead-mard-221-shopping-list.csv'));
assert.ok(app.includes('pet-bead-mard-221-grid-coordinates.csv'));
assert.ok(!app.includes('易拼通用色'));
console.log(`PASS: ${palette.colors.length} MARD codes; ${visible.length} fixture cells; CSV total matches.`);
