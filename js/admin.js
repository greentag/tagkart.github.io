const firebaseConfig = {
    apiKey: "AIzaSyD0sQgLV32_ZoB26eYzBY_Elv8JKa4v5wQ",
    authDomain: "dhami-group.firebaseapp.com",
    projectId: "dhami-group",
    storageBucket: "dhami-group.firebasestorage.app",
    messagingSenderId: "230272575666",
    appId: "1:230272575666:web:f88a092b9d2a1beb2941ab"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

let secondaryApp;
if (firebase.apps.length < 2) { 
    secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary"); 
} else { 
    secondaryApp = firebase.app("Secondary"); 
}

// ====================================================
// THEME MANAGEMENT & SYNC LOGIC (FOR ADMIN PORTAL)
// ====================================================
function selectPresetTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('dhami_selected_theme', themeName);
    localStorage.removeItem('dhami_custom_color');
    
    // Reset any manual inline style overrides
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--primary-hover');
    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--glow-color');

    syncAdminThemePickers(themeName, null);
}

function applyCustomColor(hexColor) {
    const hoverColor = adjustBrightness(hexColor, -20);
    document.documentElement.style.setProperty('--primary-color', hexColor);
    document.documentElement.style.setProperty('--primary-hover', hoverColor);
    document.documentElement.style.setProperty('--accent-color', hexColor);
    document.documentElement.style.setProperty('--glow-color', hexColor);
    
    localStorage.setItem('dhami_custom_color', hexColor);
    syncAdminThemePickers(null, hexColor);
}

function adjustBrightness(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = ((num >> 8) & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}

function syncAdminThemePickers(preset, customHex) {
    const selectors = ['themeSelectAdmin', 'themeSelectModal', 'themeSelect'];
    const pickers = ['customColorPickerAdmin', 'customColorPickerModal', 'customColorPicker'];

    if (preset) {
        selectors.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = preset;
        });
    }
    if (customHex) {
        pickers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = customHex;
        });
    }
}

function loadUserTheme() {
    const savedCustom = localStorage.getItem('dhami_custom_color');
    const savedPreset = localStorage.getItem('dhami_selected_theme');
    
    if (savedCustom) {
        applyCustomColor(savedCustom);
    } else if (savedPreset) {
        selectPresetTheme(savedPreset);
    }
}

// Captcha Logic
let captchaCorrect = 0;
function generateCaptcha() {
    let n1 = Math.floor(Math.random() * 10) + 1;
    let n2 = Math.floor(Math.random() * 10) + 1;
    captchaCorrect = n1 + n2;
    let el = document.getElementById('captchaQuestion');
    if(el) el.innerText = `${n1} + ${n2} = ?`;
    let a = document.getElementById('captchaAnswer');
    if(a) a.value = '';
}

function openLoginModal() { 
    const modal = document.getElementById('loginModal');
    if(modal) { 
        modal.style.display = 'flex'; 
        generateCaptcha(); 
    }
}

function closeLoginModal() { 
    const modal = document.getElementById('loginModal');
    if(modal) modal.style.display = 'none';
    const err = document.getElementById('loginError');
    if(err) err.style.display = 'none';
}

function openForgotModal() { 
    closeLoginModal();
    const fModal = document.getElementById('forgotPassModal');
    if(fModal) fModal.style.display = 'flex';
}

function closeForgotModal() { 
    const fModal = document.getElementById('forgotPassModal');
    if(fModal) fModal.style.display = 'none';
    openLoginModal();
}

// Auth State Check (Same as Original Code)
auth.onAuthStateChanged(user => {
    let adminPortal = document.getElementById('adminPortal');

    if (user) {
        if(adminPortal) adminPortal.style.display = 'block';
        closeLoginModal();

        let emailPrefix = user.email.split('@')[0];
        let defaultName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

        document.getElementById('adminNameDisplay').innerText = defaultName;
        document.getElementById('adminRoleDisplay').innerText = "Loading Role...";

        db.collection("users").where("email", "==", user.email).get().then((snap) => {
            let uRole = "Standard User"; 
            let uName = defaultName;
            if (!snap.empty) {
                let data = snap.docs[0].data(); 
                uName = data.name; 
                uRole = data.role;
            } else if (user.email === 'pspujari88@gmail.com' || user.email === 'admin@dhamigroup.com') {
                uRole = "System Administrator"; 
                uName = "Prakash Dhami (Admin)";
            }
            document.getElementById('adminNameDisplay').innerText = uName;
            document.getElementById('adminRoleDisplay').innerText = uRole;
            applyPermissions(uRole);
        }).catch(() => {
            document.getElementById('adminNameDisplay').innerText = defaultName;
            document.getElementById('adminRoleDisplay').innerText = "System Administrator";
            applyPermissions("System Administrator");
        });

        fetchProducts(); 
        fetchJobs(); 
        fetchUsers();
    } else {
        if(adminPortal) adminPortal.style.display = 'none';
        openLoginModal();
    }
});

function applyPermissions(role) {
    let navProd = document.getElementById('nav-manage-prod');
    let navCar = document.getElementById('nav-manage-car');
    let navUser = document.getElementById('nav-manage-user');

    if(!navProd || !navCar || !navUser) return;
    navProd.style.display = 'none'; 
    navCar.style.display = 'none'; 
    navUser.style.display = 'none';

    if (role === "System Administrator") {
        navProd.style.display = 'block'; 
        navCar.style.display = 'block'; 
        navUser.style.display = 'block';
        switchAdminTab('manage-prod');
    } else if (role === "Manager - Both") {
        navProd.style.display = 'block'; 
        navCar.style.display = 'block'; 
        switchAdminTab('manage-prod');
    } else if (role === "Only Manage Product") {
        navProd.style.display = 'block'; 
        switchAdminTab('manage-prod');
    } else if (role === "Only Manage Career") {
        navCar.style.display = 'block'; 
        switchAdminTab('manage-car');
    } else {
        alert("You don't have access to the Dashboard!"); 
        auth.signOut();
    }
}

function switchAdminTab(id) { 
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none'); 
    let activeSec = document.getElementById('admin-' + id);
    if(activeSec) activeSec.style.display = 'block'; 
    document.querySelectorAll('.admin-menu a').forEach(a => a.classList.remove('active')); 
    let navElem = document.getElementById('nav-'+id);
    if(navElem) navElem.classList.add('active'); 
}

function handleLogin() {
    let email = document.getElementById('loginId').value; 
    let pass = document.getElementById('loginPass').value; 
    let ans = parseInt(document.getElementById('captchaAnswer').value);
    let errBox = document.getElementById('loginError');

    if(!email || !pass) { 
        errBox.style.display = 'block'; 
        errBox.innerText = "Enter email and password."; 
        return; 
    }
    if(ans !== captchaCorrect) { 
        errBox.style.display = 'block'; 
        errBox.innerText = "Incorrect Captcha!"; 
        generateCaptcha(); 
        return; 
    }

    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(() => {
        return auth.signInWithEmailAndPassword(email, pass);
    }).catch((err) => { 
        errBox.style.display = 'block'; 
        errBox.innerText = err.message; 
        generateCaptcha(); 
    });
}

function logoutUser() { 
    auth.signOut().then(() => { 
        window.close();
        window.location.href = "index.html"; 
    }); 
}

function sendResetLink() {
    let email = document.getElementById('resetEmail').value;
    let msg = document.getElementById('resetMessage');
    if(email) { 
        auth.sendPasswordResetEmail(email).then(() => { 
            msg.style.display = 'block'; 
            msg.innerText = "Reset link sent successfully to your email!"; 
        }).catch((error) => { 
            msg.style.display = 'block'; 
            msg.style.color = '#e34f26'; 
            msg.innerText = error.message; 
        }); 
    }
}

// Products CRUD
let editProdId = null;
function editProduct(id, name, cat, color, qty, desc, spec, imgUrl, catUrl, isHidden) {
    editProdId = id; 
    document.getElementById('addProdName').value = name; 
    document.getElementById('addProdCat').value = cat; 
    document.getElementById('addProdColor').value = color;
    document.getElementById('addProdQty').value = qty; 
    document.getElementById('addProdDesc').value = desc;
    document.getElementById('addProdSpec').value = spec;
    document.getElementById('addProdImage').value = imgUrl !== 'undefined' ? imgUrl : "";
    document.getElementById('addProdCatalog').value = catUrl !== 'undefined' ? catUrl : "";
    document.getElementById('addProdHidden').checked = isHidden; 

    document.getElementById('btnSaveProd').innerHTML = "<i class='fa-solid fa-save'></i> Update Product"; 
    document.getElementById('btnCancelProd').style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveProduct() {
    let name = document.getElementById('addProdName').value; 
    let cat = document.getElementById('addProdCat').value; 
    let color = document.getElementById('addProdColor').value;
    let qty = document.getElementById('addProdQty').value; 
    let desc = document.getElementById('addProdDesc').value; 
    let spec = document.getElementById('addProdSpec').value;
    let imgUrl = document.getElementById('addProdImage').value;
    let catUrl = document.getElementById('addProdCatalog').value;
    let isHidden = document.getElementById('addProdHidden').checked;

    if(!name) return alert("Product Name is required!"); 
    if(!imgUrl) return alert("Product Image URL is required!"); 
    if(!spec) return alert("Product Specification is required!"); 

    let data = { 
        name: name, category: cat, color: color, qty: qty, 
        description: desc, specifications: spec, 
        imageUrl: imgUrl, catalogUrl: catUrl,
        status: isHidden ? "Hidden" : "Public" 
    };

    if(editProdId) { 
        db.collection("products").doc(editProdId).update(data).then(() => {
            alert("Product Updated Successfully!"); 
            cancelEdit('prod');
        });
    } else { 
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); 
        db.collection("products").add(data).then(() => {
            alert("Product Added Successfully!"); 
            cancelEdit('prod');
        });
    }
}

function fetchProducts() {
    db.collection("products").orderBy("createdAt", "desc").onSnapshot((snap) => {
        let t = document.getElementById('prodTbody'); 
        if(!t) return; 
        t.innerHTML = '';
        snap.forEach(doc => { 
            let p = doc.data(); 
            let safeName = p.name ? p.name.replace(/'/g, "\\'") : ""; 
            let safeColor = p.color ? p.color.replace(/'/g, "\\'") : "";
            let safeDesc = p.description ? p.description.replace(/(\r\n|\n|\r)/gm, " ").replace(/'/g, "\\'") : "";
            let safeSpec = p.specifications ? p.specifications.replace(/(\r\n|\n|\r)/gm, " ").replace(/'/g, "\\'") : "";

            t.innerHTML += `<tr>
                <td>${p.name}</td><td>${p.category}</td><td>${p.qty || 'N/A'}</td>
                <td><span class="status-badge ${p.status==='Public'?'status-active':'status-inactive'}">${p.status}</span></td>
                <td>
                    <button class="btn-small btn-edit" onclick="editProduct('${doc.id}', '${safeName}', '${p.category}', '${safeColor}', '${p.qty}', '${safeDesc}', '${safeSpec}', '${p.imageUrl}', '${p.catalogUrl}', ${p.status==='Hidden'})"><i class="fa-solid fa-pen"></i></button> 
                    <button class="btn-small btn-delete" onclick="deleteDoc('products', '${doc.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`; 
        });
    });
}

// Jobs & Users CRUD
let editJobId = null;
function editJob(id, title, req, exp, loc, desc) { 
    editJobId = id; 
    document.getElementById('addJobTitle').value = title; 
    document.getElementById('addJobReq').value = req; 
    document.getElementById('addJobExp').value = exp; 
    document.getElementById('addJobLoc').value = loc; 
    document.getElementById('addJobDesc').value = desc; 
    document.getElementById('btnSaveJob').innerHTML = "<i class='fa-solid fa-save'></i> Update Job"; 
    document.getElementById('btnCancelJob').style.display = "inline-block"; 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function saveJob() { 
    let title = document.getElementById('addJobTitle').value; 
    let req = document.getElementById('addJobReq').value; 
    let exp = document.getElementById('addJobExp').value; 
    let loc = document.getElementById('addJobLoc').value; 
    let desc = document.getElementById('addJobDesc').value; 

    if(!title || !req) return alert("Title and Req positions required!"); 
    let data = { title: title, openings: req, exp: exp, location: loc, description: desc, status: "Active" }; 

    if(editJobId) { 
        db.collection("jobs").doc(editJobId).update(data).then(() => { alert("Job Updated!"); cancelEdit('job'); }); 
    } else { 
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); 
        db.collection("jobs").add(data).then(() => { alert("Job Posted!"); cancelEdit('job'); }); 
    } 
}

function fetchJobs() { 
    db.collection("jobs").orderBy("createdAt", "desc").onSnapshot((snap) => { 
        let t = document.getElementById('jobTbody'); 
        if(!t) return; 
        t.innerHTML = ''; 
        snap.forEach(doc => { 
            let j = doc.data(); 
            let safeTitle = j.title ? j.title.replace(/'/g, "\\'") : ""; 
            let safeDesc = j.description ? j.description.replace(/(\r\n|\n|\r)/gm, " ").replace(/'/g, "\\'") : ""; 
            t.innerHTML += `<tr><td>${j.title}</td><td>${j.openings}</td><td>${j.exp}</td><td><span class="status-badge status-active">${j.status}</span></td><td><button class="btn-small btn-edit" onclick="editJob('${doc.id}', '${safeTitle}', '${j.openings}', '${j.exp}', '${j.location}', '${safeDesc}')"><i class="fa-solid fa-pen"></i></button> <button class="btn-small btn-delete" onclick="deleteDoc('jobs', '${doc.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`; 
        }); 
    }); 
}

let editUserId = null;
function editUser(id, name, email, role) { 
    editUserId = id; 
    document.getElementById('addUserName').value = name; 
    document.getElementById('addUserEmail').value = email; 
    document.getElementById('addUserEmail').disabled = true; 
    document.getElementById('addUserPass').disabled = true; 
    document.getElementById('addUserPass').placeholder = "Disabled during edit"; 
    document.getElementById('addUserRole').value = role; 
    document.getElementById('btnSaveUser').innerHTML = "<i class='fa-solid fa-save'></i> Update User Role"; 
    document.getElementById('btnCancelUser').style.display = "inline-block"; 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function saveUser() { 
    let name = document.getElementById('addUserName').value; 
    let email = document.getElementById('addUserEmail').value; 
    let pass = document.getElementById('addUserPass').value; 
    let role = document.getElementById('addUserRole').value; 

    if(!name || (!editUserId && (!email || !pass))) return alert("All fields are required!"); 
    if(editUserId) { 
        db.collection("users").doc(editUserId).update({ name: name, role: role }).then(() => { 
            alert("User access updated!"); 
            cancelEdit('user'); 
        }); 
    } else { 
        if(pass.length < 6) return alert("Password min 6 chars."); 
        secondaryApp.auth().createUserWithEmailAndPassword(email, pass).then((cred) => { 
            secondaryApp.auth().signOut(); 
            db.collection("users").doc(cred.user.uid).set({ 
                name: name, email: email, role: role, status: "Active", 
                createdAt: firebase.firestore.FieldValue.serverTimestamp() 
            }).then(() => { 
                alert("User Created!"); 
                cancelEdit('user'); 
            }); 
        }).catch(err => alert(err.message)); 
    } 
}

function fetchUsers() { 
    db.collection("users").orderBy("createdAt", "desc").onSnapshot((snap) => { 
        let t = document.getElementById('userTbody'); 
        if(!t) return; 
        t.innerHTML = ''; 
        snap.forEach(doc => { 
            let u = doc.data(); 
            let safeName = u.name ? u.name.replace(/'/g, "\\'") : ""; 
            t.innerHTML += `<tr><td>${u.name}</td><td>${u.email}</td><td><span style="color:#007bb5; font-weight:600;">${u.role}</span></td><td><span class="status-badge status-active">${u.status}</span></td><td><button class="btn-small btn-edit" onclick="editUser('${doc.id}', '${safeName}', '${u.email}', '${u.role}')"><i class="fa-solid fa-pen"></i></button> <button class="btn-small btn-delete" onclick="deleteDoc('users', '${doc.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`; 
        }); 
    }); 
}

function cancelEdit(type) {
    if(type==='prod') { 
        editProdId = null; 
        document.getElementById('addProdName').value=''; 
        document.getElementById('addProdColor').value=''; 
        document.getElementById('addProdQty').value=''; 
        document.getElementById('addProdDesc').value=''; 
        document.getElementById('addProdSpec').value=''; 
        document.getElementById('addProdImage').value=''; 
        document.getElementById('addProdCatalog').value=''; 
        document.getElementById('addProdHidden').checked=false; 
        document.getElementById('btnSaveProd').innerHTML='<i class="fa-solid fa-save"></i> Save Product'; 
        document.getElementById('btnCancelProd').style.display='none'; 
    }
    if(type==='job') { 
        editJobId = null; 
        document.getElementById('addJobTitle').value=''; 
        document.getElementById('addJobReq').value=''; 
        document.getElementById('addJobExp').value=''; 
        document.getElementById('addJobLoc').value=''; 
        document.getElementById('addJobDesc').value=''; 
        document.getElementById('btnSaveJob').innerHTML='<i class="fa-solid fa-upload"></i> Post Job'; 
        document.getElementById('btnCancelJob').style.display='none'; 
    }
    if(type==='user') { 
        editUserId = null; 
        document.getElementById('addUserName').value=''; 
        document.getElementById('addUserEmail').value=''; 
        document.getElementById('addUserPass').value=''; 
        document.getElementById('addUserEmail').disabled=false; 
        document.getElementById('addUserPass').disabled=false; 
        document.getElementById('addUserPass').placeholder="Password (Min 6 chars)"; 
        document.getElementById('btnSaveUser').innerHTML='<i class="fa-solid fa-plus"></i> Create & Sync User'; 
        document.getElementById('btnCancelUser').style.display='none'; 
    }
}

function deleteDoc(col, id) { 
    let msg = col === 'users' ? "Remove user's Role and Access from Dashboard?" : "Permanently delete?"; 
    if(confirm(msg)) db.collection(col).doc(id).delete(); 
}

// Auto-load Theme on Init
window.addEventListener('DOMContentLoaded', () => {
    loadUserTheme();
});
