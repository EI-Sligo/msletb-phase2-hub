// Import Firebase Functions from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ==========================================
// 1. PASTE YOUR CONFIG HERE
// ==========================================
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX9DNXGIxUJjamCF49px-9ZFGJE2bi9iI",
  authDomain: "msletb-phase2.firebaseapp.com",
  projectId: "msletb-phase2",
  storageBucket: "msletb-phase2.firebasestorage.app",
  messagingSenderId: "603090820895",
  appId: "1:603090820895:web:ed88ca0243b24ac9f65a2a"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==========================================
// 2. STATE & VARIABLES
// ==========================================
let currentUser = null;
let courseData = { modules: [] }; 
let userProgress = {}; // Live from Cloud

// Map Modules for Organization
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
// 3. AUTHENTICATION (Login)
// ==========================================
window.login = async () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // Auth listener below handles the redirect
    } catch (error) {
        document.getElementById('error-msg').innerText = "❌ " + error.message;
        document.getElementById('error-msg').style.display = 'block';
    }
}

window.logout = () => signOut(auth);

// Listen for Login State Changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Load User Data (Role & Progress)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            userProgress = userData.progress || {};
            
            // Check if Admin
            if (userData.role === 'admin') {
                document.getElementById('upload-btn').style.display = 'inline-block';
                document.getElementById('admin-panel').style.display = 'block';
                document.getElementById('user-role-display').style.display = 'inline-block';
                loadAdminData(); // Load all students
            }
        } else {
            // First time user, create doc
            await setDoc(doc(db, "users", user.uid), { 
                email: user.email, 
                role: 'student', 
                progress: {} 
            });
        }
        
        loadContent(); // Load content from Cloud
    } else {
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// ==========================================
// 4. CONTENT LOADING (From Firestore)
// ==========================================
async function loadContent() {
    // In this "No-Code" version, we read "content" collection from Firestore
    // If you haven't uploaded anything yet, it will be empty.
    const querySnapshot = await getDocs(collection(db, "content"));
    
    let tempModules = {};
    
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        // Group by Module ID
        if (!tempModules[item.moduleId]) {
            tempModules[item.moduleId] = {
                title: MODULE_MAP[item.moduleId] || item.moduleId,
                id: item.moduleId,
                resources: []
            };
        }
        tempModules[item.moduleId].resources.push(item);
    });

    // Convert map to array
    courseData.modules = Object.values(tempModules);
    renderModules();
}

// ==========================================
// 5. RENDERING & UI (Same Visuals)
// ==========================================
function renderModules() {
    const grid = document.getElementById('module-grid');
    if (courseData.modules.length === 0) { 
        grid.innerHTML = "<p style='text-align:center;'>No content uploaded yet. Click 'Add Content'.</p>"; 
        return; 
    }
    
    grid.innerHTML = courseData.modules.map((mod, index) => {
        // Calculate Progress based on userProgress object
        let completed = 0;
        let total = mod.resources.length;
        mod.resources.forEach(res => {
            if (userProgress[res.id]) completed++;
        });
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        return `
        <div class="module-card" onclick="openModule(${index})">
            <div style="display:flex; justify-content:space-between;">
                <h3>${mod.title}</h3>
                ${percent > 0 ? `<span class="progress-text">${percent}%</span>` : ''}
            </div>
            <p>${total} Resources</p>
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
    contentArea.innerHTML = mod.resources.map(res => renderResource(res)).join('');
}

window.showHome = () => {
    document.getElementById('unit-viewer').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    renderModules();
}

function renderResource(res) {
    let icon = "📄"; let color = "var(--primary)"; let btnText = "View";
    if (res.type === 'pdf') { icon = "📕"; color = "#d93025"; }
    if (res.type === 'video') { icon = "📺"; color = "#c4302b"; }
    
    const isChecked = userProgress[res.id] ? "checked" : "";

    return `
    <div class="resource">
        <div class="res-row">
            <span class="res-icon" style="color:${color}; font-size:1.6rem;">${icon}</span>
            <div style="flex-grow:1;">
                <div style="font-weight:600;">${res.title}</div>
            </div>
            <label style="margin-right:15px; cursor:pointer; font-size:0.9rem;">
                <input type="checkbox" ${isChecked} onchange="toggleProgress('${res.id}', this)"> Done
            </label>
            <button class="preview-btn" onclick="openMedia('${res.url}', '${res.title}')">Open</button>
        </div>
    </div>`;
}

// ==========================================
// 6. PROGRESS TRACKING (Live Cloud Sync)
// ==========================================
window.toggleProgress = async (resourceId, checkbox) => {
    if (!currentUser) return;
    
    if (checkbox.checked) {
        userProgress[resourceId] = true;
    } else {
        delete userProgress[resourceId];
    }
    
    // Save to Firestore Cloud immediately
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
        progress: userProgress
    });
}

// ==========================================
// 7. ADMIN: UPLOAD & STUDENT TRACKING
// ==========================================
window.openUploadModal = () => document.getElementById('upload-modal').style.display = 'block';
window.closeUploadModal = () => document.getElementById('upload-modal').style.display = 'none';

window.uploadFile = async () => {
    const file = document.getElementById('up-file').files[0];
    const title = document.getElementById('up-title').value;
    const moduleId = document.getElementById('up-module').value;
    const type = document.getElementById('up-type').value;
    const status = document.getElementById('up-status');

    if (!file || !title) { alert("Please select a file and title"); return; }

    status.innerText = "⏳ Uploading...";

    try {
        // 1. Upload File to Storage
        const storageRef = ref(storage, `content/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        // 2. Save Metadata to Database
        const docRef = doc(collection(db, "content"));
        await setDoc(docRef, {
            id: docRef.id,
            title: title,
            moduleId: moduleId,
            type: type,
            url: url,
            timestamp: new Date()
        });

        status.innerText = "✅ Success!";
        setTimeout(() => {
            window.closeUploadModal();
            loadContent(); // Refresh view
            status.innerText = "";
        }, 1000);

    } catch (error) {
        console.error(error);
        status.innerText = "❌ Error: " + error.message;
    }
}

async function loadAdminData() {
    // Get all users
    const querySnapshot = await getDocs(collection(db, "users"));
    let html = `<table style="width:100%; border-collapse:collapse;">
        <tr style="text-align:left; border-bottom:2px solid #ddd;">
            <th>Email</th>
            <th>Progress (Items Completed)</th>
        </tr>`;
    
    querySnapshot.forEach((doc) => {
        const u = doc.data();
        if (u.role === 'student') {
            const count = u.progress ? Object.keys(u.progress).length : 0;
            html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${u.email}</td>
                <td style="padding:8px;"><strong>${count}</strong> items</td>
            </tr>`;
        }
    });
    html += `</table>`;
    document.getElementById('student-table').innerHTML = html;
}

// ==========================================
// 8. MEDIA MODAL
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