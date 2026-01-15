// ==========================================
// 1. CONFIGURATION
// ==========================================
const ALLOWED_CODES = ["phase2", "admin2025"];
const CATEGORY_ORDER = ["Course Notes", "Presentations", "Audio", "Video", "Quizzes", "Miscellaneous"];

// ==========================================
// 2. APP STATE
// ==========================================
let courseData = { news: [], modules: [] };
let userProgress = JSON.parse(localStorage.getItem('msletb_progress')) || {};

// Load Theme from Memory
const currentTheme = localStorage.getItem('msletb_theme');
if (currentTheme) document.documentElement.setAttribute('data-theme', currentTheme);

// ==========================================
// 3. CORE FUNCTIONS (Login / Load)
// ==========================================
function checkPasscode() {
    const input = document.getElementById('passcode-input').value;
    if (ALLOWED_CODES.includes(input)) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadContent();
    } else {
        const err = document.getElementById('error-msg');
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 2000);
    }
}

function logout() { location.reload(); }

function loadContent() {
    fetch('content.json')
        .then(res => res.json())
        .then(data => {
            courseData.modules = data.modules;
            courseData.news = data.news || [];
            initDashboard();
        })
        .catch(err => {
            console.error(err);
            document.getElementById('module-grid').innerHTML = "<p style='text-align:center'>⚠️ Content Loading...</p>";
        });
}

function initDashboard() {
    renderNews();
    renderModules(courseData.modules);
}

// ==========================================
// 4. NEWS & SEARCH
// ==========================================
function renderNews() {
    const container = document.getElementById('news-feed');
    if (courseData.news.length === 0) {
        container.innerHTML = `<div class="news-item">No announcements.</div>`;
        return;
    }
    container.innerHTML = courseData.news.map(item => `
        <div class="news-item">
            <span class="news-date">${item.date}</span><br>${item.text}
        </div>
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

// ==========================================
// 5. MODULE RENDERER (With Progress)
// ==========================================
function renderModules(modulesToRender) {
    const grid = document.getElementById('module-grid');
    if (modulesToRender.length === 0) { grid.innerHTML = "<p style='text-align:center;'>No modules found.</p>"; return; }
    
    grid.innerHTML = modulesToRender.map((mod) => {
        const originalIndex = courseData.modules.indexOf(mod);
        
        // Progress Logic
        const totalUnits = mod.units ? mod.units.length : 0;
        let completed = 0;
        if(mod.units) {
             mod.units.forEach(u => {
                 if(userProgress[mod.title + "_" + u.name]) completed++;
             });
        }
        const percent = totalUnits === 0 ? 0 : Math.round((completed / totalUnits) * 100);

        return `
        <div class="module-card" onclick="openModule(${originalIndex})">
            <div style="display:flex; justify-content:space-between;">
                <h3>${mod.title}</h3>
                ${percent > 0 ? `<span class="progress-text">${percent}%</span>` : ''}
            </div>
            <p style="color:var(--text-light); font-size:0.9rem;">${totalUnits} Units</p>
            <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
        </div>
    `}).join('');
}

// ==========================================
// 6. UNIT VIEWER & RESOURCES
// ==========================================
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
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="chevron">▼</span>
                    <h3>${unit.name}</h3>
                </div>
                <div class="check-container" onclick="event.stopPropagation()">
                    <label class="check-label">
                        <input type="checkbox" ${isChecked} onchange="toggleProgress('${storageId}', this)"> Done
                    </label>
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
    filterContent(); // Refresh progress bars
}

function renderUnitContent(unit) {
    let html = "";
    let hasContent = false;
    CATEGORY_ORDER.forEach(cat => {
        const files = unit.resources.filter(r => r.category === cat);
        if (files.length > 0) {
            hasContent = true;
            html += `<div class="category-header">${getCategoryIcon(cat)} ${cat}</div>`;
            html += files.map(renderResource).join('');
        }
    });
    return hasContent ? html : `<p style="color:var(--text-light); font-style:italic;">No resources uploaded.</p>`;
}

function getCategoryIcon(cat) {
    if (cat === "Audio") return "🎧";
    if (cat === "Video") return "📺";
    if (cat === "Quizzes") return "🧠";
    if (cat === "Course Notes") return "📝";
    return "📂";
}

function renderResource(res) {
    let icon = "📄";
    const previewId = "preview-" + Math.random().toString(36).substr(2, 9);
    
    // QUIZ HANDLER
    if (res.type === 'quiz') {
        const scoreKey = `quiz_score_${res.link}`;
        const best = localStorage.getItem(scoreKey) || "-";
        return `<div class="resource"><div class="res-row"><span class="res-icon">🧠</span><div style="flex-grow:1;"><strong>${res.title}</strong><div style="font-size:0.8rem;">High Score: ${best}%</div></div><button class="preview-btn" style="background:var(--accent);" onclick="startQuiz('${res.link}')">▶ Start Quiz</button></div></div>`;
    }
    
    // AUDIO / VIDEO / PDF
    if (res.type === 'audio') {
        return `<div class="resource"><div class="res-row"><span class="res-icon">🎧</span><div style="width:100%"><strong>${res.title}</strong><br><audio controls src="${res.link}" style="width:100%; margin-top:5px;"></audio></div></div></div>`;
    } 
    if (res.type === 'video') {
        return `<div class="resource"><div class="res-row"><span class="res-icon">📺</span><div style="width:100%"><strong>${res.title}</strong><br><video controls width="100%" style="border-radius:5px; margin-top:5px; background:#000;"><source src="${res.link}" type="video/mp4"></video></div></div></div>`;
    }
    if (res.type === 'pdf') {
        return `<div class="resource"><div class="res-row"><span class="res-icon" style="color:#d93025;">📕</span><a href="${res.link}" target="_blank" class="res-link">${res.title}</a><button class="preview-btn" onclick="togglePreview('${res.link}', '${previewId}')">👁️ Preview</button></div><iframe id="${previewId}" class="pdf-frame" src=""></iframe></div>`;
    }
    
    return `<div class="resource"><div class="res-row"><span class="res-icon">📄</span><a href="${res.link}" target="_blank" class="res-link">${res.title}</a></div></div>`;
}

function togglePreview(url, frameId) {
    const frame = document.getElementById(frameId);
    if (frame.style.display === "block") { frame.style.display = "none"; frame.src = ""; } 
    else { frame.style.display = "block"; frame.src = url; }
}

// ==========================================
// 7. TOOLS & THEMES
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

// ==========================================
// 8. QUIZ ENGINE
// ==========================================
let currentQuizData = null;
let currentQuizUrl = "";

function startQuiz(url) {
    currentQuizUrl = url;
    fetch(url).then(res => res.json()).then(data => {
        // Randomize & Pick 10
        const shuffled = data.questions.sort(() => 0.5 - Math.random());
        currentQuizData = shuffled.slice(0, 10);
        
        const modal = document.createElement('div');
        modal.id = 'quiz-modal';
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content quiz-container">
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
    
    // Save Score
    const key = `quiz_score_${currentQuizUrl}`;
    const old = localStorage.getItem(key) || 0;
    if (percent > old) localStorage.setItem(key, percent);
    
    loadContent(); // Refresh dashboard
}

function closeQuiz() { document.getElementById('quiz-modal').remove(); }