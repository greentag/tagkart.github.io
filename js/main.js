// ====================================================
// 1. SUPABASE CLIENT INITIALIZATION
// ====================================================
const SUPABASE_URL = "https://yuyndtoqcwawlhrjespt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eW5kdG9xY3dhd2xocmplc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDkzOTIsImV4cCI6MjEwNjA4NTM5Mn0.TJ1DuBlYANnTNogfbt5WB64UsxNjVUyNkLR2gpHqNR0";

const sb = (typeof window.supabase !== 'undefined' && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ---- Shop settings (apne hisaab se change karo) ----
const ENQUIRY_WHATSAPP = "919999999999";          // country code ke saath, + ke bina
const ENQUIRY_EMAIL = "sales@dhamigroup.com";
const DEFAULT_CATEGORIES = ["ERP Software", "Hardware", "Service"];

let allProductsCache = [];   // Global cache for filtering
let cart = [];               // [{id, name, qty}]

// Current filter state (re-render ke baad bhi bacha rehta hai)
const filterState = {
    cats: [],        // empty = All
    stocks: [],      // empty = All  ('in-stock' / 'out-stock')
    rating: 0,
    search: '',
    sort: 'latest'
};

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatImageUrl(url) {
    if (!url) return "";
    let cleanUrl = url.trim();
    if (cleanUrl.includes("drive.google.com/file/d/")) {
        let fileId = cleanUrl.split("/file/d/")[1].split("/")[0];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return cleanUrl;
}

function isOutOfStockItem(p) {
    return (!p.qty || parseInt(p.qty, 10) <= 0);
}

// ====================================================
// 2. LIVE SYNC: PRODUCTS & JOBS FETCH
// ====================================================
async function fetchPublicData() {
    if (!sb) {
        console.warn("Supabase SDK ready nahi hai.");
        return;
    }

    // A. Products
    try {
        const { data: products, error: prodErr } = await sb
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (prodErr) console.error("Products error:", prodErr);

        if (products) {
            allProductsCache = products.filter(p => p.status !== 'Hidden');
            renderShopLayout();
        }
    } catch (e) {
        console.error("Products render error:", e);
    }

    // B. Jobs
    try {
        const { data: jobs, error: jobErr } = await sb
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });

        let jobContainer = document.getElementById('publicJobsContainer');
        if (jobContainer) {
            jobContainer.innerHTML = '';
            if (jobs && jobs.length > 0) {
                jobs.forEach(j => {
                    jobContainer.innerHTML += `
                        <div style="border-left: 5px solid var(--primary-color, #1b8a4f); background: var(--bg-main, #f0f7f3); padding: 22px; margin-top: 18px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            <h4 style="color: var(--primary-hover, #0d5c34); font-size: 18px; margin-bottom: 6px;">${escapeHtml(j.title)}</h4>
                            <p style="font-size: 13.5px; margin-bottom: 8px; color: var(--text-main, #333);">
                                <strong>Openings:</strong> ${escapeHtml(j.openings || 1)} &nbsp;|&nbsp;
                                <strong>Experience:</strong> ${escapeHtml(j.exp || 'Not specified')} &nbsp;|&nbsp;
                                <strong>Location:</strong> ${escapeHtml(j.location || 'Delhi')}
                            </p>
                            <p style="font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 12px;">${j.description ? escapeHtml(j.description).replace(/\n/g, '<br>') : ''}</p>
                            <a href="mailto:careers@dhamigroup.com?subject=Application for ${encodeURIComponent(j.title)}" style="display: inline-block; background: var(--primary-color, #1b8a4f); color: #fff; padding: 8px 18px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: 600;">Apply Now</a>
                        </div>
                    `;
                });
            } else {
                jobContainer.innerHTML = '<p style="color: #666; font-size: 14px;">No active openings right now. Send your CV to careers@dhamigroup.com.</p>';
            }
        }
    } catch (e) {
        console.error("Jobs render error:", e);
    }
}

// ====================================================
// 2B. SHOP LAYOUT + FILTERS (WIDE LAYOUT)
// ====================================================
function injectShopStyles() {
    if (document.getElementById('shopInjectedStyles')) return;
    const st = document.createElement('style');
    st.id = 'shopInjectedStyles';
    st.textContent = `
        .shop-wrap { display:flex; gap:30px; width:96%; max-width:1500px; margin:20px auto 0 auto; align-items:flex-start; text-align:left; }
        .shop-sidebar { width:290px; flex-shrink:0; background:#fff; padding:20px; border-radius:12px; border:1px solid #eaeaea; box-shadow:0 2px 8px rgba(0,0,0,0.03); position:sticky; top:90px; }
        .shop-main { flex:1; min-width:0; }
        .shop-toolbar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:16px; background:#fff; border:1px solid #eaeaea; border-radius:12px; padding:12px 16px; }
        .shop-toolbar input[type=text], .shop-toolbar select { padding:9px 12px; border:1px solid #ccc; border-radius:6px; font-size:13px; }
        .shop-toolbar input[type=text] { flex:1; min-width:180px; }
        .shop-btn { border:none; border-radius:6px; padding:9px 16px; font-size:13px; font-weight:600; cursor:pointer; color:#fff; }
        .shop-btn.primary { background:#1b8a4f; }
        .shop-btn.secondary { background:#777; }
        .shop-btn.orange { background:#e34f26; }
        #cartFab { position:fixed; right:22px; bottom:80px; z-index:9998; background:#e34f26; color:#fff; border:none; border-radius:50px; padding:12px 20px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,0.25); }
        #cartModal { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; display:none; align-items:center; justify-content:center; padding:16px; }
        #cartModal .cart-box { background:#fff; color:#333; width:100%; max-width:560px; max-height:85vh; overflow:auto; border-radius:14px; padding:22px; }
        .cart-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid #eee; font-size:14px; }
        .cart-qty button { width:26px; height:26px; border:1px solid #ccc; background:#f7f7f7; border-radius:4px; cursor:pointer; }
        @media (max-width: 900px) {
            .shop-wrap { flex-direction:column; width:98%; }
            .shop-sidebar { width:100%; position:static; }
        }
    `;
    document.head.appendChild(st);
}

function getAllCategories() {
    const set = new Set(DEFAULT_CATEGORIES);
    allProductsCache.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
}

function renderShopLayout() {
    let prodContainer = document.getElementById('publicProductsContainer');
    if (!prodContainer) return;
    injectShopStyles();

    const cats = getAllCategories();
    const catChecked = v => (filterState.cats.length === 0 ? v === 'all' : filterState.cats.includes(v)) ? 'checked' : '';
    const stockChecked = v => (filterState.stocks.length === 0 ? v === 'all' : filterState.stocks.includes(v)) ? 'checked' : '';
    const sel = (a, b) => a === b ? 'selected' : '';

    prodContainer.innerHTML = `
        <div class="shop-wrap">

            <!-- SIDEBAR FILTERS -->
            <div class="shop-sidebar">
                <h3 style="font-size: 18px; color: #0d5c34; margin-bottom: 15px; border-bottom: 2px solid #1b8a4f; padding-bottom: 8px;">Filters</h3>

                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 14px; color: #333; margin-bottom: 10px;">Categories</h4>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-cat" value="all" ${catChecked('all')} onchange="onFilterToggle(this,'filter-cat')"> All Categories</label>
                    ${cats.map(c => `<label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-cat" value="${escapeHtml(c)}" ${catChecked(c)} onchange="onFilterToggle(this,'filter-cat')"> ${escapeHtml(c)}</label>`).join('')}
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 14px; color: #333; margin-bottom: 10px;">Product Status</h4>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-stock" value="all" ${stockChecked('all')} onchange="onFilterToggle(this,'filter-stock')"> All Status</label>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-stock" value="in-stock" ${stockChecked('in-stock')} onchange="onFilterToggle(this,'filter-stock')"> In Stock</label>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-stock" value="out-stock" ${stockChecked('out-stock')} onchange="onFilterToggle(this,'filter-stock')"> Out of Stock</label>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 14px; color: #333; margin-bottom: 10px;">Minimum Rating</h4>
                    <select id="filterRating" onchange="applyFilters()" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:13px;">
                        <option value="0" ${sel(filterState.rating, 0)}>All Ratings</option>
                        <option value="4" ${sel(filterState.rating, 4)}>4 Stars &amp; Above</option>
                        <option value="5" ${sel(filterState.rating, 5)}>5 Stars Only</option>
                    </select>
                </div>

                <div style="display:flex; gap:8px;">
                    <button class="shop-btn primary" style="flex:1;" onclick="applyFilters()">Apply Filters</button>
                    <button class="shop-btn secondary" style="flex:1;" onclick="resetFilters()">Reset</button>
                </div>
            </div>

            <!-- MAIN AREA -->
            <div class="shop-main">
                <div class="shop-toolbar">
                    <input type="text" id="shopSearch" placeholder="Search products..." value="${escapeHtml(filterState.search)}" oninput="applyFilters()">
                    <select id="shopSort" onchange="applyFilters()">
                        <option value="latest" ${sel(filterState.sort, 'latest')}>Sort: Latest</option>
                        <option value="name-asc" ${sel(filterState.sort, 'name-asc')}>Name A → Z</option>
                        <option value="name-desc" ${sel(filterState.sort, 'name-desc')}>Name Z → A</option>
                        <option value="rating" ${sel(filterState.sort, 'rating')}>Rating (High → Low)</option>
                        <option value="qty" ${sel(filterState.sort, 'qty')}>Quantity (High → Low)</option>
                    </select>
                    <span id="shopCount" style="font-size:13px; color:#555;"></span>
                </div>
                <div id="productsListArea" style="display:flex; flex-direction:column; gap:16px;"></div>
            </div>
        </div>
    `;

    ensureCartUI();
    applyFilters();
}

// "All" checkbox ka logic: specific select karo to All hat jaye, sab hata do to All wapas aa jaye
function onFilterToggle(el, groupClass) {
    const boxes = Array.from(document.querySelectorAll('.' + groupClass));
    const allBox = boxes.find(b => b.value === 'all');

    if (el.value === 'all') {
        if (el.checked) boxes.forEach(b => { if (b !== el) b.checked = false; });
        else el.checked = true; // All ko uncheck nahi kar sakte
    } else {
        if (allBox) allBox.checked = false;
        if (!boxes.some(b => b.checked) && allBox) allBox.checked = true;
    }
    applyFilters();
}

function resetFilters() {
    filterState.cats = [];
    filterState.stocks = [];
    filterState.rating = 0;
    filterState.search = '';
    filterState.sort = 'latest';
    renderShopLayout();
}

// FILTER LOGIC
function applyFilters() {
    // Read UI -> state
    const catBoxes = document.querySelectorAll('.filter-cat');
    const stockBoxes = document.querySelectorAll('.filter-stock');
    if (catBoxes.length) {
        filterState.cats = Array.from(catBoxes).filter(el => el.checked && el.value !== 'all').map(el => el.value);
    }
    if (stockBoxes.length) {
        filterState.stocks = Array.from(stockBoxes).filter(el => el.checked && el.value !== 'all').map(el => el.value);
    }
    const ratingEl = document.getElementById('filterRating');
    const searchEl = document.getElementById('shopSearch');
    const sortEl = document.getElementById('shopSort');
    if (ratingEl) filterState.rating = parseFloat(ratingEl.value) || 0;
    if (searchEl) filterState.search = searchEl.value.trim();
    if (sortEl) filterState.sort = sortEl.value;

    const q = filterState.search.toLowerCase();

    let filtered = allProductsCache.filter(p => {
        const matchCat = filterState.cats.length === 0 || filterState.cats.includes(p.category);

        const out = isOutOfStockItem(p);
        const matchStock = filterState.stocks.length === 0 ||
            (filterState.stocks.includes('in-stock') && !out) ||
            (filterState.stocks.includes('out-stock') && out);

        const pRating = p.rating ? parseFloat(p.rating) : 5.0;
        const matchRating = pRating >= filterState.rating;

        const matchSearch = !q ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.specifications || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q);

        return matchCat && matchStock && matchRating && matchSearch;
    });

    // Sorting (default order = created_at desc jo DB se aata hai)
    const rate = p => (p.rating ? parseFloat(p.rating) : 5.0);
    if (filterState.sort === 'name-asc') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (filterState.sort === 'name-desc') filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    else if (filterState.sort === 'rating') filtered.sort((a, b) => rate(b) - rate(a));
    else if (filterState.sort === 'qty') filtered.sort((a, b) => (parseInt(b.qty, 10) || 0) - (parseInt(a.qty, 10) || 0));

    renderProductCards(filtered);

    const countEl = document.getElementById('shopCount');
    if (countEl) countEl.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'} found`;
}

function renderProductCards(products) {
    let listArea = document.getElementById('productsListArea');
    if (!listArea) return;

    if (!products || products.length === 0) {
        listArea.innerHTML = '<div style="background:#fff; padding:30px; border-radius:12px; text-align:center; color:#666; font-size:14px; border:1px solid #eaeaea;">No products match your filter criteria.</div>';
        return;
    }

    listArea.innerHTML = products.map(p => {
        let directImg = formatImageUrl(p.image_url);
        let imgTag = directImg
            ? `<img src="${escapeHtml(directImg)}" style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid #eaeaea;" onerror="this.onerror=null; this.src='https://placehold.co/110x110?text=No+Image';">`
            : `<div style="width:110px; height:110px; display:flex; align-items:center; justify-content:center; background:#f0f7f3; border-radius:8px;"><i class="fa-solid fa-boxes-stacked" style="font-size:30px; color:#1b8a4f;"></i></div>`;

        let out = isOutOfStockItem(p);
        let stockBadge = out
            ? `<span style="font-size:13px; font-weight:700; color:#e34f26;">Out of Stock</span>`
            : `<span style="font-size:13px; font-weight:700; color:#1b8a4f;">In Stock</span>`;

        let ratingVal = p.rating ? parseFloat(p.rating) : 5.0;
        let fullStars = Math.max(0, Math.min(5, Math.round(ratingVal)));
        let stars = '<i class="fa-solid fa-star"></i>'.repeat(fullStars) + '<i class="fa-regular fa-star"></i>'.repeat(5 - fullStars);

        let catalogBtn = p.catalog_url
            ? `<a href="${escapeHtml(p.catalog_url)}" target="_blank" rel="noopener" style="background:#1b8a4f; color:#fff; padding:8px 14px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; display:inline-block; margin-bottom:6px;"><i class="fa-solid fa-download"></i> Catalogue</a><br>`
            : '';

        let shopBtn = `<button class="shop-btn" style="background:${out ? '#ccc' : '#e34f26'}; cursor:${out ? 'not-allowed' : 'pointer'};" ${out ? 'disabled' : ''} onclick="addToCart('${escapeHtml(String(p.id))}')"><i class="fa-solid fa-cart-plus"></i> Shop Now</button>`;

        return `
            <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #dbe8e0; border-radius:12px; padding:18px 22px; box-shadow:0 3px 10px rgba(0,0,0,0.04); gap:20px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:20px; flex:1; min-width:260px;">
                    <div style="position:relative;">
                        <span style="position:absolute; top:-6px; left:-6px; background:#1b8a4f; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">NEW</span>
                        ${imgTag}
                    </div>
                    <div>
                        <h4 style="margin:0 0 6px 0; color:#0d5c34; font-size:16px; font-weight:600;">${escapeHtml(p.name)}</h4>
                        <div style="color:#f59e0b; font-size:12px; margin-bottom:6px;">${stars} <span style="color:#777; font-size:11px;">(${ratingVal})</span></div>
                        <p style="font-size:12.5px; color:#555; margin:0 0 8px 0; line-height:1.4;">${escapeHtml(p.specifications || 'Standard quality product with reliable performance.')}</p>
                        <div style="display:flex; gap:8px;">
                            <span style="background:#f0f7f3; color:#1b8a4f; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:600;">${escapeHtml(p.category || 'General')}</span>
                            <span style="background:#f0f7f3; color:#555; font-size:11px; padding:2px 8px; border-radius:4px;">Qty: ${escapeHtml(p.qty || 0)}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right; min-width:140px;">
                    <div style="margin-bottom:10px;">${stockBadge}</div>
                    ${catalogBtn}
                    ${shopBtn}
                </div>
            </div>
        `;
    }).join('');
}

// ====================================================
// 2C. CART / SHOP NOW (enquiry via WhatsApp / Email)
// ====================================================
function loadCart() {
    try {
        const saved = localStorage.getItem('dg_cart');
        cart = saved ? JSON.parse(saved) : [];
    } catch (e) { cart = []; }
}

function saveCart() {
    try { localStorage.setItem('dg_cart', JSON.stringify(cart)); } catch (e) { /* ignore */ }
    updateCartBadge();
}

function addToCart(id) {
    const p = allProductsCache.find(x => String(x.id) === String(id));
    if (!p || isOutOfStockItem(p)) return;
    const max = parseInt(p.qty, 10) || 1;
    const existing = cart.find(c => String(c.id) === String(id));
    if (existing) {
        if (existing.qty < max) existing.qty += 1;
    } else {
        cart.push({ id: String(p.id), name: p.name, qty: 1 });
    }
    saveCart();
    openCart();
}

function changeCartQty(id, delta) {
    const item = cart.find(c => String(c.id) === String(id));
    if (!item) return;
    const p = allProductsCache.find(x => String(x.id) === String(id));
    const max = p ? (parseInt(p.qty, 10) || 1) : 9999;
    item.qty = Math.max(0, Math.min(max, item.qty + delta));
    if (item.qty === 0) cart = cart.filter(c => String(c.id) !== String(id));
    saveCart();
    renderCart();
}

function clearCart() {
    cart = [];
    saveCart();
    renderCart();
}

function ensureCartUI() {
    if (!document.getElementById('cartFab')) {
        const fab = document.createElement('button');
        fab.id = 'cartFab';
        fab.onclick = openCart;
        document.body.appendChild(fab);
    }
    if (!document.getElementById('cartModal')) {
        const modal = document.createElement('div');
        modal.id = 'cartModal';
        modal.onclick = (e) => { if (e.target === modal) closeCart(); };
        modal.innerHTML = '<div class="cart-box" id="cartBox"></div>';
        document.body.appendChild(modal);
    }
    updateCartBadge();
}

function updateCartBadge() {
    const fab = document.getElementById('cartFab');
    if (!fab) return;
    const total = cart.reduce((s, c) => s + c.qty, 0);
    fab.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> Cart (${total})`;
}

function openCart() {
    ensureCartUI();
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
}

function closeCart() {
    const m = document.getElementById('cartModal');
    if (m) m.style.display = 'none';
}

function renderCart() {
    const box = document.getElementById('cartBox');
    if (!box) return;

    if (cart.length === 0) {
        box.innerHTML = `
            <h3 style="color:#0d5c34; margin-bottom:12px;">Your Cart</h3>
            <p style="color:#666; font-size:14px;">Cart khali hai. Products se "Shop Now" dabao.</p>
            <div style="text-align:right; margin-top:16px;"><button class="shop-btn secondary" onclick="closeCart()">Close</button></div>`;
        return;
    }

    box.innerHTML = `
        <h3 style="color:#0d5c34; margin-bottom:12px;">Your Cart</h3>
        ${cart.map(c => `
            <div class="cart-row">
                <span style="flex:1;">${escapeHtml(c.name)}</span>
                <span class="cart-qty">
                    <button onclick="changeCartQty('${escapeHtml(c.id)}', -1)">−</button>
                    <strong style="margin:0 8px;">${c.qty}</strong>
                    <button onclick="changeCartQty('${escapeHtml(c.id)}', 1)">+</button>
                </span>
            </div>`).join('')}
        <h4 style="margin:18px 0 8px 0; font-size:14px; color:#333;">Your Details</h4>
        <input id="cartName" type="text" placeholder="Name" style="width:100%; padding:9px; border:1px solid #ccc; border-radius:6px; margin-bottom:8px;">
        <input id="cartPhone" type="text" placeholder="Phone" style="width:100%; padding:9px; border:1px solid #ccc; border-radius:6px; margin-bottom:8px;">
        <input id="cartCompany" type="text" placeholder="Company (optional)" style="width:100%; padding:9px; border:1px solid #ccc; border-radius:6px; margin-bottom:14px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <button class="shop-btn secondary" onclick="clearCart()">Clear</button>
            <button class="shop-btn secondary" onclick="closeCart()">Continue Shopping</button>
            <button class="shop-btn orange" onclick="sendEnquiry('email')"><i class="fa-solid fa-envelope"></i> Email</button>
            <button class="shop-btn primary" onclick="sendEnquiry('whatsapp')"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button>
        </div>`;
}

function sendEnquiry(channel) {
    if (cart.length === 0) return;
    const name = (document.getElementById('cartName') || {}).value || '';
    const phone = (document.getElementById('cartPhone') || {}).value || '';
    const company = (document.getElementById('cartCompany') || {}).value || '';

    if (!name.trim() || !phone.trim()) {
        alert('Please Name aur Phone fill karo.');
        return;
    }

    const lines = cart.map((c, i) => `${i + 1}. ${c.name} x ${c.qty}`).join('\n');
    const msg = `New Product Enquiry\n\nName: ${name}\nPhone: ${phone}\nCompany: ${company || '-'}\n\nItems:\n${lines}`;

    if (channel === 'whatsapp') {
        window.open(`https://wa.me/${ENQUIRY_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
        window.location.href = `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent('Product Enquiry')}&body=${encodeURIComponent(msg)}`;
    }
}

// ====================================================
// 3. NAVIGATION & TAB SWITCHING
// ====================================================
function showHome() {
    const homeEl = document.getElementById('homePage');
    const tabEl = document.getElementById('tabContainer');
    if (homeEl) homeEl.style.display = 'block';
    if (tabEl) tabEl.style.display = 'none';

    let bgAbout = document.getElementById('aboutFullscreenBg');
    if (bgAbout) bgAbout.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectTab(tabName) {
    const homeEl = document.getElementById('homePage');
    const tabEl = document.getElementById('tabContainer');
    if (homeEl) homeEl.style.display = 'none';
    if (tabEl) tabEl.style.display = 'block';

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    let activePanel = document.getElementById('panel-' + tabName);

    if (activePanel) {
        activePanel.classList.add('active');

        let bgAbout = document.getElementById('aboutFullscreenBg');
        if (tabName === 'about') {
            if (bgAbout) bgAbout.style.display = 'block';
        } else {
            if (bgAbout) bgAbout.style.display = 'none';
        }

        if (['product', 'shop', 'career', 'serv-erp', 'serv-crm'].includes(tabName)) {
            fetchPublicData();
        }

        // Cart button sirf product/shop tab par dikhao
        const fab = document.getElementById('cartFab');
        if (fab) fab.style.display = (tabName === 'product' || tabName === 'shop') ? 'block' : 'none';

        if (tabName === 'contact' || tabName === 'about') {
            let animatedItems = activePanel.querySelectorAll('.animate-text');
            animatedItems.forEach(item => {
                item.style.animation = 'none';
                item.offsetHeight;
                item.style.animation = null;
            });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ====================================================
// 4. 3D CAROUSEL CONTROLLER
// ====================================================
let carouselSpinner = document.getElementById('carouselSpinner');
let carouselScene = document.getElementById('carouselScene');
let currentAngle = 0;
let startX = 0;
let isDraggingCarousel = false;
let didDrag = false;

function moveCarousel(direction) {
    if (!carouselSpinner) carouselSpinner = document.getElementById('carouselSpinner');
    if (!carouselSpinner) return;
    currentAngle += direction * 72;
    carouselSpinner.style.transform = `rotateY(${currentAngle}deg)`;
}

let autoRotate = setInterval(() => { moveCarousel(-1); }, 5000);

function resetAutoRotate() {
    clearInterval(autoRotate);
    autoRotate = setInterval(() => { moveCarousel(-1); }, 5000);
}

if (carouselScene) {
    carouselScene.addEventListener('mousedown', (e) => {
        isDraggingCarousel = true;
        didDrag = false;
        startX = e.clientX;
        resetAutoRotate();
    });
    window.addEventListener('mouseup', (e) => {
        if (!isDraggingCarousel) return;
        isDraggingCarousel = false;
        let endX = e.clientX;
        let diff = startX - endX;
        if (Math.abs(diff) > 50) {
            didDrag = true;
            if (diff > 0) moveCarousel(-1);
            else moveCarousel(1);
        }
    });
    carouselScene.addEventListener('touchstart', (e) => {
        isDraggingCarousel = true;
        didDrag = false;
        startX = e.touches[0].clientX;
        resetAutoRotate();
    });
    window.addEventListener('touchend', (e) => {
        if (!isDraggingCarousel) return;
        isDraggingCarousel = false;
        let endX = e.changedTouches[0].clientX;
        let diff = startX - endX;
        if (Math.abs(diff) > 50) {
            didDrag = true;
            if (diff > 0) moveCarousel(-1);
            else moveCarousel(1);
        }
    });
}

function handleCardClick(tabName) {
    if (!didDrag) {
        selectTab(tabName);
    }
}

// ====================================================
// 5. SCROLL TO TOP & HERO AUTO-SLIDER
// ====================================================
let topBtn = document.getElementById("scrollTopBtn");
window.onscroll = function() {
    if (!topBtn) topBtn = document.getElementById("scrollTopBtn");
    if (!topBtn) return;
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

let currentHeroSlide = 1;
const totalHeroSlides = 5;
setInterval(() => {
    document.querySelectorAll('.service-slide').forEach(slide => { slide.classList.remove('active'); });
    currentHeroSlide = currentHeroSlide >= totalHeroSlides ? 1 : currentHeroSlide + 1;
    let el = document.getElementById('h-slide-' + currentHeroSlide);
    if (el) el.classList.add('active');
}, 3000);

// ====================================================
// 6. THEMES & COLOR LOGIC
// ====================================================
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const bulb = document.getElementById('bulbIcon');

    if (isDark) {
        if (bulb) {
            bulb.classList.remove('fa-regular');
            bulb.classList.add('fa-solid');
        }
    } else {
        if (bulb) {
            bulb.classList.remove('fa-solid');
            bulb.classList.add('fa-regular');
        }
    }
}

function selectPresetTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);

    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--primary-hover');
    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--glow-color');

    const select = document.getElementById('themeSelect');
    if (select) select.value = themeName;
}

function applyCustomColor(hexColor) {
    const hoverColor = adjustBrightness(hexColor, -20);
    document.documentElement.style.setProperty('--primary-color', hexColor);
    document.documentElement.style.setProperty('--primary-hover', hoverColor);
    document.documentElement.style.setProperty('--accent-color', hexColor);
    document.documentElement.style.setProperty('--glow-color', hexColor);

    const picker = document.getElementById('customColorPicker');
    if (picker) picker.value = hexColor;
}

function adjustBrightness(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = ((num >> 8) & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}

function loadDefaultTheme() {
    selectPresetTheme('emerald');
}

// ====================================================
// 7. INITIALIZE ON DOM READY
// ====================================================
window.addEventListener('DOMContentLoaded', () => {
    loadDefaultTheme();
    loadCart();
    if (typeof changeLanguage === 'function') {
        changeLanguage('en');
    }
    fetchPublicData();
});
