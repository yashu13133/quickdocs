/* ATS resume builder. PDF is drawn as real text with jsPDF (not an image). */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CONTACT = [['name','Full name'],['title','Job title (optional)'],['email','Email'],['phone','Phone'],['location','City, Country'],['links','LinkedIn / portfolio (optional)']];
const blankExp = () => ({ role:'', company:'', dates:'', bullets:'' });
const blankEdu = () => ({ degree:'', school:'', year:'' });
let S = { data:{}, exp:[blankExp()], edu:[blankEdu()] };
try { const s = JSON.parse(localStorage.getItem('resume-v1')||'null'); if (s && s.data) S = s; } catch(e){}
const save = () => { try { localStorage.setItem('resume-v1', JSON.stringify(S)); } catch(e){} };

/* ---------- FORM ---------- */
function field(label, attrs, val, area) {
  return `<label class="f"><span>${label}</span>` + (area
    ? `<textarea rows="3" ${attrs}>${esc(val||'')}</textarea>`
    : `<input type="text" ${attrs} value="${esc(val||'')}">`) + `</label>`;
}
function buildLists() {
  $('contact').innerHTML = CONTACT.map(([k,l]) => field(l, `data-k="${k}"`, S.data[k])).join('');
  $('exp').innerHTML = S.exp.map((e,i) =>
    `<div class="f" style="border:1px solid var(--line);border-radius:8px;padding:10px">` +
    field('Job title', `data-l="exp" data-i="${i}" data-f="role"`, e.role) +
    field('Company', `data-l="exp" data-i="${i}" data-f="company"`, e.company) +
    field('Dates (e.g. Jan 2022 - Present)', `data-l="exp" data-i="${i}" data-f="dates"`, e.dates) +
    field('Achievements (one per line)', `data-l="exp" data-i="${i}" data-f="bullets"`, e.bullets, true) +
    `<button class="btn ghost" type="button" data-rm="exp" data-i="${i}">Remove</button></div>`).join('');
  $('edu').innerHTML = S.edu.map((e,i) =>
    `<div class="f" style="border:1px solid var(--line);border-radius:8px;padding:10px">` +
    field('Degree', `data-l="edu" data-i="${i}" data-f="degree"`, e.degree) +
    field('School / University', `data-l="edu" data-i="${i}" data-f="school"`, e.school) +
    field('Year', `data-l="edu" data-i="${i}" data-f="year"`, e.year) +
    `<button class="btn ghost" type="button" data-rm="edu" data-i="${i}">Remove</button></div>`).join('');
  document.querySelectorAll('[data-k="summary"],[data-k="skills"],[data-k="certs"]').forEach(el => el.value = S.data[el.dataset.k] || '');
}
$('form').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.k) S.data[t.dataset.k] = t.value;
  else if (t.dataset.l) S[t.dataset.l][+t.dataset.i][t.dataset.f] = t.value;
  else return;
  save(); render();
});
$('form').addEventListener('click', e => {
  const l = e.target.dataset.rm; if (!l) return;
  S[l].splice(+e.target.dataset.i, 1);
  if (!S[l].length) S[l].push(l === 'exp' ? blankExp() : blankEdu());
  save(); buildLists(); render();
});
$('addExp').onclick = () => { S.exp.push(blankExp()); save(); buildLists(); };
$('addEdu').onclick = () => { S.edu.push(blankEdu()); save(); buildLists(); };

/* ---------- PREVIEW ---------- */
const lines = s => String(s||'').split('\n').map(x => x.trim()).filter(Boolean);
function render() {
  const d = S.data, p = $('paper');
  const contact = [d.email, d.phone, d.location, d.links].filter(Boolean).map(esc).join(' | ');
  let h = `<div class="a-name">${esc(d.name || 'Your Name')}</div>`;
  if (d.title) h += `<div class="a-title">${esc(d.title)}</div>`;
  if (contact) h += `<div class="a-contact">${contact}</div>`;
  if (d.summary && d.summary.trim()) h += `<div class="a-h">SUMMARY</div><div>${esc(d.summary).replace(/\n/g,'<br>')}</div>`;
  const exp = S.exp.filter(e => e.role || e.company);
  if (exp.length) h += `<div class="a-h">EXPERIENCE</div>` + exp.map(e =>
    `<div class="a-entry"><div class="a-line"><b>${esc(e.role)}${e.role && e.company ? ', ' : ''}${esc(e.company)}</b><span>${esc(e.dates)}</span></div>` +
    (lines(e.bullets).length ? `<ul>${lines(e.bullets).map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '') + `</div>`).join('');
  const edu = S.edu.filter(e => e.degree || e.school);
  if (edu.length) h += `<div class="a-h">EDUCATION</div>` + edu.map(e =>
    `<div class="a-entry"><div class="a-line"><b>${esc(e.degree)}${e.degree && e.school ? ', ' : ''}${esc(e.school)}</b><span>${esc(e.year)}</span></div></div>`).join('');
  if (d.skills && d.skills.trim()) h += `<div class="a-h">SKILLS</div><div>${esc(d.skills)}</div>`;
  if (lines(d.certs).length) h += `<div class="a-h">CERTIFICATIONS / PROJECTS</div><ul>${lines(d.certs).map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  p.innerHTML = h;
  fit();
}
function fit() {
  const s = Math.min(1, $('stage').clientWidth / 794);
  $('paper').style.transform = `scale(${s})`;
  $('stage').style.height = ($('paper').offsetHeight * s) + 'px';
}
window.addEventListener('resize', fit);

/* ---------- PDF (real text) ---------- */
const clean = s => String(s||'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
function buildPDF() {
  const doc = new jspdf.jsPDF({ unit:'pt', format:'a4' });
  const W = 595.28, H = 841.89, M = 46, CW = W - 2*M;
  let y = M;
  const d = S.data;
  const need = h => { if (y + h > H - M) { doc.addPage(); y = M; } };
  const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
  function para(text, size, bold, x = M, width = CW, gap = 3, align = 'left') {
    font(size, bold);
    const ls = doc.splitTextToSize(clean(text), width);
    ls.forEach(l => { need(size * 1.25); y += size; doc.text(l, align === 'center' ? W/2 : x, y, { align }); y += size * 0.25; });
    y += gap;
  }
  function heading(t) {
    need(30); y += 8; font(11, true); y += 11; doc.text(t, M, y); y += 4;
    doc.setLineWidth(0.7); doc.line(M, y, W - M, y); y += 5;
  }
  function bullets(arr) {
    arr.forEach(b => {
      font(10.5, false);
      const ls = doc.splitTextToSize(clean(b), CW - 16);
      ls.forEach((l, i) => { need(14); y += 10.5; if (i === 0) doc.text('\u2022', M + 4, y); doc.text(l, M + 16, y); y += 2.8; });
    });
    y += 2;
  }
  doc.setTextColor(0);
  para(d.name || 'Your Name', 20, true, M, CW, 2, 'center');
  if (d.title) para(d.title, 11.5, false, M, CW, 2, 'center');
  const contact = [d.email, d.phone, d.location, d.links].filter(Boolean).join(' | ');
  if (contact) para(contact, 10, false, M, CW, 4, 'center');
  if (d.summary && d.summary.trim()) { heading('SUMMARY'); para(d.summary.replace(/\n/g, ' '), 10.5, false); }
  const exp = S.exp.filter(e => e.role || e.company);
  if (exp.length) {
    heading('EXPERIENCE');
    exp.forEach(e => {
      need(30); font(11, true); y += 11;
      doc.text(clean([e.role, e.company].filter(Boolean).join(', ')), M, y, { maxWidth: CW - 130 });
      font(10, false); doc.text(clean(e.dates), W - M, y, { align:'right' }); y += 4;
      bullets(lines(e.bullets)); y += 3;
    });
  }
  const edu = S.edu.filter(e => e.degree || e.school);
  if (edu.length) {
    heading('EDUCATION');
    edu.forEach(e => {
      need(20); font(11, true); y += 11;
      doc.text(clean([e.degree, e.school].filter(Boolean).join(', ')), M, y, { maxWidth: CW - 70 });
      font(10, false); doc.text(clean(e.year), W - M, y, { align:'right' }); y += 8;
    });
  }
  if (d.skills && d.skills.trim()) { heading('SKILLS'); para(d.skills.replace(/\n/g, ' '), 10.5, false); }
  if (lines(d.certs).length) { heading('CERTIFICATIONS / PROJECTS'); bullets(lines(d.certs)); }
  doc.setProperties({ title: clean((d.name || 'Resume') + ' - Resume') });
  return doc;
}
async function downloadPDF() {
  const btn = $('dl');
  btn.disabled = true; btn.textContent = 'Preparing PDF…';
  try {
    if (!(d => d.name && d.name.trim())(S.data)) { $('msg').textContent = 'Please enter your full name first.'; return; }
    if (!window.jspdf) throw new Error('PDF library failed to load. Check your internet and retry.');
    if (!(await isPaid())) { $('msg').textContent = 'Please complete payment to download.'; return; }
    const nm = S.data.name.trim().replace(/[^\w]+/g, '_') || 'resume';
    buildPDF().save(nm + '_Resume.pdf');
    $('msg').textContent = 'Downloaded.';
  } catch (e) {
    console.error(e);
    $('msg').textContent = 'Could not create the PDF: ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Download PDF (₹15)';
  }
}
$('dl').addEventListener('click', downloadPDF);
buildLists(); render();
