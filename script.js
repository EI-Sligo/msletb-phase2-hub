// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ==========================================
// 1. CONFIGURATION (PASTE YOUR KEYS HERE)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDX9DNXGIxUJjamCF49px-9ZFGJE2bi9iI",
  authDomain: "msletb-phase2.firebaseapp.com",
  projectId: "msletb-phase2",
  storageBucket: "msletb-phase2.firebasestorage.app",
  messagingSenderId: "603090820895",
  appId: "1:603090820895:web:ed88ca0243b24ac9f65a2a"
};

// Initialize Main App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// State Variables
let currentUser = null;
let courseData = { modules: [] }; 
let userProgress = {}; 

// ==========================================
// 2. CURRICULUM DATA
// ==========================================
const MODULE_MAP = {
    "00_EHS": "Module 0: Health and Safety",
    "01_Electricity": "Module 1: Electricity/Electronics",
    "02_Installation": "Module 2: Installation Techniques",
    "03_Pressure": "Module 3: Measurement – Pressure",
    "04_Flow": "Module 4: Measurement – Flow",
    "05_Level": "Module 5: Measurement – Level",
    "06_Temp": "Module 6: Measurement – Temperature",
    "07_Control": "Module 7: Automatic Control"
};

const UNIT_DATA = {
    "00_EHS": ["Unit 1: Induction/Health and Safety", "Unit 2: Manual Handling"],
    "01_Electricity": ["Unit 3: Introduction to Electricity/Ohm’s Law", "Unit 4: Resistance Networks/Measurement", "Unit 5: Power and Energy", "Unit 6: Magnetism, Electromagnetism and Electromagnetic Induction", "Unit 7: Capacitance in a DC Circuit", "Unit 8: Introduction to AC", "Unit 9: The Power Transformer", "Unit 10: Soldering and Printed Circuit Board Techniques", "Unit 11: Semiconductors and Diodes", "Unit 12: Rectification and Power Supplies", "Unit 13: Introduction to Logic", "Unit 14: Introduction to Transistors"],
    "02_Installation": ["Unit 1: Basic Engineering", "Unit 2: Conduit and Trunking Systems", "Unit 3: Cables and Cable Termination", "Unit 4: Lighting and Lighting Circuits", "Unit 5: Consumer Unit and Protective Devices", "Unit 6: Fixed Appliances and Socket Circuits", "Unit 7: Earthing and Bonding", "Unit 8: Multicore Cables", "Unit 9: Installation Testing"],
    "03_Pressure": ["Unit 1: Pressure Measurement", "Unit 2: Digital and Liquid Manometers", "Unit 3: Elastic Pressure Elements", "Unit 4: Calibration Standards", "Unit 5: Pressure Switch", "Unit 6: Pneumatic Transmitter", "Unit 7: Electronic Transmitter", "Unit 8: Test Equipment"],
    "04_Flow": ["Unit 1: Introduction to Flow", "Unit 2: Orifice Plate Construction and Installation", "Unit 3: DP Flow Measurement, Square Root Relationship Integration", "Unit 4: Turbine Flowmeter/Positive Displacement Meters", "Unit 5: Variable Area Meter", "Unit 6: Vortex Flowmeter"],
    "05_Level": ["Unit 1: Level Measurement – Direct Method", "Unit 2: Level Measurement – Head Method (Gas Purge System)", "Unit 3: Head Type – Open Tank DP Method", "Unit 4: Head Type – Closed Tank DP Method", "Unit 5: Radar Level Systems", "Unit 6: Level Switch-Level Electrode", "Unit 7: Controller/Indicator/Recorders"],
    "06_Temp": ["Unit 1: Introduction to Temperature", "Unit 2: Temperature Simulation/Measurement", "Unit 3: Temperature Indicators/Switches/Recorders", "Unit 4: Resistance Thermometer", "Unit 5: Wheatstone Bridge", "Unit 6: Thermocouples", "Unit 7: Temperature Transmitter"],
    "07_Control": ["Unit 1: Instrument Loops, Functions, Drawings", "Unit 2: Control Valve Assembly", "Unit 3: I/P and P/I Converters", "Unit 4: Electrically Operated Valves", "Unit 5: Two-Step Control", "Unit 6: Proportional Control"]
};

// ==========================================
// 3. AUTHENTICATION & SECURITY
// ==========================================
window.login = async () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (e) { showError(e.message); }
}

window.logout = () => signOut(auth);

function showError(msg) {
    const el = document.getElementById('error-msg');
    el.innerText = "❌ " + msg;
    el.style.display = 'block';
}

// SECURE AUTH LISTENER (WITH SUPER ADMIN FIX)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check database for user profile
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        // SUPER ADMIN CHECK (Overrides Database)
        const isSuperAdmin = (user.email.toLowerCase() === "declanmcmorrow@msletb.ie");

        if (userDoc.exists() || isSuperAdmin) {
            currentUser = user;
            
            // Get data or use defaults if Super Admin is missing from DB
            const userData = userDoc.exists() ? userDoc.data() : { role: 'admin', progress: {} };
            userProgress = userData.progress || {};

            // Force Admin Role if email matches
            if (isSuperAdmin) userData.role = 'admin';

            // UI: Hide Login, Show App
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';

            // UI: Show Admin Controls
            if (userData.role === 'admin') {
                document.getElementById('upload-btn').style.display = 'inline-block';
                document.getElementById('admin-panel').style.display = 'block';
                document.getElementById('user-role-display').style.display = 'inline-block';
                loadAdminData();
            }
            
            // Load Content
            loadContent();

            // Self-healing: If Super Admin is missing in DB, create the doc now
            if (isSuperAdmin && !userDoc.exists()) {
                await setDoc(userDocRef, { email: user.email, role: 'admin', progress: {} });
            }

        } else {
            // User was deleted/blocked by Admin
            alert("⛔ Access Denied: Account disabled.");
            await signOut(auth);
            location.reload();
        }

    } else {
        // No user logged in
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// ==========================================
// 4. ADMIN: USER MANAGEMENT
// ==========================================
window.switchAdminTab = (tab) => {
    document.getElementById('admin-tab-list').style.display = (tab === 'list') ? 'block' : 'none';
    document.getElementById('admin-tab-add').style.display = (tab === 'add') ? 'block' : 'none';
    document.getElementById('btn-tab-list').classList.toggle('active', tab === 'list');
    document.getElementById('btn-tab-add').classList.toggle('active', tab === 'add');
}

window.loadAdminData = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const listBody = document.getElementById('student-list-body');
    listBody.innerHTML = "";

    snapshot.forEach(docSnap => {
        const u = docSnap.data();
        if (u.role === 'student') {
            const progressCount = u.progress ? Object.keys(u.progress).length : 0;
            listBody.innerHTML += `
            <tr>
                <td style="padding:10px;">${u.email}</td>
                <td style="padding:10px;"><strong>${progressCount}</strong> items</td>
                <td style="padding:10px;"><button class="block-btn" onclick="blockUser('${docSnap.id}')">Block / Delete</button></td>
            </tr>`;
        }
    });
}

window.blockUser = async (uid) => {
    if(confirm("Permanently delete this student and their progress?")) {
        await deleteDoc(doc(db, "users", uid));
        loadAdminData();
    }
}

// CREATE USER (Without logging out Admin)
window.adminCreateUser = async () => {
    const email = document.getElementById('new-stu-email').value;
    const pass = document.getElementById('new-stu-pass').value;

    if(!email || !pass) { alert("Enter email and password."); return; }

    try {
        // Initialize a secondary app to create user in background
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        
        // Write to DB using Main App (Admin Permissions)
        await setDoc(doc(db, "users", userCred.user.uid), {
            email: email, role: 'student', progress: {}
        });

        // Cleanup secondary app
        await signOut(secondaryAuth);
        
        alert(`✅ User created: ${email}`);
        document.getElementById('new-stu-email').value = "";
        document.getElementById('new-stu-pass').value = "";
        
        // Return to list view
        switchAdminTab('list');
        loadAdminData();

    } catch (e) {
        alert("Error: " + e.message);
    }
}

// Emergency Fix Button (Keep just in case)
window.forceAdmin = async () => {
    if (!currentUser) { alert("Please Log In First!"); return; }
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email, role: 'admin', progress: {}
        });
        alert("Success! You are now an Admin. Refresh the page.");
    } catch (e) { alert("Error: " + e.message); }
}

// ==========================================
// 5. ADMIN: UPLOADS & DROPDOWNS
// ==========================================
window.openUploadModal = () => document.getElementById('upload-modal').style.display = 'block';
window.closeUploadModal = () => document.getElementById('upload-modal').style.display = 'none';

window.updateUnitDropdown = () => {
    const modSelect = document.getElementById('up-module');
    const unitSelect = document.getElementById('up-unit');
    const selectedMod = modSelect.value;
    
    // Reset unit dropdown
    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';

    if (selectedMod && UNIT_DATA[selectedMod]) {
        unitSelect.disabled = false;
        UNIT_DATA[selectedMod].forEach(unitName => {
            const opt = document.createElement('option');
            opt.value = unitName;
            opt.innerText = unitName;
            unitSelect.appendChild(opt);
        });
    } else {
        unitSelect.disabled = true;
        unitSelect.innerHTML = '<option value="">-- Select Module First --</option>';
    }
}

window.uploadFile = async () => {
    const file = document.getElementById('up-file').files[0];
    const title = document.getElementById('up-title').value;
    const moduleId = document.getElementById('up-module').value;
    const unitName = document.getElementById('up-unit').value;
    const category = document.getElementById('up-type').value;
    const status = document.getElementById('up-status');

    if (!file || !title || !moduleId || !unitName) { alert("Missing fields"); return; }
    status.innerText = "⏳ Uploading...";

    try {
        // Upload to Storage
        const storageRef = ref(storage, `content/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        // Determine File Type Icon
        let fileType = 'pdf'; 
        if(category === 'Video') fileType = 'video';
        if(category === 'Audio') fileType = 'audio';
        if(category === 'Quizzes') fileType = 'quiz';
        if(category === 'Presentations') fileType = 'ppt';

        // Save Metadata to Database
        const docRef = doc(collection(db, "content"));
        await setDoc(docRef, {
            id: docRef.id, title: title, moduleId: moduleId, unit: unitName,
            category: category, type: fileType, url: url, timestamp: new Date()
        });

        status.innerText = "✅ Success!";
        setTimeout(() => { window.closeUploadModal(); loadContent(); status.innerText=""; }, 1500);
    } catch (e) { status.innerText = "❌ Error: " + e.message; }
}

// ==========================================
// 6. CONTENT LOADING & RENDERING
// ==========================================
async function loadContent() {
    const querySnapshot = await getDocs(collection(db, "content"));
    let tempModules = {};
    
    // Sort modules by Key to keep order (00, 01, 02...)
    const sortedKeys = Object.keys(MODULE_MAP).sort();
    sortedKeys.forEach(k => { tempModules[k] = { title: MODULE_MAP[k], id: k, resources: [] }; });

    querySnapshot.forEach((doc) => {
        const item = doc.data();
        if (tempModules[item.moduleId]) tempModules[item.moduleId].resources.push(item);
    });
    courseData.modules = Object.values(tempModules);
    renderModules();
}

function renderModules() {
    const grid = document.getElementById('module-grid');
    grid.innerHTML = courseData.modules.map((mod, index) => {
        let completed = 0;
        let total = mod.resources.length;
        mod.resources.forEach(res => { if(userProgress[res.id]) completed++; });
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        return `
        <div class="module-card" onclick="openModule(${index})">
            <div style="display:flex; justify-content:space-between;"><h3>${mod.title}</h3>${percent > 0 ? `<span class="progress-text">${percent}%</span>` : ''}</div>
            <p style="color:var(--text-light); font-size:0.9rem;">${total} Resources</p>
            <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
        </div>`;
    }).join('');
}

window.openModule = (index) => {
    const mod = courseData.modules[index];
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('unit-viewer').style.display = 'block';
    document.getElementById('module-title-display').innerText = mod.title;
    
    const contentArea = document.getElementById('unit-content-area');
    const unitsInThisMod = UNIT_DATA[mod.id] || [];
    let html = "";
    
    // Loop through known units to keep order
    unitsInThisMod.forEach(uName => {
        const resources = mod.resources.filter(r => r.unit === uName);
        
        html += `<div class="unit-block active">
            <div class="unit-header" style="background:rgba(0,0,0,0.03); cursor:default;"><h3>${uName}</h3></div>
            <div class="unit-body" style="display:block;">`;
            
        if(resources.length === 0) {
            html += `<p style="color:#ccc; font-style:italic; padding-left:10px;">No content uploaded yet.</p>`;
        } else {
            // Sort by Category
            const cats = ["Course Notes", "Presentations", "Audio", "Video", "Quizzes", "Miscellaneous"];
            cats.forEach(cat => {
                const files = resources.filter(r => r.category === cat);
                if(files.length > 0) {
                    html += `<div class="category-header">${cat}</div>`;
                    html += files.map(renderResource).join('');
                }
            });
        }
        html += `</div></div>`;
    });
    contentArea.innerHTML = html;
}

window.showHome = () => {
    document.getElementById('unit-viewer').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    renderModules();
}

function renderResource(res) {
    let icon = "📄"; let color = "var(--primary)"; let btn = "View";
    
    if (res.type === 'pdf') { icon = "📕"; color = "#d93025"; btn="Open PDF"; }
    if (res.type === 'video') { icon = "📺"; color = "#c4302b"; btn="Watch"; }
    if (res.type === 'ppt') { icon = "📽️"; color = "#d24726"; btn="Download"; }
    
    const isChecked = userProgress[res.id] ? "checked" : "";
    let action = `openMedia('${res.url}', '${res.title}')`;
    
    // Handle Quizzes or different files
    if(res.type === 'quiz') return renderQuizCard(res);

    return `
    <div class="resource">
        <div class="res-row">
            <span class="res-icon" style="color:${color};">${icon}</span>
            <div style="flex-grow:1;"><strong>${res.title}</strong></div>
            <label style="cursor:pointer; margin-right:15px; font-size:0.9rem;">
                <input type="checkbox" ${isChecked} onchange="toggleProgress('${res.id}', this)"> Done
            </label>
            <button class="preview-btn" onclick="${action}">${btn}</button>
        </div>
    </div>`;
}

window.toggleProgress = async (rid, checkbox) => {
    if (!currentUser) return;
    if (checkbox.checked) userProgress[rid] = true; else delete userProgress[rid];
    await updateDoc(doc(db, "users", currentUser.uid), { progress: userProgress });
}

// ==========================================
// 7. UTILS (Media, Tools, Calc)
// ==========================================
window.openMedia = (url, title) => {
    document.getElementById('media-modal').style.display = 'block';
    document.getElementById('media-frame').src = url;
    document.getElementById('media-title').innerText = title;
}
window.closeMedia = () => {
    document.getElementById('media-modal').style.display = 'none';
    document.getElementById('media-frame').src = "";
}

window.openTools = () => document.getElementById('tools-modal').style.display = 'block';
window.closeTools = () => document.getElementById('tools-modal').style.display = 'none';

window.switchTab = (name) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.target.classList.add('active');
}

window.calcOhm = () => {
    const v = parseFloat(document.getElementById('ohm-v').value);
    const i = parseFloat(document.getElementById('ohm-i').value);
    const r = parseFloat(document.getElementById('ohm-r').value);
    const res = document.getElementById('ohm-result');
    if (!isNaN(i) && !isNaN(r)) res.innerText = `Voltage = ${(i * r).toFixed(2)} V`;
    else if (!isNaN(v) && !isNaN(r)) res.innerText = `Current = ${(v / r).toFixed(2)} A`;
    else if (!isNaN(v) && !isNaN(i)) res.innerText = `Resistance = ${(v / i).toFixed(2)} Ω`;
    else res.innerText = "Enter any 2 values.";
}

window.calcScale = () => {
    const min = parseFloat(document.getElementById('scale-min').value);
    const max = parseFloat(document.getElementById('scale-max').value);
    const pv = parseFloat(document.getElementById('scale-pv').value);
    const result = (((pv - min) / (max - min)) * 16) + 4;
    document.getElementById('scale-result').innerText = `Output: ${result.toFixed(2)} mA`;
}