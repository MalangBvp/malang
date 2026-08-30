(function(){
var c=[75,97,109,98,97,113,116];
var s=String.fromCharCode.apply(null,c);
console.log('%c %c '+s+' %c ','font-size:24px;','background:linear-gradient(90deg,#ff6b5b,#f3c14b,#2de0ca);color:#07050f;font-size:26px;font-weight:900;padding:14px 26px;border-radius:8px;letter-spacing:6px;text-shadow:0 2px 0 rgba(255,255,255,.35);','font-size:24px;');
console.log('%cMalang — Fine Arts & Photography Club','color:#f3c14b;font-size:14px;font-weight:700;font-family:monospace;');
})();
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzh2QFcA0o58atwU8Uip5ZKDztzTogrZ6oSMbSKAHnPhiOVTf4FrJHK6SJXjQdOrvnR/exec';
function checkAsset(path, flagClass){
return new Promise(resolve => {
const img = new Image();
img.onload = () => { document.body.classList.add(flagClass); resolve(true); };
img.onerror = () => resolve(false);
img.src = path;
});
}
function playSound(path){ const a = new Audio(path); a.play().catch(() => {}); }
function initStarfield(){
const canvas = document.getElementById('starfield');
if (!canvas) return;
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
addEventListener('resize', resize);
const stars = Array.from({ length: 180 }, () => ({
x: Math.random() * canvas.width, y: Math.random() * canvas.height,
r: Math.random() * 1.3 + 0.3, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.8
}));
let shooters = [];
function spawnShooter(){
shooters.push({
x: Math.random() * canvas.width * 0.7,
y: Math.random() * canvas.height * 0.3,
vx: 7 + Math.random() * 5, vy: 3 + Math.random() * 3,
life: 0, maxLife: 35 + Math.random() * 20
});
}
function tick(t){
ctx.clearRect(0, 0, canvas.width, canvas.height);
stars.forEach(s => {
const tw = 0.5 + 0.5 * Math.sin((t / 1000) * s.speed + s.phase);
ctx.globalAlpha = 0.2 + tw * 0.7; ctx.fillStyle = '#f5efe3';
ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
});
if (Math.random() < 0.012) spawnShooter();
shooters.forEach(s => {
s.x += s.vx; s.y += s.vy; s.life++;
const alpha = Math.max(0, 1 - s.life / s.maxLife);
const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 8, s.y - s.vy * 8);
grad.addColorStop(0, `rgba(245,239,227,${alpha})`);
grad.addColorStop(1, 'rgba(245,239,227,0)');
ctx.strokeStyle = grad;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(s.x, s.y);
ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
ctx.stroke();
});
shooters = shooters.filter(s => s.life < s.maxLife && s.x < canvas.width + 60 && s.y < canvas.height + 60);
ctx.globalAlpha = 1;
requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
}
const domainIcons = {
Art: `<path d="M10 44l6-30h4l4 26h16l4-26h4l6 30h-6l-2-8H18l-2 8z"/>`,
Photography: `<path d="M6 16h10l4-6h16l4 6h12a4 4 0 014 4v20a4 4 0 01-4 4H6a4 4 0 01-4-4V20a4 4 0 014-4z"/><circle cx="34" cy="30" r="9" fill="#07050f"/>`,
Video_Editing: `<path d="M4 18h44a4 4 0 014 4v20a4 4 0 01-4 4H4a4 4 0 01-4-4V22a4 4 0 014-4z"/><path d="M8 18l6-14h7l-6 14M24 18l6-14h7l-6 14M40 18l6-14h6l-6 14" fill="none" stroke="#07050f" stroke-width="3"/>`,
Digital_Art: `<rect x="6" y="4" width="40" height="52" rx="5"/><path d="M38 0l10 10-7 7-10-10z" fill="#07050f"/>`,
Other: `<path d="M24 2l4.5 17.5L46 24l-17.5 4.5L24 46l-4.5-17.5L2 24l17.5-4.5z"/>`
};
const domainColorVar = {
Art:'var(--c-art)', Photography:'var(--c-photo)', Video_Editing:'var(--c-video)',
Digital_Art:'var(--c-digital)', Other:'var(--c-other)'
};
const domainElementSrc = {
Art:'assets/art.png', Photography:'assets/photography.png',
Video_Editing:'assets/video-editing.png', Digital_Art:'assets/digital-art.png'
};
const domainMedia = {
Art:['assets/a1.webp','assets/a2.webp','assets/a3.webp','assets/a4.webp','assets/a5.webp'],
Photography:['assets/p1.webp','assets/p2.webp','assets/p3.webp','assets/p4.webp','assets/p5.webp'],
Video_Editing:['assets/fe2025.mp4','assets/club-video.mp4'],
Digital_Art:['assets/da1.webp','assets/da2.webp','assets/da3.webp','assets/da4.webp','assets/da5.webp'],
Other:[]
};
const avatarSrc = {
Art:{Male:'assets/l__art_b.png', Female:'assets/l_art_g.png'},
Photography:{Male:'assets/l_photo_b.png', Female:'assets/l_photo_g.png'},
Video_Editing:{Male:'assets/l_editor_b.png', Female:'assets/l_editor_g.png'},
Digital_Art:{Male:'assets/l_digital_b.png', Female:'assets/l_digital_g.png'},
Other:{Male:'assets/l_other_b.png', Female:'assets/l_other_g.png'}
};
function mediaEl(domain, src){
if (src){
if (/\.(mp4|webm)$/i.test(src)) return `<video src="${src}" autoplay muted loop playsinline></video>`;
return `<img src="${src}" alt="">`;
}
return `<svg viewBox="0 0 48 48" style="fill:#07050f">${domainIcons[domain]}</svg>`;
}
function svgIcon(domain, color){
const wrap = document.createElement('div');
wrap.style.cssText = 'width:100%;height:100%';
wrap.innerHTML = `<svg viewBox="0 0 48 48" style="fill:${color};width:100%;height:100%">${domainIcons[domain]}</svg>`;
return wrap.firstElementChild;
}
function spawnHeroHang(){
const layer = document.getElementById('heroHang');
if (!layer) return;
const keys = ['Art','Photography','Video_Editing','Digital_Art'];
keys.forEach((key, i) => {
const left = 10 + i * 26, h = 50 + (i % 2) * 50;
const src = domainMedia[key] && domainMedia[key][0] ? domainMedia[key][0] : null;
const el = document.createElement('div');
el.className = 'hang'; el.style.left = left + '%';
el.innerHTML = `<span class="thread" style="height:${h}px;"></span><span class="swatch" style="background:${domainColorVar[key]}">${mediaEl(key, src)}</span>`;
layer.appendChild(el);
});
}
function spawnSplashBlobs(){
const layer = document.getElementById('splashLayer');
if (!layer) return;
const colors = ['var(--red)','var(--gold)','var(--teal)','var(--blue)','var(--orange)','var(--purple)','var(--paper)'];
const cols = 4, rows = 4;
const big = Math.max(window.innerWidth, window.innerHeight);
let i = 0;
for (let r = 0; r < rows; r++){
for (let c = 0; c < cols; c++){
const el = document.createElement('span');
el.className = 'splat';
const w = big * (0.42 + Math.random() * 0.3);
const h = w * (0.75 + Math.random() * 0.5);
el.style.width = w + 'px';
el.style.height = h + 'px';
const left = (c / (cols - 1)) * 130 - 20 + (Math.random() * 18 - 9);
const top = (r / (rows - 1)) * 130 - 20 + (Math.random() * 18 - 9);
el.style.left = left + 'vw';
el.style.top = top + 'vh';
el.style.background = colors[i % colors.length];
el.style.animationDelay = (Math.random() * 0.35) + 's';
layer.appendChild(el);
i++;
}
}
}
function launchConfetti(){
const layer = document.getElementById('confettiLayer');
if (!layer) return;
const colors = ['#ff4d4d','#ffd23b','#3bff8f','#3b9eff','#c93bff','#ff8f3b','#ff5bd0','#5bffe0'];
for (let i = 0; i < 160; i++){
const el = document.createElement('span');
el.className = 'confetti-piece';
const size = 6 + Math.random() * 10;
el.style.width = size + 'px';
el.style.height = (size * (0.4 + Math.random() * 0.4)) + 'px';
el.style.left = Math.random() * 100 + '%';
el.style.setProperty('--driftX', (Math.random() * 160 - 80) + 'px');
el.style.background = colors[i % colors.length];
el.style.animationDuration = (2 + Math.random() * 2.2) + 's';
el.style.animationDelay = (Math.random() * 0.8) + 's';
el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
layer.appendChild(el);
}
setTimeout(() => { layer.innerHTML = ''; }, 5200);
}
initStarfield();
spawnHeroHang();
document.addEventListener('click', e => {
const sw = e.target.closest('.swatch');
if (!sw) return;
const isVideo = !!sw.querySelector('video');
const cls = isVideo ? 'video-enlarged' : 'enlarged';
document.querySelectorAll('.swatch.enlarged, .swatch.video-enlarged').forEach(s => { if (s !== sw) s.classList.remove('enlarged', 'video-enlarged'); });
clearTimeout(sw._collapseTimer);
if (sw.classList.contains(cls)){
sw.classList.remove(cls);
} else {
sw.classList.add(cls);
sw._collapseTimer = setTimeout(() => sw.classList.remove(cls), 10000);
}
});
const heroLogoImg = document.getElementById('heroLogoImg');
let heroLogoAlt = false;
if (heroLogoImg) heroLogoImg.addEventListener('click', () => {
heroLogoImg.classList.add('spinning');
setTimeout(() => {
heroLogoAlt = !heroLogoAlt;
heroLogoImg.src = heroLogoAlt ? 'assets/logo-transparent.png' : 'assets/logo-emblem.png';
}, 300);
setTimeout(() => heroLogoImg.classList.remove('spinning'), 620);
});
Promise.all([
checkAsset('assets/brush.png', 'has-brush-asset'),
checkAsset('assets/camera.png', 'has-camera-asset')
]).then(() => {
const loaderEl = document.getElementById('loader');
function stage(name, delay){ setTimeout(() => { if (loaderEl) loaderEl.classList.add('stage-' + name); }, delay); }
function unstage(name, delay){ setTimeout(() => { if (loaderEl) loaderEl.classList.remove('stage-' + name); }, delay); }
stage('brush', 100);
setTimeout(spawnSplashBlobs, 450);
playSound('assets/splash.mp3');
stage('emblem', 1400);
unstage('emblem', 2700);
stage('camera', 3000);
setTimeout(() => playSound('assets/click.mp3'), 3320);
unstage('camera', 4050);
stage('flash', 4000);
setTimeout(() => {
if (loaderEl) loaderEl.classList.add('loader-done');
setTimeout(() => {
const applyEl = document.getElementById('apply');
if (applyEl) applyEl.scrollIntoView({ behavior: 'smooth' });
}, 5000);
}, 4500);
});
const steps = [...document.querySelectorAll('.step')];
const stops = [...document.querySelectorAll('.stop')];
const railFill = document.getElementById('railFill');
const avatarToken = document.getElementById('avatarToken');
const curtain = document.getElementById('curtain');
let currentStep = 1;
let state = { gender: null, domains: [] };
function goToStep(n){
steps.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
stops.forEach(s => s.classList.toggle('active', +s.dataset.step <= n));
currentStep = n;
if (railFill && avatarToken && steps.length > 1){
const pct = ((n - 1) / (steps.length - 1)) * 100;
railFill.style.width = pct + '%';
avatarToken.style.left = `calc(${pct}% - 32px)`;
}
}
function playCurtain(onMid){
if (!curtain) { onMid(); return; }
curtain.classList.add('active');
setTimeout(onMid, 430);
setTimeout(() => curtain.classList.remove('active'), 480);
}
document.querySelectorAll('[data-next]').forEach(btn => {
btn.addEventListener('click', () => {
if (currentStep === 1){
playCurtain(() => {
goToStep(2);
checkStep2();
renderSkillsSummary();
spawnFormHang();
});
return;
}
if (currentStep < steps.length) goToStep(currentStep + 1);
});
});
document.querySelectorAll('[data-back]').forEach(btn => {
btn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); });
});
const genderChipsEl = document.getElementById('genderChips');
if (genderChipsEl) genderChipsEl.addEventListener('click', e => {
const chip = e.target.closest('.chip'); if (!chip) return;
[...chip.parentElement.children].forEach(c => c.classList.remove('selected'));
chip.classList.add('selected');
state.gender = chip.dataset.value;
renderAvatar(); checkStep1();
});
function popDomainIcon(chip, key){
if (!domainElementSrc[key]) return;
const pop = document.createElement('img');
pop.src = domainElementSrc[key];
pop.className = 'chip-pop';
pop.onerror = () => pop.remove();
chip.appendChild(pop);
setTimeout(() => pop.remove(), 950);
}
function updateOtherVisibility(){
const el = document.getElementById('otherTextField');
if (el) el.classList.toggle('visible', state.domains.includes('Other'));
}
const domainChipsEl = document.getElementById('domainChips');
if (domainChipsEl) domainChipsEl.addEventListener('click', e => {
const chip = e.target.closest('.chip'); if (!chip) return;
chip.classList.toggle('selected');
const val2 = chip.dataset.value;
if (chip.classList.contains('selected')){
state.domains.push(val2);
popDomainIcon(chip, val2);
} else {
state.domains = state.domains.filter(d => d !== val2);
}
renderAvatar(); checkStep1(); updateOtherVisibility();
});
function checkStep1(){
const btn = document.querySelector('[data-step="1"] .btn-next');
const nameEl = document.getElementById('fName');
if (btn) btn.disabled = !(state.gender && state.domains.length > 0 && nameEl && nameEl.value.trim());
}
function checkStep2(){
const btn = document.querySelector('[data-step="2"] .btn-next');
if (!btn) return;
const ok = ['fEmail','fPhone','fInsta','fYear','fBranch','fdivision'].every(id => val(id).trim());
btn.disabled = !ok;
}
['fEmail','fPhone','fInsta','fYear','fBranch','fdivision'].forEach(id => {
const el = document.getElementById(id);
if (el){ el.addEventListener('input', checkStep2); el.addEventListener('change', checkStep2); }
});
const fNameEl = document.getElementById('fName');
if (fNameEl) fNameEl.addEventListener('input', checkStep1);
function renderSkillsSummary(){
const wrap = document.getElementById('skillsSummary');
if (!wrap) return;
wrap.innerHTML = state.domains.map(d =>
`<span class="chip domain-chip selected readonly" style="--dc:${domainColorVar[d]}">${d.replace('_',' ')}</span>`
).join('');
updateOtherVisibility();
}
function renderAvatar(){
if (!state.domains.length || !avatarToken) return;
if (state.gender === 'Prefer not to say'){
avatarToken.innerHTML = `<img src="assets/logo-emblem.png" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.src='assets/logo.png'">`;
return;
}
const primary = state.domains[state.domains.length - 1];
const accent = domainColorVar[primary] || 'var(--gold)';
const genderKey = (state.gender === 'Male' || state.gender === 'Female') ? state.gender : null;
const src = genderKey && avatarSrc[primary] ? avatarSrc[primary][genderKey] : null;
if (src){
avatarToken.innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:contain">`;
} else {
let hair = '';
if (state.gender === 'Female') hair = `<path d="M14 20 Q30 4 46 20 L46 34 Q30 24 14 34 Z" fill="${accent}" opacity=".9"/>`;
else if (state.gender === 'Male') hair = `<path d="M14 20 Q30 10 46 20 L46 24 Q30 16 14 24 Z" fill="${accent}" opacity=".9"/>`;
else hair = `<circle cx="30" cy="18" r="10" fill="none" stroke="${accent}" stroke-width="2" opacity=".9"/>`;
avatarToken.innerHTML = `<svg viewBox="0 0 60 60" style="width:100%;height:100%"><circle cx="30" cy="30" r="28" fill="var(--bg-alt)"/><circle cx="30" cy="26" r="10" fill="none" stroke="${accent}" stroke-width="2.5"/>${hair}<g transform="translate(15,38) scale(0.5)" style="fill:${accent}">${domainIcons[primary]}</g></svg>`;
}
}
function spawnFormHang(){
const layer = document.getElementById('formHang');
if (!layer) return;
layer.innerHTML = '';
const domains = state.domains.length ? state.domains : ['Art'];
const items = [];
domains.forEach(d => {
const media = domainMedia[d];
if (media && media.length) media.forEach(src => items.push({ d, src }));
else items.push({ d, src: null });
});
items.forEach((item, i) => {
const h = 50 + (i % 3) * 20;
const el = document.createElement('div');
el.className = 'hang';
el.style.animationDelay = (i * 0.06) + 's, ' + (0.4 + i * 0.06) + 's';
el.innerHTML = `<span class="thread" style="height:${h}px;"></span><span class="swatch" style="background:${domainColorVar[item.d]}">${mediaEl(item.d, item.src)}</span>`;
layer.appendChild(el);
});
}
const muteBtn = document.getElementById('muteToggle');
if (muteBtn) muteBtn.addEventListener('click', () => {
const v = document.getElementById('outroVideo');
if (!v) return;
v.muted = !v.muted;
muteBtn.textContent = v.muted ? '🔇' : '🔊';
});
function val(id){ const el = document.getElementById(id); return el ? el.value : ''; }
function submitToSheet(){
if (!SHEET_URL || SHEET_URL.indexOf('PASTE_') === 0) return;
const payload = {
Name: val('fName'), Gender: state.gender || '', Domains: state.domains.join(', '),
Email: val('fEmail'), Phone: val('fPhone'), Instagram: val('fInsta'),
Year: val('fYear'), Branch: val('fBranch'), Division: val('fdivision'),
Skills: state.domains.join(', '), Other_text: val('otherText'),
Motivation: val('fMotivation'), Portfolio: val('fPortfolio')
};
console.log('Submitting to sheet:', payload);
fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }).catch(() => {});
}
const submitBtn = document.getElementById('submitBtn');
if (submitBtn) submitBtn.addEventListener('click', () => {
const motivationEl = document.getElementById('fMotivation');
const motivationField = motivationEl ? motivationEl.closest('.field') : null;
const otherEl = document.getElementById('otherText');
const otherField = otherEl ? otherEl.closest('.field') : null;
let firstBad = null;
if (!motivationEl || !motivationEl.value.trim()){
if (motivationField) motivationField.classList.add('error');
firstBad = firstBad || motivationEl;
} else if (motivationField) motivationField.classList.remove('error');
if (state.domains.includes('Other') && (!otherEl || !otherEl.value.trim())){
if (otherField) otherField.classList.add('error');
firstBad = firstBad || otherEl;
} else if (otherField) otherField.classList.remove('error');
if (firstBad){ firstBad.focus(); return; }
submitToSheet();
const applyEl = document.getElementById('apply');
if (applyEl) applyEl.style.display = 'none';
const heroEl = document.getElementById('hero');
if (heroEl) heroEl.style.display = 'none';
const outroEl = document.getElementById('outro');
if (outroEl){
outroEl.classList.add('active');
outroEl.scrollIntoView({ behavior: 'smooth' });
launchConfetti();
}
});
goToStep(1);