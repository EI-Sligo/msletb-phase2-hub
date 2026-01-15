// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const CATEGORY_ORDER = ["Course Notes", "Presentations", "Audio", "Video", "Quizzes", "Miscellaneous"];
let courseData = { news: [], modules: [] };
let userProgress = JSON.parse(localStorage.getItem('msletb_progress')) || {};
let currentUser = null;

// Load Theme
const currentTheme = localStorage.getItem('msletb_theme');
if (currentTheme) document.documentElement.setAttribute('data-theme', currentTheme);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Fail:', err));
    });
}

// ==========================================
// 2. AUTHENTICATION
// ==========================================
function checkLogin() {
    const email = document.getElementById('email-input').value.toLowerCase().trim();
    const pass = document.getElementById('password-input').value.trim();
    const errorMsg = document.getElementById('error-msg');

    fetch('users.json')
        .then(res => res.json())
        .then(users => {
            const validUser = users.find(u => u.email.toLowerCase() === email && u.password === pass);
            if (validUser) {
                currentUser = validUser;
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
                document.getElementById('user-display').innerText = validUser.name;
                loadContent();
            } else {
                errorMsg.style.display = 'block';
                setTimeout(() => errorMsg.style.display = 'none', 3000);
            }
        })
        .catch(err => {
            console.error(err);
            errorMsg.innerText = "⚠️ Error loading users file.";
            errorMsg.style.display = 'block';
        });
}
function logout() { location.reload(); }

// ==========================================
// 3. CORE LOGIC (Load/Render)
// ==========================================
function loadContent() {
    fetch('content.json')
        .then(res => res.json())
        .then(data => {
            courseData.modules = data.modules;
            courseData.news = data.news || [];
            initDashboard();
        })
        .catch(err => console.error("Content Error:", err));
}

function initDashboard() {
    renderNews();
    renderModules(courseData.modules);
}

function renderNews() {
    const container = document.getElementById('news-feed');
    if (courseData.news.length === 0) {
        container.innerHTML = `<div class="news-item">No announcements.</div>`;
        return;
    }
    container.innerHTML = courseData.news.map(item => `
        <div class="news-item"><span class="news-date">${item.date}</span><br>${item.text}</div>
    `).join('');
}

function filterContent() {
    const query = document.getElementById('search-input').value.toLowerCase();
    if (!query) { renderModules(courseData.modules); return; }
    const filtered = courseData.modules.filter(mod => {
        const titleMatch = mod.title.toLowerCase().includes(query);
        const unitMatch = mod.units.some(u => u.name.toLowerCase().includes(query));
        return titleMatch || unitMatch;
    });
    renderModules(filtered);
}

function renderModules(modulesToRender) {
    const grid = document.getElementById('module-grid');
    if (modulesToRender.length === 0) { grid.innerHTML = "<p style='text-align:center;'>No modules found.</p>"; return; }
    grid.innerHTML = modulesToRender.map((mod) => {
        const originalIndex = courseData.modules.indexOf(mod);
        let completed = 0;
        const totalUnits = mod.units ? mod.units.length : 0;
        if(mod.units) {
             mod.units.forEach(u => { if(userProgress[mod.title + "_" + u.name]) completed++; });
        }
        const percent = totalUnits === 0 ? 0 : Math.round((completed / totalUnits) * 100);
        return `
        <div class="module-card" onclick="openModule(${originalIndex})">
            <div style="display:flex; justify-content:space-between;"><h3>${mod.title}</h3>${percent > 0 ? `<span class="progress-text">${percent}%</span>` : ''}</div>
            <p style="color:var(--text-light); font-size:0.9rem;">${totalUnits} Units</p>
            <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
        </div>`;
    }).join('');
}

function openModule(index) {
    const module = courseData.modules[index];
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('news-section').style.display = 'none';
    document.getElementById('unit-viewer').style.display = 'block';
    document.getElementById('module-title-display').innerText = module.title;
    const contentArea = document.getElementById('unit-content-area');
    if (!module.units || module.units.length === 0) { contentArea.innerHTML = "<p>No units found.</p>"; return; }
    contentArea.innerHTML = module.units.map((unit, uIndex) => {
        const unitId = `unit-${uIndex}`;
        const storageId = module.title + "_" + unit.name;
        const isChecked = userProgress[storageId] ? "checked" : "";
        return `
        <div class="unit-block" id="${unitId}">
            <div class="unit-header" onclick="toggleUnit('${unitId}')">
                <div style="display:flex; align-items:center; gap:10px;"><span class="chevron">▼</span><h3>${unit.name}</h3></div>
                <div class="check-container" onclick="event.stopPropagation()">
                    <label class="check-label"><input type="checkbox" ${isChecked} onchange="toggleProgress('${storageId}', this)"> Done</label>
                </div>
            </div>
            <div class="unit-body">${renderUnitContent(unit)}</div>
        </div>`;
    }).join('');
}

function toggleUnit(id) { document.getElementById(id).classList.toggle("active"); }
function toggleProgress(id, checkbox) {
    if (checkbox.checked) userProgress[id] = true; else delete userProgress[id];
    localStorage.setItem('msletb_progress', JSON.stringify(userProgress));
}
function showHome() {
    document.getElementById('unit-viewer').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('news-section').style.display = 'block';
    filterContent();
}

// ==========================================
// 4. RESOURCE RENDERING & MEDIA VIEWER
// ==========================================
function renderUnitContent(unit) {
    let html = "";
    let hasContent = false;
    CATEGORY_ORDER.forEach(cat => {
        const files = unit.resources.filter(r => r.category === cat);
        if (files.length > 0) {
            hasContent = true;
            html += `<div class="category-header">${cat}</div>`;
            html += files.map(renderResource).join('');
        }
    });
    return hasContent ? html : `<p style="color:var(--text-light); font-style:italic;">No resources uploaded.</p>`;
}

function renderResource(res) {
    let icon = "📄";
    let btnColor = "var(--primary)";
    let btnText = "View";

    // Quiz Special Case
    if (res.type === 'quiz') {
        const scoreKey = `quiz_score_${res.link}`;
        const best = localStorage.getItem(scoreKey) || "-";
        return `
        <div class="resource" onclick="startQuiz('${res.link}')">
            <div class="res-row">
                <span class="res-icon" style="color:#dcae1d; background:rgba(220,174,29,0.1);">🧠</span>
                <div style="flex-grow:1;">
                    <div style="font-weight:600; color:var(--text-dark);">${res.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-light);">High Score: ${best}%</div>
                </div>
                <button class="preview-btn" style="background:#dcae1d15; color:#dcae1d; border:1px solid #dcae1d;">Start Quiz</button>
            </div>
        </div>`;
    }

    // Media Types
    if (res.type === 'pdf') { icon = "📕"; btnColor = "#d93025"; btnText = "Open PDF"; }
    else if (res.type === 'video') { icon = "📺"; btnColor = "#c4302b"; btnText = "Watch Video"; }
    else if (res.type === 'audio') { icon = "🎧"; btnColor = "#a142f4"; btnText = "Listen"; }
    else if (res.type === 'word') { icon = "📝"; btnColor = "#2b579a"; btnText = "Download"; }
    else if (res.type === 'ppt') { icon = "📽️"; btnColor = "#d24726"; btnText = "Download"; }

    // OnClick logic: If PDF/Video use openMedia(), else just open link
    let clickAction = `window.open('${res.link}', '_blank')`;
    if(res.type === 'pdf' || res.type === 'video' || res.type === 'audio') {
        clickAction = `openMedia('${res.link}', '${res.type}', '${res.title.replace(/'/g, "\\'")}')`;
    }

    return `
    <div class="resource" onclick="${clickAction}">
        <div class="res-row">
            <span class="res-icon" style="color:${btnColor}; font-size:1.6rem;">${icon}</span>
            <div style="flex-grow:1;">
                <div style="font-weight:600; color:var(--text-dark);">${res.title}</div>
                <div style="font-size:0.75rem; color:var(--text-light); text-transform:uppercase; font-weight:600;">${res.type}</div>
            </div>
            <button class="preview-btn" style="background:${btnColor}10; color:${btnColor}; border:1px solid ${btnColor}40;">
                ${btnText}
            </button>
        </div>
    </div>`;
}

// Media Modal Functions
function openMedia(url, type, title) {
    const modal = document.getElementById('media-modal');
    const frame = document.getElementById('media-frame');
    document.getElementById('media-title').innerText = title;
    frame.src = url;
    modal.style.display = 'block';
}

function closeMedia() {
    const modal = document.getElementById('media-modal');
    const frame = document.getElementById('media-frame');
    modal.style.display = 'none';
    frame.src = "";
}

// ==========================================
// 5. REPORTING (Email)
// ==========================================
function generateReport() {
    let name = currentUser ? currentUser.name : prompt("Enter your name:", "");
    if (!name) return;
    
    // Replace this with your email
    const instructorEmail = "YOUR_EMAIL@msletb.ie"; 
    
    const date = new Date().toLocaleDateString();
    let body = `Student: ${name}%0D%0A`; 
    body += `Date: ${date}%0D%0A--------------------------------%0D%0A`;
    
    body += `MODULE PROGRESS:%0D%0A`;
    courseData.modules.forEach(mod => {
        let completed = 0;
        let total = mod.units ? mod.units.length : 0;
        if (total > 0) {
            mod.units.forEach(u => { if(userProgress[mod.title + "_" + u.name]) completed++; });
            const percent = Math.round((completed / total) * 100);
            body += `[${percent}%] - ${mod.title}%0D%0A`;
        }
    });

    body += `%0D%0AQUIZ SCORES:%0D%0A`;
    let quizFound = false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('quiz_score_')) {
            quizFound = true;
            let quizName = key.split('/').pop().replace('.json', '').replace(/_/g, ' ');
            let score = localStorage.getItem(key);
            body += `- ${quizName}: ${score}%%0D%0A`;
        }
    }
    if (!quizFound) body += "(No quizzes attempted)%0D%0A";
    
    window.location.href = `mailto:${instructorEmail}?subject=Progress Report - ${name}&body=${body}`;
}

// ==========================================
// 6. TOOLS & QUIZ ENGINE (Unchanged Logic)
// ==========================================
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    let target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('msletb_theme', target);
}
function openTools() { document.getElementById('tools-modal').style.display = 'block'; }
function closeTools() { document.getElementById('tools-modal').style.display = 'none'; }
window.onclick = function(e) { if(e.target == document.getElementById('tools-modal')) closeTools(); }

function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.target.classList.add('active');
}
function calcOhm() {
    const v = parseFloat(document.getElementById('ohm-v').value);
    const i = parseFloat(document.getElementById('ohm-i').value);
    const r = parseFloat(document.getElementById('ohm-r').value);
    const res = document.getElementById('ohm-result');
    if (!isNaN(i) && !isNaN(r)) res.innerText = `Voltage = ${(i * r).toFixed(2)} V`;
    else if (!isNaN(v) && !isNaN(r)) res.innerText = `Current = ${(v / r).toFixed(2)} A`;
    else if (!isNaN(v) && !isNaN(i)) res.innerText = `Resistance = ${(v / i).toFixed(2)} Ω`;
    else res.innerText = "Enter any 2 values.";
}
function calcScale() {
    const min = parseFloat(document.getElementById('scale-min').value);
    const max = parseFloat(document.getElementById('scale-max').value);
    const pv = parseFloat(document.getElementById('scale-pv').value);
    if (isNaN(min) || isNaN(max) || isNaN(pv)) { document.getElementById('scale-result').innerText = "Enter all values."; return; }
    const result = (((pv - min) / (max - min)) * 16) + 4;
    document.getElementById('scale-result').innerText = `Output: ${result.toFixed(2)} mA`;
}

// Quiz Engine
let currentQuizData = null;
let currentQuizUrl = "";
function startQuiz(url) {
    currentQuizUrl = url;
    fetch(url).then(res => res.json()).then(data => {
        const shuffled = data.questions.sort(() => 0.5 - Math.random());
        currentQuizData = shuffled.slice(0, 10);
        const modal = document.createElement('div');
        modal.id = 'quiz-modal';
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content quiz-container" style="max-width:600px;">
                <div class="quiz-header"><h2>${data.title}</h2><span class="close-modal" onclick="closeQuiz()">×</span></div>
                <div id="quiz-body">${currentQuizData.map((q, i) => renderQuestion(q, i)).join('')}</div>
                <div style="text-align:center; margin-top:20px;">
                    <button class="calc-btn" style="background:var(--success);" onclick="submitQuiz()">Submit Answers</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }).catch(err => alert("Error loading quiz."));
}
function renderQuestion(q, index) {
    return `<div class="question-card" id="q-card-${index}"><p><strong>${index + 1}. ${q.question}</strong></p>
        ${q.options.map((opt, i) => `<button class="option-btn" onclick="selectOpt(${index},${i},this)">${opt}</button>`).join('')}
        <input type="hidden" id="ans-${index}" value=""></div>`;
}
function selectOpt(qIdx, oIdx, btn) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById(`ans-${qIdx}`).value = oIdx;
}
function submitQuiz() {
    let score = 0;
    currentQuizData.forEach((q, i) => {
        const userAns = parseInt(document.getElementById(`ans-${i}`).value);
        const card = document.getElementById(`q-card-${i}`);
        const btns = card.querySelectorAll('.option-btn');
        btns.forEach(b => b.classList.remove('correct', 'incorrect'));
        if (!isNaN(userAns)) {
            if (userAns === q.answer) { score++; btns[userAns].classList.add('correct'); }
            else { btns[userAns].classList.add('incorrect'); btns[q.answer].classList.add('correct'); }
        } else { btns[q.answer].classList.add('correct'); }
    });
    const percent = Math.round((score / currentQuizData.length) * 100);
    alert(`Score: ${score}/${currentQuizData.length} (${percent}%)`);
    const key = `quiz_score_${currentQuizUrl}`;
    const old = localStorage.getItem(key) || 0;
    if (percent > old) localStorage.setItem(key, percent);
    closeQuiz();
    loadContent();
}
function closeQuiz() { document.getElementById('quiz-modal').remove(); }