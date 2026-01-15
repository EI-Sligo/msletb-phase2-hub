// ==========================================
// 1. CONFIGURATION
// ==========================================
const ALLOWED_CODES = ["phase2", "admin2025"];
const CATEGORY_ORDER = ["Course Notes", "Presentations", "Audio", "Video", "Miscellaneous"];

// ==========================================
// 2. APP STATE
// ==========================================
let courseData = { 
    news: [], // Empty by default, filled by JSON
    modules: [] 
};
let userProgress = JSON.parse(localStorage.getItem('msletb_progress')) || {};

// ==========================================
// 3. LOGIC
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
            courseData.news = data.news || []; // Load news from files
            initDashboard();
        })
        .catch(err => {
            console.error(err);
            document.getElementById('module-grid').innerHTML = "<p style='text-align:center'>⚠️ Loading content...</p>";
        });
}

function initDashboard() {
    renderNews();
    renderModules(courseData.modules);
}

function renderNews() {
    const container = document.getElementById('news-feed');
    
    if (courseData.news.length === 0) {
        container.innerHTML = `<div class="news-item"><span class="news-date">System</span><br>No announcements at the moment.</div>`;
        return;
    }

    container.innerHTML = courseData.news.map(item => `
        <div class="news-item">
            <span class="news-date">${item.date}</span><br>${item.text}
        </div>
    `).join('');
}

// --- SEARCH & FILTER ---
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

// --- RENDER MODULES ---
function renderModules(modulesToRender) {
    const grid = document.getElementById('module-grid');
    if (modulesToRender.length === 0) { grid.innerHTML = "<p style='text-align:center; color:#666;'>No modules found.</p>"; return; }
    
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
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h3>${mod.title}</h3>
                ${percent > 0 ? `<span class="progress-text">${percent}%</span>` : ''}
            </div>
            <p style="color:#666; font-size:0.9rem;">${totalUnits} Units</p>
            <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
        </div>
    `}).join('');
}

// --- UNIT VIEWER ---
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
    filterContent();
}

// --- RESOURCES ---
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
    return hasContent ? html : `<p style="color:#999; font-style:italic;">No resources uploaded.</p>`;
}

function getCategoryIcon(cat) {
    if (cat === "Audio") return "🎧";
    if (cat === "Video") return "📺";
    if (cat === "Presentations") return "📽️";
    if (cat === "Course Notes") return "📝";
    return "📂";
}

function renderResource(res) {
    let icon = "📄";
    const previewId = "preview-" + Math.random().toString(36).substr(2, 9);
    
    if (res.type === 'audio') {
        return `<div class="resource"><div class="res-row"><span class="res-icon">🎧</span><div style="width:100%"><strong>${res.title}</strong><br><audio controls src="${res.link}" style="width:100%; margin-top:5px;"></audio></div></div></div>`;
    } 
    else if (res.type === 'video') {
        return `<div class="resource"><div class="res-row"><span class="res-icon">📺</span><div style="width:100%"><strong>${res.title}</strong><br><video controls width="100%" style="border-radius:5px; margin-top:5px; background:#000;"><source src="${res.link}" type="video/mp4"></video></div></div></div>`;
    }
    else if (res.type === 'pdf') {
        return `<div class="resource"><div class="res-row"><span class="res-icon" style="color:#d93025;">📕</span><a href="${res.link}" target="_blank" class="res-link">${res.title}</a><button class="preview-btn" onclick="togglePreview('${res.link}', '${previewId}')">👁️ Preview</button></div><iframe id="${previewId}" class="pdf-frame" src=""></iframe></div>`;
    }
    
    return `<div class="resource"><div class="res-row"><span class="res-icon">📄</span><a href="${res.link}" target="_blank" class="res-link">${res.title}</a></div></div>`;
}

function togglePreview(url, frameId) {
    const frame = document.getElementById(frameId);
    if (frame.style.display === "block") { frame.style.display = "none"; frame.src = ""; } 
    else { frame.style.display = "block"; frame.src = url; }
}