import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const paletteCode = readFileSync(new URL('palette/mard-221-v2026-09-14.js', root), 'utf8');
const context = { atob };
vm.runInNewContext(`${paletteCode}; globalThis.result = MARD_221;`, context);
const palette = context.result;

assert.equal(palette.colorSystem, 'MARD 221 色号体系（公开参考）');
assert.equal(palette.beadSizeMm, 2.6);
assert.equal(palette.colors.length, 221);
assert.equal(new Set(palette.colors.map(color => color.code)).size, 221);
assert.ok(palette.colors.every(color => /^([A-H]|M)\d+$/.test(color.code) && /^([A-H]|M)\d{2}$/.test(color.purchaseCode) && color.purchaseCode === `${color.code[0]}${color.code.slice(1).padStart(2, '0')}` && color.rgb.length === 3 && color.rgb.every(value => Number.isInteger(value) && value >= 0 && value <= 255)));
assert.equal(new Set(palette.colors.map(color => color.purchaseCode)).size, 221, 'every source code must have a unique purchase code');

const fixture = JSON.parse(readFileSync(new URL('fixtures/demo-mard-221-cells.json', root), 'utf8'));
const visible = fixture.cells.filter(Boolean);
const knownCodes = new Set(palette.colors.map(color => color.code));
assert.ok(visible.every(code => knownCodes.has(code)), 'every non-background fixture cell must map to a real MARD code');

const csv = readFileSync(new URL('examples/demo-mard-221-shopping-list.csv', root), 'utf8').trim().split('\n');
const header = csv.shift().split(',');
assert.deepEqual(header, ['color_system', 'bead_size_mm', 'source_code', 'purchase_code', 'name', 'quantity', 'palette_id', 'procurement_status']);
const rows = csv.map(line => line.split(','));
assert.ok(rows.every(row => row[0] === 'MARD 221 色号体系（公开参考）' && row[1] === '2.6' && knownCodes.has(row[2]) && /^([A-H]|M)\d{2}$/.test(row[3]) && row[7].includes('未验证') && !row.join(',').includes('通用色') && !row.join(',').includes('原厂 MARD')));
assert.equal(rows.reduce((total, row) => total + Number(row[5]), 0), visible.length, 'shopping-list count must equal visible cells');

const app = readFileSync(new URL('app.js', root), 'utf8');
assert.ok(app.includes('assertDelivery(values, colors)'));
assert.ok(app.includes('pet-bead-mard-221-shopping-list.csv'));
assert.ok(app.includes('pet-bead-mard-221-grid-coordinates.csv'));
assert.ok(!app.includes('易拼通用色'));
assert.ok(app.includes('purchase_code'));
assert.ok(!app.includes('MARD 企业店'));
console.log(`PASS: ${palette.colors.length} source/purchase codes; ${visible.length} fixture cells; CSV total matches.`);
