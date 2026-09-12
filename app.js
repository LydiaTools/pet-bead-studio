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
  $('png').disabled = $('pdf').disabled = $('storyPack').disabled = false;
  $('clearOutline').disabled = !outline.length;
  $('status').textContent = invalidOutline
    ? '主体轮廓太小或无效，未应用；请清除后沿宠物外缘重画。'
    : outline.length >= 6
    ? `两版已生成；主体轮廓已保留 ${outline.length} 个控制点。`
    : outline.length
    ? `主体轮廓还需 ${6 - outline.length} 个点才会应用；请继续沿宠物外缘点选。`
    : backgroundSamples.length
    ? `两版已生成；已按 ${backgroundSamples.length} 个背景样本清除边缘连通背景。`
    : pins.length
      ? '两版已生成，并锁定了识别点颜色。'
    : '两版已生成；可点击左图锁定眼睛、鼻口或花纹颜色。';
};

function quantize(pts, k, pins = []) {
  if (!pts.length) return pins.length ? pins.slice(0, k) : [[255, 255, 255]];
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
  return cent;
}

function nearest(p, arr) {
  let best = 0;
  let d = Infinity;
  arr.forEach((q, i) => {
    const x = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    if (x < d) { d = x; best = i; }
  });
  return best;
}

function rgb(i) { return `rgb(${palette[i].join(',')})`; }

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
    c.fillStyle = `rgb(${colors[v].join(',')})`;
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
    const fill = `rgb(${colors[v].join(',')})`;
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
  $('stats').innerHTML = `<p><b>细节版：</b>${detailTotal} 颗／${detailPalette.length} 色　<b>易拼版：</b>${easyTotal} 颗／${palette.length} 色</p>`
    + counts.map((n, i) => `<span class="swatch"><i class="dot" style="background:${rgb(i)}"></i>易拼通用色 ${i + 1}：${n} 颗</span>`).join('');
}

function loadImage(url) {
  features = [];
  outline = [];
  image = new Image();
  image.onload = draw;
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
  if (!image) return;
  const r = src.getBoundingClientRect();
  const x = Math.round((e.clientX - r.left) * 480 / r.width);
  const y = Math.round((e.clientY - r.top) * 480 / r.height);
  const name = $('feature').value;
  if (name === '主体轮廓') {
    if (outline.length === 16) { $('status').textContent = '主体轮廓最多 16 个点；请清除后重画。'; return; }
    outline.push({ x, y });
    draw();
    return;
  }
  const edge = 72;
  if (name === '背景' && x > edge && x < 480 - edge && y > edge && y < 480 - edge) {
    $('status').textContent = '背景取样只能点画面边缘，避免误删宠物；请点靠近边框的背景。';
    return;
  }
  const sameType = features.filter(feature => feature.name === name);
  if (sameType.length === 3) features.splice(features.indexOf(sameType[0]), 1);
  features.push({ x, y, name });
  draw();
};
$('clearOutline').onclick = () => { outline = []; draw(); };
['grid', 'colors', 'preset', 'bgTolerance'].forEach(id => $(id).oninput = draw);
$('png').onclick = () => {
  const a = document.createElement('a');
  a.href = pat.toDataURL('image/png');
  a.download = 'pet-bead-easy-pattern.png';
  a.click();
};
$('pdf').onclick = () => {
  const w = window.open('', '_blank');
  const total = cells.filter(x => x >= 0).length;
  w.document.write(`<img src="${pat.toDataURL('image/png')}" style="width:100%"><h1>宠物拼豆图纸·易拼版</h1><p>通用颜色统计：${total} 颗／${palette.length} 色。请在打印窗口选择“存储为 PDF”。</p>`);
  w.document.close();
  w.print();
};

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
