// ==========================================
// 1. CONFIGURATION
// ==========================================
const ALLOWED_CODES = ["phase2", "admin2025"]; // Add your codes here
const CATEGORY_ORDER = ["Course Notes", "Presentations", "Audio", "Video", "Miscellaneous"];

// ==========================================
// 2. NEWS
// ==========================================
const NEWS_BOARD = [
    { date: "System Update", text: "New 'Accordion' layout active. Click a Unit title to view its contents." },
    { date: "Module 1", text: "Please ensure you have reviewed the Health & Safety docs before Tuesday." }
];

// ==========================================
// 3. APP LOGIC
// ==========================================
let courseData = { news: NEWS_BOARD, modules: [] };

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
            initDashboard();
        })
        .catch(err => {
            console.error(err);
            document.getElementById('module-grid').innerHTML = "<p style='text-align:center'>⚠️ Loading content...</p>";
        });
}

function initDashboard() {
    renderNews();
    const grid = document.getElementById('module-grid');
    if (courseData.modules.length === 0) { grid.innerHTML = "<p>No modules found.</p>"; return; }
    
    grid.innerHTML = courseData.modules.map((mod, index) => `
        <div class="module-card" onclick="openModule(${index})">
            <h3>${mod.title}</h3>
            <p>${mod.units ? mod.units.length : 0} Units</p>
        </div>
    `).join('');
}

function renderNews() {
    document.getElementById('news-feed').innerHTML = courseData.news.map(item => `
        <div class="news-item"><span class="news-date">${item.date}</span><br>${item.text}</div>
    `).join('');
}

// --- NEW: Open Module with Collapsible Units ---
function openModule(index) {
    const module = courseData.modules[index];
    
    // Switch Views
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('news-section').style.display = 'none';
    document.getElementById('unit-viewer').style.display = 'block';

    // Set Titles
    document.getElementById('module-title-display').innerText = module.title;
    document.getElementById('module-desc-display').innerText = "Select a Unit to expand content";
    
    const contentArea = document.getElementById('unit-content-area');
    if (!module.units || module.units.length === 0) { contentArea.innerHTML = "<p>No units found.</p>"; return; }

    // Generate HTML for Units (Closed by default)
    contentArea.innerHTML = module.units.map((unit, uIndex) => {
        // Unique ID for each unit so we can toggle it
        const unitId = `unit-${uIndex}`;
        
        return `
        <div class="unit-block" id="${unitId}">
            <div class="unit-header" onclick="toggleUnit('${unitId}')">
                <h3>${unit.name}</h3>
                <span class="chevron">▼</span>
            </div>
            
            <div class="unit-body">
                ${renderUnitContent(unit)}
            </div>
        </div>`;
    }).join('');
}

// --- NEW: Toggle Function ---
function toggleUnit(id) {
    const element = document.getElementById(id);
    // This toggles the 'active' class defined in CSS
    element.classList.toggle("active");
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

    if (!hasContent) return `<p style="color:#999; font-style:italic;">No resources uploaded yet.</p>`;
    return html;
}

function showHome() {
    document.getElementById('unit-viewer').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('news-section').style.display = 'block';
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
    if (res.type === 'pdf') icon = "📕";
    if (res.type === 'word') icon = "📝";
    if (res.type === 'excel') icon = "📊";
    if (res.type === 'ppt') icon = "📽️";
    if (res.type === 'audio') icon = "🎧";
    if (res.type === 'video') icon = "📺";
    if (res.type === 'image') icon = "🖼️";

    let content = "";
    if (res.type === 'audio') {
        content = `<div><strong>${res.title}</strong></div><audio controls src="${res.link}" style="width:100%; margin-top:5px;"></audio>`;
    } else if (res.type === 'video') {
        content = `<div><strong>${res.title}</strong></div><video controls width="100%" style="border-radius:5px; margin-top:5px; background:#000;"><source src="${res.link}" type="video/mp4"></video>`;
    } else if (res.type === 'image') {
        content = `<div><strong>${res.title}</strong></div><img src="${res.link}" style="max-width:100%; border-radius:5px; margin-top:10px;">`;
    } else {
        content = `<a href="${res.link}" target="_blank" class="res-link">${res.title}</a>`;
    }

    return `<div class="resource">
            <span class="res-icon" style="color:#555;">${icon}</span>
            <div style="width:100%;">${content}</div>
            </div>`;
}