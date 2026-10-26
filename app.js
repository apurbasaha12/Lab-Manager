// LabStock – vanilla JS + LocalStorage. All demo quantities are fictional.
const KEY = 'labstock_v1';
const CATS = ['Development Boards', 'Passive Components', 'Sensors & Modules', 'Prototyping', 'Test & Measurement', 'Tools & Accessories'];
let db = { items: [], tx: [] };          // the whole app state
const $ = s => document.querySelector(s);

// ---------- helpers ----------
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avail = i => i.total - i.issued;                       // Available = Total - Issued
const status = i => avail(i) <= 0 ? 'out' : avail(i) <= i.min ? 'low' : 'ok';
const badge = i => `<span class="badge ${status(i)}">${{ ok: 'In stock', low: 'Low stock', out: 'Out of stock' }[status(i)]}</span>`;
const isInt = v => Number.isInteger(v) && v >= 0;
const findItem = id => db.items.find(i => i.id === id);
const daysOverdue = t => Math.floor((new Date(todayStr()) - new Date(t.due)) / 864e5);
const overdueList = () => db.tx.filter(t => t.type === 'Issue' && t.outstanding > 0 && t.due && t.due < todayStr());
function toast(msg, isError) {
  const t = $('#toast'); t.textContent = msg; t.className = isError ? 'error' : '';
  t.style.display = 'block'; clearTimeout(toast.timer); toast.timer = setTimeout(() => t.style.display = 'none', 3000);
}

// ---------- storage ----------
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save data.', true); } }
function validData(d) {
  return d && Array.isArray(d.items) && Array.isArray(d.tx) && d.items.every(i =>
    i && typeof i.id === 'string' && typeof i.name === 'string' && isInt(i.total) && isInt(i.issued) && i.issued <= i.total && isInt(i.min));
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (validData(d)) { db = d; return; } } catch (e) { /* fall through */ }
  seed();
}
function seed() {
  // [name, model, categoryIndex, unit, total, min, location, reusable?]
  const S = [
    ['Arduino Uno R3', 'A000066', 0, 'pcs', 20, 4, 'Shelf A1', 1], ['Arduino Nano', 'A000005', 0, 'pcs', 15, 3, 'Shelf A1', 1],
    ['ESP32 DevKit', 'ESP32-WROOM-32', 0, 'pcs', 12, 3, 'Shelf A2', 1], ['ESP8266 NodeMCU', 'ESP-12E', 0, 'pcs', 10, 3, 'Shelf A2', 1],
    ['Raspberry Pi 4', 'RPI4-4GB', 0, 'pcs', 6, 2, 'Cabinet B1', 1], ['Raspberry Pi Pico', 'RP2040', 0, 'pcs', 8, 2, 'Cabinet B1', 1],
    ['Resistor 220 ohm', '1/4W', 1, 'pcs', 500, 100, 'Drawer C1', 0], ['Resistor 10k ohm', '1/4W', 1, 'pcs', 400, 100, 'Drawer C1', 0],
    ['Capacitor 100uF', '25V electrolytic', 1, 'pcs', 150, 40, 'Drawer C2', 0], ['Capacitor 0.1uF', 'Ceramic', 1, 'pcs', 200, 50, 'Drawer C2', 0],
    ['LED Red 5mm', 'LED-R5', 1, 'pcs', 300, 60, 'Drawer C3', 0], ['LED Green 5mm', 'LED-G5', 1, 'pcs', 40, 60, 'Drawer C3', 0],
    ['Diode', '1N4007', 1, 'pcs', 100, 25, 'Drawer C4', 0], ['Transistor', 'BC547', 1, 'pcs', 120, 30, 'Drawer C4', 0],
    ['Potentiometer 10k', 'RV09', 1, 'pcs', 60, 15, 'Drawer C5', 0], ['Push button', '6mm tactile', 1, 'pcs', 150, 30, 'Drawer C5', 0],
    ['Inductor 100uH', 'Axial', 1, 'pcs', 30, 10, 'Drawer C6', 0],
    ['Ultrasonic sensor', 'HC-SR04', 2, 'pcs', 25, 5, 'Shelf D1', 1], ['Temp/humidity sensor', 'DHT22', 2, 'pcs', 18, 4, 'Shelf D1', 1],
    ['IR sensor module', 'FC-51', 2, 'pcs', 20, 5, 'Shelf D2', 1], ['PIR motion sensor', 'HC-SR501', 2, 'pcs', 14, 4, 'Shelf D2', 1],
    ['Accelerometer/gyroscope', 'MPU6050', 2, 'pcs', 10, 3, 'Shelf D3', 1], ['RFID reader', 'RC522', 2, 'pcs', 8, 2, 'Shelf D3', 1],
    ['GPS module', 'NEO-6M', 2, 'pcs', 5, 2, 'Shelf D4', 1], ['Relay module', '5V 1-channel', 2, 'pcs', 12, 3, 'Shelf D4', 1],
    ['Motor driver', 'L298N', 2, 'pcs', 9, 3, 'Shelf D4', 1],
    ['Breadboard', '830 points', 3, 'pcs', 30, 6, 'Shelf E1', 1], ['Jumper wires', 'M-M 20cm pack', 3, 'packs', 35, 10, 'Shelf E2', 0],
    ['PCB board', 'Perfboard 7x9', 3, 'pcs', 50, 15, 'Shelf E2', 0], ['USB cable', 'Type-A to B', 3, 'pcs', 20, 5, 'Shelf E3', 1],
    ['Digital multimeter', 'DT830B', 4, 'pcs', 8, 2, 'Cabinet F1', 1], ['Oscilloscope', 'DSO-100MHz', 4, 'pcs', 3, 1, 'Bench G1', 1],
    ['Function generator', 'FG-10MHz', 4, 'pcs', 2, 1, 'Bench G1', 1], ['DC power supply', '30V 5A', 4, 'pcs', 4, 1, 'Bench G2', 1],
    ['Clamp meter', 'DT266', 4, 'pcs', 2, 1, 'Cabinet F1', 1], ['Soldering iron', '60W', 5, 'pcs', 10, 2, 'Cabinet H1', 1],
    ['Wire stripper', 'Auto', 5, 'pcs', 8, 2, 'Cabinet H1', 1], ['Screwdriver set', '24-piece', 5, 'sets', 6, 2, 'Cabinet H2', 1],
    ['Tweezers', 'ESD', 5, 'pcs', 12, 3, 'Cabinet H2', 1], ['Component storage box', '24-grid', 5, 'pcs', 15, 3, 'Shelf E3', 1]
  ];
  db = { items: S.map((r, n) => ({ id: 'LS-' + String(n + 1).padStart(3, '0'), name: r[0], model: r[1], category: CATS[r[2]], unit: r[3], total: r[4], issued: 0, min: r[5], location: r[6], type: r[7] ? 'Reusable' : 'Consumable' })), tx: [] };
  // a few sample issues; one is overdue so the alerts can be demonstrated
  doIssue('DEMO-101', 'LS-001', 3, addDays(-12), addDays(-5), 'Demo overdue', 'track');
  doIssue('DEMO-102', 'LS-030', 1, addDays(-2), addDays(5), 'Demo', 'track');
  doIssue('DEMO-103', 'LS-007', 50, addDays(-1), '', 'Demo consumed', 'consume');
  save();
}

// ---------- core business logic (returns an error string, or '' on success) ----------
function nextTxId() { return 'T-' + String(db.tx.length + 1).padStart(4, '0'); }
function doIssue(student, itemId, qty, date, due, remarks, mode) {
  const item = findItem(itemId);
  if (!student.trim()) return 'Enter a student name or ID.';
  if (!item) return 'Select an item.';
  if (!Number.isInteger(qty) || qty < 1) return 'Quantity must be a whole number of at least 1.';
  if (qty > avail(item)) return `Only ${avail(item)} ${item.unit} available.`;
  if (!date) return 'Choose an issue date.';
  if (mode === 'track' && (!due || due < date)) return 'Expected return date must be on or after the issue date.';
  if (mode === 'track') item.issued += qty; else item.total -= qty;   // consumed units leave the stock
  db.tx.push({ id: nextTxId(), time: date + ' ' + new Date().toTimeString().slice(0, 5), student: student.trim(), itemId, itemName: item.name,
    type: mode === 'track' ? 'Issue' : 'Consumed', qty, due: mode === 'track' ? due : '', outstanding: mode === 'track' ? qty : 0, remarks: remarks.trim() });
  return '';
}
function doReturn(txId, qty, remarks) {
  const t = db.tx.find(x => x.id === txId && x.type === 'Issue');
  if (!t || t.outstanding < 1) return 'Select an outstanding issue.';
  if (!Number.isInteger(qty) || qty < 1) return 'Quantity must be a whole number of at least 1.';
  if (qty > t.outstanding) return `Only ${t.outstanding} still outstanding for this issue.`;
  const item = findItem(t.itemId);
  if (item) item.issued -= qty;
  t.outstanding -= qty;                                    // prevents returning the same units twice
  db.tx.push({ id: nextTxId(), time: todayStr() + ' ' + new Date().toTimeString().slice(0, 5), student: t.student, itemId: t.itemId, itemName: t.itemName,
    type: 'Return', qty, due: '', outstanding: 0, remarks: `Ref ${t.id}. ${remarks.trim()}` });
  return '';
}

// ---------- rendering ----------
const rows = (arr, empty) => arr.length ? arr.join('') : `<tr><td colspan="9" class="empty">${empty}</td></tr>`;
function txRow(t) { return `<tr><td>${t.id}</td><td>${esc(t.time)}</td><td>${esc(t.student)}</td><td>${t.itemId} ${esc(t.itemName)}</td><td>${t.type}</td><td>${t.qty}</td><td>${esc(t.due)}</td><td>${esc(t.remarks)}</td></tr>`; }
const TXHEAD = '<tr><th>ID</th><th>Date/time</th><th>Student</th><th>Item</th><th>Type</th><th>Qty</th><th>Due</th><th>Remarks</th></tr>';

function renderDashboard() {
  const avl = db.items.reduce((s, i) => s + avail(i), 0), iss = db.items.reduce((s, i) => s + i.issued, 0);
  const low = db.items.filter(i => status(i) !== 'ok').length, od = overdueList().length;
  $('#cards').innerHTML = `<div class="card"><b>${db.items.length}</b>Item types</div><div class="card good"><b>${avl}</b>Available units</div>
    <div class="card"><b>${iss}</b>Issued units</div><div class="card warn"><b>${low}</b>Low / out of stock</div><div class="card bad"><b>${od}</b>Overdue returns</div>`;
  $('#recentTable').innerHTML = TXHEAD + rows(db.tx.slice(-6).reverse().map(txRow), 'No transactions yet.');
}
function renderInventory() {
  const q = $('#invSearch').value.toLowerCase(), c = $('#invCat').value, s = $('#invStatus').value;
  const list = db.items.filter(i => (!c || i.category === c) && (!s || status(i) === s) &&
    [i.id, i.name, i.model, i.category].join(' ').toLowerCase().includes(q));
  $('#invTable').innerHTML = '<tr><th>ID</th><th>Name</th><th>Model</th><th>Category</th><th>Total</th><th>Issued</th><th>Available</th><th>Min</th><th>Location</th><th>Type</th><th>Status</th><th></th></tr>' +
    list.map(i => `<tr><td>${esc(i.id)}</td><td>${esc(i.name)}</td><td>${esc(i.model)}</td><td>${esc(i.category)}</td><td>${i.total} ${esc(i.unit)}</td><td>${i.issued}</td><td><b>${avail(i)}</b></td><td>${i.min}</td><td>${esc(i.location)}</td><td>${i.type}</td><td>${badge(i)}</td>
    <td><button class="small" data-edit="${esc(i.id)}">Edit</button> <button class="small" data-del="${esc(i.id)}">Delete</button></td></tr>`).join('');
  $('#invEmpty').hidden = list.length > 0;
}
function renderIssueForms() {
  const keep = $('#isItem').value;
  $('#isItem').innerHTML = '<option value="">-- select item --</option>' + db.items.filter(i => avail(i) > 0)
    .map(i => `<option value="${esc(i.id)}">${esc(i.id)} – ${esc(i.name)} (${avail(i)} ${esc(i.unit)} avail.)</option>`).join('');
  $('#isItem').value = keep;
  const open = db.tx.filter(t => t.type === 'Issue' && t.outstanding > 0);
  $('#rtTx').innerHTML = open.length ? open.map(t => `<option value="${t.id}">${t.id} – ${esc(t.student)} – ${esc(t.itemName)} (${t.outstanding} out)</option>`).join('') : '<option value="">No outstanding issues</option>';
}
function renderHistory() {
  const q = $('#hSearch').value.toLowerCase(), ty = $('#hType').value, d = $('#hDate').value;
  const list = db.tx.filter(t => (!ty || t.type === ty) && (!d || t.time.startsWith(d)) &&
    [t.student, t.itemId, t.itemName, t.id].join(' ').toLowerCase().includes(q)).reverse();
  $('#histTable').innerHTML = TXHEAD + list.map(txRow).join('');
  $('#histEmpty').hidden = list.length > 0;
}
function renderAlerts() {
  $('#lowTable').innerHTML = '<tr><th>ID</th><th>Item</th><th>Available</th><th>Minimum</th><th>Status</th></tr>' +
    rows(db.items.filter(i => status(i) !== 'ok').map(i => `<tr><td>${i.id}</td><td>${esc(i.name)}</td><td>${avail(i)}</td><td>${i.min}</td><td>${badge(i)}</td></tr>`), 'All items sufficiently stocked.');
  $('#overTable').innerHTML = '<tr><th>Item</th><th>Student</th><th>Outstanding</th><th>Expected return</th><th>Days overdue</th></tr>' +
    rows(overdueList().map(t => `<tr><td>${esc(t.itemName)}</td><td>${esc(t.student)}</td><td>${t.outstanding}</td><td>${t.due}</td><td><b>${daysOverdue(t)}</b></td></tr>`), 'No overdue returns.');
}
function renderAll() { renderDashboard(); renderInventory(); renderIssueForms(); renderHistory(); renderAlerts(); }

// ---------- navigation ----------
$('#nav').addEventListener('click', e => {
  const p = e.target.dataset.page; if (!p) return;
  document.querySelectorAll('.page').forEach(s => s.hidden = s.id !== p);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b === e.target));
});
['#invSearch', '#invCat', '#invStatus'].forEach(s => $(s).addEventListener('input', renderInventory));
['#hSearch', '#hType', '#hDate'].forEach(s => $(s).addEventListener('input', renderHistory));

// ---------- add / edit / delete items ----------
let editingId = null;
$('#addBtn').onclick = () => openDialog(null);
function openDialog(id) {
  editingId = id; const i = id ? findItem(id) : { id: 'LS-' + String(db.items.length + 1).padStart(3, '0'), name: '', model: '', category: CATS[0], unit: 'pcs', total: 0, min: 0, location: '', type: 'Reusable' };
  $('#dlgTitle').textContent = id ? 'Edit item' : 'Add item';
  $('#fId').value = i.id; $('#fId').disabled = !!id; $('#fName').value = i.name; $('#fModel').value = i.model; $('#fCat').value = i.category;
  $('#fUnit').value = i.unit; $('#fTotal').value = i.total; $('#fMin').value = i.min; $('#fLoc').value = i.location; $('#fType').value = i.type; $('#fErr').textContent = '';
  $('#itemDlg').showModal();
}
$('#fCancel').onclick = () => $('#itemDlg').close();
$('#itemForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('#fId').value.trim(), total = Number($('#fTotal').value), min = Number($('#fMin').value), name = $('#fName').value.trim();
  const err = !id ? 'Item ID is required.' : !name ? 'Item name is required.' : !isInt(total) ? 'Total quantity must be a whole number, 0 or more.'
    : !isInt(min) ? 'Minimum threshold must be a whole number, 0 or more.' : (!editingId && findItem(id)) ? 'That item ID already exists.'
    : (editingId && total < findItem(editingId).issued) ? `Total cannot be below the ${findItem(editingId).issued} units currently issued.` : '';
  if (err) { $('#fErr').textContent = err; return; }
  const data = { id, name, model: $('#fModel').value.trim(), category: $('#fCat').value, unit: $('#fUnit').value.trim() || 'pcs', total, min, location: $('#fLoc').value.trim(), type: $('#fType').value };
  if (editingId) Object.assign(findItem(editingId), data); else db.items.push({ ...data, issued: 0 });
  save(); renderAll(); $('#itemDlg').close(); toast(editingId ? 'Item updated.' : 'Item added.');
});
$('#invTable').addEventListener('click', e => {
  if (e.target.dataset.edit) openDialog(e.target.dataset.edit);
  if (e.target.dataset.del) {
    const i = findItem(e.target.dataset.del);
    if (i.issued > 0) return toast(`Cannot delete: ${i.issued} unit(s) still issued.`, true);
    if (confirm(`Delete "${i.name}"? This cannot be undone.`)) { db.items = db.items.filter(x => x !== i); save(); renderAll(); toast('Item deleted.'); }
  }
});

// ---------- issue / return forms ----------
$('#isDate').value = todayStr(); $('#isDue').value = addDays(7);
function syncMode() { $('#dueLabel').hidden = $('#isMode').value !== 'track'; }
$('#isMode').onchange = syncMode;
$('#isItem').onchange = () => { const i = findItem($('#isItem').value); if (i) { $('#isMode').value = i.type === 'Reusable' ? 'track' : 'consume'; syncMode(); } };
$('#issueForm').addEventListener('submit', e => {
  e.preventDefault();
  const err = doIssue($('#isStudent').value, $('#isItem').value, Number($('#isQty').value), $('#isDate').value, $('#isDue').value, $('#isRemarks').value, $('#isMode').value);
  if (err) return toast(err, true);
  save(); renderAll(); e.target.reset(); $('#isDate').value = todayStr(); $('#isDue').value = addDays(7); syncMode(); toast('Equipment issued.');
});
$('#returnForm').addEventListener('submit', e => {
  e.preventDefault();
  const err = doReturn($('#rtTx').value, Number($('#rtQty').value), $('#rtRemarks').value);
  if (err) return toast(err, true);
  save(); renderAll(); $('#rtQty').value = 1; $('#rtRemarks').value = ''; toast('Return recorded.');
});

// ---------- CSV export ----------
function downloadCsv(name, header, data) {
  const cell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [header, ...data].map(r => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$('#exportInv').onclick = () => downloadCsv('inventory.csv', ['ID', 'Name', 'Model', 'Category', 'Unit', 'Total', 'Issued', 'Available', 'Min', 'Location', 'Type'],
  db.items.map(i => [i.id, i.name, i.model, i.category, i.unit, i.total, i.issued, avail(i), i.min, i.location, i.type]));
$('#exportTx').onclick = () => downloadCsv('transactions.csv', ['ID', 'DateTime', 'Student', 'ItemID', 'Item', 'Type', 'Qty', 'ExpectedReturn', 'Remarks'],
  db.tx.map(t => [t.id, t.time, t.student, t.itemId, t.itemName, t.type, t.qty, t.due, t.remarks]));

// ---------- reset ----------
$('#resetBtn').onclick = () => {
  if (confirm('Reset ALL data to the demo data? Your changes will be lost.') && prompt('Type RESET to confirm:') === 'RESET') { seed(); renderAll(); toast('Demo data restored.'); }
};

// ---------- start ----------
['#invCat', '#fCat'].forEach(s => $(s).innerHTML = (s === '#invCat' ? '<option value="">All categories</option>' : '') + CATS.map(c => `<option>${c}</option>`).join(''));
load(); syncMode(); renderAll();
