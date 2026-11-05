const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

async function api(action, body, query = '') {
  const res = await fetch('api.php?action=' + action + query,
    body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || 'Terjadi kesalahan');
  return d;
}
function toast(m) {
  const t = $('#toast'); t.textContent = m; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500);
}
const fail = e => toast('Gagal: ' + e.message);
const badge = t => `<span class="st ${t === 'DIIZINKAN' ? 'ok' : 'bad'}">${t}</span>`;

let fwOn = localStorage.getItem('fw') !== 'off';
let hist = { a: [], b: [] }, last = null;

/* ---------- Navigasi ---------- */
async function show(v) {
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  document.querySelectorAll('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
  const loaders = { dashboard: refreshDash, rules: loadRules, logs: loadLogs, bl: loadBL, sim: async () => {} };
  try { await loaders[v](); } catch (e) { fail(e); }
}document.querySelectorAll('.nav button').forEach(b => b.onclick = () => show(b.dataset.v));
$('#to-logs').onclick = e => { e.preventDefault(); show('logs'); };

/* ---------- Header ---------- */
function renderFw() {
  $('#fw-label').textContent = fwOn ? 'AKTIF (ALLOW-LIST)' : 'NONAKTIF';
  $('#fw-label').className = fwOn ? 'ok' : 'bad';
  $('#fw-btn').textContent = fwOn ? 'Matikan Firewall' : 'Aktifkan Firewall';
  $('#fw-btn').className = 'btn ' + (fwOn ? 'ok-btn' : 'bad-btn');
}
$('#fw-btn').onclick = () => { fwOn = !fwOn; localStorage.setItem('fw', fwOn ? 'on' : 'off'); renderFw(); toast(fwOn ? 'Firewall diaktifkan' : 'Firewall dinonaktifkan'); };
setInterval(() => $('#clock').textContent = new Date().toISOString().substr(11, 8) + ' UTC', 1000);

function resources() {  // data simulasi
  const cpu = ri(10, 30), mem = ri(38, 48);
  $('#cpu').textContent = cpu + '%'; $('#cpu-b').style.width = cpu + '%';
  $('#mem').textContent = mem + '%'; $('#mem-b').style.width = mem + '%';
  $('#bw').textContent = (Math.random() * 2 + 0.5).toFixed(1) + ' MB/s';
}
setInterval(resources, 3000);

/* ---------- Dashboard ---------- */
function drawChart() {
  const c = $('#chart'), w = c.width = c.parentElement.clientWidth - 32, h = c.height = 220, x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  const mx = Math.max(5, ...hist.a, ...hist.b);
  x.strokeStyle = '#1a2538'; x.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = 10 + i * (h - 30) / 4; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  [[hist.a, '#34d399'], [hist.b, '#f43f5e']].forEach(([d, col]) => {
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath();
    d.forEach((v, i) => { const px = i * w / 29, py = h - 20 - v / mx * (h - 30); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.stroke();
  });
}
async function refreshDash() {
  const s = await api('stats');
  $('#s-total').textContent = fmt(s.total);
  $('#s-allow').textContent = fmt(s.allowed);
  $('#s-block').textContent = fmt(s.blocked);
  $('#s-rules').textContent = s.aktif;
  $('#s-rate').textContent = 'Tingkat Kelulusan: ' + (s.total ? (s.allowed / s.total * 100).toFixed(1) : '0') + '%';
  $('#s-rsub').textContent = s.allow_n + ' Allow / ' + s.block_n + ' Block';
  $('#rule-badge').textContent = s.aktif;
  if (last) { hist.a.push(s.allowed - last.allowed); hist.b.push(s.blocked - last.blocked); }
  last = s; hist.a = hist.a.slice(-30); hist.b = hist.b.slice(-30);
  drawChart();
  const lv = s.recent_blocked < 10 ? ['RENDAH', 'low'] : s.recent_blocked < 30 ? ['SEDANG', 'mid'] : ['TINGGI', 'high'];
  $('#threat').textContent = lv[0]; $('#threat').className = 'lv ' + lv[1];

  const tp = await api('top_ports'), mx = Math.max(1, ...tp.map(p => +p.jumlah));
  $('#ports').innerHTML = tp.length ? tp.map(p =>
    `<div class="pbar"><span>:${p.port}</span><i><u style="width:${p.jumlah / mx * 100}%"></u></i><b>${p.jumlah}</b></div>`).join('')
    : '<div class="empty">Belum ada data</div>';

  const rc = await api('logs', null, '&limit=5');
  $('#recent').innerHTML = rc.length ? rc.map(l =>
    `<tr><td class="mono">${esc(l.waktu.substr(11))}</td><td class="mono">${esc(l.ip_sumber)}</td><td class="mono">${l.port_tujuan}</td><td>${esc(l.jenis_aktivitas)}</td><td>${badge(l.tindakan)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">Belum ada peringatan</td></tr>';
}
setInterval(() => { if (!$('#v-dashboard').hidden) refreshDash().catch(() => {}); }, 2000);

/* ---------- Aturan Firewall ---------- */
async function loadRules() {
  const r = await api('rules');
  $('#rules').innerHTML = r.length ? r.map(x => `<tr>
    <td>${x.id}</td><td>${esc(x.nama)}</td><td class="mono">${esc(x.ip_address)}</td><td class="mono">${esc(x.port)}</td>
    <td><span class="st ${x.aksi === 'ALLOW' ? 'ok' : 'bad'}">${x.aksi}</span></td>
    <td><button class="sw ${x.aktif == 1 ? 'on' : ''}" onclick="toggleRule(${x.id})" title="Aktif/Nonaktif"></button></td>
    <td><button class="btn bad-btn" onclick="delRule(${x.id})">Hapus</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Belum ada aturan</td></tr>';
}
async function toggleRule(id) { try { await api('rule_toggle', { id }); loadRules(); } catch (e) { fail(e); } }
async function delRule(id) { if (!confirm('Hapus aturan ini?')) return; try { await api('rule_delete', { id }); loadRules(); toast('Aturan dihapus'); } catch (e) { fail(e); } }
$('#rule-form').onsubmit = async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  try { await api('rule_add', f); e.target.reset(); e.target.ip.value = '*'; e.target.port.value = '*'; loadRules(); toast('Aturan ditambahkan'); } catch (err) { fail(err); }
};

/* ---------- Simulasi ---------- */
const ATT = ['45.133.1.77', '185.220.101.4', '103.28.12.9'];
const SC = {
  normal: () => Array.from({ length: 6 }, () => ({
    ip: Math.random() < .6 ? '192.168.1.' + ri(2, 200) : '36.72.' + ri(1, 250) + '.' + ri(1, 250),
    port: rnd([80, 443, 53, 22, 8080]), jenis: 'Akses Normal' })),
  scan: () => { const ip = rnd(ATT); return [21, 22, 23, 25, 445, 3306, 3389, 8080].map(port => ({ ip, port, jenis: 'Port Scan' })); },
  brute: () => { const ip = rnd(ATT); return Array.from({ length: 8 }, () => ({ ip, port: 22, jenis: 'Brute Force SSH' })); },
  flood: () => Array.from({ length: 10 }, () => ({ ip: rnd(ATT), port: 3389, jenis: 'SYN Flood (RDP)' }))
};
let running = false, simA = 0, simB = 0;
function feed(p, r) {
  r.status === 'DIIZINKAN' ? simA++ : simB++;
  $('#sim-a').textContent = simA; $('#sim-b').textContent = simB;
  const d = document.createElement('div');
  d.innerHTML = `[${esc(r.waktu)}] ${esc(p.ip)}:${p.port} ${esc(p.jenis)} &rarr; ${badge(r.status)} <span style="color:var(--mut)">${esc(r.keterangan)}</span>`;
  $('#feed').prepend(d);
}
async function send(p) { const r = await api('simulate', { ...p, fw: fwOn }); feed(p, r); }
document.querySelectorAll('[data-sc]').forEach(b => b.onclick = async () => {
  if (running) return toast('Simulasi sedang berjalan');
  running = true;
  try { for (const p of SC[b.dataset.sc]()) { await send(p); await sleep(250); } } catch (e) { fail(e); }
  running = false;
});
$('#sim-form').onsubmit = async e => {
  e.preventDefault();
  try { await send({ ip: e.target.ip.value.trim(), port: +e.target.port.value, jenis: 'Paket Manual' }); } catch (err) { fail(err); }
};

/* ---------- Log ---------- */
async function loadLogs() {
  const l = await api('logs', null, '&limit=200&filter=' + $('#log-filter').value);
  $('#logs').innerHTML = l.length ? l.map(x => `<tr><td class="mono">${esc(x.waktu)}</td><td class="mono">${esc(x.ip_sumber)}</td><td class="mono">${x.port_tujuan}</td><td>${esc(x.jenis_aktivitas)}</td><td>${badge(x.tindakan)}</td><td>${esc(x.keterangan)}</td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">Log kosong</td></tr>';
}
$('#log-filter').onchange = () => loadLogs().catch(fail);
$('#log-refresh').onclick = () => loadLogs().catch(fail);
$('#log-clear').onclick = async () => { if (!confirm('Hapus semua log?')) return; try { await api('logs_clear', {}); loadLogs(); toast('Log dihapus'); } catch (e) { fail(e); } };

/* ---------- Blacklist ---------- */
async function loadBL() {
  const b = await api('bl');
  $('#bls').innerHTML = b.length ? b.map(x => `<tr><td>${x.id}</td><td class="mono">${esc(x.ip_address)}</td><td>${esc(x.alasan)}</td><td class="mono">${esc(x.created_at)}</td>
    <td><button class="btn bad-btn" onclick="delBL(${x.id})">Hapus</button></td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">Blacklist kosong</td></tr>';
}
async function delBL(id) { try { await api('bl_delete', { id }); loadBL(); toast('IP dihapus dari blacklist'); } catch (e) { fail(e); } }
$('#bl-form').onsubmit = async e => {
  e.preventDefault();
  try { await api('bl_add', { ip: e.target.ip.value.trim(), alasan: e.target.alasan.value }); e.target.reset(); loadBL(); toast('IP ditambahkan ke blacklist'); } catch (err) { fail(err); }
};

/* ---------- Init ---------- */
renderFw(); resources(); show('dashboard');