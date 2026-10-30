/* MAK(e) It Happen client portal: shared data layer and helpers, the client view (index.html)
   and Mak's admin view (admin.html). Runs on sample data until config.js has Supabase keys. */
(function () {
'use strict';

const CFG = window.PORTAL_CONFIG || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const BUCKET = 'portal-files';
const MAX_FILE = 20 * 1048576;

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 864e5;
const localISO = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const todayISO = () => localISO(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return localISO(d); };
const daysUntil = iso => Math.round((new Date(iso + 'T12:00') - new Date(todayISO() + 'T12:00')) / DAY);
const fmtDate = (iso, o) => iso ? new Date(String(iso).slice(0, 10) + 'T12:00').toLocaleDateString('en-US', o || { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const fmtDateTime = v => v ? new Date(v).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const money = v => { const n = Number(v) || 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const isReviewStep = m => /share your experience|recap and feedback/i.test(m.title || '');
const reviewBtn = () => CFG.REVIEW_URL ? `<a class="btn sm primary" href="${esc(CFG.REVIEW_URL)}" target="_blank" rel="noopener" style="margin-top:8px">★ Leave a Google review</a>` : '';
const byDate = k => (a, b) => String(a[k] || '9999').localeCompare(String(b[k] || '9999')) || (a.sort || 0) - (b.sort || 0);
let toastT = 0;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}
function copyText(text, ok) {
  const done = () => toast(ok || 'Copied');
  try { navigator.clipboard.writeText(text).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback() { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy blocked. Select the text and copy it.'); } ta.remove(); }
}
function modal(html) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(bg); document.body.style.overflow = 'hidden';
  const f = bg.querySelector('[data-close], button, input, textarea'); if (f) f.focus();
  return bg.querySelector('.modal');
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); document.body.style.overflow = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
const brandHTML = sub => `<a class="brand" href="${esc(CFG.SITE_URL || '../')}"><span class="m">M</span><span><b>MAK<span>(e)</span> It Happen</b><small>${esc(sub)}</small></span></a>`;

/* ---------- package plans (timeline + payment schedule) ---------- */
// Each step: [when, title, owner, detail]. when = days from the event (negative = before), or 'b+N' = N days after booking.
const COMMON_END = [[0, 'Event day!', 'mak', 'Enjoy every moment. I run the day.'], [1, 'Share your experience', 'client', 'If you loved it, a quick review means the world.']];
const PLANS = {
  'Day-of coordination: events': [
    ['b+0', "You're booked!", 'mak', 'Agreement signed and your date is reserved.'],
    ['b+0', 'Pay your 50% deposit', 'client', 'Your deposit holds your date.'],
    [-30, 'Send your vendor list and event details', 'client', 'Vendor names, contacts and arrival times, plus anything I should know.'],
    [-21, 'Planning call with Mak', 'mak', "We'll walk through your day together."],
    [-14, 'Final guest count and timeline approval due', 'client', 'Due 14 days before your event.'],
    [-14, 'Final payment due', 'client', 'Your remaining balance is due 14 days before your event.'],
    [-7, 'Run of show ready for your review', 'mak', 'Approve it here or request changes.'],
    [-3, 'Vendor confirmations', 'mak', 'I confirm arrival times with every vendor.'],
    ...COMMON_END],
  'Day-of coordination: weddings': [
    ['b+0', "You're booked!", 'mak', 'Agreement signed and your date is reserved.'],
    ['b+0', 'Pay your 50% deposit', 'client', 'Your deposit holds your date.'],
    [-30, 'Send your vendor list and wedding details', 'client', 'Vendor contacts, arrival times, family notes and must-have moments.'],
    [-21, 'Planning call with Mak', 'mak', "We'll walk through your wedding day together."],
    [-14, 'Final guest count and timeline approval due', 'client', 'Due 14 days before your wedding.'],
    [-14, 'Final payment due', 'client', 'Your remaining balance is due 14 days before your wedding.'],
    [-7, 'I take over coordination', 'mak', 'From here, send vendor questions my way.'],
    [-7, 'Run of show ready for your review', 'mak', 'Approve it here or request changes.'],
    [-3, 'Vendor confirmations', 'mak', 'I confirm arrival times with every vendor.'],
    [-1, 'Rehearsal (if booked)', 'mak', ''],
    [0, 'Wedding day!', 'mak', 'Be fully present. I run the day.'], [1, 'Share your experience', 'client', 'If you loved it, a quick review means the world.']],
  'Month-of coordination': [
    ['b+0', "You're booked!", 'mak', 'Agreement signed and your date is reserved.'],
    ['b+0', 'Pay your 50% deposit', 'client', 'Your deposit holds your date.'],
    [-42, 'Kickoff meeting', 'mak', 'I step in 4 to 6 weeks out.'],
    [-35, 'Send your vendor contracts and contacts', 'client', 'So I can confirm every detail.'],
    [-28, 'Vendor confirmations begin', 'mak', ''],
    [-21, 'Venue walkthrough', 'mak', ''],
    [-14, 'Final guest count and timeline approval due', 'client', 'Due 14 days before your event.'],
    [-14, 'Final payment due', 'client', 'Your remaining balance is due 14 days before your event.'],
    [-10, 'Run of show ready for your review', 'mak', 'Approve it here or request changes.'],
    [-1, 'Rehearsal (if booked)', 'mak', ''],
    ...COMMON_END],
  'Full planning & design': [
    ['b+0', "You're booked!", 'mak', 'Agreement signed and your date is reserved.'],
    ['b+0', 'Pay your 50% deposit', 'client', 'Your deposit holds your date.'],
    ['b+7', 'Vision and budget meeting', 'mak', 'We dream big and set the budget.'],
    ['b+21', 'Design concept for your review', 'mak', 'Colors, mood and the overall look.'],
    [-120, 'Book key vendors', 'mak', 'Venue, catering, photo and music first.'],
    [-60, 'Invitations go out', 'client', ''],
    [-45, 'Final design review', 'mak', ''],
    [-30, 'Final vendor details due', 'client', ''],
    [-14, 'Final guest count and timeline approval due', 'client', 'Due 14 days before your event.'],
    [-14, 'Final payment due', 'client', 'Your remaining balance is due 14 days before your event.'],
    [-10, 'Run of show ready for your review', 'mak', 'Approve it here or request changes.'],
    [-1, 'Rehearsal (if booked)', 'mak', ''],
    ...COMMON_END],
  'Corporate & company events': [
    ['b+0', "You're booked!", 'mak', 'Agreement signed and your date is reserved.'],
    ['b+0', 'Pay your 50% deposit', 'client', 'Your deposit holds your date.'],
    [-30, 'Branding and guest experience plan for your review', 'mak', ''],
    [-21, 'Logistics call', 'mak', ''],
    [-14, 'Final headcount and timeline approval due', 'client', 'Due 14 days before your event.'],
    [-14, 'Final payment due', 'client', 'Your remaining balance is due 14 days before your event.'],
    [-7, 'Run of show ready for your review', 'mak', 'Approve it here or request changes.'],
    [-3, 'Vendor confirmations', 'mak', ''],
    [0, 'Event day!', 'mak', 'Your guests are in good hands.'], [1, 'Recap and feedback', 'client', 'Tell me how it went for your team.']],
  'Pop-up & one-off production': [
    ['b+0', "You're booked!", 'mak', 'Agreement signed and your date is reserved.'],
    ['b+0', 'Pay your 50% deposit', 'client', 'Your deposit holds your date.'],
    [-30, 'Concept approval', 'client', ''],
    [-21, 'Production plan for your review', 'mak', ''],
    [-14, 'Final payment due', 'client', 'Your remaining balance is due 14 days before your event.'],
    [-7, 'Run of show ready for your review', 'mak', 'Approve it here or request changes.'],
    [-1, 'Setup and load-in', 'mak', ''],
    ...COMMON_END],
  'Hourly consulting': [['b+0', "You're booked!", 'mak', ''], ...COMMON_END.slice(0, 1)],
};
const PACKAGE_NAMES = Object.keys(PLANS).concat('Other');

function buildPlan(clientId, pkg, eventDate, bookedOn, totalFee) {
  const steps = PLANS[pkg] || PLANS['Day-of coordination: events'];
  const booked = bookedOn || todayISO();
  const at = w => {
    if (typeof w === 'string') return addDays(booked, Number(w.slice(2)) || 0);
    if (!eventDate) return booked;
    const d = addDays(eventDate, w);
    return w < 0 && d < booked ? booked : d;
  };
  const milestones = steps.map(([w, title, owner, detail], i) => ({ id: uid(), client_id: clientId, title, detail, owner, due_date: at(w), done: i === 0, sort: i }));
  const fee = Number(totalFee) || 0, deposit = Math.round(fee / 2 * 100) / 100;
  const balanceDue = eventDate ? (addDays(eventDate, -14) < booked ? booked : addDays(eventDate, -14)) : booked;
  const payments = fee ? [
    { id: uid(), client_id: clientId, label: '50% deposit', amount: deposit, due_date: booked, paid_on: null, method: '' },
    { id: uid(), client_id: clientId, label: 'Final balance', amount: Math.round((fee - deposit) * 100) / 100, due_date: balanceDue, paid_on: null, method: '' },
  ] : [];
  return { milestones, payments };
}

/* ---------- data stores ---------- */
const TABLES = ['clients', 'milestones', 'reviews', 'comments', 'payments', 'meetings', 'vendors', 'files', 'admin_notes'];

// Sample data in this browser, so the portal can be tried before Supabase is connected.
const Demo = (() => {
  const KEY = 'mak-portal-demo-v1', SKEY = 'mak-portal-demo-session';
  let db = null;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('This browser is out of room for sample files.'); } };
  function seed() {
    const id = uid(), ev = addDays(todayISO(), 96), booked = addDays(todayISO(), -40);
    const plan = buildPlan(id, 'Day-of coordination: weddings', ev, booked, 1400);
    plan.milestones.forEach(m => { if (m.due_date < todayISO()) m.done = true; });
    plan.payments[0].paid_on = booked; plan.payments[0].method = 'Zelle';
    const ros = uid();
    db = {
      clients: [{ id, name: 'Sarah Thompson', partner: 'James Carter', email: 'sarah@example.com', phone: '817-555-0142', event_type: 'Wedding', package: 'Day-of coordination: weddings', event_date: ev, venue: 'The Springs Event Venue, Aledo', guests: 140, total_fee: 1400, booked_on: booked, created_at: new Date().toISOString() }],
      milestones: plan.milestones, payments: plan.payments,
      reviews: [
        { id: ros, client_id: id, title: 'Wedding day run of show (draft 1)', kind: 'run-of-show', status: 'pending', version: 1, link: '', body: { rows: [
          { time: '1:00 PM', title: 'Hair and makeup wraps', notes: 'Bridal suite' }, { time: '2:30 PM', title: 'First look', notes: 'Garden terrace, photographer leads' },
          { time: '4:30 PM', title: 'Guests arrive', notes: 'Welcome drinks on the lawn' }, { time: '5:00 PM', title: 'Ceremony', notes: '25 minutes' },
          { time: '5:30 PM', title: 'Cocktail hour', notes: 'Family photos at the arbor' }, { time: '6:30 PM', title: 'Grand entrance and dinner', notes: '' },
          { time: '7:45 PM', title: 'Toasts and first dance', notes: 'DJ cues the playlist' }, { time: '10:30 PM', title: 'Sparkler exit', notes: '' }] }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: uid(), client_id: id, title: 'Vendor contact sheet', kind: 'document', status: 'approved', version: 1, link: '', body: { text: 'Florist: Petal & Party Co.\nCatering: Devivo Bros\nPhoto: Lauren Rose Photography\nDJ: Spin City Events' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ],
      comments: [{ id: uid(), review_id: ros, author: 'mak', body: "Here's the first draft! Let me know if the timing for the first look works for you two.", created_at: new Date().toISOString() }],
      meetings: [{ id: uid(), client_id: id, title: 'Planning call', starts_at: addDays(todayISO(), 5) + 'T18:00', location: 'Phone', notes: '' }],
      vendors: [
        { id: uid(), client_id: id, category: 'Florist', name: 'Petal & Party Co.', contact: 'Jenna', phone: '817-555-0190', email: '', arrival: '12:00 PM' },
        { id: uid(), client_id: id, category: 'Catering', name: 'Devivo Bros', contact: 'Marco', phone: '817-555-0133', email: '', arrival: '3:00 PM' }],
      files: [], admin_notes: [],
    };
    write();
  }
  function load() { db = read(); if (!db || !db.clients) seed(); TABLES.forEach(t => { db[t] = db[t] || []; }); }
  const ok = v => Promise.resolve(JSON.parse(JSON.stringify(v)));
  return {
    mode: 'demo',
    async getUser() { load(); const s = sessionStorage.getItem(SKEY); return s ? { email: s } : null; },
    async signIn(email) { sessionStorage.setItem(SKEY, email || 'demo'); return { email }; },
    async signUp(email) { sessionStorage.setItem(SKEY, email || 'demo'); return { email, confirm: false }; },
    async signOut() { sessionStorage.removeItem(SKEY); },
    async reset() { return true; },
    async setPassword() { return true; },
    onRecovery() {},
    async isAdmin() { return true; },
    async list(table, clientId) {
      load();
      if (table === 'comments') { const ids = new Set(db.reviews.filter(r => !clientId || r.client_id === clientId).map(r => r.id)); return ok(db.comments.filter(c => ids.has(c.review_id))); }
      return ok(db[table].filter(r => !clientId || (table === 'clients' ? r.id === clientId : r.client_id === clientId)));
    },
    async myClient() { load(); return ok(db.clients[0] || null); },
    async insert(table, row) { load(); const r = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row); db[table].push(r); write(); return ok(r); },
    async insertMany(table, rows) { load(); rows.forEach(r => db[table].push(Object.assign({ created_at: new Date().toISOString() }, r))); write(); return ok(rows); },
    async update(table, id, patch) { load(); const r = db[table].find(x => x.id === id); if (!r) throw new Error('Not found'); Object.assign(r, patch); write(); return ok(r); },
    async remove(table, id) {
      load(); db[table] = db[table].filter(x => x.id !== id);
      if (table === 'clients') TABLES.forEach(t => { if (t !== 'clients' && t !== 'comments') db[t] = db[t].filter(x => x.client_id !== id); });
      if (table === 'reviews') db.comments = db.comments.filter(c => c.review_id !== id);
      write();
    },
    async respond(reviewId, decision, note) {
      load(); const r = db.reviews.find(x => x.id === reviewId); if (!r) throw new Error('Not found');
      r.status = decision; r.updated_at = new Date().toISOString();
      if (note) db.comments.push({ id: uid(), review_id: reviewId, author: 'client', body: note, created_at: new Date().toISOString() });
      write();
    },
    async upload(clientId, file, by) {
      if (file.size > 2 * 1048576) throw new Error('Sample mode only stores files under 2 MB. Real portal files can be up to 20 MB.');
      const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
      return this.insert('files', { client_id: clientId, name: file.name, size: file.size, type: file.type, path: '', data_url: data, uploaded_by: by });
    },
    async getNotes(clientId) { load(); const r = db.admin_notes.find(x => x.client_id === clientId); return r ? r.notes || '' : ''; },
    async saveNotes(clientId, notes) { load(); const r = db.admin_notes.find(x => x.client_id === clientId); if (r) r.notes = notes; else db.admin_notes.push({ client_id: clientId, notes }); write(); },
    async fileUrl(f) { return f.data_url; },
    async removeFile(f) { return this.remove('files', f.id); },
    resetSample() { localStorage.removeItem(KEY); db = null; },
  };
})();

// Real logins and data in Supabase. Row-level security in the database decides who can see what.
const Live = (() => {
  if (!LIVE) return null;
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const must = ({ data, error }) => { if (error) throw error; return data; };
  const here = () => location.href.split('#')[0].split('?')[0];
  return {
    mode: 'live', sb,
    async getUser() { const { data } = await sb.auth.getSession(); return data.session ? { email: data.session.user.email } : null; },
    async signIn(email, password) { must(await sb.auth.signInWithPassword({ email, password })); return { email }; },
    async signUp(email, password) { const d = must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: here() } })); return { email, confirm: !d.session }; },
    async signOut() { await sb.auth.signOut(); },
    async reset(email) { must(await sb.auth.resetPasswordForEmail(email, { redirectTo: here() })); return true; },
    async setPassword(password) { must(await sb.auth.updateUser({ password })); return true; },
    onRecovery(cb) { sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') cb(); }); },
    async isAdmin() { const { data, error } = await sb.rpc('is_admin'); return !error && !!data; },
    async list(table, clientId) {
      let q = sb.from(table).select('*');
      if (clientId && table === 'clients') q = q.eq('id', clientId);
      else if (clientId && table !== 'comments') q = q.eq('client_id', clientId);
      return must(await q);
    },
    async myClient() { return (must(await sb.from('clients').select('*').limit(1)) || [])[0] || null; },
    async insert(table, row) { return must(await sb.from(table).insert(row).select().single()); },
    async insertMany(table, rows) { return rows.length ? must(await sb.from(table).insert(rows).select()) : []; },
    async update(table, id, patch) { return must(await sb.from(table).update(patch).eq('id', id).select().single()); },
    async remove(table, id) { must(await sb.from(table).delete().eq('id', id)); },
    async respond(reviewId, decision, note) { must(await sb.rpc('respond_review', { p_review: reviewId, p_decision: decision, p_note: note || '' })); },
    async upload(clientId, file, by) {
      if (file.size > MAX_FILE) throw new Error(file.name + ' is over 20 MB.');
      const path = clientId + '/' + uid() + '-' + file.name.replace(/[^\w.\- ]+/g, '_');
      must(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream' }));
      return this.insert('files', { client_id: clientId, name: file.name, size: file.size, type: file.type, path, uploaded_by: by });
    },
    async getNotes(clientId) { const r = must(await sb.from('admin_notes').select('notes').eq('client_id', clientId).maybeSingle()); return r ? r.notes || '' : ''; },
    async saveNotes(clientId, notes) { must(await sb.from('admin_notes').upsert({ client_id: clientId, notes, updated_at: new Date().toISOString() })); },
    async fileUrl(f) { return must(await sb.storage.from(BUCKET).createSignedUrl(f.path, 3600)).signedUrl; },
    async removeFile(f) { if (f.path) await sb.storage.from(BUCKET).remove([f.path]); return this.remove('files', f.id); },
  };
})();
const DB = Live || Demo;
const errMsg = e => (e && (e.message || e.error_description)) || 'Something went wrong. Try again.';

/* ---------- shared pieces ---------- */
// Creating a login is by invitation only: clients get it from the link Mak sends (?signup),
// Mak from admin.html?setup. The database also refuses logins for emails that aren't on file.
function authScreen(root, { title, sub, admin, onIn }) {
  const params = new URLSearchParams(location.search);
  const invited = admin ? params.has('setup') : params.has('signup');
  let mode = invited ? 'signup' : 'signin';
  DB.onRecovery(() => { mode = 'newpass'; draw(); });
  function draw(msg, cls) {
    const t = { signin: ['Sign in', 'Sign in'], signup: ['Create your account', 'Create account'], reset: ['Reset your password', 'Send reset link'], newpass: ['Choose a new password', 'Save password'] }[mode];
    root.innerHTML = `<div class="auth"><form class="card" novalidate>
      ${DB.mode === 'demo' ? `<div class="demo-banner">Sample mode: any email and password works. Real logins turn on once Supabase is connected.</div>` : ''}
      <div class="eyebrow">${esc(sub)}</div><h1>${esc(mode === 'signin' ? title : t[0])}</h1>
      ${mode === 'signup' ? `<p class="msg" style="color:var(--muted)">${admin ? 'Use your business email (makeithappenevents.dfw@gmail.com).' : 'Use the email address Mak has on file for you (the one her invite was sent to).'}</p>` : ''}
      ${mode === 'signin' && !invited && !admin ? `<p class="msg" style="color:var(--muted)">The client portal is for booked MAK(e) It Happen clients. Your personal link to create a login comes from Mak once your agreement is signed.</p>` : ''}
      ${mode !== 'newpass' ? `<label class="f">Email<input type="email" name="email" autocomplete="email" required></label>` : ''}
      ${mode !== 'reset' ? `<label class="f">${mode === 'signin' ? 'Password' : 'New password'}<input type="password" name="password" autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" minlength="8" required></label>` : ''}
      <button class="btn primary" type="submit">${t[1]}</button>
      <p class="msg ${cls || ''}" role="status">${esc(msg || '')}</p>
      <div class="actions" style="justify-content:space-between">
        ${mode === 'signin' ? `${invited ? `<button type="button" class="link" data-m="signup">${admin ? 'First time? Create your login' : 'First time? Create your login'}</button>` : ''}<button type="button" class="link" data-m="reset">Forgot password?</button>` : '<button type="button" class="link" data-m="signin">Back to sign in</button>'}
      </div></form></div>`;
    root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; draw(); }));
    root.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target), email = String(f.get('email') || '').trim(), pw = String(f.get('password') || '');
      if (mode !== 'newpass' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return draw('Please enter your email address.', 'bad');
      if (mode !== 'reset' && pw.length < 8) return draw('Passwords need at least 8 characters.', 'bad');
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        if (mode === 'signin') { await DB.signIn(email, pw); onIn(); }
        else if (mode === 'signup') { const r = await DB.signUp(email, pw); if (r.confirm) { mode = 'signin'; draw('Check your email for a link to confirm your account, then sign in.', 'good'); } else onIn(); }
        else if (mode === 'reset') { await DB.reset(email); mode = 'signin'; draw('If that email has an account, a reset link is on its way.', 'good'); }
        else { await DB.setPassword(pw); onIn(); }
      } catch (err) {
        btn.disabled = false;
        const m = errMsg(err);
        draw(/invalid login/i.test(m) ? 'That email and password do not match. Try again or reset your password.'
          : /database error saving new user|invitation only/i.test(m) ? `This email isn't set up for a portal yet. Use the email address Mak sent your invite to, or text Mak at ${CFG.PHONE}.`
          : /already registered/i.test(m) ? 'You already have a login with this email. Sign in instead, or reset your password.'
          : m, 'bad');
      }
    });
    const first = root.querySelector('input'); if (first) first.focus();
  }
  draw();
}
function stepState(m) {
  if (m.done) return 'done';
  const d = daysUntil(m.due_date);
  return d < 0 ? 'late' : 'open';
}
function paymentAlerts(payments) {
  return payments.filter(p => !p.paid_on && p.due_date).map(p => ({ p, d: daysUntil(p.due_date) })).filter(x => x.d <= 14).sort((a, b) => a.d - b.d);
}
function howToPayHTML() {
  const ways = [CFG.ZELLE && `<b>Zelle:</b> ${esc(CFG.ZELLE)}`, CFG.VENMO && `<b>Venmo:</b> ${esc(CFG.VENMO)}`, CFG.CHECK_PAYABLE && `<b>Check:</b> payable to ${esc(CFG.CHECK_PAYABLE)}`].filter(Boolean);
  return `<div class="howpay">${ways.length ? `How to pay: ${ways.join(' · ')}<br>Mak will mark your payment received here once it comes in.` : `Mak will send you payment details directly. Once a payment comes in, it's marked received here.`}</div>`;
}
function reviewBodyHTML(r) {
  const b = r.body || {};
  let html = '';
  if (r.kind === 'run-of-show' && Array.isArray(b.rows) && b.rows.length) {
    html += `<div style="overflow-x:auto"><table class="ros"><thead><tr><th>Time</th><th>What's happening</th><th>Notes</th></tr></thead><tbody>${b.rows.map(x => `<tr><td>${esc(x.time)}</td><td>${esc(x.title)}</td><td class="muted">${esc(x.notes)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if (b.text) html += `<div class="doc">${String(b.text).split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
  if (r.link) html += `<div><a class="btn sm" href="${esc(r.link)}" target="_blank" rel="noopener">Open the full document</a></div>`;
  return html || '<p class="empty">Nothing attached yet.</p>';
}
const STATUS = { pending: ['Needs your review', 'amber'], approved: ['Approved', 'ok'], changes: ['Changes requested', 'red'] };
const statusPill = (s, admin) => { const v = STATUS[s] || STATUS.pending; return `<span class="pill ${v[1]}">${admin && s === 'pending' ? 'Waiting on client' : v[0]}</span>`; };
function threadHTML(comments, clientName) {
  if (!comments.length) return '';
  return `<ul class="thread">${comments.sort(byDate('created_at')).map(c => `<li class="${c.author === 'client' ? 'client' : ''}"><span>${c.author === 'client' ? esc(firstName(clientName) || 'Client') : 'Mak'} · ${esc(fmtDateTime(c.created_at))}</span>${esc(c.body)}</li>`).join('')}</ul>`;
}
async function openFile(f) {
  try { const url = await DB.fileUrl(f); const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }
  catch (e) { toast(errMsg(e)); }
}

/* =====================================================================
   CLIENT VIEW
   ===================================================================== */
async function startClient() {
  const root = $('#app');
  const head = $('#top');
  const drawHead = user => {
    head.innerHTML = `<div class="wrap">${brandHTML('Client portal')}${user ? `<div class="who"><span class="dim" style="display:none">${esc(user.email)}</span><button class="btn ghost sm" id="out">Sign out</button></div>` : ''}</div>`;
    const o = $('#out'); if (o) o.addEventListener('click', async () => { await DB.signOut(); go(); });
  };
  async function go() {
    const user = await DB.getUser();
    drawHead(user);
    if (!user) return authScreen(root, { title: 'Welcome to your portal', sub: 'MAK(e) It Happen Moments', onIn: go });
    root.innerHTML = '<div class="wrap"><p class="empty" style="padding:40px 0">Opening your portal…</p></div>';
    try {
      const client = await DB.myClient();
      if (!client) {
        root.innerHTML = `<div class="auth"><div class="card"><div class="eyebrow">Almost there</div><h1>Your portal isn't ready yet</h1><p class="muted" style="margin:0">Mak sets up your portal once your agreement is signed. If you've booked already, make sure you signed up with the same email address that's on your agreement, or text Mak at ${esc(CFG.PHONE)}.</p><button class="btn" id="out2">Sign out</button></div></div>`;
        $('#out2').addEventListener('click', async () => { await DB.signOut(); go(); });
        return;
      }
      const [milestones, reviews, comments, payments, meetings, vendors, files] = await Promise.all(['milestones', 'reviews', 'comments', 'payments', 'meetings', 'vendors', 'files'].map(t => DB.list(t, client.id)));
      renderClient(root, client, { milestones, reviews, comments, payments, meetings, vendors, files }, go);
    } catch (e) { root.innerHTML = `<div class="wrap"><p class="empty" style="padding:40px 0">Could not open your portal: ${esc(errMsg(e))}</p></div>`; }
  }
  go();
}

function renderClient(root, c, d, reload) {
  const days = c.event_date ? daysUntil(c.event_date) : null;
  const names = [firstName(c.name), firstName(c.partner)].filter(Boolean).join(' & ');
  const ms = [...d.milestones].sort(byDate('due_date'));
  const upcoming = ms.filter(m => !m.done).slice(0, 3);
  const pending = d.reviews.filter(r => r.status === 'pending');
  const payAlerts = paymentAlerts(d.payments);
  const total = d.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), paid = d.payments.filter(p => p.paid_on).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const nowIdx = ms.findIndex(m => !m.done);
  let lastMonth = '';
  const timeline = ms.map((m, i) => {
    const month = fmtDate(m.due_date, { month: 'long', year: 'numeric' });
    const head = month !== lastMonth ? `<li class="month">${esc(month)}</li>` : ''; lastMonth = month;
    const st = stepState(m), isEvent = c.event_date && m.due_date === c.event_date && /day!/i.test(m.title);
    const cls = ['step', st === 'done' ? 'done' : '', i === nowIdx ? 'now' : '', st === 'late' ? 'late' : '', isEvent ? 'event' : ''].join(' ');
    return `${head}<li class="${cls}"><div class="row1"><b>${esc(m.title)}</b><span class="when">${esc(fmtDate(m.due_date, { month: 'short', day: 'numeric' }))}</span>${m.owner === 'client' && !m.done ? '<span class="pill">Your to-do</span>' : ''}${st === 'late' ? '<span class="pill red">Past due</span>' : ''}</div>${m.detail ? `<p>${esc(m.detail)}</p>` : ''}${isReviewStep(m) && !m.done && days !== null && days <= 0 ? reviewBtn() : ''}</li>`;
  }).join('');
  const meetings = [...d.meetings].filter(m => !m.starts_at || new Date(m.starts_at) >= new Date(Date.now() - DAY)).sort(byDate('starts_at'));

  root.innerHTML = `<div class="wrap">
    ${DB.mode === 'demo' ? `<div class="demo-banner" style="margin-top:16px">Sample mode: this is a pretend client so you can see the portal. Nothing here is real yet.</div>` : ''}
    <section class="hero">
      <div><div class="eyebrow">${esc(c.package || c.event_type || 'Your event')}</div>
        <h1>Hi ${esc(names || 'there')}<span>.</span></h1>
        <div class="meta">${c.event_date ? `<span>${esc(fmtDate(c.event_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</span>` : ''}${c.venue ? `<span>${esc(c.venue)}</span>` : ''}${c.guests ? `<span>${esc(c.guests)} guests</span>` : ''}</div></div>
      ${days !== null ? `<div class="count"><b>${days > 0 ? days : days === 0 ? 'Today' : '✓'}</b><span>${days > 1 ? 'days to go' : days === 1 ? 'day to go' : days === 0 ? 'is the day!' : 'Thank you for celebrating with me'}</span></div>` : ''}
    </section>
    <div class="alerts">
      ${payAlerts.map(({ p, d: dd }) => `<div class="alert ${dd < 0 ? 'red' : 'amber'}"><span>${dd < 0 ? 'Past due' : dd === 0 ? 'Due today' : `Due in ${dd} day${dd === 1 ? '' : 's'}`}: ${esc(p.label)} · ${money(p.amount)}</span><a class="btn sm" href="#payments">See payments</a></div>`).join('')}
      ${pending.length ? `<div class="alert"><span>${pending.length} item${pending.length === 1 ? '' : 's'} from Mak ${pending.length === 1 ? 'is' : 'are'} ready for your review</span><a class="btn sm primary" href="#review">Review now</a></div>` : ''}
    </div>
    <div class="grid">
      <div class="col">
        <section class="panel glow"><header><h2>What's next</h2></header>
          ${upcoming.length ? `<ul class="next">${upcoming.map(m => `<li><div class="datechip"><span>${esc(fmtDate(m.due_date, { month: 'short' }))}</span><b>${esc(fmtDate(m.due_date, { day: 'numeric' }))}</b></div><div class="t"><b>${esc(m.title)}</b>${m.owner === 'client' ? ' <span class="pill">Your to-do</span>' : ''}<p>${esc(m.detail || (m.owner === 'client' ? 'Something I need from you.' : "Mak's handling this."))}</p>${isReviewStep(m) && days !== null && days <= 0 ? reviewBtn() : ''}</div></li>`).join('')}</ul>` : '<p class="empty">Everything is checked off. Enjoy!</p>'}
        </section>
        <section class="panel" id="review"><header><h2>For your review</h2><span class="dim">${d.reviews.length} item${d.reviews.length === 1 ? '' : 's'}</span></header>
          ${d.reviews.length ? `<div class="items">${[...d.reviews].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).map(r => `<button class="item" data-review="${esc(r.id)}"><span class="t"><b>${esc(r.title)}</b><span>${r.kind === 'run-of-show' ? 'Run of show' : 'Document'}${r.version > 1 ? ' · version ' + esc(r.version) : ''} · updated ${esc(fmtDate(r.updated_at || r.created_at, { month: 'short', day: 'numeric' }))}</span></span>${statusPill(r.status)}</button>`).join('')}</div>` : "<p class='empty'>When Mak shares your run of show or other plans, they'll show up here for you to approve.</p>"}
        </section>
        <section class="panel"><header><h2>Your timeline</h2></header>
          ${ms.length ? `<ol class="tl">${timeline}</ol>` : '<p class="empty">Mak is building your timeline.</p>'}
        </section>
      </div>
      <div class="col">
        <section class="panel" id="payments"><header><h2>Payments</h2></header>
          ${d.payments.length ? `<div class="pay-sum"><div><span>Total</span><b>${money(total)}</b></div><div><span>Paid</span><b>${money(paid)}</b></div><div><span>Remaining</span><b>${money(total - paid)}</b></div></div>
          <div class="bar"><i style="width:${total ? Math.min(100, paid / total * 100) : 0}%"></i></div>
          <ul class="plist">${[...d.payments].sort(byDate('due_date')).map(p => { const dd = p.due_date ? daysUntil(p.due_date) : null; return `<li><span><b>${esc(p.label)}</b><br><span class="dim" style="font-size:13px">${p.paid_on ? 'Paid ' + esc(fmtDate(p.paid_on)) : p.due_date ? 'Due ' + esc(fmtDate(p.due_date)) : ''}</span></span><span style="text-align:right"><span class="amt">${money(p.amount)}</span><br>${p.paid_on ? '<span class="pill ok">Paid</span>' : dd !== null && dd < 0 ? '<span class="pill red">Past due</span>' : dd !== null && dd <= 14 ? '<span class="pill amber">Due soon</span>' : '<span class="pill dim">Upcoming</span>'}</span></li>`; }).join('')}</ul>
          ${howToPayHTML()}` : '<p class="empty">Your payment schedule will show here.</p>'}
        </section>
        <section class="panel"><header><h2>Meetings</h2><a class="btn sm" href="${esc(CFG.BOOK_CALL_URL || '#')}">Book a call</a></header>
          ${meetings.length ? `<ul class="mini">${meetings.map(m => `<li><b>${esc(m.title)}</b><span>${esc(fmtDateTime(m.starts_at))}${m.location ? ' · ' + esc(m.location) : ''}</span>${m.notes ? `<div class="muted" style="margin-top:4px">${esc(m.notes)}</div>` : ''}</li>`).join('')}</ul>` : '<p class="empty">No meetings scheduled right now.</p>'}
        </section>
        <section class="panel"><header><h2>Files</h2><label class="btn sm" style="cursor:pointer">Upload<input type="file" id="cfile" multiple hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"></label></header>
          ${d.files.length ? `<ul class="mini">${[...d.files].sort(byDate('created_at')).reverse().map(f => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="min-width:0"><b style="overflow-wrap:anywhere">${esc(f.name)}</b><span>${f.uploaded_by === 'client' ? 'You' : 'Mak'} · ${esc(fmtDate(f.created_at, { month: 'short', day: 'numeric' }))}${f.size ? ' · ' + esc(fmtSize(f.size)) : ''}</span></span><button class="btn sm" data-file="${esc(f.id)}">Open</button></li>`).join('')}</ul>` : '<p class="empty">Share inspiration photos, your guest list or anything else with Mak here.</p>'}
        </section>
        ${d.vendors.length ? `<section class="panel"><header><h2>Your vendor team</h2></header><ul class="mini">${d.vendors.map(v => `<li><b>${esc(v.name)}</b><span>${esc(v.category || '')}${v.arrival ? ' · arrives ' + esc(v.arrival) : ''}${v.contact ? ' · ' + esc(v.contact) : ''}${v.phone ? ' · ' + esc(v.phone) : ''}</span></li>`).join('')}</ul></section>` : ''}
        <section class="panel"><header><h2>Questions?</h2></header><p class="muted" style="margin:0 0 12px">I'm always a text away.</p><div class="actions"><a class="btn primary" href="sms:${esc(String(CFG.PHONE || '').replace(/\D/g, ''))}">Text Mak</a><a class="btn" href="mailto:${esc(CFG.EMAIL)}">Email Mak</a></div></section>
      </div>
    </div></div>`;

  root.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => openClientReview(d.reviews.find(r => r.id === b.dataset.review), c, d, reload)));
  root.querySelectorAll('[data-file]').forEach(b => b.addEventListener('click', () => openFile(d.files.find(f => f.id === b.dataset.file))));
  $('#cfile').addEventListener('change', async e => {
    for (const file of [...e.target.files]) {
      toast('Uploading ' + file.name + '…');
      try { await DB.upload(c.id, file, 'client'); toast(file.name + ' shared with Mak'); } catch (err) { toast(errMsg(err)); }
    }
    reload();
  });
}

function openClientReview(r, c, d, reload) {
  if (!r) return;
  const comments = d.comments.filter(x => x.review_id === r.id);
  const m = modal(`<header><div><div class="eyebrow">${r.kind === 'run-of-show' ? 'Run of show' : 'For your review'}${r.version > 1 ? ' · version ' + esc(r.version) : ''}</div><h2>${esc(r.title)}</h2></div><button class="btn ghost sm" data-close>Close</button></header>
    <div>${statusPill(r.status)}</div>
    ${reviewBodyHTML(r)}
    ${threadHTML(comments, c.name)}
    ${r.status === 'pending' ? `<div style="display:flex;flex-direction:column;gap:10px"><label class="f">Anything to change? (optional for approvals)<textarea id="note" placeholder="Example: Can we move the first look to 2:00?"></textarea></label>
      <div class="actions"><button class="btn primary" data-act="approved">Looks perfect, approve</button><button class="btn" data-act="changes">Request changes</button></div></div>`
    : r.status === 'changes' ? `<p class="muted" style="margin:0">Thanks! Mak is updating this and will share a new version here.</p>` : `<p class="muted" style="margin:0">You approved this. Need a change anyway? Text Mak at ${esc(CFG.PHONE)}.</p>`}`);
  m.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
    const note = m.querySelector('#note').value.trim();
    if (b.dataset.act === 'changes' && !note) { toast('Tell Mak what to change first.'); m.querySelector('#note').focus(); return; }
    b.disabled = true;
    try { await DB.respond(r.id, b.dataset.act, note); closeModal(); toast(b.dataset.act === 'approved' ? 'Approved! Mak will see it right away.' : 'Sent to Mak. She will share an update here.'); reload(); }
    catch (e) { b.disabled = false; toast(errMsg(e)); }
  }));
}

/* =====================================================================
   ADMIN VIEW (Mak)
   ===================================================================== */
const FIELDS = {
  milestones: [['title', 'Step', 'text'], ['due_date', 'Date', 'date'], ['owner', 'Whose job', 'select', [['mak', 'Mak'], ['client', 'Client to-do']]], ['detail', 'Note for the client', 'text'], ['done', 'Done', 'check']],
  payments: [['label', 'Payment', 'text'], ['amount', 'Amount', 'number'], ['due_date', 'Due', 'date'], ['paid_on', 'Paid on', 'date'], ['method', 'Paid by', 'text']],
  meetings: [['title', 'Meeting', 'text'], ['starts_at', 'When', 'datetime-local'], ['location', 'Where or link', 'text'], ['notes', 'Notes', 'text']],
  vendors: [['category', 'Type', 'text'], ['name', 'Vendor', 'text'], ['contact', 'Contact', 'text'], ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], ['arrival', 'Arrives', 'text']],
};
const BLANK = {
  milestones: () => ({ title: 'New step', due_date: todayISO(), owner: 'mak', detail: '', done: false, sort: 99 }),
  payments: () => ({ label: 'Payment', amount: 0, due_date: todayISO(), paid_on: null, method: '' }),
  meetings: () => ({ title: 'Meeting', starts_at: todayISO() + 'T12:00', location: '', notes: '' }),
  vendors: () => ({ category: '', name: 'New vendor', contact: '', phone: '', email: '', arrival: '' }),
};
const inviteStatus = c => !c.invite_requested_at ? 'Not emailed yet'
  : c.invited_at && c.invited_at >= c.invite_requested_at ? 'Welcome email sent ' + fmtDate(c.invited_at)
  : 'Welcome email is on its way (goes out within about 5 minutes)';
const CLIENT_FIELDS = [['name', 'Client name', 'text'], ['partner', 'Partner or company contact', 'text'], ['email', 'Email (their login)', 'email'], ['phone', 'Phone', 'text'], ['event_type', 'Event type', 'text'], ['package', 'Package', 'select', PACKAGE_NAMES.map(p => [p, p])], ['event_date', 'Event date', 'date'], ['venue', 'Venue', 'text'], ['guests', 'Guests', 'number'], ['total_fee', 'Total fee', 'number'], ['booked_on', 'Booked on', 'date']];

function inputHTML([key, label, type, opts], val, attr = 'data-k') {
  const v = val ?? '';
  if (type === 'check') return `<label class="c"><input type="checkbox" ${attr}="${key}" ${v ? 'checked' : ''}>${esc(label)}</label>`;
  if (type === 'select') return `<label class="f">${esc(label)}<select ${attr}="${key}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(v) === ov ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></label>`;
  const shown = type === 'datetime-local' && v ? String(v).slice(0, 16) : type === 'date' && v ? String(v).slice(0, 10) : v;
  return `<label class="f">${esc(label)}<input type="${type}" ${attr}="${key}" value="${esc(shown)}" ${type === 'number' ? 'step="any"' : ''}></label>`;
}
function readInputs(el, attr = 'data-k') {
  const out = {};
  el.querySelectorAll(`[${attr}]`).forEach(i => {
    const k = i.getAttribute(attr);
    out[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (i.value === '' ? null : Number(i.value)) : (i.type === 'date' || i.type === 'datetime-local') ? (i.value || null) : i.value.trim();
  });
  return out;
}

async function startAdmin() {
  const root = $('#app'), head = $('#top');
  const state = { clients: [], cur: null, tab: 'overview', data: null, q: '' };
  const drawHead = user => {
    head.innerHTML = `<div class="wrap wide">${brandHTML('Client portal · Admin')}<div class="who">${CFG.TOOLKIT_URL ? `<a class="btn ghost sm" href="${esc(CFG.TOOLKIT_URL)}">Toolkit</a>` : ''}<a class="btn ghost sm" href="./">Client view</a>${user ? '<button class="btn ghost sm" id="out">Sign out</button>' : ''}</div></div>`;
    const o = $('#out'); if (o) o.addEventListener('click', async () => { await DB.signOut(); go(); });
  };
  async function go() {
    const user = await DB.getUser();
    drawHead(user);
    if (!user) return authScreen(root, { title: 'Mak, sign in', sub: 'Client portal admin', admin: true, onIn: go });
    if (!(await DB.isAdmin())) { root.innerHTML = `<div class="auth"><div class="card"><h1>Not an admin account</h1><p class="muted" style="margin:0">This page is only for Mak. Clients sign in on the client portal.</p><a class="btn" href="./">Go to the client portal</a></div></div>`; return; }
    await loadClients();
  }
  async function loadClients(keepId) {
    try { state.clients = (await DB.list('clients')).sort(byDate('event_date')); }
    catch (e) { root.innerHTML = `<div class="wrap"><p class="empty" style="padding:40px 0">Could not load clients: ${esc(errMsg(e))}</p></div>`; return; }
    const id = keepId || (state.cur && state.cur.id) || (state.clients[0] && state.clients[0].id);
    state.cur = state.clients.find(c => c.id === id) || null;
    if (state.cur) await loadData(); else state.data = null;
    draw();
  }
  async function loadData() {
    const id = state.cur.id;
    const [milestones, reviews, comments, payments, meetings, vendors, files, notes] = await Promise.all(['milestones', 'reviews', 'comments', 'payments', 'meetings', 'vendors', 'files'].map(t => DB.list(t, id)).concat(DB.getNotes(id)));
    state.data = { milestones, reviews, comments: comments.filter(cm => reviews.some(r => r.id === cm.review_id)), payments, meetings, vendors, files, notes };
  }
  function clientFlags(c) {
    return c.id === (state.cur && state.cur.id) && state.data ? [state.data.reviews.some(r => r.status === 'changes') && '<span class="pill red">Changes requested</span>', paymentAlerts(state.data.payments).some(x => x.d < 0) && '<span class="pill red">Payment past due</span>'].filter(Boolean).join(' ') : '';
  }
  function draw() {
    const ql = state.q.toLowerCase();
    const list = state.clients.filter(c => !ql || [c.name, c.partner, c.email, c.venue].some(v => String(v || '').toLowerCase().includes(ql)));
    root.innerHTML = `<div class="wrap wide">
      ${DB.mode === 'demo' ? `<div class="demo-banner" style="margin-top:16px">Sample mode: changes save only in this browser. Connect Supabase to make it real. <button class="link" id="resetDemo">Reset sample data</button></div>` : ''}
      <div class="admin">
        <aside class="panel"><header><h2>Clients</h2><button class="btn primary sm" id="newc">New client</button></header>
          <input type="text" id="cq" placeholder="Search clients" value="${esc(state.q)}" style="margin-bottom:10px">
          <div class="clist">${list.map(c => `<button class="crow" data-c="${esc(c.id)}" aria-current="${state.cur && c.id === state.cur.id}"><b>${esc(c.name)}${c.partner ? ' & ' + esc(firstName(c.partner)) : ''}</b><span>${c.event_date ? esc(fmtDate(c.event_date)) + ' · ' : ''}${esc(c.package || '')}</span></button>`).join('') || '<p class="empty">No clients yet. Add your first one.</p>'}</div>
        </aside>
        <main id="detail">${state.cur ? detailHTML() : '<section class="panel"><p class="empty">Choose a client, or add a new one when someone books.</p></section>'}</main>
      </div></div>`;
    $('#newc').addEventListener('click', newClient);
    $('#cq').addEventListener('input', e => { state.q = e.target.value; const pos = e.target.selectionStart; draw(); const i = $('#cq'); i.focus(); i.setSelectionRange(pos, pos); });
    root.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', async () => { state.cur = state.clients.find(c => c.id === b.dataset.c); state.tab = 'overview'; await loadData(); draw(); }));
    const rd = $('#resetDemo'); if (rd) rd.addEventListener('click', () => { Demo.resetSample(); state.cur = null; loadClients(); });
    if (state.cur) wireDetail();
  }
  const TABS = [['overview', 'Overview'], ['timeline', 'Timeline'], ['reviews', 'For review'], ['payments', 'Payments'], ['meetings', 'Meetings'], ['vendors', 'Vendors'], ['files', 'Files']];
  function detailHTML() {
    const c = state.cur, d = state.data;
    const portalURL = new URL('./', location.href).href;
    const tabBody = {
      overview: () => `<div class="form-grid" id="cform">${CLIENT_FIELDS.map(f => inputHTML(f, c[f[0]])).join('')}</div>
        <label class="f" style="margin-top:12px">Private notes (only you ever see these)<textarea id="pnotes" placeholder="Family dynamics, must-haves, anything to remember">${esc(d.notes || '')}</textarea></label>
        <div class="actions" style="margin-top:14px"><button class="btn primary" id="saveC">Save details</button><button class="btn" id="sendInvite">${c.invite_requested_at ? 'Email the welcome again' : 'Email their welcome + portal link'}</button><button class="btn" id="invite">Copy invite to text</button><button class="btn danger" id="delC">Delete client</button></div>
        <p class="dim" style="margin:10px 0 0;font-size:13px">Portal welcome email: ${esc(inviteStatus(c))}</p>
        <div class="copybox" style="margin-top:14px" id="inviteText">Hi ${esc(firstName(c.name))}! Your MAK(e) It Happen client portal is ready. This is where you'll see your timeline, review your run of show, and keep track of payments.\n\nCreate your account here with ${esc(c.email)}:\n${esc(portalURL)}?signup</div>`,
      timeline: () => crudHTML('milestones', [...d.milestones].sort(byDate('due_date'))) + `<div class="actions" style="margin-top:12px"><button class="btn" id="rebuild">Rebuild from package template</button></div>`,
      reviews: () => `<div class="actions" style="margin-bottom:12px"><button class="btn primary" id="newR">Share something for review</button></div>
        <div class="items">${[...d.reviews].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).map(r => `<button class="item" data-r="${esc(r.id)}"><span class="t"><b>${esc(r.title)}</b><span>${r.kind === 'run-of-show' ? 'Run of show' : 'Document'} · v${esc(r.version || 1)} · ${d.comments.filter(x => x.review_id === r.id).length} message(s)</span></span>${statusPill(r.status, true)}</button>`).join('') || '<p class="empty">Nothing shared yet.</p>'}</div>`,
      payments: () => crudHTML('payments', [...d.payments].sort(byDate('due_date'))),
      meetings: () => crudHTML('meetings', [...d.meetings].sort(byDate('starts_at'))),
      vendors: () => crudHTML('vendors', d.vendors),
      files: () => `<div class="actions" style="margin-bottom:12px"><label class="btn primary" style="cursor:pointer">Upload files<input type="file" id="afile" multiple hidden></label><span class="dim" style="font-size:13px">Photos, contracts, PDFs. Your client sees everything here.</span></div>
        <ul class="mini">${[...d.files].sort(byDate('created_at')).reverse().map(f => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="min-width:0"><b style="overflow-wrap:anywhere">${esc(f.name)}</b><span>${f.uploaded_by === 'client' ? 'From client' : 'From you'} · ${esc(fmtDate(f.created_at, { month: 'short', day: 'numeric' }))}${f.size ? ' · ' + esc(fmtSize(f.size)) : ''}</span></span><span class="actions"><button class="btn sm" data-fo="${esc(f.id)}">Open</button><button class="btn sm danger" data-fd="${esc(f.id)}">Delete</button></span></li>`).join('') || '<p class="empty">No files yet.</p>'}</ul>`,
    };
    return `<section class="panel glow"><header><div><div class="eyebrow">${esc(c.package || '')}</div><h2 style="font-size:clamp(24px,4vw,34px)">${esc(c.name)}${c.partner ? ' & ' + esc(c.partner) : ''}</h2>
      <div class="dim" style="margin-top:4px">${c.event_date ? esc(fmtDate(c.event_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })) + ' · ' + (daysUntil(c.event_date) >= 0 ? daysUntil(c.event_date) + ' days out' : 'past') : 'No date yet'} ${clientFlags(c)}</div></div></header>
      <div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${state.tab === k}">${l}</button>`).join('')}</div>
      <div id="tabBody">${tabBody[state.tab]()}</div></section>`;
  }
  function crudHTML(table, rows) {
    return `<div class="erows">${rows.map(r => `<div class="erow" data-row="${esc(r.id)}">${FIELDS[table].map(f => inputHTML(f, r[f[0]], 'data-f')).join('')}<div class="actions"><button class="btn sm primary" data-save>Save</button><button class="btn sm danger" data-del>Delete</button></div></div>`).join('') || '<p class="empty">Nothing here yet.</p>'}</div>
      <div class="actions" style="margin-top:12px"><button class="btn" data-add="${table}">Add</button></div>`;
  }
  function wireDetail() {
    const c = state.cur, d = state.data, tb = $('#tabBody');
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; draw(); }));
    const table = { timeline: 'milestones', payments: 'payments', meetings: 'meetings', vendors: 'vendors' }[state.tab];
    if (table) {
      tb.querySelectorAll('[data-row]').forEach(row => {
        row.querySelector('[data-save]').addEventListener('click', async () => { try { await DB.update(table, row.dataset.row, readInputs(row, 'data-f')); toast('Saved'); await loadData(); draw(); } catch (e) { toast(errMsg(e)); } });
        const del = row.querySelector('[data-del]');
        del.addEventListener('click', async () => {
          if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Tap again'; setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Delete'; } }, 3000); return; }
          try { await DB.remove(table, row.dataset.row); await loadData(); draw(); } catch (e) { toast(errMsg(e)); }
        });
      });
      tb.querySelector('[data-add]').addEventListener('click', async () => { try { await DB.insert(table, Object.assign({ client_id: c.id }, BLANK[table]())); await loadData(); draw(); } catch (e) { toast(errMsg(e)); } });
    }
    if (state.tab === 'overview') {
      $('#saveC').addEventListener('click', async () => { const patch = readInputs($('#cform')); if (!patch.name || !patch.email) return toast('Name and email are required.'); patch.email = patch.email.toLowerCase(); try { await DB.update('clients', c.id, patch); await DB.saveNotes(c.id, $('#pnotes').value.trim()); toast('Saved'); await loadClients(c.id); } catch (e) { toast(errMsg(e)); } });
      $('#invite').addEventListener('click', () => copyText($('#inviteText').textContent, 'Invite copied. Paste it into a text or email.'));
      $('#sendInvite').addEventListener('click', () => welcomeEditor(c));
      const del = $('#delC');
      del.addEventListener('click', async () => {
        if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Tap again to delete everything for this client'; setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Delete client'; } }, 4000); return; }
        try { for (const f of d.files) await DB.removeFile(f); await DB.remove('clients', c.id); state.cur = null; toast('Client deleted'); await loadClients(); } catch (e) { toast(errMsg(e)); }
      });
    }
    if (state.tab === 'timeline') {
      const rb = $('#rebuild');
      rb.addEventListener('click', async () => {
        if (!rb.dataset.armed) { rb.dataset.armed = '1'; rb.textContent = 'Tap again: replaces this timeline'; setTimeout(() => { if (rb.isConnected) { delete rb.dataset.armed; rb.textContent = 'Rebuild from package template'; } }, 4000); return; }
        try { for (const m of d.milestones) await DB.remove('milestones', m.id); await DB.insertMany('milestones', buildPlan(c.id, c.package, c.event_date, c.booked_on).milestones); toast('Timeline rebuilt'); await loadData(); draw(); } catch (e) { toast(errMsg(e)); }
      });
    }
    if (state.tab === 'reviews') {
      $('#newR').addEventListener('click', () => editReview(null));
      tb.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => adminReview(d.reviews.find(r => r.id === b.dataset.r))));
    }
    if (state.tab === 'files') {
      $('#afile').addEventListener('change', async e => { for (const f of [...e.target.files]) { toast('Uploading ' + f.name + '…'); try { await DB.upload(c.id, f, 'mak'); } catch (err) { toast(errMsg(err)); } } toast('Uploaded'); await loadData(); draw(); });
      tb.querySelectorAll('[data-fo]').forEach(b => b.addEventListener('click', () => openFile(d.files.find(f => f.id === b.dataset.fo))));
      tb.querySelectorAll('[data-fd]').forEach(b => b.addEventListener('click', async () => {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete'; } }, 3000); return; }
        try { await DB.removeFile(d.files.find(f => f.id === b.dataset.fd)); await loadData(); draw(); } catch (e) { toast(errMsg(e)); }
      }));
    }
  }
  function adminReview(r) {
    const d = state.data, comments = d.comments.filter(x => x.review_id === r.id);
    const m = modal(`<header><div><div class="eyebrow">${r.kind === 'run-of-show' ? 'Run of show' : 'Document'} · v${esc(r.version || 1)}</div><h2>${esc(r.title)}</h2></div><button class="btn ghost sm" data-close>Close</button></header>
      <div>${statusPill(r.status, true)}</div>${reviewBodyHTML(r)}${threadHTML(comments, state.cur.name)}
      <label class="f">Message to your client<textarea id="reply" placeholder="Updated the first look to 2:00!"></textarea></label>
      <div class="actions"><button class="btn primary" id="send">Send message</button><button class="btn" id="edit">Edit and share a new version</button><button class="btn danger" id="del">Delete</button></div>`);
    m.querySelector('#send').addEventListener('click', async () => { const body = m.querySelector('#reply').value.trim(); if (!body) return toast('Write a message first.'); try { await DB.insert('comments', { review_id: r.id, author: 'mak', body }); toast('Sent'); await loadData(); adminReview(r); draw(); } catch (e) { toast(errMsg(e)); } });
    m.querySelector('#edit').addEventListener('click', () => editReview(r));
    const del = m.querySelector('#del');
    del.addEventListener('click', async () => { if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Tap again'; return; } try { await DB.remove('reviews', r.id); closeModal(); await loadData(); draw(); } catch (e) { toast(errMsg(e)); } });
  }
  function editReview(r) {
    const isNew = !r, b = (r && r.body) || {};
    let rows = Array.isArray(b.rows) ? b.rows.map(x => Object.assign({}, x)) : [{ time: '', title: '', notes: '' }];
    const m = modal(`<header><div><div class="eyebrow">${isNew ? 'Share for review' : 'New version'}</div><h2>${isNew ? 'Share something with ' + esc(firstName(state.cur.name)) : esc(r.title)}</h2></div><button class="btn ghost sm" data-close>Close</button></header>
      <div class="form-grid"><label class="f">Title<input type="text" id="rt" value="${esc(r ? r.title : 'Run of show')}"></label>
      <label class="f">Type<select id="rk"><option value="run-of-show" ${!r || r.kind === 'run-of-show' ? 'selected' : ''}>Run of show (time-by-time)</option><option value="document" ${r && r.kind === 'document' ? 'selected' : ''}>Document or note</option></select></label></div>
      <div id="rosBox"></div>
      <label class="f">Note or details<textarea id="rx" placeholder="Anything you want them to read">${esc(b.text || '')}</textarea></label>
      <label class="f">Link (Canva, Google Doc, PDF) <input type="url" id="rl" value="${esc(r ? r.link || '' : '')}" placeholder="https://"></label>
      ${isNew ? '' : `<label class="f">Message about this version<input type="text" id="rm" placeholder="What changed?"></label>`}
      <div class="actions"><button class="btn primary" id="rs">${isNew ? 'Share for review' : 'Share new version'}</button></div>`);
    const box = m.querySelector('#rosBox'), kind = m.querySelector('#rk');
    const drawRows = () => {
      box.hidden = kind.value !== 'run-of-show';
      box.innerHTML = `<div class="ros-edit"><div class="dim" style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Time · What's happening · Notes</div>${rows.map((x, i) => `<div class="r" data-i="${i}"><input type="text" data-rf="time" value="${esc(x.time)}" placeholder="4:30 PM"><input type="text" data-rf="title" value="${esc(x.title)}" placeholder="Guests arrive"><input type="text" data-rf="notes" value="${esc(x.notes)}" placeholder="Notes"><button class="btn sm danger" data-rx="${i}" aria-label="Remove row">✕</button></div>`).join('')}<div><button class="btn sm" id="addRow">Add a row</button></div></div>`;
      box.querySelectorAll('[data-rf]').forEach(inp => inp.addEventListener('input', () => { rows[+inp.closest('[data-i]').dataset.i][inp.dataset.rf] = inp.value; }));
      box.querySelectorAll('[data-rx]').forEach(btn => btn.addEventListener('click', () => { rows.splice(+btn.dataset.rx, 1); if (!rows.length) rows.push({ time: '', title: '', notes: '' }); drawRows(); }));
      box.querySelector('#addRow').addEventListener('click', () => { rows.push({ time: '', title: '', notes: '' }); drawRows(); const ins = box.querySelectorAll('[data-rf="time"]'); ins[ins.length - 1].focus(); });
    };
    kind.addEventListener('change', drawRows); drawRows();
    m.querySelector('#rs').addEventListener('click', async () => {
      const title = m.querySelector('#rt').value.trim(); if (!title) return toast('Add a title.');
      const body = { text: m.querySelector('#rx').value.trim() };
      if (kind.value === 'run-of-show') body.rows = rows.filter(x => x.time || x.title || x.notes);
      const patch = { title, kind: kind.value, body, link: m.querySelector('#rl').value.trim(), status: 'pending', updated_at: new Date().toISOString() };
      try {
        if (isNew) await DB.insert('reviews', Object.assign({ client_id: state.cur.id, version: 1 }, patch));
        else {
          await DB.update('reviews', r.id, Object.assign(patch, { version: (r.version || 1) + 1 }));
          const msg = m.querySelector('#rm').value.trim();
          await DB.insert('comments', { review_id: r.id, author: 'mak', body: msg || `Shared version ${(r.version || 1) + 1}.` });
        }
        closeModal(); toast(isNew ? 'Shared. It shows as "Needs your review" in their portal.' : 'New version shared for review'); await loadData(); draw();
      } catch (e) { toast(errMsg(e)); }
    });
  }
  // Mak personalizes the welcome email (name, event, date) and sees exactly what will be sent.
  function welcomeEditor(c) {
    const defName = [firstName(c.name), firstName(c.partner)].filter(Boolean).join(' & ');
    const defEvent = /wedding/i.test((c.package || '') + ' ' + (c.event_type || '')) ? 'wedding' : 'event';
    const defDate = c.event_date ? fmtDate(c.event_date, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const v = { name: c.welcome_name || defName, event: c.welcome_event || defEvent, date: c.welcome_date ?? defDate };
    const preview = () => {
      const eventLine = `Welcome to the MAK(e) It Happen family! I'm so excited to be part of your ${v.event || 'event'}${v.date ? ' on ' + v.date : ''}!`;
      return `<div class="copybox" style="white-space:normal;color:var(--ink);background:#fff;color:#22262A;border-style:solid">
        <p style="margin:0 0 4px;color:#587073;font-size:13px"><b>To:</b> ${esc(c.email)}<br><b>Subject:</b> Welcome to MAK(e) It Happen! Your client portal is ready</p><hr style="border:0;border-top:1px solid #ddd;margin:10px 0">
        <p style="margin:0 0 10px">Hi ${esc(v.name || 'there')},</p>
        <p style="margin:0 0 10px">${esc(eventLine)}</p>
        <p style="margin:0 0 10px">I've set up your own private client portal. It's where you'll see your timeline and what's coming up next, review and approve your run of show, keep track of payments, and share files with me, all in one place.</p>
        <p style="margin:0 0 10px"><span style="display:inline-block;background:#4FC9C0;color:#22262A;font-weight:700;padding:9px 20px;border-radius:999px">Create my portal login</span></p>
        <p style="margin:0 0 10px">Be sure to create your login with this email address (${esc(c.email)}). You'll get a quick email to confirm your account, and then you're all set!</p>
        <p style="margin:0 0 10px">Questions anytime? Text me at ${esc(CFG.PHONE)}.</p>
        <p style="margin:0">Can't wait to MAK(e) it happen!<br>Mak<br><span style="color:#888;font-size:12px">[your email signature]</span></p></div>`;
    };
    const m = modal(`<header><div><div class="eyebrow">Welcome email</div><h2>Personalize ${esc(firstName(c.name) || 'their')} welcome</h2></div><button class="btn ghost sm" data-close>Close</button></header>
      <div class="form-grid">
        <label class="f">Name(s) after "Hi"<input type="text" id="wName" value="${esc(v.name)}" placeholder="Sarah & James"></label>
        <label class="f">Their event<input type="text" id="wEvent" value="${esc(v.event)}" placeholder="wedding"></label>
        <label class="f">Date (as you want it written)<input type="text" id="wDate" value="${esc(v.date)}" placeholder="Saturday, May 1, 2027"></label>
      </div>
      <p class="dim" style="margin:0;font-size:13px">Leave the date blank to skip it. This is exactly what ${esc(c.email)} will get:</p>
      <div id="wPrev">${preview()}</div>
      <div class="actions"><button class="btn primary" id="wSend">${c.invite_requested_at ? 'Send welcome email again' : 'Send welcome email'}</button><button class="btn ghost" data-close>Not now</button></div>`);
    ['wName', 'wEvent', 'wDate'].forEach(id => m.querySelector('#' + id).addEventListener('input', () => {
      v.name = m.querySelector('#wName').value.trim(); v.event = m.querySelector('#wEvent').value.trim(); v.date = m.querySelector('#wDate').value.trim();
      m.querySelector('#wPrev').innerHTML = preview();
    }));
    m.querySelector('#wSend').addEventListener('click', async e => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '')) return toast('Add their email on the Overview tab first.');
      e.target.disabled = true;
      try {
        await DB.update('clients', c.id, { welcome_name: v.name, welcome_event: v.event, welcome_date: v.date, invite_requested_at: new Date().toISOString() });
        closeModal(); toast('Welcome email queued. It goes out within about 5 minutes.'); await loadClients(c.id);
      } catch (err) { e.target.disabled = false; toast(errMsg(err)); }
    });
  }
  function newClient() {
    const blank = { name: '', partner: '', email: '', phone: '', event_type: '', package: 'Day-of coordination: events', event_date: '', venue: '', guests: '', total_fee: '', booked_on: todayISO(), notes: '' };
    const m = modal(`<header><div><div class="eyebrow">Just booked</div><h2>New client portal</h2></div><button class="btn ghost sm" data-close>Close</button></header>
      <p class="muted" style="margin:0">Their timeline and payment schedule fill in from the package, the event date and the total fee. You can edit everything after.</p>
      <div class="form-grid" id="ncf">${CLIENT_FIELDS.map(f => inputHTML(f, blank[f[0]])).join('')}</div>
      <label class="c"><input type="checkbox" id="ncInvite" checked>Write their welcome email + portal link next</label>
      <div class="actions"><button class="btn primary" id="ncs">Create portal</button></div>`);
    m.querySelector('#ncs').addEventListener('click', async e => {
      const v = readInputs(m.querySelector('#ncf'));
      if (!v.name) return toast('Add the client name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email || '')) return toast('Add their email. It becomes their login.');
      e.target.disabled = true;
      try {
        v.email = v.email.toLowerCase(); v.booked_on = v.booked_on || todayISO();
        const writeWelcome = m.querySelector('#ncInvite').checked;
        const c = await DB.insert('clients', v);
        const plan = buildPlan(c.id, c.package, c.event_date, c.booked_on, c.total_fee);
        await DB.insertMany('milestones', plan.milestones);
        await DB.insertMany('payments', plan.payments);
        closeModal(); state.tab = 'overview'; await loadClients(c.id);
        if (writeWelcome) welcomeEditor(state.cur); else toast('Portal created. Email or copy their invite when you are ready.');
      } catch (err) { e.target.disabled = false; toast(errMsg(err)); }
    });
  }
  go();
}

window.Portal = { startClient, startAdmin, buildPlan, PLANS };
})();
