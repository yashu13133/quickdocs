/* ---------- LANGUAGES ----------
 To add a language: add an <option> in biodata.html, add a block here
 with the same keys, and (if needed) a font in the <link> and CSS. */
const LANG = {
  en: { title:'Biodata', god:'|| Shree Ganeshay Namah ||', photo:'Photo',
    personal:'Personal Details', family:'Family Details', contact:'Contact Details',
    name:'Full Name', dob:'Date of Birth', tob:'Time of Birth', pob:'Place of Birth',
    height:'Height', complexion:'Complexion', religion:'Religion', caste:'Caste', gotra:'Gotra',
    education:'Education', occupation:'Occupation', income:'Annual Income',
    father:"Father's Name", fatherocc:"Father's Occupation", mother:"Mother's Name", motherocc:"Mother's Occupation",
    siblings:'Siblings', address:'Address', phone:'Contact Number', email:'Email' },
  hi: { title:'बायोडाटा', god:'|| श्री गणेशाय नमः ||', photo:'फोटो',
    personal:'व्यक्तिगत जानकारी', family:'पारिवारिक जानकारी', contact:'संपर्क जानकारी',
    name:'पूरा नाम', dob:'जन्म तिथि', tob:'जन्म समय', pob:'जन्म स्थान',
    height:'ऊँचाई', complexion:'रंग', religion:'धर्म', caste:'जाति', gotra:'गोत्र',
    education:'शिक्षा', occupation:'व्यवसाय', income:'वार्षिक आय',
    father:'पिता का नाम', fatherocc:'पिता का व्यवसाय', mother:'माता का नाम', motherocc:'माता का व्यवसाय',
    siblings:'भाई-बहन', address:'पता', phone:'संपर्क नंबर', email:'ईमेल' }
};
const SECTIONS = {
  personal:['name','dob','tob','pob','height','complexion','religion','caste','gotra','education','occupation','income'],
  family:['father','fatherocc','mother','motherocc','siblings'],
  contact:['address','phone','email']
};
const COLORS = ['#8c2f39','#1f5c4a','#2f4f8c','#7a3b8f','#b5651d'];

/* ---------- STATE ---------- */
let state = { lang:'en', tpl:'classic', color:COLORS[0], photo:'', data:{} };
try { const s = JSON.parse(localStorage.getItem('biodata-v1')||'null'); if (s) state = Object.assign(state, s); } catch(e){}
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const save = () => { try { localStorage.setItem('biodata-v1', JSON.stringify(Object.assign({}, state, {photo:''}))); } catch(e){} };

/* ---------- FORM ---------- */
function buildForm() {
  const t = LANG[state.lang];
  let h = '';
  for (const sec in SECTIONS) {
    h += `<h3>${esc(t[sec])}</h3>`;
    SECTIONS[sec].forEach(k => {
      const v = esc(state.data[k] || '');
      h += k === 'address'
        ? `<label class="f"><span>${esc(t[k])}</span><textarea rows="2" data-k="${k}">${v}</textarea></label>`
        : `<label class="f"><span>${esc(t[k])}</span><input type="text" data-k="${k}" value="${v}"></label>`;
    });
  }
  $('fields').innerHTML = h;
  $('fields').querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => {
    state.data[el.dataset.k] = el.value; save(); render();
  }));
}

/* ---------- PREVIEW ---------- */
function render() {
  const t = LANG[state.lang], d = state.data;
  const p = $('paper');
  p.className = 't-' + state.tpl + (state.lang === 'hi' ? ' hi' : '');
  p.style.setProperty('--acc', state.color);
  let h = `<div class="p-top">${esc(t.god)}</div><div class="p-title">${esc(t.title)}</div>`;
  h += `<div class="p-head">`;
  if (state.photo) h += `<img class="p-photo" src="${state.photo}" alt="">`;
  h += `<div class="p-name">${esc(d.name || '')}</div></div>`;
  for (const sec in SECTIONS) {
    const rows = SECTIONS[sec].filter(k => !(k === 'name') && d[k] && d[k].trim());
    if (!rows.length) continue;
    h += `<div class="p-sec"><h4>${esc(t[sec])}</h4>` +
      rows.map(k => `<div class="p-row"><b>${esc(t[k])}</b><i>${esc(d[k]).replace(/\n/g,'<br>')}</i></div>`).join('') + `</div>`;
  }
  p.innerHTML = h;
  fit();
}
function fit() {
  const s = Math.min(1, $('stage').clientWidth / 794);
  $('paper').style.transform = `scale(${s})`;
  $('stage').style.height = (1123 * s) + 'px';
}
window.addEventListener('resize', fit);

/* Payment (isPaid) lives in js/pay.js and is shared with the resume page. */
/* ---------- PDF ---------- */
async function downloadPDF() {
  const btn = $('dl');
  btn.disabled = true; btn.textContent = 'Preparing PDF…';
  try {
    if (!(await isPaid())) { $('msg').textContent = 'Please complete payment to download.'; return; }
    if (!window.html2canvas || !window.jspdf) throw new Error('PDF libraries failed to load. Check your internet and retry.');
    await document.fonts.ready;
    const canvas = await html2canvas($('paper'), {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      onclone: doc => { doc.getElementById('paper').style.transform = 'none'; }
    });
    const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
    const nm = (state.data.name || 'biodata').trim().replace(/[^\w\u0900-\u097F]+/g, '_');
    pdf.save(nm + '_biodata.pdf');
    $('msg').textContent = 'Downloaded.';
  } catch (e) {
    console.error(e);
    $('msg').textContent = 'Could not create the PDF: ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Download PDF (₹15)';
  }
}

/* ---------- INIT ---------- */
function init() {
  $('lang').value = state.lang; $('tpl').value = state.tpl;
  $('sw').innerHTML = COLORS.map(c => `<div class="sw${c===state.color?' on':''}" data-c="${c}" style="background:${c}"></div>`).join('');
  $('sw').addEventListener('click', e => {
    const c = e.target.dataset.c; if (!c) return;
    state.color = c; save();
    document.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === c));
    render();
  });
  $('lang').addEventListener('change', e => { state.lang = e.target.value; save(); buildForm(); render(); });
  $('tpl').addEventListener('change', e => { state.tpl = e.target.value; save(); render(); });
  $('photo').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { state.photo = r.result; render(); /* photo not saved to localStorage (size) */ };
    r.readAsDataURL(f);
  });
  $('dl').addEventListener('click', downloadPDF);
  state.photo = ''; // photo is session-only
  buildForm(); render();
}
init();
