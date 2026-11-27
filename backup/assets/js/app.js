const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyFmP_-KqHaGnNr79Vf2K0sYEKKCkHxco6rwZ9bO7qDLuon6fzGIO0O_VfvNlCnFx5kkw/exec',
  CURRENCY: 'USD',
  LOCALE: 'en-US',
  USE_SAMPLE_DATA_IF_OFFLINE: true
};

const SAMPLE_PRODUCTS = [
  {
    "id": "PRD-0001",
    "name": "Aeron Executive Ergonomic Chair",
    "category": "Furniture",
    "brand": "Herman Miller",
    "sku": "HM-AER-EXE",
    "price": 1250.0,
    "stock": 15,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80",
    "description": "Premium ergonomic task chair with breathable mesh, posture support, and executive finish.",
    "tags": "chair,ergonomic,office,premium",
    "createdAt": "2026-05-01",
    "updatedAt": "2026-05-24"
  },
  {
    "id": "PRD-0002",
    "name": "Velocity 16 Pro Laptop",
    "category": "Electronics",
    "brand": "Apex Systems",
    "sku": "APX-V16-32",
    "price": 2499.0,
    "stock": 28,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    "description": "High-performance workstation laptop for design, development, analytics, and enterprise workloads.",
    "tags": "laptop,workstation,computer,pro",
    "createdAt": "2026-05-02",
    "updatedAt": "2026-05-23"
  },
  {
    "id": "PRD-0003",
    "name": "MX Master 3S Wireless Mouse",
    "category": "Accessories",
    "brand": "Logitech",
    "sku": "LOG-MX3S-BLK",
    "price": 99.99,
    "stock": 120,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80",
    "description": "Silent click productivity mouse with ergonomic grip and multi-device controls.",
    "tags": "mouse,wireless,accessory",
    "createdAt": "2026-05-03",
    "updatedAt": "2026-05-22"
  },
  {
    "id": "PRD-0004",
    "name": "NoiseFocus ANC Headset",
    "category": "Electronics",
    "brand": "Sony",
    "sku": "SONY-NF-ANC",
    "price": 398.0,
    "stock": 8,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80",
    "description": "Enterprise-grade active noise cancelling headset for focused calls and travel.",
    "tags": "headset,audio,noise cancelling",
    "createdAt": "2026-05-04",
    "updatedAt": "2026-05-21"
  },
  {
    "id": "PRD-0005",
    "name": "RisePro Standing Desk Converter",
    "category": "Furniture",
    "brand": "FlexiDesk",
    "sku": "FD-RISE-PRO",
    "price": 199.5,
    "stock": 35,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1595514535313-09756b107cb5?auto=format&fit=crop&w=900&q=80",
    "description": "Adjustable sit-stand desk riser with smooth pneumatic lift and cable slots.",
    "tags": "desk,standing,furniture",
    "createdAt": "2026-05-05",
    "updatedAt": "2026-05-20"
  },
  {
    "id": "PRD-0006",
    "name": "Smart Meeting Notebook Pack",
    "category": "Stationery",
    "brand": "Moleskine",
    "sku": "MOL-SMART-3",
    "price": 34.9,
    "stock": 200,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1531346878377-244bb1c855a8?auto=format&fit=crop&w=900&q=80",
    "description": "Premium notebooks for meeting notes, action items, sketches, and planning.",
    "tags": "notebook,stationery,meeting",
    "createdAt": "2026-05-06",
    "updatedAt": "2026-05-19"
  },
  {
    "id": "PRD-0007",
    "name": "UltraSharp 32 4K Monitor",
    "category": "Electronics",
    "brand": "Dell",
    "sku": "DEL-U32-4K",
    "price": 749.0,
    "stock": 18,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80",
    "description": "Color-accurate 32-inch 4K monitor for executive desks and creative teams.",
    "tags": "monitor,display,4k",
    "createdAt": "2026-05-07",
    "updatedAt": "2026-05-18"
  },
  {
    "id": "PRD-0008",
    "name": "Executive Desk Organizer Set",
    "category": "Stationery",
    "brand": "Nexus Office",
    "sku": "NX-DESK-ORG",
    "price": 47.5,
    "stock": 88,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    "description": "Minimal metal-and-wood organizer set for clean executive workstations.",
    "tags": "organizer,desk,stationery",
    "createdAt": "2026-05-08",
    "updatedAt": "2026-05-17"
  },
  {
    "id": "PRD-0009",
    "name": "Conference Room Camera 4K",
    "category": "Electronics",
    "brand": "Logitech",
    "sku": "LOG-MEET-4K",
    "price": 899.0,
    "stock": 12,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=900&q=80",
    "description": "Smart 4K conference camera with auto-framing and integrated room audio.",
    "tags": "camera,conference,meeting,4k",
    "createdAt": "2026-05-09",
    "updatedAt": "2026-05-16"
  },
  {
    "id": "PRD-0010",
    "name": "Modular Collaboration Sofa",
    "category": "Furniture",
    "brand": "WorkLounge",
    "sku": "WL-SOFA-MOD",
    "price": 1399.0,
    "stock": 6,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
    "description": "Modular seating for breakout areas, visitor lounges, and collaborative spaces.",
    "tags": "sofa,lounge,furniture",
    "createdAt": "2026-05-10",
    "updatedAt": "2026-05-15"
  },
  {
    "id": "PRD-0011",
    "name": "Secure USB-C Docking Station",
    "category": "Networking",
    "brand": "Anker",
    "sku": "ANK-DOCK-11",
    "price": 219.0,
    "stock": 55,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80",
    "description": "Multi-port USB-C dock with dual display support and enterprise charging.",
    "tags": "dock,usb-c,networking,accessory",
    "createdAt": "2026-05-11",
    "updatedAt": "2026-05-14"
  },
  {
    "id": "PRD-0012",
    "name": "Enterprise Wi-Fi 7 Access Point",
    "category": "Networking",
    "brand": "Ubiquiti",
    "sku": "UBQ-WIFI7-AP",
    "price": 329.0,
    "stock": 24,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1606765962248-7ff407b51667?auto=format&fit=crop&w=900&q=80",
    "description": "High-density access point for offices, meeting zones, and campus networks.",
    "tags": "wifi,networking,access point",
    "createdAt": "2026-05-12",
    "updatedAt": "2026-05-13"
  },
  {
    "id": "PRD-0013",
    "name": "Privacy Screen 14-inch",
    "category": "Accessories",
    "brand": "3M",
    "sku": "3M-PRIV-14",
    "price": 39.0,
    "stock": 96,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    "description": "Laptop privacy filter for travel, shared desks, and confidential work.",
    "tags": "privacy,screen,laptop,accessory",
    "createdAt": "2026-05-13",
    "updatedAt": "2026-05-12"
  },
  {
    "id": "PRD-0014",
    "name": "AI Presentation Clicker",
    "category": "Accessories",
    "brand": "Kensington",
    "sku": "KEN-AI-CLICK",
    "price": 69.0,
    "stock": 44,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=900&q=80",
    "description": "Wireless presenter with laser pointer, timer alerts, and USB-C receiver.",
    "tags": "presenter,clicker,meeting",
    "createdAt": "2026-05-14",
    "updatedAt": "2026-05-11"
  },
  {
    "id": "PRD-0015",
    "name": "Acoustic Focus Panel Kit",
    "category": "Workspace",
    "brand": "SoundFrame",
    "sku": "SF-PANEL-12",
    "price": 289.0,
    "stock": 22,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    "description": "Premium acoustic wall panel kit for meeting rooms and open offices.",
    "tags": "acoustic,workspace,panel",
    "createdAt": "2026-05-15",
    "updatedAt": "2026-05-10"
  },
  {
    "id": "PRD-0016",
    "name": "Air Quality Desk Sensor",
    "category": "Workspace",
    "brand": "Kaiterra",
    "sku": "KAI-AQ-DESK",
    "price": 159.0,
    "stock": 31,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80",
    "description": "Compact indoor air quality monitor with CO2, temperature, and humidity tracking.",
    "tags": "sensor,air quality,workspace",
    "createdAt": "2026-05-16",
    "updatedAt": "2026-05-09"
  },
  {
    "id": "PRD-0017",
    "name": "Magnetic Whiteboard Pro",
    "category": "Stationery",
    "brand": "Quartet",
    "sku": "QRT-MAG-PRO",
    "price": 249.0,
    "stock": 17,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
    "description": "Large magnetic glass board for planning, workshops, and agile ceremonies.",
    "tags": "whiteboard,planning,stationery",
    "createdAt": "2026-05-17",
    "updatedAt": "2026-05-08"
  },
  {
    "id": "PRD-0018",
    "name": "Secure Shredder 20-Sheet",
    "category": "Workspace",
    "brand": "Fellowes",
    "sku": "FEL-SHRED-20",
    "price": 299.0,
    "stock": 9,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&w=900&q=80",
    "description": "Cross-cut shredder for departments handling confidential documents.",
    "tags": "shredder,security,workspace",
    "createdAt": "2026-05-18",
    "updatedAt": "2026-05-07"
  },
  {
    "id": "PRD-0019",
    "name": "Executive Laptop Backpack",
    "category": "Accessories",
    "brand": "Targus",
    "sku": "TAR-BAG-EXE",
    "price": 119.0,
    "stock": 67,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    "description": "Professional waterproof backpack with laptop protection and organizer pockets.",
    "tags": "bag,backpack,laptop,travel",
    "createdAt": "2026-05-19",
    "updatedAt": "2026-05-06"
  },
  {
    "id": "PRD-0020",
    "name": "Premium Paper Ream Box",
    "category": "Stationery",
    "brand": "Hammermill",
    "sku": "HAM-PAPER-10",
    "price": 52.0,
    "stock": 150,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1517697471339-4aa32003c11a?auto=format&fit=crop&w=900&q=80",
    "description": "Bright white multipurpose paper for office printing and documentation.",
    "tags": "paper,stationery,printing",
    "createdAt": "2026-05-20",
    "updatedAt": "2026-05-05"
  },
  {
    "id": "PRD-0021",
    "name": "Hybrid Work Desk Lamp",
    "category": "Workspace",
    "brand": "BenQ",
    "sku": "BEN-LAMP-HYB",
    "price": 189.0,
    "stock": 40,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
    "description": "Auto-dimming desk lamp optimized for video calls and late work sessions.",
    "tags": "lamp,desk,lighting,workspace",
    "createdAt": "2026-05-21",
    "updatedAt": "2026-05-04"
  },
  {
    "id": "PRD-0022",
    "name": "Compact Label Printer",
    "category": "Electronics",
    "brand": "Brother",
    "sku": "BRO-LABEL-CMP",
    "price": 149.0,
    "stock": 30,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
    "description": "Fast label printer for assets, inventory, shipping, and office organization.",
    "tags": "printer,label,inventory",
    "createdAt": "2026-05-22",
    "updatedAt": "2026-05-03"
  },
  {
    "id": "PRD-0023",
    "name": "Ergo Keyboard Low Profile",
    "category": "Accessories",
    "brand": "Keychron",
    "sku": "KEY-ERGO-LP",
    "price": 129.0,
    "stock": 51,
    "status": "Active",
    "featured": true,
    "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
    "description": "Low-profile mechanical keyboard designed for long-form productivity.",
    "tags": "keyboard,mechanical,ergonomic",
    "createdAt": "2026-05-23",
    "updatedAt": "2026-05-02"
  },
  {
    "id": "PRD-0024",
    "name": "Boardroom HDMI Matrix",
    "category": "Networking",
    "brand": "Aten",
    "sku": "ATN-HDMI-MX",
    "price": 429.0,
    "stock": 11,
    "status": "Active",
    "featured": false,
    "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
    "description": "Reliable HDMI matrix switch for boardrooms, training rooms, and demo spaces.",
    "tags": "hdmi,boardroom,networking,av",
    "createdAt": "2026-05-24",
    "updatedAt": "2026-05-01"
  }
];

const state = {
  products: [],
  filtered: [],
  activeCategory: 'All',
  selectedProduct: null,
  filters: { search: '', sort: 'latest', minPrice: '', maxPrice: '', featuredOnly: false, inStockOnly: false }
};

const $ = (selector) => document.querySelector(selector);
const currency = new Intl.NumberFormat(CONFIG.LOCALE, { style: 'currency', currency: CONFIG.CURRENCY });
const fallbackImage = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 650"><rect width="900" height="650" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="34" fill="#334155">Product Image</text></svg>`);

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  fetchProducts();
});

function bindEvents() {
  $('#refreshBtn').addEventListener('click', fetchProducts);
  $('#resetBtn').addEventListener('click', resetFilters);
  $('#emptyResetBtn').addEventListener('click', resetFilters);
  $('#searchInput').addEventListener('input', (e) => updateFilter('search', e.target.value));
  $('#sortSelect').addEventListener('change', (e) => updateFilter('sort', e.target.value));
  $('#minPrice').addEventListener('input', (e) => updateFilter('minPrice', e.target.value));
  $('#maxPrice').addEventListener('input', (e) => updateFilter('maxPrice', e.target.value));
  $('#featuredOnly').addEventListener('change', (e) => updateFilter('featuredOnly', e.target.checked));
  $('#inStockOnly').addEventListener('change', (e) => updateFilter('inStockOnly', e.target.checked));
  $('#voiceBtn').addEventListener('click', startVoiceSearch);
  $('#orderForm').addEventListener('submit', submitOrder);
  $('#quantity').addEventListener('input', updateTotal);
  $('#modalClose').addEventListener('click', closeModal);
  $('#orderModal').addEventListener('click', (e) => { if (e.target.id === 'orderModal') closeModal(); });
  $('#mobileFilterBtn').addEventListener('click', () => $('#filterPanel').classList.add('open'));
  $('#closeFilters').addEventListener('click', () => $('#filterPanel').classList.remove('open'));
};

async function fetchProducts() {
  setLoading(true);
  setNotice('');
  $('#syncStatus').textContent = 'Syncing...';
  try {
    if (!CONFIG.GOOGLE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL.includes('YOUR_WEB_APP_URL')) throw new Error('Missing Apps Script URL');
    const url = CONFIG.GOOGLE_SCRIPT_URL + '?action=products&cache=' + Date.now();
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    const json = await response.json();
    if (json.status !== 'success') throw new Error(json.message || 'Sheet returned an error');
    state.products = (json.data || []).map(normalizeProduct);
    $('#syncStatus').textContent = 'Connected to Google Sheets';
    $('#syncTime').textContent = 'Last sync: ' + new Date().toLocaleString();
  } catch (error) {
    console.warn(error);
    if (!CONFIG.USE_SAMPLE_DATA_IF_OFFLINE) {
      setNotice('Unable to connect to Google Sheets. Check deployment permissions and Apps Script URL.');
      state.products = [];
    } else {
      state.products = SAMPLE_PRODUCTS.map(normalizeProduct);
      setNotice('Using built-in sample products because the live Google Sheet could not be reached. Update Apps Script deployment URL after setup.');
      $('#syncStatus').textContent = 'Sample data mode';
      $('#syncTime').textContent = 'Last attempt: ' + new Date().toLocaleString();
    }
  } finally {
    state.activeCategory = 'All';
    renderAll();
    setLoading(false);
  }
}

function normalizeProduct(product) {
  return {
    id: String(product.id || product.productId || product['Product ID'] || '').trim(),
    name: String(product.name || product.productName || product['Product Name'] || '').trim(),
    category: String(product.category || product.Category || 'Uncategorized').trim() || 'Uncategorized',
    brand: String(product.brand || product.Brand || '').trim(),
    sku: String(product.sku || product.SKU || '').trim(),
    price: Number(product.price || product.Price || 0),
    stock: Number(product.stock || product.Stock || 0),
    status: String(product.status || product.Status || 'Active'),
    featured: Boolean(product.featured === true || String(product.featured || product.Featured).toLowerCase() === 'yes'),
    image: String(product.image || product.imageUrl || product['Image URL'] || '').trim(),
    description: String(product.description || product.Description || '').trim(),
    tags: String(product.tags || product.Tags || '').trim(),
    createdAt: product.createdAt || product['Created At'] || '',
    updatedAt: product.updatedAt || product['Updated At'] || product.createdAt || product['Created At'] || ''
  };
}

function updateFilter(key, value) {
  state.filters[key] = value;
  applyFilters();
  renderProducts();
}

function resetFilters() {
  state.activeCategory = 'All';
  state.filters = { search: '', sort: 'latest', minPrice: '', maxPrice: '', featuredOnly: false, inStockOnly: false };
  $('#searchInput').value = '';
  $('#sortSelect').value = 'latest';
  $('#minPrice').value = '';
  $('#maxPrice').value = '';
  $('#featuredOnly').checked = false;
  $('#inStockOnly').checked = false;
  renderAll();
}

function renderAll() {
  renderStats();
  renderCategories();
  applyFilters();
  renderProducts();
}

function renderStats() {
  const categories = new Set(state.products.map(p => p.category));
  $('#statProducts').textContent = state.products.length;
  $('#statCategories').textContent = categories.size;
  $('#statFeatured').textContent = state.products.filter(p => p.featured).length;
}

function renderCategories() {
  const counts = state.products.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const categories = ['All', ...Object.keys(counts).sort()];
  $('#categoryStrip').innerHTML = categories.map(category => {
    const count = category === 'All' ? state.products.length : counts[category];
    const active = category === state.activeCategory ? ' active' : '';
    return `<button type="button" class="cat-btn${active}" data-category="${escapeHtml(category)}">${escapeHtml(category)} <span>${count}</span></button>`;
  }).join('');
  document.querySelectorAll('.cat-btn').forEach(btn => btn.addEventListener('click', () => {
    state.activeCategory = btn.dataset.category;
    renderCategories();
    applyFilters();
    renderProducts();
    $('#filterPanel').classList.remove('open');
  }));
}

function applyFilters() {
  const search = state.filters.search.trim().toLowerCase();
  const min = state.filters.minPrice === '' ? null : Number(state.filters.minPrice);
  const max = state.filters.maxPrice === '' ? null : Number(state.filters.maxPrice);
  let items = [...state.products];

  if (state.activeCategory !== 'All') items = items.filter(p => p.category === state.activeCategory);
  if (search) {
    items = items.filter(p => [p.id, p.name, p.category, p.brand, p.sku, p.tags, p.description].join(' ').toLowerCase().includes(search));
  }
  if (min !== null && !Number.isNaN(min)) items = items.filter(p => p.price >= min);
  if (max !== null && !Number.isNaN(max)) items = items.filter(p => p.price <= max);
  if (state.filters.featuredOnly) items = items.filter(p => p.featured);
  if (state.filters.inStockOnly) items = items.filter(p => p.stock > 0);

  const sorters = {
    latest: (a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
    featured: (a,b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
    nameAsc: (a,b) => a.name.localeCompare(b.name),
    priceAsc: (a,b) => a.price - b.price,
    priceDesc: (a,b) => b.price - a.price,
    stockDesc: (a,b) => b.stock - a.stock
  };
  items.sort(sorters[state.filters.sort] || sorters.latest);
  state.filtered = items;
}

function renderProducts() {
  $('#resultCount').textContent = `${state.filtered.length} of ${state.products.length} products shown`;
  $('#emptyState').classList.toggle('hidden', state.filtered.length !== 0);
  $('#productGrid').classList.toggle('hidden', state.filtered.length === 0);
  $('#productGrid').innerHTML = state.filtered.map(productCard).join('');
  document.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.buy)));
}

function productCard(product) {
  const lowStock = product.stock > 0 && product.stock <= 10;
  const disabled = product.stock <= 0 || String(product.status).toLowerCase() !== 'active';
  return `
    <article class="card">
      <div class="card-media">
        <img src="${escapeAttr(product.image || fallbackImage)}" alt="${escapeAttr(product.name)}" loading="lazy" onerror="this.src='${fallbackImage}'" />
        <div class="badges">
          <span class="badge">${escapeHtml(product.category)}</span>
          <span>${product.featured ? '<span class="badge featured">Featured</span>' : lowStock ? '<span class="badge low">Low stock</span>' : ''}</span>
        </div>
      </div>
      <div class="card-body">
        <span class="product-id">${escapeHtml(product.id)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="card-foot">
          <div><span class="price">${currency.format(product.price)}</span><br><small>${product.stock} available</small></div>
          <button class="buy-btn" data-buy="${escapeAttr(product.id)}" ${disabled ? 'disabled' : ''}>${disabled ? 'Unavailable' : 'Buy now'}</button>
        </div>
      </div>
    </article>`;
}

function openModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  state.selectedProduct = product;
  $('#modalImage').src = product.image || fallbackImage;
  $('#modalCategory').textContent = product.category;
  $('#modalTitle').textContent = product.name;
  $('#modalDescription').textContent = product.description;
  $('#modalProductId').textContent = product.id;
  $('#modalPrice').textContent = currency.format(product.price);
  $('#modalStock').textContent = product.stock + ' available';
  $('#productId').value = product.id;
  $('#productName').value = product.name;
  $('#unitPrice').value = product.price;
  $('#quantity').max = Math.max(1, product.stock || 1);
  $('#quantity').value = 1;
  updateTotal();
  $('#orderModal').classList.add('open');
  $('#orderModal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#orderModal').classList.remove('open');
  $('#orderModal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  $('#orderForm').reset();
}

function updateTotal() {
  const product = state.selectedProduct;
  if (!product) return;
  const qty = Math.max(1, Number($('#quantity').value || 1));
  $('#totalAmount').value = currency.format(product.price * qty);
}

async function submitOrder(event) {
  event.preventDefault();
  const product = state.selectedProduct;
  if (!product) return;
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.action = 'createOrder';
  data.source = 'NovaProcure Website';

  const submitBtn = $('#submitBtn');
  const oldText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    if (!CONFIG.GOOGLE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL.includes('YOUR_WEB_APP_URL')) throw new Error('Apps Script URL is missing');
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    const json = await response.json();
    if (json.status !== 'success') throw new Error(json.message || 'Order failed');
    toast(`Order created: ${json.data.orderId}`, 'success');
    closeModal();
    fetchProducts();
  } catch (error) {
    console.error(error);
    if (CONFIG.USE_SAMPLE_DATA_IF_OFFLINE) {
      const mockId = 'LOCAL-' + Date.now().toString().slice(-6);
      toast(`Demo order saved locally: ${mockId}. Deploy Apps Script for live sheet orders.`, 'success');
      closeModal();
    } else {
      toast(error.message || 'Could not submit order', 'error');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
}

function startVoiceSearch() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return toast('Voice search is not supported in this browser. Use Chrome over HTTPS.', 'error');
  const recognition = new Recognition();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;
  $('#voiceBtn').classList.add('recording');
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    $('#searchInput').value = text;
    updateFilter('search', text);
    toast('Voice search: ' + text, 'success');
  };
  recognition.onerror = () => toast('Voice search could not hear clearly.', 'error');
  recognition.onend = () => $('#voiceBtn').classList.remove('recording');
  recognition.start();
}

function setLoading(value) {
  $('#loader').classList.toggle('hidden', !value);
  $('#productGrid').classList.toggle('hidden', value);
}
function setNotice(message) {
  $('#notice').textContent = message;
  $('#notice').classList.toggle('hidden', !message);
}
function toast(message, type = 'success') {
  const el = $('#toast');
  el.textContent = message;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 4200);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
