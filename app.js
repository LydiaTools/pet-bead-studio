const $ = id => document.getElementById(id);
const src = $('source');
const ordinary = $('ordinary');
const pat = $('pattern');
const beadsDetail = $('beadsDetail');
const beadsEasy = $('beadsEasy');

let image = null;
let cells = [];
let palette = [];
let features = [];
let outline = [];
let detailCells = [];
let detailPalette = [];
let activeStep = 1;

const STEP_COPY = {
  1: ['先选一张，让人一眼认出它的照片', '不用摆拍。日常一张有眼神、有小习惯的照片，就可以从这里开始。', '从日常照片开始', '我的这只', '上传后开始'],
  2: ['圈出我家的这只', '只要沿着它的边缘点一圈，背景就不会把它挤没。', '先把它和背景分开', '我家的这只', '沿边缘点一下'],
  3: ['留住一眼就认得出的地方', '眼睛、鼻口和特别的花纹，才是“它像不像它”的关键。', '比毛色更多一点，是它的神态', '留下熟悉的眼睛', '点一下眼睛'],
  4: ['决定一个真的能拼完的大小', '格子和颜色不是越多越好。够像，也要让人愿意一颗颗拼完。', '', '', '看图纸'],
  5: ['最后检查：拼完以后，还像不像它', '先看预排效果和用豆数量；确认神态还在，再把图纸带走。', '', '', '预排效果'],
};

function sourceHint() {
  const hints = {
    '眼睛': '点一下照片里的眼睛，把它的颜色留下来。最多可以选 3 处。',
    '鼻口': '点一下鼻子或嘴巴，把这些熟悉的颜色留下来。最多可以选 3 处。',
    '独特花纹': '点一下它特别的毛色或花纹，把这个颜色留下来。最多可以选 3 处。',
    '背景': '在照片边缘的背景上点 1–3 下，去掉相近的背景颜色。',
    '主体轮廓': '沿宠物身体边缘点 6–16 下，圈外的背景就会去掉。不满意可以重新圈。',
  };
  return hints[$('feature').value];
}

function chooseFeature(name) {
  $('feature').value = name;
  document.querySelectorAll('.feature').forEach(button => button.classList.toggle('active', button.dataset.feature === name));
  $('sourceHelp').textContent = sourceHint();
}

function setStep(next) {
  activeStep = Math.max(1, Math.min(5, next));
  const [title, description, kicker, canvasTitle, hint] = STEP_COPY[activeStep];
  $('app').dataset.step = activeStep;
  $('stageCount').textContent = `第 ${activeStep} 步，共 5 步`;
  $('stageTitle').textContent = title;
  $('stageDescription').textContent = description;
  $('canvasKicker').textContent = kicker;
  $('canvasTitle').textContent = canvasTitle;
  $('tapHint').textContent = hint;
  document.querySelectorAll('.step').forEach(button => button.classList.toggle('active', +button.dataset.step === activeStep));
  document.querySelectorAll('[data-shows]').forEach(card => card.classList.toggle('visible', card.dataset.shows.split(' ').includes(String(activeStep))));
  if (activeStep === 2) chooseFeature('主体轮廓');
  if (activeStep === 3 && !['眼睛', '鼻口', '独特花纹'].includes($('feature').value)) chooseFeature('眼睛');
  if (activeStep < 2) $('sourceHelp').textContent = '先选照片。你不用为了做拼豆，专门让它摆好。';
  $('previous').disabled = activeStep === 1;
  $('next').textContent = activeStep === 5 ? '回看第一步' : '下一步';
}

const draw = () => {
  if (!image) return;
  const n = +$('grid').value;
  const easyK = +$('colors').value;
  const detailK = Math.min(32, easyK + 8);
  const tolerance = +$('bgTolerance').value;
  $('gridValue').textContent = `${n} × ${n}`;
  $('colorValue').textContent = `易拼 ${easyK} 色／细节 ${detailK} 色`;
  $('bgValue').textContent = tolerance;

  const c = src.getContext('2d');
  c.clearRect(0, 0, 480, 480);
  const head = $('preset').value === 'head';
  const iw = image.width;
  const ih = image.height;
  const side = Math.min(iw, ih) * (head ? 0.72 : 1);
  const sx = (iw - side) / 2;
  const sy = head ? Math.max(0, (ih - side) / 2 - side * 0.1) : (ih - side) / 2;
  c.drawImage(image, sx, sy, side, side, 0, 0, 480, 480);

  const selected = features.map(f => ({ ...f, color: Array.from(c.getImageData(f.x, f.y, 1, 1).data.slice(0, 3)) }));
  const pins = selected.filter(f => f.name !== '背景').map(f => f.color);
  const backgroundSamples = selected.filter(f => f.name === '背景').map(f => f.color);
  features.forEach((f, i) => {
    c.strokeStyle = f.name === '背景' ? '#7756b6' : ['#d83c30', '#1572d3', '#4a942b'][i % 3];
    c.lineWidth = 4;
    c.beginPath();
    c.arc(f.x, f.y, 10, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = c.strokeStyle;
    c.fillText(f.name, f.x + 12, f.y - 10);
  });
  if (outline.length) {
    c.strokeStyle = '#176b58';
    c.lineWidth = 3;
    c.setLineDash([7, 5]);
    c.beginPath();
    c.moveTo(outline[0].x, outline[0].y);
    outline.slice(1).forEach(point => c.lineTo(point.x, point.y));
    if (outline.length >= 6) c.closePath();
    c.stroke();
    c.setLineDash([]);
  }

  const tiny = document.createElement('canvas');
  tiny.width = tiny.height = n;
  const t = tiny.getContext('2d');
  // Read pixels from the unannotated photo crop.  The visible source canvas
  // contains selection circles and labels, which must never become beads.
  t.drawImage(image, sx, sy, side, side, 0, 0, n, n);
  const raw = t.getImageData(0, 0, n, n).data;
  let foreground = foregroundMask(raw, n, backgroundSamples, tolerance);
  let invalidOutline = false;
  if (outline.length >= 6) {
    const outlined = foreground.map((visible, index) => visible && insidePolygon((index % n + .5) * 480 / n, (Math.floor(index / n) + .5) * 480 / n, outline));
    if (outlined.filter(Boolean).length >= 12) foreground = outlined;
    else invalidOutline = true;
  }
  const points = pointsFor(raw, foreground);

  detailPalette = quantize(points, detailK, pins);
  detailCells = mapCells(raw, detailPalette, n, foreground);
  palette = quantize(points, easyK, pins);
  cells = cleanCells(mapCells(raw, palette, n, foreground), n);

  renderGrid(ordinary, detailCells, detailPalette, n);
  renderGrid(pat, cells, palette, n);
  renderBeads(beadsDetail, detailCells, detailPalette, n);
  renderBeads(beadsEasy, cells, palette, n);
  renderStats();
  $('png').disabled = $('pdf').disabled = $('storyPack').disabled = $('shoppingCsv').disabled = $('gridCsv').disabled = false;
  $('clearOutline').disabled = !outline.length;
  $('status').textContent = invalidOutline
    ? '还没圈住宠物，点“重新圈一遍”，沿身体边缘再试一次。'
    : outline.length >= 6
    ? '圈好了，外面的背景已经去掉。看看有没有漏掉耳朵或尾巴。'
    : outline.length
    ? `再沿宠物边缘点 ${6 - outline.length} 下，就能去掉圈外的背景。`
    : backgroundSamples.length
    ? '已去掉边缘相近的背景颜色，看看宠物有没有被误删。'
    : pins.length
      ? '你选的颜色留下来了，看看图纸里的它像不像。'
    : '图纸出来了。点一下照片里的眼睛，把它的颜色留下来。';
};

function quantize(pts, k, pins = []) {
  if (!pts.length) return snapToMard(pins.length ? pins.slice(0, k) : [[255, 255, 255]]);
  let cent = [
    ...pins.slice(0, k),
    ...Array.from({ length: Math.max(0, k - pins.length) }, (_, i) => pts[Math.floor(i * pts.length / Math.max(1, k - pins.length))])
  ];
  for (let z = 0; z < 8; z++) {
    const bins = cent.map(() => []);
    pts.forEach(p => bins[nearest(p, cent)].push(p));
    cent = bins.map((b, i) => i < pins.length ? pins[i] : (b.length
      ? b.reduce((a, p) => a.map((v, j) => v + p[j]), [0, 0, 0]).map(v => Math.round(v / b.length))
      : cent[i]));
  }
  return snapToMard(cent);
}

function snapToMard(centroids) {
  const used = new Set();
  return centroids.map(centroid => {
    const choice = [...MARD_221.colors]
      .sort((a, b) => distance(centroid, a.rgb) - distance(centroid, b.rgb))
      .find(color => !used.has(color.code)) || MARD_221.colors[0];
    used.add(choice.code);
    return choice;
  });
}

function distance(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function nearest(p, arr) {
  let best = 0;
  let d = Infinity;
  arr.forEach((q, i) => {
    const color = q.rgb || q;
    const x = distance(p, color);
    if (x < d) { d = x; best = i; }
  });
  return best;
}

function rgb(i) { return `rgb(${palette[i].rgb.join(',')})`; }
function colorRgb(color) { return `rgb(${color.rgb.join(',')})`; }

function pointsFor(raw, foreground) {
  const points = [];
  for (let i = 0; i < foreground.length; i++) {
    if (foreground[i]) points.push([raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]]);
  }
  return points;
}

function foregroundMask(raw, n, samples, tolerance) {
  const foreground = Array(n * n).fill(true);
  if (!samples.length) return foreground;
  const candidate = Array(n * n).fill(false);
  const maxDistance = tolerance * tolerance * 3;
  for (let i = 0; i < candidate.length; i++) {
    const p = [raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]];
    candidate[i] = samples.some(sample => (p[0] - sample[0]) ** 2 + (p[1] - sample[1]) ** 2 + (p[2] - sample[2]) ** 2 <= maxDistance);
  }
  const removed = Array(n * n).fill(false);
  const queue = [];
  const visit = index => { if (candidate[index] && !removed[index]) { removed[index] = true; queue.push(index); } };
  for (let x = 0; x < n; x++) { visit(x); visit((n - 1) * n + x); }
  for (let y = 1; y < n - 1; y++) { visit(y * n); visit(y * n + n - 1); }
  while (queue.length) {
    const index = queue.shift();
    const x = index % n, y = Math.floor(index / n);
    if (x) visit(index - 1);
    if (x < n - 1) visit(index + 1);
    if (y) visit(index - n);
    if (y < n - 1) visit(index + n);
  }
  removed.forEach((value, index) => { if (value) foreground[index] = false; });
  return foreground.some(Boolean) ? foreground : Array(n * n).fill(true);
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function mapCells(raw, colors, n, foreground) {
  const values = [];
  for (let i = 0; i < n * n; i++) {
    if (!foreground[i]) { values.push(-1); continue; }
    const p = i * 4;
    values.push(nearest([raw[p], raw[p + 1], raw[p + 2]], colors));
  }
  return values;
}

function cleanCells(values, n) {
  const out = values.slice();
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      const v = values[i];
      if (v < 0) continue;
      const around = [values[i-n-1], values[i-n], values[i-n+1], values[i-1], values[i+1], values[i+n-1], values[i+n], values[i+n+1]];
      const visibleAround = around.filter(a => a >= 0);
      if (visibleAround.filter(a => a === v).length > 1) continue;
      const counts = new Map();
      visibleAround.forEach(a => counts.set(a, (counts.get(a) || 0) + 1));
      const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (winner && winner[1] >= 5) out[i] = winner[0];
    }
  }
  return out;
}

function renderGrid(canvas, values, colors, n) {
  const c = canvas.getContext('2d');
  const s = 640 / n;
  c.fillStyle = '#f8f5ed';
  c.fillRect(0, 0, 640, 640);
  values.forEach((v, i) => {
    if (v < 0) return;
    c.fillStyle = colorRgb(colors[v]);
    c.fillRect((i % n) * s, Math.floor(i / n) * s, s, s);
  });
  c.strokeStyle = '#ffffff88';
  c.lineWidth = Math.max(0.3, s * 0.03);
  for (let i = 0; i <= n; i++) {
    c.beginPath();
    c.moveTo(i * s, 0); c.lineTo(i * s, 640);
    c.moveTo(0, i * s); c.lineTo(640, i * s);
    c.stroke();
  }
}

function renderBeads(canvas, values, colors, n) {
  const c = canvas.getContext('2d');
  const s = 560 / n;
  const off = 40;
  c.fillStyle = '#d8d3c8';
  c.fillRect(0, 0, 640, 640);
  c.fillStyle = '#f8f5ed';
  c.fillRect(off - 8, off - 8, 576, 576);
  values.forEach((v, i) => {
    if (v < 0) return;
    const x = off + (i % n + 0.5) * s;
    const y = off + (Math.floor(i / n) + 0.5) * s;
    const r = s * 0.45;
    const fill = colorRgb(colors[v]);
    c.fillStyle = '#0002';
    c.beginPath(); c.arc(x + r * 0.1, y + r * 0.14, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = fill;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff7';
    c.beginPath(); c.arc(x - r * 0.24, y - r * 0.25, r * 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0008';
    c.beginPath(); c.arc(x, y, r * 0.31, 0, Math.PI * 2); c.fill();
    c.fillStyle = fill;
    c.beginPath(); c.arc(x, y, r * 0.19, 0, Math.PI * 2); c.fill();
  });
}

function renderStats() {
  const counts = palette.map(() => 0);
  cells.filter(x => x >= 0).forEach(x => counts[x]++);
  const detailTotal = detailCells.filter(x => x >= 0).length;
  const easyTotal = cells.filter(x => x >= 0).length;
  $('stats').innerHTML = `<p><b>细节版：</b>${detailTotal} 颗／${detailPalette.length} 色　<b>易拼版：</b>${easyTotal} 颗／${palette.length} 色<br><small>${MARD_221.colorSystem}｜${MARD_221.beadSizeMm} mm。源色号→市售下单核对格式；屏幕色仅用于匹配。</small></p>`
    + counts.map((n, i) => `<span class="swatch"><i class="dot" style="background:${rgb(i)}"></i>${palette[i].code} → ${palette[i].purchaseCode}：${n} 颗</span>`).join('');
}

function assertDelivery(values, colors) {
  const known = new Set(MARD_221.colors.map(color => color.code));
  const used = values.filter(value => value >= 0).map(value => colors[value]);
  if (!used.every(color => color && known.has(color.code) && color.purchaseCode)) throw new Error('存在未映射到 MARD 221 色号体系／市售下单代码的可见格子。');
  const total = used.length;
  const byCode = used.reduce((map, color) => map.set(color.code, (map.get(color.code) || 0) + 1), new Map());
  if ([...byCode.values()].reduce((sum, count) => sum + count, 0) !== total) throw new Error('采购清单总数与可见格子数不一致。');
  return { total, byCode };
}

function csvCell(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadText(text, filename, type = 'text/csv;charset=utf-8') {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['\ufeff', text], { type }));
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function purchaseRows() {
  const { total, byCode } = assertDelivery(cells, palette);
  const rows = [...byCode.entries()].map(([code, quantity]) => {
    const color = MARD_221.colors.find(item => item.code === code);
    return [MARD_221.colorSystem, MARD_221.beadSizeMm, color.code, color.purchaseCode, color.name, quantity, MARD_221.id, MARD_221.procurementStatus];
  });
  return { total, rows };
}

function downloadShoppingList() {
  const { total, rows } = purchaseRows();
  const header = ['color_system', 'bead_size_mm', 'source_code', 'purchase_code', 'name', 'quantity', 'palette_id', 'procurement_status'];
  downloadText([header, ...rows].map(row => row.map(csvCell).join(',')).join('\n'), 'pet-bead-mard-221-shopping-list.csv');
  $('status').textContent = `采购清单已下载：${total} 个可见格子均有源色号与市售下单代码；下单前仍须核对卖家、规格和批次。`;
}

function downloadGridCsv() {
  assertDelivery(cells, palette);
  const n = +$('grid').value;
  const header = ['row', 'column', 'color_system', 'bead_size_mm', 'source_code', 'purchase_code', 'name', 'procurement_status'];
  const rows = cells.flatMap((value, index) => {
    if (value < 0) return [];
    const color = palette[value];
    return [[Math.floor(index / n) + 1, index % n + 1, MARD_221.colorSystem, MARD_221.beadSizeMm, color.code, color.purchaseCode, color.name, MARD_221.procurementStatus]];
  });
  downloadText([header, ...rows].map(row => row.map(csvCell).join(',')).join('\n'), 'pet-bead-mard-221-grid-coordinates.csv');
  $('status').textContent = '带行列坐标、源色号和市售下单代码的图纸已下载。';
}

function coordinateGridDataUrl() {
  const n = +$('grid').value;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 700;
  const c = canvas.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 700, 700);
  c.drawImage(pat, 42, 42, 640, 640);
  c.fillStyle = '#26332d'; c.font = '10px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const interval = n > 64 ? 10 : 5;
  for (let i = 0; i < n; i += interval) {
    const position = 42 + (i + .5) * 640 / n;
    c.fillText(String(i + 1), position, 22);
    c.save(); c.translate(22, position); c.rotate(-Math.PI / 2); c.fillText(String(i + 1), 0, 0); c.restore();
  }
  return canvas.toDataURL('image/png');
}

function loadImage(url) {
  features = [];
  outline = [];
  image = new Image();
  image.onload = () => {
    draw();
    setStep(2);
  };
  image.src = url;
}

$('file').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  if (!/^image\/(png|jpeg)$/.test(f.type)) return $('status').textContent = '只支持 PNG 或 JPEG。';
  loadImage(URL.createObjectURL(f));
};
$('demo').onclick = () => loadImage('assets/demo-white-dog.jpg');
src.onclick = e => {
  if (!image) { $('status').textContent = '先选一张照片，再从它的眼睛和轮廓开始。'; return; }
  const r = src.getBoundingClientRect();
  const x = Math.round((e.clientX - r.left) * 480 / r.width);
  const y = Math.round((e.clientY - r.top) * 480 / r.height);
  const name = $('feature').value;
  if (name === '主体轮廓') {
    if (outline.length === 16) { $('status').textContent = '已经点满 16 下了；想改一改，可以点“重新圈一遍”。'; return; }
    outline.push({ x, y });
    draw();
    return;
  }
  const edge = 72;
  if (name === '背景' && x > edge && x < 480 - edge && y > edge && y < 480 - edge) {
    $('status').textContent = '请点照片边缘的背景，这样不容易误删宠物。';
    return;
  }
  const sameType = features.filter(feature => feature.name === name);
  if (sameType.length === 3) features.splice(features.indexOf(sameType[0]), 1);
  features.push({ x, y, name });
  draw();
};
$('clearOutline').onclick = () => { outline = []; draw(); };
document.querySelectorAll('.feature').forEach(button => button.onclick = () => chooseFeature(button.dataset.feature));
document.querySelectorAll('.step').forEach(button => button.onclick = () => setStep(+button.dataset.step));
$('previous').onclick = () => setStep(activeStep - 1);
$('next').onclick = () => setStep(activeStep === 5 ? 1 : activeStep + 1);
['grid', 'colors', 'preset', 'bgTolerance'].forEach(id => $(id).oninput = draw);
$('png').onclick = () => {
  const a = document.createElement('a');
  a.href = pat.toDataURL('image/png');
  a.download = 'pet-bead-easy-pattern.png';
  a.click();
};
$('pdf').onclick = () => {
  const w = window.open('', '_blank');
  const { total, rows } = purchaseRows();
  const list = rows.map(row => `<li><b>${row[2]} → ${row[3]}</b> ${row[4]}：${row[5]} 颗</li>`).join('');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>MARD 221 色号体系图纸</title><style>body{font-family:system-ui,"PingFang SC",sans-serif;margin:24px}img{max-width:760px;width:100%;image-rendering:pixelated}small{color:#555}</style><h1>宠物拼豆图纸·易拼版</h1><p>${MARD_221.colorSystem}｜${MARD_221.beadSizeMm} mm｜${total} 颗／${palette.length} 色</p><img src="${coordinateGridDataUrl()}" alt="带坐标的拼豆格子图纸"><h2>市售下单核对代码</h2><ul>${list}</ul><small>每个可见格子均映射至源色号和零填充市售代码。公开资料仅支持同色号体系／2.6 mm 市售线索；卖家、原厂身份、库存、批次和实物色差必须在下单前核对。</small>`);
  w.document.close();
  w.print();
};
$('shoppingCsv').onclick = downloadShoppingList;
$('gridCsv').onclick = downloadGridCsv;

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}

$('storyPack').onclick = () => {
  const outputs = [
    [src, 'process-01-source-analysis.png'],
    [ordinary, 'process-02-detail-pattern.png'],
    [pat, 'process-03-easy-pattern.png'],
    [beadsDetail, 'process-04-detail-preview.png'],
    [beadsEasy, 'process-05-easy-preview.png'],
  ];
  outputs.forEach(([canvas, filename], index) => {
    window.setTimeout(() => downloadCanvas(canvas, filename), index * 180);
  });
  $('status').textContent = '已生成 5 张同源过程图；浏览器若拦截多文件下载，请允许本地页面下载多个文件。';
};

setStep(1);
