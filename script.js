// ==========================================
// 1. CONFIGURATION
// ==========================================
const ALLOWED_CODES = ["phase2", "admin2025"];

// Categories to display (in this order)
const CATEGORY_ORDER = ["Course Notes", "Presentations", "Audio", "Video", "Miscellaneous"];

// ==========================================
// 2. NEWS
// ==========================================
const NEWS_BOARD = [
    { date: "Update", text: "New folder structure applied. Check Module 1." }
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
            document.getElementById('module-grid').innerHTML = "<p style='text-align:center'>⚠️ Content loading...</p>";
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

function openModule(index) {
    const module = courseData.modules[index];
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('news-section').style.display = 'none';
    document.getElementById('unit-viewer').style.display = 'block';

    document.getElementById('module-title-display').innerText = module.title;
    document.getElementById('module-desc-display').innerText = "Course Material";
    
    const contentArea = document.getElementById('unit-content-area');
    if (!module.units || module.units.length === 0) { contentArea.innerHTML = "<p>No units found.</p>"; return; }

    contentArea.innerHTML = module.units.map(unit => {
        // Group resources by category
        let unitHtml = `<div class="unit-block"><div class="unit-header"><h3>${unit.name}</h3></div><div class="unit-body">`;
        
        let hasContent = false;
        
        // Loop through our defined categories
        CATEGORY_ORDER.forEach(cat => {
            // Find files in this category
            const files = unit.resources.filter(r => r.category === cat);
            
            if (files.length > 0) {
                hasContent = true;
                // Add a Sub-Header (e.g., "Audio")
                unitHtml += `<h4 style="margin: 15px 0 10px 0; color:#555; border-bottom:1px solid #eee; padding-bottom:5px;">${getCategoryIcon(cat)} ${cat}</h4>`;
                // Render files
                unitHtml += files.map(renderResource).join('');
            }
        });

        if (!hasContent) unitHtml += `<p style="color:#999; font-style:italic;">No resources uploaded.</p>`;
        
        unitHtml += `</div></div>`;
        return unitHtml;
    }).join('');
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
        content = `<a href="${res.link}" target="_blank" style="text-decoration:none; color:#0066cc; font-weight:600;">${res.title}</a>`;
    }

    return `<div class="resource" style="display:flex; align-items:flex-start; margin-bottom:10px; padding:10px; background:#fdfdfd; border:1px solid #f0f0f0; border-radius:5px;">
            <span style="font-size:1.4rem; margin-right:10px;">${icon}</span><div style="width:100%;">${content}</div></div>`;
}