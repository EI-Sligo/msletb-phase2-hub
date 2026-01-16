// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ==========================================
// 1. CONFIGURATION (PASTE YOUR KEYS HERE)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "msletb-phase2.firebaseapp.com",
    projectId: "msletb-phase2",
    storageBucket: "msletb-phase2.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// State
let currentUser = null;
let courseData = { modules: [] }; 
let userProgress = {}; 

const MODULE_MAP = {
    "01_Electricity": "Electrical / Electronics",
    "02_Installation": "Installation Techniques",
    "03_Pressure": "Measurement - Pressure",
    "04_Flow": "Measurement - Flow",
    "05_Level": "Measurement - Level",
    "06_Temp": "Measurement - Temperature",
    "07_Control": "Automatic Control",
    "00_EHS": "Health & Safety"
};

// ==========================================
// 2. AUTHENTICATION & ADMIN FIX
// ==========================================
window.login = async () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (e) { showError(e.message); }
}

window.signup = async () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        // Create student doc by default
        await setDoc(doc(db, "users", userCred.user.uid), {
            email: email, role: 'student', progress: {}
        });
        alert("Account Created!");
    } catch (e) { showError(e.message); }
}

window.forceAdmin = async () => {
    if (!currentUser) { alert("Please Log In First!"); return; }
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email, role: 'admin', progress: {}
        });
        alert("Success! You are now an Admin. Refresh the page.");
    } catch (e) { alert("Error: " + e.message); }
}

window.logout = () => signOut(auth);

function showError(msg) {
    const el = document.getElementById('error-msg');
    el.innerText = "❌ " + msg;
    el.style.display = 'block';
}

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Get User Role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            userProgress = userData.progress || {};
            
            if (userData.role === 'admin') {
                document.getElementById('upload-btn').style.display = 'inline-block';
                document.getElementById('admin-panel').style.display = 'block';
                document.getElementById('user-role-display').style.display = 'inline-block';
                loadAdminData();
            }
        }
        loadContent();
    } else {
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// ==========================================
// 3. ADMIN: USER MANAGEMENT & UPLOADS
// ==========================================
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
                <td style="padding:10px;"><button class="block-btn" onclick="blockUser('${docSnap.id}')">Block User</button></td>
            </tr>`;
        }
    });
}

window.blockUser = async (uid) => {
    if(confirm("Remove this student?")) {
        await deleteDoc(doc(db, "users", uid));
        loadAdminData();
    }
}

// Uploads
window.openUploadModal = () => document.getElementById('upload-modal').style.display = 'block';
window.closeUploadModal = () => document.getElementById('upload-modal').style.display = 'none';

window.uploadFile = async () => {
    const file = document.getElementById('up-file').files[0];
    const title = document.getElementById('up-title').value;
    const moduleId = document.getElementById('up-module').value;
    const type = document.getElementById('up-type').value;
    const status = document.getElementById('up-status');

    if (!file || !title) { alert("Missing fields"); return; }
    status.innerText = "⏳ Uploading...";

    try {
        const storageRef = ref(storage, `content/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        const docRef = doc(collection(db, "content"));
        await setDoc(docRef, {
            id: docRef.id, title: title, moduleId: moduleId,
            type: type, url: url, timestamp: new Date()
        });

        status.innerText = "✅ Success!";
        setTimeout(() => { window.closeUploadModal(); loadContent(); status.innerText=""; }, 1000);
    } catch (e) { status.innerText = "❌ Error: " + e.message; }
}

// ==========================================
// 4. CONTENT & RENDERING
// ==========================================
async function loadContent() {
    const querySnapshot = await getDocs(collection(db, "content"));
    let tempModules = {};
    
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        if (!tempModules[item.moduleId]) {
            tempModules[item.moduleId] = {
                title: MODULE_MAP[item.moduleId] || item.moduleId,
                id: item.moduleId, resources: []
            };
        }
        tempModules[item.moduleId].resources.push(item);
    });
    courseData.modules = Object.values(tempModules);
    renderModules();
}

function renderModules() {
    const grid = document.getElementById('module-grid');
    if (courseData.modules.length === 0) { grid.innerHTML = "<p style='text-align:center; padding:20px;'>No content yet. Admin: Click 'Add Content'.</p>"; return; }
    
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
    document.getElementById('unit-content-area').innerHTML = mod.resources.map(renderResource).join('');
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
    
    const isChecked = userProgress[res.id] ? "checked" : "";
    
    // Onclick logic
    let action = `openMedia('${res.url}', '${res.title}')`;
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

// Progress Saving
window.toggleProgress = async (rid, checkbox) => {
    if (!currentUser) return;
    if (checkbox.checked) userProgress[rid] = true; else delete userProgress[rid];
    await updateDoc(doc(db, "users", currentUser.uid), { progress: userProgress });
}

// ==========================================
// 5. UTILS (Media, Tools, Theme)
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