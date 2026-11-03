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
const TABLES = ['clients', 'milestones', 'reviews', 'comments', 'payments', 'meetings', 'vendors', 'files', 'admin_notes', 'hub_items', 'client_links'];
// Planning Hub starter list for sample mode (the live list comes from the hub_items table).
const HUB_SAMPLE = [
  ['tool', 'wedding', 'Website & RSVPs', 'Zola wedding website', 'https://www.zola.com/wedding-planning/website', 'Free website with RSVPs, your story, travel info and registry in one place.'],
  ['tool', 'wedding', 'Registry', 'Zola registry', 'https://www.zola.com/wedding-registry', 'Gifts, experiences and cash funds on one list.'],
  ['tool', 'wedding', 'Invitations', 'Minted', 'https://www.minted.com/wedding', 'Designer save-the-dates and invitations, with free guest addressing.'],
  ['tool', 'wedding', 'Inspiration', 'Pinterest wedding ideas', 'https://www.pinterest.com/ideas/wedding/', 'Save looks you love, then share your board with Mak.'],
  ['tool', 'wedding', 'Legal & after', 'Tarrant County marriage licenses', 'https://www.tarrantcountytx.gov/en/county-clerk/vital-records/marriage-licenses.html', 'In Texas the license is good for 90 days and has a 72-hour wait, so get it 1–2 months out.'],
  ['vendor', 'all', 'Florist', 'Petal & Party Co. (sample)', '', 'Example vendor. Add your real preferred vendors from the admin page.'],
  ['tip', 'wedding', null, 'Book hair, makeup and your trial', null, 'Good artists book 6+ months ahead. Schedule your trial near a fitting or engagement shoot so you see the full look.', 6],
  ['tip', 'wedding', null, 'Order invitations and set up your registry', null, 'Invitations take 4–6 weeks to print and address. Registry links go on your website, never on the invitation.', 4],
  ['tip', 'wedding', null, 'Mail invitations and get your marriage license', null, 'Invitations go out 6–8 weeks before. A Texas license is good for 90 days with a 72-hour wait, so get it this month.', 2],
].map(([section, audience, category, title, url, note, months_out], i) => ({ section, audience, category, title, url, note, months_out: months_out ?? null, sort: i, active: true }));

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
      hub_items: HUB_SAMPLE.map(x => Object.assign({ id: uid() }, x)),
      client_links: [{ id: uid(), client_id: id, title: 'Our Pinterest board', url: 'https://www.pinterest.com/ideas/wedding/', note: 'Garden ceremony, soft greenery', added_by: 'client', created_at: new Date().toISOString() }],
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
      return ok(db[table].filter(r => !clientId || table === 'hub_items' || (table === 'clients' ? r.id === clientId : r.client_id === clientId)));
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
    async upload(clientId, file, by, tag) {
      if (file.size > 2 * 1048576) throw new Error('Sample mode only stores files under 2 MB. Real portal files can be up to 20 MB.');
      const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
      return this.insert('files', { client_id: clientId, name: file.name, size: file.size, type: file.type, path: '', data_url: data, uploaded_by: by, tag: tag || null });
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
      else if (clientId && table !== 'comments' && table !== 'hub_items') q = q.eq('client_id', clientId);
      return must(await q);
    },
    async myClient(email) { return (must(await sb.from('clients').select('*').eq('email', String(email || '').toLowerCase()).limit(1)) || [])[0] || null; },
    async insert(table, row) { return must(await sb.from(table).insert(row).select().single()); },
    async insertMany(table, rows) { return rows.length ? must(await sb.from(table).insert(rows).select()) : []; },
    async update(table, id, patch) { return must(await sb.from(table).update(patch).eq('id', id).select().single()); },
    async remove(table, id) { must(await sb.from(table).delete().eq('id', id)); },
    async respond(reviewId, decision, note) { must(await sb.rpc('respond_review', { p_review: reviewId, p_decision: decision, p_note: note || '' })); },
    async upload(clientId, file, by, tag) {
      if (file.size > MAX_FILE) throw new Error(file.name + ' is over 20 MB.');
      const path = clientId + '/' + uid() + '-' + file.name.replace(/[^\w.\- ]+/g, '_');
      must(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream' }));
      return this.insert('files', Object.assign({ client_id: clientId, name: file.name, size: file.size, type: file.type, path, uploaded_by: by }, tag ? { tag } : {}));
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
    html += `<div class="list">${b.rows.map(x => `<div class="row" style="align-items:flex-start"><span style="flex:none;width:86px;font-weight:700;color:var(--tint);font-variant-numeric:tabular-nums">${esc(x.time)}</span><span class="grow"><b>${esc(x.title)}</b>${x.notes ? `<span class="sub">${esc(x.notes)}</span>` : ''}</span></div>`).join('')}</div>`;
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
    head.innerHTML = `<div class="wrap">${brandHTML(user ? user.email : 'Client portal')}${user ? `<div class="who"><button class="btn ghost sm" id="out">Sign out</button></div>` : ''}</div>`;
    const o = $('#out'); if (o) o.addEventListener('click', async () => { await DB.signOut(); go(); });
  };
  async function go() {
    const user = await DB.getUser();
    drawHead(user);
    if (!user) return authScreen(root, { title: 'Welcome to your portal', sub: 'MAK(e) It Happen Moments', onIn: go });
    root.innerHTML = '<div class="wrap"><p class="empty" style="padding:40px 0">Opening your portal…</p></div>';
    try {
      let client = await DB.myClient(user.email), preview = null;
      // Mak signed in here sees a labeled preview and picks which client's portal to look at.
      if (!client && DB.mode === 'live' && await DB.isAdmin()) {
        const all = (await DB.list('clients')).sort((a, b) => String(a.name).localeCompare(String(b.name)));
        if (all.length) {
          const pick = sessionStorage.getItem('mak-preview-client');
          client = all.find(x => x.id === pick) || all[0];
          preview = { all, email: user.email };
        }
      }
      if (!client) {
        root.innerHTML = `<div class="auth"><div class="card"><div class="eyebrow">Almost there</div><h1>Your portal isn't ready yet</h1><p class="muted" style="margin:0">Mak sets up your portal once your agreement is signed. If you've booked already, make sure you signed up with the same email address that's on your agreement, or text Mak at ${esc(CFG.PHONE)}.</p><button class="btn" id="out2">Sign out</button></div></div>`;
        $('#out2').addEventListener('click', async () => { await DB.signOut(); go(); });
        return;
      }
      const [milestones, reviews, comments, payments, meetings, vendors, files] = await Promise.all(['milestones', 'reviews', 'comments', 'payments', 'meetings', 'vendors', 'files'].map(t => DB.list(t, client.id)));
      // The Planning Hub is extra: if its tables aren't set up yet, the rest of the portal still opens.
      const [hub, links] = await Promise.all([DB.list('hub_items').catch(() => []), DB.list('client_links', client.id).catch(() => [])]);
      renderClient(root, client, { milestones, reviews, comments, payments, meetings, vendors, files, hub, links }, go, preview);
    } catch (e) { root.innerHTML = `<div class="wrap"><p class="empty" style="padding:40px 0">Could not open your portal: ${esc(errMsg(e))}</p></div>`; }
  }
  go();
}

// The client view is a simple app: five tabs along the bottom, one thing per screen.
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/></svg>',
  timeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M7.5 13.5h3M7.5 17h6"/></svg>',
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 14 2 2 4-4"/></svg>',
  pay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
  files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
  call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
};
const CLIENT_TABS = [['home', 'Home'], ['timeline', 'Timeline'], ['plan', 'Plan'], ['review', 'Review'], ['pay', 'Payments'], ['files', 'Files']];
let clientTab = (location.hash.replace('#', '') === 'payments' ? 'pay' : location.hash.replace('#', '')) || 'home';

function renderClient(root, c, d, reload, preview) {
  if (!CLIENT_TABS.some(t => t[0] === clientTab)) clientTab = 'home';
  const days = c.event_date ? daysUntil(c.event_date) : null;
  const names = [firstName(c.name), firstName(c.partner)].filter(Boolean).join(' & ');
  const ms = [...d.milestones].sort(byDate('due_date'));
  const upcoming = ms.filter(m => !m.done).slice(0, 3);
  const pending = d.reviews.filter(r => r.status === 'pending');
  const payAlerts = paymentAlerts(d.payments);
  const total = d.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), paid = d.payments.filter(p => p.paid_on).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const nowIdx = ms.findIndex(m => !m.done);
  const meetings = [...d.meetings].filter(m => !m.starts_at || new Date(m.starts_at) >= new Date(Date.now() - DAY)).sort(byDate('starts_at'));
  const chip = iso => `<div class="datechip"><span>${esc(fmtDate(iso, { month: 'short' }))}</span><b>${esc(fmtDate(iso, { day: 'numeric' }))}</b></div>`;
  const title = (h, sub) => `<div class="large-title"><h1>${h}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
  const banner = (DB.mode === 'demo' ? `<div class="demo-banner" style="margin-top:14px">Sample mode: this is a pretend client so you can see the portal.</div>` : '') +
    (preview ? `<div class="demo-banner" style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center"><span><b>Admin preview:</b> this is what your client sees.</span>
      <select id="pvPick" style="min-height:38px;padding:6px 34px 6px 10px;width:auto;font-size:15px">${preview.all.map(x => `<option value="${esc(x.id)}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : '');

  const screens = {
    home: () => `${title(`Hi ${esc(names || 'there')}!`, [c.event_date ? esc(fmtDate(c.event_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) : '', esc(c.venue || '')].filter(Boolean).join(' · '))}
      ${days !== null ? `<div class="count-card"><div><b>${days > 0 ? days : days === 0 ? '🎉' : '✓'}</b><br><span>${days > 1 ? 'days to go' : days === 1 ? 'day to go' : days === 0 ? 'Today is the day!' : 'Thank you for celebrating with me!'}</span></div><div class="when">${esc(c.package || c.event_type || '')}${c.guests ? `<br>${esc(c.guests)} guests` : ''}</div></div>` : ''}
      ${payAlerts.length || pending.length ? `<div class="section-title">Needs your attention</div><div class="list">
        ${pending.length ? `<button class="row with-icon" data-go="review"><span class="ico">${ICONS.review}</span><span class="grow"><b>${pending.length} thing${pending.length === 1 ? '' : 's'} to review</b><span class="sub">Tap to look and approve</span></span><span class="chev"></span></button>` : ''}
        ${payAlerts.map(({ p, d: dd }) => `<button class="row with-icon" data-go="pay"><span class="ico ${dd < 0 ? 'red' : 'amber'}">${ICONS.pay}</span><span class="grow"><b>${esc(p.label)} · ${money(p.amount)}</b><span class="sub">${dd < 0 ? 'Past due' : dd === 0 ? 'Due today' : `Due in ${dd} day${dd === 1 ? '' : 's'}`}</span></span><span class="chev"></span></button>`).join('')}
      </div>` : ''}
      <div class="section-title">Coming up next</div>
      ${upcoming.length ? `<div class="list">${upcoming.map(m => `<div class="row" data-go="timeline" role="link" tabindex="0" style="cursor:pointer">${chip(m.due_date)}<span class="grow"><b>${esc(m.title)}</b><span class="sub">${m.owner === 'client' ? '<span class="pill">Your to-do</span> ' : ''}${esc(m.detail || (m.owner === 'client' ? 'Something I need from you.' : "Mak's handling this."))}</span>${isReviewStep(m) && days !== null && days <= 0 ? reviewBtn() : ''}</span><span class="chev"></span></div>`).join('')}</div>` : '<div class="list"><div class="row"><span class="grow muted">Everything is checked off. Enjoy!</span></div></div>'}
      ${meetings.length ? `<div class="section-title">Meetings</div><div class="list">${meetings.map(m => `<div class="row">${m.starts_at ? chip(String(m.starts_at).slice(0, 10)) : ''}<span class="grow"><b>${esc(m.title)}</b><span class="sub">${esc(fmtDateTime(m.starts_at))}${m.location ? ' · ' + esc(m.location) : ''}${m.notes ? '<br>' + esc(m.notes) : ''}</span></span></div>`).join('')}</div>` : ''}
      <div class="section-title">Need Mak?</div>
      <div class="list">
        <a class="row with-icon" href="sms:${esc(String(CFG.PHONE || '').replace(/\D/g, ''))}"><span class="ico green">${ICONS.text}</span><span class="grow"><b>Text Mak</b><span class="sub">${esc(CFG.PHONE)}</span></span><span class="chev"></span></a>
        <a class="row with-icon" href="mailto:${esc(CFG.EMAIL)}"><span class="ico blue">${ICONS.mail}</span><span class="grow"><b>Email Mak</b></span><span class="chev"></span></a>
        ${CFG.BOOK_CALL_URL ? `<a class="row with-icon" href="${esc(CFG.BOOK_CALL_URL)}" target="_blank" rel="noopener"><span class="ico">${ICONS.call}</span><span class="grow"><b>Book a call</b></span><span class="chev"></span></a>` : ''}
      </div>`,
    timeline: () => {
      let last = '';
      const groups = [];
      ms.forEach((m, i) => {
        const month = fmtDate(m.due_date, { month: 'long', year: 'numeric' });
        if (month !== last) { groups.push({ month, rows: [] }); last = month; }
        const st = stepState(m), isEvent = c.event_date && m.due_date === c.event_date && /day!/i.test(m.title);
        const cls = st === 'done' ? 'done' : isEvent ? 'event' : st === 'late' ? 'late' : i === nowIdx ? 'now' : '';
        groups[groups.length - 1].rows.push(`<div class="row"><span class="check ${cls}"></span><span class="grow"><b style="${st === 'done' ? 'color:var(--muted);font-weight:500' : ''}">${esc(m.title)}</b><span class="sub">${esc(fmtDate(m.due_date, { weekday: 'short', month: 'short', day: 'numeric' }))}${m.owner === 'client' && !m.done ? ' · <span class="pill">Your to-do</span>' : ''}${st === 'late' ? ' · <span class="pill red">Past due</span>' : ''}${m.detail ? '<br>' + esc(m.detail) : ''}</span>${isReviewStep(m) && !m.done && days !== null && days <= 0 ? reviewBtn() : ''}</span></div>`);
      });
      return `${title('Timeline', 'Everything from booking to your big day.')}
        ${groups.length ? groups.map(g => `<div class="section-title">${esc(g.month)}</div><div class="list">${g.rows.join('')}</div>`).join('') : '<div class="section-title">&nbsp;</div><div class="list"><div class="row"><span class="grow muted">Mak is building your timeline.</span></div></div>'}
        ${d.vendors.length ? `<div class="section-title">Your vendor team</div><div class="list">${d.vendors.map(v => `<div class="row"><span class="grow"><b>${esc(v.name)}</b><span class="sub">${[v.category, v.arrival && 'arrives ' + v.arrival, v.contact, v.phone].filter(Boolean).map(esc).join(' · ')}</span></span></div>`).join('')}</div>` : ''}`;
    },
    review: () => `${title('Review', 'Approve what Mak shares, or ask for changes.')}
      <div class="section-title">${pending.length ? `${pending.length} waiting on you` : 'All caught up'}</div>
      ${d.reviews.length ? `<div class="list">${[...d.reviews].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).map(r => `<button class="row" data-review="${esc(r.id)}"><span class="grow"><b>${esc(r.title)}</b><span class="sub">${r.kind === 'run-of-show' ? 'Run of show' : 'Document'}${r.version > 1 ? ' · version ' + esc(r.version) : ''}</span></span>${statusPill(r.status)}<span class="chev"></span></button>`).join('')}</div>` : `<div class="list"><div class="row"><span class="grow muted">When Mak shares your run of show or other plans, they'll show up here.</span></div></div>`}`,
    pay: () => `${title('Payments')}
      ${d.payments.length ? `<div class="section-title">Your balance</div><div class="pay-card"><div class="big">${money(total - paid)}</div><div class="of">left of ${money(total)} total · ${money(paid)} paid</div><div class="bar"><i style="width:${total ? Math.min(100, paid / total * 100) : 0}%"></i></div></div>
        <div class="section-title">Schedule</div>
        <div class="list">${[...d.payments].sort(byDate('due_date')).map(p => { const dd = p.due_date ? daysUntil(p.due_date) : null; return `<div class="row"><span class="grow"><b>${esc(p.label)}</b><span class="sub">${p.paid_on ? 'Paid ' + esc(fmtDate(p.paid_on)) : p.due_date ? 'Due ' + esc(fmtDate(p.due_date, { weekday: 'short', month: 'short', day: 'numeric' })) : ''}</span></span><span class="end"><b style="color:var(--ink)">${money(p.amount)}</b><br>${p.paid_on ? '<span class="pill ok">Paid</span>' : dd !== null && dd < 0 ? '<span class="pill red">Past due</span>' : dd !== null && dd <= 14 ? '<span class="pill amber">Due soon</span>' : '<span class="pill dim">Upcoming</span>'}</span></div>`; }).join('')}</div>
        ${howToPayHTML()}` : '<div class="section-title">&nbsp;</div><div class="list"><div class="row"><span class="grow muted">Your payment schedule will show here.</span></div></div>'}`,
    plan: () => {
      const items = (d.hub || []).filter(i => i.active !== false && (i.audience === 'all' || i.audience === audienceOf(c))).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const vendors = items.filter(i => i.section === 'vendor'), tools = items.filter(i => i.section === 'tool');
      const { now, next } = tipsFor(items.filter(i => i.section === 'tip'), days);
      const groups = list => { const m = new Map(); list.forEach(i => { const k = i.category || 'More'; if (!m.has(k)) m.set(k, []); m.get(k).push(i); }); return [...m]; };
      const linkRow = i => i.url ? `<a class="row with-icon" href="${esc(i.url)}" target="_blank" rel="noopener"><span class="ico">${ICONS.link}</span><span class="grow"><b>${esc(i.title)}</b>${i.note ? `<span class="sub">${esc(i.note)}</span>` : ''}</span><span class="chev"></span></a>`
        : `<div class="row with-icon"><span class="ico">${ICONS.star}</span><span class="grow"><b>${esc(i.title)}</b>${i.note ? `<span class="sub">${esc(i.note)}</span>` : ''}</span></div>`;
      const ideas = d.files.filter(f => f.tag === 'inspiration');
      return `${title('Planning Hub', 'Mak’s favorite vendors, helpful websites and a place for your ideas.')}
        ${now ? `<div class="section-title">Tip for right now</div><div class="tip-card"><b>${esc(now.title)}</b><p>${esc(now.note || '')}</p>${next ? `<span class="tip-next">Next up: ${esc(next.title)}</span>` : ''}</div>` : ''}
        <div class="section-title">Mak’s preferred vendors</div>
        ${vendors.length ? groups(vendors).map(([cat, list]) => `<div class="hub-cat">${esc(cat)}</div><div class="list">${list.map(linkRow).join('')}</div>`).join('') + '<p class="hub-note">Tell them Mak sent you. I only recommend people I trust to show up and do it right.</p>' : '<div class="list"><div class="row"><span class="grow muted">Mak is adding her favorite vendors here. Ask her anytime for a recommendation.</span></div></div>'}
        ${tools.length ? `<div class="section-title">Helpful websites</div>${groups(tools).map(([cat, list]) => `<div class="hub-cat">${esc(cat)}</div><div class="list">${list.map(linkRow).join('')}</div>`).join('')}` : ''}
        <div class="section-title">My saved links</div>
        <div class="list">${d.links.map(l => `<div class="row with-icon"><span class="ico">${ICONS.link}</span><span class="grow">${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener"><b>${esc(l.title)}</b></a>` : `<b>${esc(l.title)}</b>`}${l.note ? `<span class="sub">${esc(l.note)}</span>` : ''}</span>${l.added_by === 'client' ? `<button class="btn sm ghost" data-ldel="${esc(l.id)}">Remove</button>` : ''}</div>`).join('') || '<div class="row"><span class="grow muted">Save your Pinterest board, your website, your registry or anything you want handy.</span></div>'}</div>
        <form class="hub-add" id="addLink" novalidate><input type="text" name="title" placeholder="Name it (e.g. Our Pinterest board)" aria-label="Link name"><input type="url" name="url" placeholder="Paste the link" aria-label="Link"><input type="text" name="note" placeholder="Note (optional)" aria-label="Note"><button class="btn primary" type="submit">Save link</button></form>
        <div class="section-title">Inspiration photos</div>
        ${ideas.length ? `<div class="idea-grid">${ideas.sort(byDate('created_at')).reverse().map(f => `<button class="idea" data-idea="${esc(f.id)}" aria-label="${esc(f.name)}"><img alt="" data-src="${esc(f.id)}"></button>`).join('')}</div>` : ''}
        <label class="btn block" style="cursor:pointer;margin-top:10px">${ICONS.upload.replace('<svg', '<svg width="22" height="22"')} Add inspiration photos<input type="file" id="ideaFile" multiple hidden accept="image/*"></label>
        <p class="hub-note">Mak can see everything you save here, so it doubles as a way to show her your vision.</p>`;
    },
    files: () => `${title('Files', 'Share photos, your guest list or anything else with Mak.')}
      <div class="section-title">&nbsp;</div>
      <label class="btn primary block" style="cursor:pointer">${ICONS.upload.replace('<svg', '<svg width="22" height="22"')} Upload a photo or file<input type="file" id="cfile" multiple hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"></label>
      <div class="section-title">${d.files.some(f => f.tag !== 'inspiration') ? 'Shared files' : ''}</div>
      ${d.files.some(f => f.tag !== 'inspiration') ? `<div class="list">${d.files.filter(f => f.tag !== 'inspiration').sort(byDate('created_at')).reverse().map(f => `<button class="row" data-file="${esc(f.id)}"><span class="grow"><b>${esc(f.name)}</b><span class="sub">From ${f.uploaded_by === 'client' ? 'you' : 'Mak'} · ${esc(fmtDate(f.created_at, { month: 'short', day: 'numeric' }))}${f.size ? ' · ' + esc(fmtSize(f.size)) : ''}</span></span><span class="chev"></span></button>`).join('')}</div>` : ''}`,
  };

  root.innerHTML = `<div class="wrap app">${banner}${screens[clientTab]()}</div>
    <nav class="tabbar" aria-label="Portal sections"><div class="in" role="tablist">${CLIENT_TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${clientTab === k}">${ICONS[k]}<span>${l}</span>${k === 'review' && pending.length ? `<span class="badge">${pending.length}</span>` : ''}</button>`).join('')}</div></nav>`;

  const show = k => { clientTab = k; try { history.replaceState(null, '', '#' + k); } catch (e) {} renderClient(root, c, d, reload, preview); window.scrollTo(0, 0); };
  root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  root.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', e => { if (e.target.closest('a')) return; show(b.dataset.go); });
    b.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.closest('a')) show(b.dataset.go); });
  });
  const pv = $('#pvPick'); if (pv) pv.addEventListener('change', () => { sessionStorage.setItem('mak-preview-client', pv.value); reload(); });
  root.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => preview ? toast('Preview only: your client approves this from their own login.') : openClientReview(d.reviews.find(r => r.id === b.dataset.review), c, d, reload)));
  root.querySelectorAll('[data-file]').forEach(b => b.addEventListener('click', () => openFile(d.files.find(f => f.id === b.dataset.file))));
  if (clientTab === 'plan') wirePlan(root, c, d, reload, preview);
  const cf = $('#cfile');
  if (cf) cf.addEventListener('change', async e => {
    for (const file of [...e.target.files]) {
      toast('Uploading ' + file.name + '…');
      try { await DB.upload(c.id, file, 'client'); toast(file.name + ' shared with Mak'); } catch (err) { toast(errMsg(err)); }
    }
    reload();
  });
}

const audienceOf = c => /wedding/i.test((c.package || '') + ' ' + (c.event_type || '')) ? 'wedding' : 'event';
// Tips are tied to "months out". The current tip is the one whose window has opened most recently.
function tipsFor(tips, days) {
  if (!tips.length) return {};
  const sorted = [...tips].sort((a, b) => (Number(b.months_out) || 0) - (Number(a.months_out) || 0));
  if (days === null) return { now: sorted[0], next: sorted[1] };
  if (days < 0) return {};
  const left = days / 30.4;
  const open = sorted.filter(t => (Number(t.months_out) || 0) >= left);
  const now = open[open.length - 1] || null, next = sorted.find(t => (Number(t.months_out) || 0) < left && (!now || t !== now));
  return { now: now || sorted[0], next: now ? next : sorted[1] };
}
function wirePlan(root, c, d, reload, preview) {
  root.querySelectorAll('img[data-src]').forEach(async img => {
    const f = d.files.find(x => x.id === img.dataset.src);
    try { img.src = await DB.fileUrl(f); } catch (e) {}
  });
  root.querySelectorAll('[data-idea]').forEach(b => b.addEventListener('click', () => openFile(d.files.find(f => f.id === b.dataset.idea))));
  const form = $('#addLink');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (preview) return toast('Preview only: your client saves links from their own login.');
    const f = new FormData(form), url = String(f.get('url') || '').trim(), t = String(f.get('title') || '').trim();
    if (!t && !url) return toast('Add a name or paste a link.');
    if (url && !/^https?:\/\//i.test(url)) return toast('Links start with https://');
    try { await DB.insert('client_links', { client_id: c.id, title: t || url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0], url, note: String(f.get('note') || '').trim(), added_by: 'client' }); toast('Saved'); reload(); }
    catch (err) { toast(errMsg(err)); }
  });
  root.querySelectorAll('[data-ldel]').forEach(b => b.addEventListener('click', async () => {
    if (preview) return toast('Preview only.');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Remove'; } }, 3000); return; }
    try { await DB.remove('client_links', b.dataset.ldel); reload(); } catch (err) { toast(errMsg(err)); }
  }));
  const fi = $('#ideaFile');
  fi.addEventListener('change', async e => {
    if (preview) { toast('Preview only.'); return; }
    for (const file of [...e.target.files]) {
      toast('Uploading ' + file.name + '…');
      try { await DB.upload(c.id, file, 'client', 'inspiration'); } catch (err) { toast(errMsg(err)); }
    }
    toast('Added to your inspiration'); reload();
  });
}
function openClientReview(r, c, d, reload) {
  if (!r) return;
  const comments = d.comments.filter(x => x.review_id === r.id);
  const m = modal(`<header><div><div class="eyebrow">${r.kind === 'run-of-show' ? 'Run of show' : 'For your review'}${r.version > 1 ? ' · version ' + esc(r.version) : ''}</div><h2>${esc(r.title)}</h2><div style="margin-top:8px">${statusPill(r.status)}</div></div><button class="btn sm" data-close>Done</button></header>
    ${reviewBodyHTML(r)}
    ${threadHTML(comments, c.name)}
    ${r.status === 'pending' ? `<div style="display:flex;flex-direction:column;gap:12px"><button class="btn primary block" data-act="approved">👍  Looks perfect, approve</button>
      <label class="f" style="margin-top:6px">Want something changed? Tell Mak here:<textarea id="note" placeholder="Example: Can we move the first look to 2:00?"></textarea></label>
      <button class="btn block" data-act="changes">Send my changes to Mak</button></div>`
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
  const state = { clients: [], cur: null, tab: 'overview', data: null, q: '', view: 'clients', hub: [] };
  const drawHead = user => {
    head.innerHTML = `<div class="wrap wide">${brandHTML('Client portal · Admin')}<div class="who">${CFG.TOOLKIT_URL ? `<a class="btn ghost sm" href="${esc(CFG.TOOLKIT_URL)}">Toolkit</a>` : ''}<button class="btn ghost sm" id="hubBtn">Planning Hub</button><a class="btn ghost sm" href="./">Client view</a>${user ? '<button class="btn ghost sm" id="out">Sign out</button>' : ''}</div></div>`;
    const o = $('#out'); if (o) o.addEventListener('click', async () => { await DB.signOut(); go(); });
    const hb = $('#hubBtn'); if (hb) { hb.hidden = !user; hb.addEventListener('click', () => { state.view = state.view === 'hub' ? 'clients' : 'hub'; hb.textContent = state.view === 'hub' ? 'Clients' : 'Planning Hub'; draw(); }); }
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
    const links = await DB.list('client_links', id).catch(() => []);
    state.data = { milestones, reviews, comments: comments.filter(cm => reviews.some(r => r.id === cm.review_id)), payments, meetings, vendors, files, notes, links };
  }
  function clientFlags(c) {
    return c.id === (state.cur && state.cur.id) && state.data ? [state.data.reviews.some(r => r.status === 'changes') && '<span class="pill red">Changes requested</span>', paymentAlerts(state.data.payments).some(x => x.d < 0) && '<span class="pill red">Payment past due</span>'].filter(Boolean).join(' ') : '';
  }
  function draw() {
    if (state.view === 'hub') return drawHub();
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
  // Planning Hub: one list Mak keeps for every client. Clients see the items for their event type.
  const HUB_SECTIONS = [['vendor', 'Your preferred vendors', 'Shows first. Add the vendors you refer (and earn your 10% on).'], ['tool', 'Helpful websites', 'Websites and tools grouped by category.'], ['tip', 'Tips by months out', 'Each client sees the tip for where they are in planning. "Months out" = when it starts showing.']];
  const HUB_FIELDS = s => [['title', s === 'tip' ? 'Tip headline' : 'Name', 'text'], ...(s === 'tip' ? [['months_out', 'Months out', 'number']] : [['category', 'Category', 'text'], ['url', 'Link (https://)', 'url']]), ['note', s === 'tip' ? 'Tip' : 'Short note for clients', 'text'], ['audience', 'Who sees it', 'select', [['all', 'Everyone'], ['wedding', 'Weddings'], ['event', 'Other events']]], ['sort', 'Order', 'number'], ['active', 'Showing', 'check']];
  async function drawHub() {
    try { state.hub = await DB.list('hub_items'); }
    catch (e) { root.innerHTML = `<div class="wrap wide"><section class="panel" style="margin-top:16px"><p class="empty">The Planning Hub isn't set up in the database yet (${esc(errMsg(e))}).</p></section></div>`; return; }
    root.innerHTML = `<div class="wrap wide"><section class="panel glow" style="margin-top:16px"><header><div><div class="eyebrow">Every client</div><h2 style="font-size:clamp(24px,4vw,34px)">Planning Hub</h2><div class="dim" style="margin-top:4px">What shows on the Plan tab in your clients' portals.</div></div></header>
      ${HUB_SECTIONS.map(([s, label, help]) => { const rows = state.hub.filter(i => i.section === s).sort((a, b) => (a.sort || 0) - (b.sort || 0)); return `<h3 style="margin:22px 0 4px">${esc(label)} <span class="dim" style="font-size:14px;font-weight:500">${rows.length}</span></h3><p class="dim" style="margin:0 0 10px;font-size:14px">${esc(help)}</p>
        <div class="erows">${rows.map(r => `<div class="erow" data-hrow="${esc(r.id)}">${HUB_FIELDS(s).map(f => inputHTML(f, r[f[0]], 'data-f')).join('')}<div class="actions"><button class="btn sm primary" data-hsave>Save</button><button class="btn sm danger" data-hdel>Delete</button></div></div>`).join('') || '<p class="empty">Nothing here yet.</p>'}</div>
        <div class="actions" style="margin-top:10px"><button class="btn" data-hadd="${s}">Add ${s === 'vendor' ? 'a vendor' : s === 'tool' ? 'a website' : 'a tip'}</button></div>`; }).join('')}
      </section></div>`;
    root.querySelectorAll('[data-hrow]').forEach(row => {
      row.querySelector('[data-hsave]').addEventListener('click', async () => {
        const patch = readInputs(row, 'data-f');
        if (patch.url && !/^https?:\/\//i.test(patch.url)) return toast('Links start with https://');
        try { await DB.update('hub_items', row.dataset.hrow, patch); toast('Saved'); drawHub(); } catch (e) { toast(errMsg(e)); }
      });
      const del = row.querySelector('[data-hdel]');
      del.addEventListener('click', async () => {
        if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Tap again'; setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Delete'; } }, 3000); return; }
        try { await DB.remove('hub_items', row.dataset.hrow); drawHub(); } catch (e) { toast(errMsg(e)); }
      });
    });
    root.querySelectorAll('[data-hadd]').forEach(b => b.addEventListener('click', async () => {
      const s = b.dataset.hadd, max = Math.max(0, ...state.hub.filter(i => i.section === s).map(i => i.sort || 0));
      try { await DB.insert('hub_items', { section: s, audience: s === 'vendor' ? 'all' : 'wedding', category: s === 'vendor' ? 'Florist' : s === 'tool' ? 'Planning' : null, title: s === 'vendor' ? 'New vendor' : s === 'tool' ? 'New website' : 'New tip', url: '', note: '', months_out: s === 'tip' ? 3 : null, sort: max + 1, active: true }); drawHub(); }
      catch (e) { toast(errMsg(e)); }
    }));
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
        <ul class="mini">${[...d.files].sort(byDate('created_at')).reverse().map(f => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="min-width:0"><b style="overflow-wrap:anywhere">${esc(f.name)}</b><span>${f.tag === 'inspiration' ? 'Inspiration photo · ' : ''}${f.uploaded_by === 'client' ? 'From client' : 'From you'} · ${esc(fmtDate(f.created_at, { month: 'short', day: 'numeric' }))}${f.size ? ' · ' + esc(fmtSize(f.size)) : ''}</span></span><span class="actions"><button class="btn sm" data-fo="${esc(f.id)}">Open</button><button class="btn sm danger" data-fd="${esc(f.id)}">Delete</button></span></li>`).join('') || '<p class="empty">No files yet.</p>'}</ul>
        <h3 style="margin:22px 0 8px">Their saved links</h3>
        <ul class="mini">${(d.links || []).map(l => `<li><b style="overflow-wrap:anywhere">${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>` : esc(l.title)}</b><span>${esc(l.note || '')}${l.note ? ' · ' : ''}${esc(fmtDate(l.created_at, { month: 'short', day: 'numeric' }))}</span></li>`).join('') || '<p class="empty">They haven\'t saved any links yet. They add them on the Plan tab.</p>'}</ul>`,
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
