// ====================================================
// 1. SUPABASE CLIENT INITIALIZATION
// ====================================================
const SUPABASE_URL = "https://yuyndtoqcwawlhrjespt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eW5kdG9xY3dhd2xocmplc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDkzOTIsImV4cCI6MjEwNjA4NTM5Mn0.TJ1DuBlYANnTNogfbt5WB64UsxNjVUyNkLR2gpHqNR0";

var sb = (typeof window.supabase !== 'undefined' && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, storage: window.sessionStorage, autoRefreshToken: true }
      })
    : null;

function esc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Old products saved with 'Hidden' are treated as Inactive; everything else is Active.
function isActiveStatus(status) {
    return status !== 'Hidden' && status !== 'Inactive';
}

// ====================================================
// 2. THEME MANAGEMENT & SYNC LOGIC
// ====================================================
function selectPresetTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
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

function loadDefaultAdminTheme() {
    selectPresetTheme('emerald');
}

// ====================================================
// 3. CAPTCHA & MODAL LOGIC
// ====================================================
let captchaCorrect = 12;

function generateCaptcha() {
    let n1 = Math.floor(Math.random() * 9) + 1;
    let n2 = Math.floor(Math.random() * 9) + 1;
    captchaCorrect = n1 + n2;
    let el = document.getElementById('captchaQuestion');
    if (el) el.innerText = `${n1} + ${n2} = ?`;
    let a = document.getElementById('captchaAnswer');
    if (a) a.value = '';
}

function openLoginModal() {
    const fModal = document.getElementById('forgotPassModal');
    if (fModal) fModal.style.display = 'none';
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        generateCaptcha();
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
    const err = document.getElementById('loginError');
    if (err) err.style.display = 'none';
}

function openForgotModal() {
    closeLoginModal();
    const fModal = document.getElementById('forgotPassModal');
    if (fModal) fModal.style.display = 'flex';
}

function closeForgotModal() {
    const fModal = document.getElementById('forgotPassModal');
    if (fModal) fModal.style.display = 'none';
    openLoginModal();
}

function backToPublicWebsite() {
    const adminPortal = document.getElementById('adminPortal');
    const websiteView = document.getElementById('websiteView');
    if (adminPortal) adminPortal.style.display = 'none';
    if (websiteView) websiteView.style.display = 'block';
    if (typeof showHome === 'function') showHome();
}

// ====================================================
// 3B. INACTIVITY TIMER (30 minutes)
// ====================================================
let inactivityTimer = null;
const INACTIVITY_LIMIT = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Your session has expired due to 30 minutes of inactivity.");
        logoutUser();
    }, INACTIVITY_LIMIT);
}

function startInactivityTracker() {
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetInactivityTimer));
    resetInactivityTimer();
}

function stopInactivityTracker() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetInactivityTimer));
}

// ====================================================
// 4. SUPABASE AUTH STATE & PERMISSIONS
// ====================================================
if (sb) {
    sb.auth.onAuthStateChange(async (event, session) => {
        let adminPortal = document.getElementById('adminPortal');
        let websiteView = document.getElementById('websiteView');
        const user = session ? session.user : null;

        if (user) {
            if (adminPortal) adminPortal.style.display = 'block';
            if (websiteView) websiteView.style.display = 'none';
            closeLoginModal();

            let emailPrefix = user.email.split('@')[0];
            let defaultName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

            let adminName = document.getElementById('adminNameDisplay');
            let adminRole = document.getElementById('adminRoleDisplay');
            if (adminName) adminName.innerText = defaultName;
            if (adminRole) adminRole.innerText = "Loading Role...";

            try {
                const { data, error } = await sb
                    .from('users')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();

                let uRole = "Standard User";
                let uName = defaultName;

                if (data) {
                    uName = data.name || defaultName;
                    uRole = data.role || "Standard User";
                } else if (user.email === 'pspujari88@gmail.com' || user.email === 'admin@dhamigroup.com') {
                    uRole = "System Administrator";
                    uName = "Prakash Dhami (Admin)";
                }

                if (adminName) adminName.innerText = uName;
                if (adminRole) adminRole.innerText = uRole;
                applyPermissions(uRole);
            } catch (e) {
                if (adminName) adminName.innerText = defaultName;
                if (adminRole) adminRole.innerText = "System Administrator";
                applyPermissions("System Administrator");
            }

            fetchProducts();
            fetchJobs();
            fetchUsers();
            fetchOrders();
            fetchEnquiries();
            startInactivityTracker();
        } else {
            stopInactivityTracker();
            if (adminPortal) adminPortal.style.display = 'none';
            if (websiteView) websiteView.style.display = 'block';
        }
    });
}

function applyPermissions(role) {
    const nav = {
        prod: document.getElementById('nav-manage-prod'),
        car: document.getElementById('nav-manage-car'),
        user: document.getElementById('nav-manage-user'),
        order: document.getElementById('nav-manage-order'),
        msg: document.getElementById('nav-manage-msg')
    };
    if (!nav.prod || !nav.car || !nav.user) return;
    Object.values(nav).forEach(el => { if (el) el.style.display = 'none'; });
    const show = (key) => { if (nav[key]) nav[key].style.display = 'block'; };

    if (role === "System Administrator") {
        ['prod', 'car', 'user', 'order', 'msg'].forEach(show);
        switchAdminTab('manage-prod');
    } else if (role === "Manager - Both") {
        ['prod', 'car', 'order', 'msg'].forEach(show);
        switchAdminTab('manage-prod');
    } else if (role === "Only Manage Product") {
        ['prod', 'order'].forEach(show);
        switchAdminTab('manage-prod');
    } else if (role === "Only Manage Career") {
        show('car');
        switchAdminTab('manage-car');
    } else {
        alert("You don't have access to the Dashboard!");
        logoutUser();
    }
}

function switchAdminTab(id) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    let activeSec = document.getElementById('admin-' + id);
    if (activeSec) activeSec.style.display = 'block';
    document.querySelectorAll('.admin-menu a').forEach(a => a.classList.remove('active'));
    let navElem = document.getElementById('nav-' + id);
    if (navElem) navElem.classList.add('active');
}

async function handleLogin() {
    let email = document.getElementById('loginId').value.trim();
    let pass = document.getElementById('loginPass').value;
    let ans = parseInt(document.getElementById('captchaAnswer').value, 10);
    let errBox = document.getElementById('loginError');

    if (!email || !pass) {
        errBox.style.display = 'block';
        errBox.innerText = "Enter email and password.";
        return;
    }
    if (ans !== captchaCorrect) {
        errBox.style.display = 'block';
        errBox.innerText = "Incorrect Captcha!";
        generateCaptcha();
        return;
    }

    if (!sb) {
        alert("Supabase SDK not loaded. Check connection.");
        return;
    }

    const btn = document.getElementById('btnLogin');
    if (btn) btn.innerText = "Verifying...";

    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: pass
    });

    if (btn) btn.innerText = "Verify & Login";

    if (error) {
        errBox.style.display = 'block';
        errBox.innerText = error.message;
        generateCaptcha();
    }
}

async function logoutUser() {
    stopInactivityTracker();
    if (sb) await sb.auth.signOut();
    window.location.reload();
}

async function sendResetLink() {
    let email = document.getElementById('resetEmail').value.trim();
    let msg = document.getElementById('resetMessage');
    if (email && sb) {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href
        });

        if (error) {
            msg.style.display = 'block';
            msg.style.color = '#e34f26';
            msg.innerText = error.message;
        } else {
            msg.style.display = 'block';
            msg.style.color = '#1b8a4f';
            msg.innerText = "Reset link sent successfully to your email!";
        }
    }
}

// ====================================================
// STORAGE FILE UPLOADER HELPERS
// ====================================================
async function uploadFileToStorage(file, folder) {
    const fileExt = file.name.split('.').pop();
    const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${folder}/${cleanName}`;

    const { data, error } = await sb.storage.from('products').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
    });

    if (error) {
        throw new Error("File Upload Failed: " + error.message);
    }

    const { data: publicData } = sb.storage.from('products').getPublicUrl(filePath);
    return publicData.publicUrl;
}

// Best-effort cleanup of removed/replaced files from Supabase Storage
async function deleteStoredFiles(urls) {
    const marker = '/storage/v1/object/public/products/';
    const paths = urls.map(u => {
        const i = u ? u.indexOf(marker) : -1;
        return i === -1 ? null : decodeURIComponent(u.substring(i + marker.length).split('?')[0]);
    }).filter(Boolean);
    if (paths.length === 0) return;
    try {
        const { error } = await sb.storage.from('products').remove(paths);
        if (error) console.warn("Old file cleanup failed:", error.message);
    } catch (e) {
        console.warn("Old file cleanup failed:", e);
    }
}

// ====================================================
// 5. PRODUCTS CRUD (price, rating, multiple images, Active/Inactive)
// ====================================================
let editProdId = null;
let existingCatalogUrl = "";
let removeCatalog = false;          // edit mode: remove current catalogue on save
let imageItems = [];                // [{type:'existing', url} | {type:'new', file, preview}]
let removedImageUrls = [];          // existing images removed in edit mode
let currentProducts = [];

function getProductImages(p) {
    let list = [];
    if (Array.isArray(p.images)) list = p.images.filter(Boolean);
    else if (typeof p.images === 'string' && p.images) {
        try { list = JSON.parse(p.images).filter(Boolean); } catch (e) { list = []; }
    }
    if (list.length === 0 && p.image_url) list = [p.image_url];
    return list;
}

// ---- Image manager ----
function renderImageManager() {
    const box = document.getElementById('imageManager');
    if (!box) return;
    if (imageItems.length === 0) {
        box.innerHTML = '<div style="font-size:12px; color:#888;">No images selected yet. You can select several images at once.</div>';
        return;
    }
    box.innerHTML = imageItems.map((it, i) => `
        <div class="img-card">
            <div class="thumb-box big"><img src="${it.type === 'new' ? it.preview : esc(it.url)}" alt=""></div>
            ${i === 0 ? '<span class="cover-badge">Cover</span>' : ''}
            ${it.type === 'new' ? '<span class="new-badge">New</span>' : ''}
            <button type="button" class="img-x" title="Remove image" onclick="removeImageItem(${i})">&times;</button>
            ${i === 0 ? '<span class="cover-label">Main image</span>' : `<button type="button" class="btn-mini cover" onclick="makeCover(${i})">Set as cover</button>`}
        </div>`).join('');
}

function onImagesPicked(input) {
    Array.from(input.files).forEach(f => imageItems.push({ type: 'new', file: f, preview: URL.createObjectURL(f) }));
    input.value = '';
    renderImageManager();
}

function removeImageItem(i) {
    const it = imageItems[i];
    if (!it) return;
    if (it.type === 'existing') removedImageUrls.push(it.url);
    else URL.revokeObjectURL(it.preview);
    imageItems.splice(i, 1);
    renderImageManager();
}

function makeCover(i) {
    const [it] = imageItems.splice(i, 1);
    imageItems.unshift(it);
    renderImageManager();
}

// ---- Catalogue box (edit mode) ----
function renderCurrentFiles() {
    const catBox = document.getElementById('currentCatBox');
    if (!catBox) return;
    if (!editProdId || !existingCatalogUrl) {
        catBox.innerHTML = '';
    } else if (removeCatalog) {
        catBox.innerHTML = `<div class="file-current"><span style="flex:1; color:#e34f26; font-weight:600;">Current catalogue will be removed when you save.</span><button type="button" class="btn-mini undo" onclick="toggleRemoveFile('catalog')">Undo</button></div>`;
    } else {
        catBox.innerHTML = `<div class="file-current"><i class="fa-solid fa-file-pdf" style="font-size:28px; color:#e34f26;"></i><div style="flex:1;"><strong>Current catalogue</strong><br><a href="${esc(existingCatalogUrl)}" target="_blank" rel="noopener" style="color:#007bb5;">Open file</a> <small style="color:#777;">&middot; choose a file above to replace it</small></div><button type="button" class="btn-mini remove" onclick="toggleRemoveFile('catalog')"><i class="fa-solid fa-trash"></i> Remove</button></div>`;
    }
}

function toggleRemoveFile(kind) {
    removeCatalog = !removeCatalog;
    renderCurrentFiles();
}

// Picking a new catalogue cancels a pending "remove" (the new file replaces the old one)
function onFilePicked(kind) {
    removeCatalog = false;
    renderCurrentFiles();
}

function populateEditProduct(id) {
    const p = currentProducts.find(item => item.id === id);
    if (!p) return;

    editProdId = p.id;
    existingCatalogUrl = p.catalog_url || "";
    removeCatalog = false;
    removedImageUrls = [];
    imageItems = getProductImages(p).map(url => ({ type: 'existing', url }));

    document.getElementById('addProdName').value = p.name || '';
    document.getElementById('addProdCat').value = p.category || 'ERP Software';
    document.getElementById('addProdColor').value = p.color || '';
    document.getElementById('addProdQty').value = p.qty || '';
    const priceEl = document.getElementById('addProdPrice');
    if (priceEl) priceEl.value = (p.price !== null && p.price !== undefined) ? p.price : '';
    const ratingEl = document.getElementById('addProdRating');
    if (ratingEl) ratingEl.value = p.rating || 5.0;
    document.getElementById('addProdDesc').value = p.description || '';
    document.getElementById('addProdSpec').value = p.specifications || '';

    const imgInput = document.getElementById('addProdImageFile');
    if (imgInput) imgInput.value = '';
    const catInput = document.getElementById('addProdCatalogFile');
    if (catInput) catInput.value = '';
    renderImageManager();
    renderCurrentFiles();

    const statusEl = document.getElementById('addProdStatus');
    if (statusEl) statusEl.value = isActiveStatus(p.status) ? 'Active' : 'Inactive';

    document.getElementById('btnSaveProd').innerHTML = "<i class='fa-solid fa-save'></i> Update Product";
    document.getElementById('btnCancelProd').style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveProduct() {
    let name = document.getElementById('addProdName').value.trim();
    let cat = document.getElementById('addProdCat').value;
    let color = document.getElementById('addProdColor').value.trim();
    let qty = document.getElementById('addProdQty').value;
    const priceEl = document.getElementById('addProdPrice');
    let price = priceEl ? priceEl.value : '';
    const ratingEl = document.getElementById('addProdRating');
    let rating = ratingEl ? ratingEl.value : 5.0;
    let desc = document.getElementById('addProdDesc').value.trim();
    let spec = document.getElementById('addProdSpec').value.trim();
    const statusEl = document.getElementById('addProdStatus');
    let status = statusEl ? statusEl.value : 'Active';

    const catFileInput = document.getElementById('addProdCatalogFile');

    if (!name) return alert("Product Name is required!");
    if (!spec) return alert("Product Specification is required!");

    if (price !== '' && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
        return alert("Please enter a valid Price (0 or more), or leave it blank.");
    }

    if (imageItems.length === 0) {
        if (!editProdId) return alert("Please attach at least one Product Image.");
        if (!confirm("This product has no images. Save without any image?")) return;
    }

    const saveBtn = document.getElementById('btnSaveProd');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Uploading & Saving...";
    saveBtn.disabled = true;

    try {
        let finalCatalogUrl = existingCatalogUrl;
        const filesToDelete = [...removedImageUrls];

        // Upload new images, keeping the order shown in the image manager
        const finalImages = [];
        for (const it of imageItems) {
            if (it.type === 'existing') finalImages.push(it.url);
            else finalImages.push(await uploadFileToStorage(it.file, 'images'));
        }
        const finalImageUrl = finalImages[0] || "";

        if (catFileInput && catFileInput.files.length > 0) {
            finalCatalogUrl = await uploadFileToStorage(catFileInput.files[0], 'catalogues');
            if (existingCatalogUrl) filesToDelete.push(existingCatalogUrl);
        } else if (removeCatalog) {
            finalCatalogUrl = "";
            if (existingCatalogUrl) filesToDelete.push(existingCatalogUrl);
        }

        let payload = {
            name: name,
            category: cat,
            color: color,
            qty: qty ? parseInt(qty, 10) : null,
            price: price !== '' ? parseFloat(price) : null,
            rating: rating ? parseFloat(rating) : 5.0,
            description: desc,
            specifications: spec,
            image_url: finalImageUrl,
            images: finalImages,
            catalog_url: finalCatalogUrl,
            status: status
        };

        if (editProdId) {
            const { error } = await sb.from('products').update(payload).eq('id', editProdId);
            if (error) throw error;
            alert("Product Updated Successfully!");
        } else {
            const { error } = await sb.from('products').insert([payload]);
            if (error) throw error;
            alert("Product Added Successfully!");
        }

        await deleteStoredFiles(filesToDelete);
        cancelEdit('prod');
        fetchProducts();
        if (typeof fetchPublicData === 'function') fetchPublicData();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    }
}

async function fetchProducts() {
    if (!sb) return;
    const { data: products, error } = await sb
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    let t = document.getElementById('prodTbody');
    if (!t) return;
    t.innerHTML = '';

    if (error) {
        console.error("Products Fetch Error:", error.message);
        return;
    }

    currentProducts = products || [];

    currentProducts.forEach(p => {
        let row = document.createElement('tr');
        const imgs = getProductImages(p);
        const imgThumb = imgs.length > 0
            ? `<div class="thumb-box"><img src="${esc(imgs[0])}" alt="" onerror="this.onerror=null; this.src='https://placehold.co/56x56?text=No+Img';"></div>`
            : `<div class="thumb-box"><i class="fa-solid fa-image" style="font-size: 20px; color: #bbb;"></i></div>`;
        const photoCount = imgs.length > 1 ? `<div style="font-size:10px; color:#777; text-align:center;">${imgs.length} photos</div>` : '';

        const priceCell = (p.price && parseFloat(p.price) > 0)
            ? '<strong>₹' + Number(p.price).toLocaleString('en-IN') + '</strong>'
            : '<span style="color:#999;">On request</span>';
        const active = isActiveStatus(p.status);

        row.innerHTML = `
            <td>${imgThumb}${photoCount}</td>
            <td><strong>${esc(p.name)}</strong></td>
            <td>${esc(p.category || '-')}</td>
            <td>${priceCell}</td>
            <td>${p.qty || 0}</td>
            <td>${p.rating || 5.0} ⭐</td>
            <td style="white-space:nowrap;"><label class="switch" title="Show / hide on website"><input type="checkbox" class="status-toggle" ${active ? 'checked' : ''}><span class="slider"></span></label><span class="status-badge ${active ? 'status-active' : 'status-inactive'}">${active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-table-action btn-view-act" title="View"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-table-action btn-edit-act" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-table-action btn-delete-act" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;

        row.querySelector('.btn-view-act').addEventListener('click', () => window.open(imgs[0] || '#', '_blank'));
        row.querySelector('.btn-edit-act').addEventListener('click', () => populateEditProduct(p.id));
        row.querySelector('.btn-delete-act').addEventListener('click', () => deleteDoc('products', p.id));
        row.querySelector('.status-toggle').addEventListener('change', (e) => toggleStatus('products', p.id, e.target.checked));
        if (!active) row.style.opacity = '0.6';
        t.appendChild(row);
    });
}

// ====================================================
// 6. CAREERS CRUD (with Active/Inactive)
// ====================================================
let editJobId = null;
let currentJobs = [];

function populateEditJob(id) {
    const j = currentJobs.find(item => item.id === id);
    if (!j) return;

    editJobId = j.id;
    document.getElementById('addJobTitle').value = j.title || '';
    document.getElementById('addJobReq').value = j.openings || '';
    document.getElementById('addJobExp').value = j.exp || '';
    document.getElementById('addJobLoc').value = j.location || '';
    document.getElementById('addJobDesc').value = j.description || '';
    const statusEl = document.getElementById('addJobStatus');
    if (statusEl) statusEl.value = isActiveStatus(j.status) ? 'Active' : 'Inactive';
    document.getElementById('btnSaveJob').innerHTML = "<i class='fa-solid fa-save'></i> Update Job";
    document.getElementById('btnCancelJob').style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveJob() {
    let title = document.getElementById('addJobTitle').value.trim();
    let req = document.getElementById('addJobReq').value;
    let exp = document.getElementById('addJobExp').value.trim();
    let loc = document.getElementById('addJobLoc').value.trim();
    let desc = document.getElementById('addJobDesc').value.trim();
    const statusEl = document.getElementById('addJobStatus');

    if (!title || !desc) return alert("Title and Description are required!");
    let payload = {
        title: title,
        openings: req ? parseInt(req, 10) : 1,
        exp: exp,
        location: loc,
        description: desc,
        status: statusEl ? statusEl.value : "Active"
    };

    if (editJobId) {
        const { error } = await sb.from('jobs').update(payload).eq('id', editJobId);
        if (error) alert(error.message);
        else {
            alert("Job Updated!");
            cancelEdit('job');
            fetchJobs();
            if (typeof fetchPublicData === 'function') fetchPublicData();
        }
    } else {
        const { error } = await sb.from('jobs').insert([payload]);
        if (error) alert(error.message);
        else {
            alert("Job Posted!");
            cancelEdit('job');
            fetchJobs();
            if (typeof fetchPublicData === 'function') fetchPublicData();
        }
    }
}

async function fetchJobs() {
    if (!sb) return;
    const { data: jobs, error } = await sb
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

    let t = document.getElementById('jobTbody');
    if (!t) return;
    t.innerHTML = '';

    if (error) {
        console.error("Jobs Fetch Error:", error.message);
        return;
    }

    currentJobs = jobs || [];

    currentJobs.forEach(j => {
        let row = document.createElement('tr');
        const active = isActiveStatus(j.status);
        row.innerHTML = `
            <td><strong>${esc(j.title)}</strong></td>
            <td>${j.openings || 1}</td>
            <td>${esc(j.exp || '-')}</td>
            <td style="white-space:nowrap;"><label class="switch" title="Show / hide on website"><input type="checkbox" class="status-toggle" ${active ? 'checked' : ''}><span class="slider"></span></label><span class="status-badge ${active ? 'status-active' : 'status-inactive'}">${active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-table-action btn-view-act" title="View"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-table-action btn-edit-act" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-table-action btn-delete-act" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;

        row.querySelector('.btn-view-act').addEventListener('click', () => alert(`Job Title: ${j.title}\nDescription: ${j.description || 'N/A'}`));
        row.querySelector('.btn-edit-act').addEventListener('click', () => populateEditJob(j.id));
        row.querySelector('.btn-delete-act').addEventListener('click', () => deleteDoc('jobs', j.id));
        row.querySelector('.status-toggle').addEventListener('change', (e) => toggleStatus('jobs', j.id, e.target.checked));
        if (!active) row.style.opacity = '0.6';
        t.appendChild(row);
    });
}

// ====================================================
// 7. USER MANAGEMENT CRUD
// ====================================================
let editUserId = null;
let currentUsers = [];

function populateEditUser(id) {
    const u = currentUsers.find(item => item.id === id);
    if (!u) return;

    editUserId = u.id;
    document.getElementById('addUserName').value = u.name || '';
    document.getElementById('addUserEmail').value = u.email || '';
    document.getElementById('addUserEmail').disabled = true;
    document.getElementById('addUserPass').disabled = true;
    document.getElementById('addUserPass').placeholder = "Disabled during edit";
    document.getElementById('addUserRole').value = u.role || 'Only Manage Product';
    document.getElementById('btnSaveUser').innerHTML = "<i class='fa-solid fa-save'></i> Update User Role";
    document.getElementById('btnCancelUser').style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveUser() {
    let name = document.getElementById('addUserName').value.trim();
    let email = document.getElementById('addUserEmail').value.trim();
    let pass = document.getElementById('addUserPass').value;
    let role = document.getElementById('addUserRole').value;

    if (!name || (!editUserId && (!email || !pass))) return alert("All fields are required!");

    if (editUserId) {
        const { error } = await sb.from('users').update({ name: name, role: role }).eq('id', editUserId);
        if (error) alert(error.message);
        else {
            alert("User access updated!");
            cancelEdit('user');
            fetchUsers();
        }
    } else {
        if (pass.length < 6) return alert("Password min 6 chars.");

        // Separate, non-persisting client: otherwise signUp() would replace the admin's own login session
        const tmpClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        const { data: authData, error: authError } = await tmpClient.auth.signUp({
            email: email,
            password: pass
        });

        if (authError) return alert(authError.message);

        const userId = authData.user ? authData.user.id : crypto.randomUUID();
        const { error: dbError } = await sb.from('users').insert([{
            id: userId,
            name: name,
            email: email,
            role: role,
            status: "Active"
        }]);

        if (dbError) alert("User note: " + dbError.message);
        else alert("User Created Successfully!");

        cancelEdit('user');
        fetchUsers();
    }
}

async function fetchUsers() {
    if (!sb) return;
    const { data: users, error } = await sb
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    let t = document.getElementById('userTbody');
    if (!t) return;
    t.innerHTML = '';

    if (error) {
        console.error("Users Fetch Error:", error.message);
        return;
    }

    currentUsers = users || [];

    currentUsers.forEach(u => {
        let row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${esc(u.name)}</strong></td>
            <td>${esc(u.email)}</td>
            <td><span style="color:#007bb5; font-weight:600;">${esc(u.role)}</span></td>
            <td><span class="status-badge status-active">${esc(u.status || 'Active')}</span></td>
            <td>
                <button class="btn-table-action btn-view-act" title="View"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-table-action btn-edit-act" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-table-action btn-delete-act" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;

        row.querySelector('.btn-view-act').addEventListener('click', () => alert(`User: ${u.name}\nEmail: ${u.email}\nRole: ${u.role}`));
        row.querySelector('.btn-edit-act').addEventListener('click', () => populateEditUser(u.id));
        row.querySelector('.btn-delete-act').addEventListener('click', () => deleteDoc('users', u.id));
        t.appendChild(row);
    });
}

// ====================================================
// 8. HELPERS & GENERAL CLEANUP
// ====================================================
async function toggleStatus(col, id, makeActive) {
    const newStatus = makeActive ? 'Active' : 'Inactive';
    const { error } = await sb.from(col).update({ status: newStatus }).eq('id', id);
    if (error) alert("Could not update status: " + error.message);
    if (col === 'products') fetchProducts();
    if (col === 'jobs') fetchJobs();
    if (typeof fetchPublicData === 'function') fetchPublicData();
}

function cancelEdit(type) {
    if (type === 'prod') {
        editProdId = null;
        existingCatalogUrl = "";
        removeCatalog = false;
        removedImageUrls = [];
        imageItems.forEach(it => { if (it.type === 'new') URL.revokeObjectURL(it.preview); });
        imageItems = [];
        document.getElementById('addProdName').value = '';
        document.getElementById('addProdColor').value = '';
        document.getElementById('addProdQty').value = '';
        const priceEl = document.getElementById('addProdPrice');
        if (priceEl) priceEl.value = '';
        const ratingEl = document.getElementById('addProdRating');
        if (ratingEl) ratingEl.value = '5.0';
        const imgInput = document.getElementById('addProdImageFile');
        if (imgInput) imgInput.value = '';
        const catInput = document.getElementById('addProdCatalogFile');
        if (catInput) catInput.value = '';
        renderImageManager();
        renderCurrentFiles();
        document.getElementById('addProdDesc').value = '';
        document.getElementById('addProdSpec').value = '';
        const statusEl = document.getElementById('addProdStatus');
        if (statusEl) statusEl.value = 'Active';
        document.getElementById('btnSaveProd').innerHTML = '<i class="fa-solid fa-save"></i> Save Product';
        document.getElementById('btnCancelProd').style.display = 'none';
    }
    if (type === 'job') {
        editJobId = null;
        document.getElementById('addJobTitle').value = '';
        document.getElementById('addJobReq').value = '';
        document.getElementById('addJobExp').value = '';
        document.getElementById('addJobLoc').value = '';
        document.getElementById('addJobDesc').value = '';
        const statusEl = document.getElementById('addJobStatus');
        if (statusEl) statusEl.value = 'Active';
        document.getElementById('btnSaveJob').innerHTML = '<i class="fa-solid fa-upload"></i> Post Job';
        document.getElementById('btnCancelJob').style.display = 'none';
    }
    if (type === 'user') {
        editUserId = null;
        document.getElementById('addUserName').value = '';
        document.getElementById('addUserEmail').value = '';
        document.getElementById('addUserPass').value = '';
        document.getElementById('addUserEmail').disabled = false;
        document.getElementById('addUserPass').disabled = false;
        document.getElementById('addUserPass').placeholder = "Password (Min 6 chars)";
        document.getElementById('btnSaveUser').innerHTML = '<i class="fa-solid fa-plus"></i> Create User';
        document.getElementById('btnCancelUser').style.display = 'none';
    }
}

async function deleteDoc(col, id) {
    let msg = col === 'users' ? "Remove user access from Dashboard?" : "Permanently delete this record?";
    if (confirm(msg)) {
        const { error } = await sb.from(col).delete().eq('id', id);
        if (error) alert(error.message);
        else {
            if (col === 'products') { fetchProducts(); if (typeof fetchPublicData === 'function') fetchPublicData(); }
            if (col === 'jobs') { fetchJobs(); if (typeof fetchPublicData === 'function') fetchPublicData(); }
            if (col === 'users') fetchUsers();
            if (col === 'orders') fetchOrders();
            if (col === 'enquiries') fetchEnquiries();
        }
    }
}

// ====================================================
// 9. ORDERS & ENQUIRIES (from the website forms)
// ====================================================
let currentOrders = [];
let currentEnquiries = [];
const ORDER_STATUSES = ['New', 'Contacted', 'Quoted', 'Confirmed', 'Completed', 'Cancelled'];
const ENQUIRY_STATUSES = ['New', 'In Progress', 'Closed'];

function fmtDate(d) {
    try { return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return ''; }
}
function fmtMoney(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
}
function statusOptions(list, current) {
    return list.map(s => `<option ${s === current ? 'selected' : ''}>${s}</option>`).join('');
}
function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-block' : 'none';
}

function showDetailModal(title, html) {
    document.getElementById('detailTitle').innerHTML = title;
    document.getElementById('detailBody').innerHTML = html;
    document.getElementById('detailModal').style.display = 'flex';
}
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

async function updateRecordStatus(table, id, value) {
    const { error } = await sb.from(table).update({ status: value }).eq('id', id);
    if (error) alert("Could not update status: " + error.message);
    if (table === 'orders') fetchOrders();
    if (table === 'enquiries') fetchEnquiries();
}

// ---- Orders ----
async function fetchOrders() {
    if (!sb) return;
    const t = document.getElementById('orderTbody');
    if (!t) return;
    const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
    t.innerHTML = '';
    if (error) { console.error("Orders Fetch Error:", error.message); return; }

    currentOrders = data || [];
    setBadge('orderBadge', currentOrders.filter(o => o.status === 'New').length);

    if (currentOrders.length === 0) {
        t.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No orders yet.</td></tr>';
        return;
    }
    currentOrders.forEach(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${esc(o.order_no)}</strong></td>
            <td>${fmtDate(o.created_at)}</td>
            <td>${esc(o.customer_name)}<br><small style="color:#777;">${esc(o.phone)}</small></td>
            <td>${items.length}</td>
            <td>${Number(o.total) > 0 ? '<strong>' + fmtMoney(o.total) + '</strong>' : '<span style="color:#999;">Quote</span>'}</td>
            <td><select class="status-select">${statusOptions(ORDER_STATUSES, o.status || 'New')}</select></td>
            <td>
                <button class="btn-table-action btn-view-act" title="View"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-table-action btn-delete-act" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>`;
        row.querySelector('.status-select').addEventListener('change', (e) => updateRecordStatus('orders', o.id, e.target.value));
        row.querySelector('.btn-view-act').addEventListener('click', () => viewOrder(o.id));
        row.querySelector('.btn-delete-act').addEventListener('click', () => deleteDoc('orders', o.id));
        t.appendChild(row);
    });
}

function viewOrder(id) {
    const o = currentOrders.find(x => x.id === id);
    if (!o) return;
    const items = Array.isArray(o.items) ? o.items : [];
    const rows = items.map(i => `<tr><td>${esc(i.name)}</td><td style="text-align:center;">${esc(i.qty)}</td><td style="text-align:right;">${Number(i.price) > 0 ? fmtMoney(i.price * i.qty) : 'Quote'}</td></tr>`).join('');
    showDetailModal('Order ' + esc(o.order_no), `
        <p style="color:#777; margin:0 0 10px;">${fmtDate(o.created_at)} &middot; Status: <strong>${esc(o.status || 'New')}</strong></p>
        <p><strong>${esc(o.customer_name)}</strong>${o.company ? ' &middot; ' + esc(o.company) : ''}<br>
           Phone: ${esc(o.phone)} &middot; Email: ${esc(o.email)}<br>
           ${o.gstin ? 'GSTIN: ' + esc(o.gstin) + '<br>' : ''}
           ${esc(o.address || '')}, ${esc(o.city || '')}, ${esc(o.state || '')} - ${esc(o.pincode || '')}</p>
        <p>Payment: ${esc(o.payment_method || '-')}<br>Customer notes: ${esc(o.notes || '-')}</p>
        <table class="admin-table" style="margin-top:10px;">
            <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p style="text-align:right; margin-top:10px;">
            Subtotal: ${fmtMoney(o.subtotal)} &middot; GST: ${fmtMoney(o.gst)}<br>
            <strong style="font-size:16px;">Total: ${fmtMoney(o.total)}</strong>
        </p>
        <label style="font-weight:600; font-size:13px;">Internal notes</label>
        <textarea id="orderAdminNote" rows="3" style="width:100%; margin:6px 0 10px;">${esc(o.admin_notes || '')}</textarea>
        <button class="action-btn" style="width:auto;" onclick="saveOrderNote('${esc(o.id)}')"><i class="fa-solid fa-save"></i> Save note</button>`);
}

async function saveOrderNote(id) {
    const note = document.getElementById('orderAdminNote').value.trim();
    const { error } = await sb.from('orders').update({ admin_notes: note }).eq('id', id);
    if (error) return alert("Could not save note: " + error.message);
    alert("Note saved.");
    fetchOrders();
}

// ---- Enquiries / contact messages ----
async function fetchEnquiries() {
    if (!sb) return;
    const t = document.getElementById('msgTbody');
    if (!t) return;
    const { data, error } = await sb.from('enquiries').select('*').order('created_at', { ascending: false });
    t.innerHTML = '';
    if (error) { console.error("Enquiries Fetch Error:", error.message); return; }

    currentEnquiries = data || [];
    setBadge('msgBadge', currentEnquiries.filter(m => m.status === 'New').length);

    if (currentEnquiries.length === 0) {
        t.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No messages yet.</td></tr>';
        return;
    }
    currentEnquiries.forEach(m => {
        const row = document.createElement('tr');
        const msg = String(m.message || '');
        row.innerHTML = `
            <td>${fmtDate(m.created_at)}</td>
            <td><span class="status-badge ${m.type === 'enquiry' ? 'status-active' : 'status-inactive'}" style="background:#e8f1ff; color:#1e40af;">${esc(m.type)}</span></td>
            <td><strong>${esc(m.name)}</strong><br><small style="color:#777;">${esc(m.email || '')} ${esc(m.mobile || '')}</small></td>
            <td>${esc(msg.length > 70 ? msg.slice(0, 70) + '...' : msg)}</td>
            <td><select class="status-select">${statusOptions(ENQUIRY_STATUSES, m.status || 'New')}</select></td>
            <td>
                <button class="btn-table-action btn-view-act" title="View"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-table-action btn-delete-act" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>`;
        row.querySelector('.status-select').addEventListener('change', (e) => updateRecordStatus('enquiries', m.id, e.target.value));
        row.querySelector('.btn-view-act').addEventListener('click', () => viewEnquiry(m.id));
        row.querySelector('.btn-delete-act').addEventListener('click', () => deleteDoc('enquiries', m.id));
        t.appendChild(row);
    });
}

function viewEnquiry(id) {
    const m = currentEnquiries.find(x => x.id === id);
    if (!m) return;
    showDetailModal('Message from ' + esc(m.name), `
        <p style="color:#777; margin:0 0 10px;">${fmtDate(m.created_at)} &middot; ${esc(m.type)} &middot; Status: <strong>${esc(m.status || 'New')}</strong></p>
        <p>Email: ${esc(m.email || '-')}<br>Mobile: ${esc(m.mobile || '-')}<br>
           ${m.company ? 'Company: ' + esc(m.company) + '<br>' : ''}${m.service ? 'Service: ' + esc(m.service) + '<br>' : ''}</p>
        <div style="background:#f8fbf9; border:1px solid #dbe8e0; border-radius:8px; padding:12px; white-space:pre-wrap;">${esc(m.message)}</div>`);
}

function initPortal() {
    // each step on its own, so one failing step can never leave the captcha stuck on "Loading..."
    [loadDefaultAdminTheme, generateCaptcha, renderImageManager].forEach(function (fn) {
        try { fn(); } catch (e) { console.error(fn.name + ' failed:', e); }
    });
    if (!sb) {
        const box = document.getElementById('loginError');
        if (box) {
            box.style.display = 'block';
            box.innerText = 'Could not load the Supabase library. Check your internet connection or ad-blocker and refresh.';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortal);
} else {
    initPortal();
}
