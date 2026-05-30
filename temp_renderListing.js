function renderListing(type, val, qs=''){
  const params = new URLSearchParams(qs||'');
  const qFromUrl = params.get('q') || '';
  const leafFromUrl = params.get('leaf') || '';
  let base = [];
  let title = '';
  let subtitle = '';
  let cat = null;

  if(type==='category'){
    cat = categories.find(c=>c.slug===val);
    base = productsForCategory(val);
    if(leafFromUrl) base = base.filter(p=>p._leafSlug===leafFromUrl);
    title = cat?.name || titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products in this category`;
    setSEO({
      title: `${title} – Buy Online at Best Prices in Pakistan`,
      description: `Shop ${base.length.toLocaleString()} ${title} products online in Pakistan at Sasta Milaga. Compare prices, filter by brand, price range and more.`,
      image: cat ? cat.image : undefined,
      url: `${SITE_URL}/#/category/${val}`,
      ldJson: cat ? categoryLdJson(cat) : undefined
    });
  } else if(type==='tag'){
    const tag = topTags.find(t=>t.slug===val) || {name:titleCase(unSlug(val))};
    base = productsForTag(val);
    title = `#${tag.name}`;
    subtitle = `${base.length.toLocaleString()} products matched by tag`;
    setSEO({
      title: `${tag.name} Products – Best Prices Pakistan`,
      description: `Find ${base.length.toLocaleString()} ${tag.name} products at Sasta Milaga Pakistan. Best prices, easy filtering, fast delivery.`,
      url: `${SITE_URL}/#/tag/${val}`,
      ldJson: { "@context":"https://schema.org","@type":"CollectionPage","name":`${tag.name} Products`,"url":`${SITE_URL}/#/tag/${val}` }
    });
  } else if(type==='store'){
    base = productsForStore(val);
    title = base[0]?.store || titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products from this store`;
    setSEO({
      title: `${title} – Official Store at Sasta Milaga Pakistan`,
      description: `Browse all ${base.length.toLocaleString()} products from ${title} at Sasta Milaga. Competitive prices, verified seller.`,
      url: `${SITE_URL}/#/store/${val}`
    });
  } else if(type==='deals'){
    base = getDeals();
    title = '⚡ Blastic Deals';
    subtitle = 'Biggest discounts, in-stock products';
    setSEO({
      title: 'Best Deals & Discounts – Sasta Milaga Pakistan',
      description: `Save big on ${base.length.toLocaleString()} discounted products at Sasta Milaga. Up to 70% off on fashion, electronics, beauty and more in Pakistan.`,
      url: `${SITE_URL}/#/deals`
    });
  } else {
    state.filters.q = qFromUrl;
    $('#topSearch').value = qFromUrl;
    base = products;
    title = qFromUrl ? `Search: "${qFromUrl}"` : 'Search Everything';
    subtitle = 'Search by name, category, store, description and tags';
    setSEO({
      title: qFromUrl ? `"${qFromUrl}" – Search Results at Sasta Milaga` : 'Search All Products – Sasta Milaga Pakistan',
      description: `Search results for "${qFromUrl}" at Sasta Milaga. Find the best prices on products across Pakistan.`,
      url: `${SITE_URL}/#/search?q=${encodeURIComponent(qFromUrl)}`
    });
  }

  state.base = base;
  state.filters.q = type==='search' ? qFromUrl : '';
  const heroImg = img(base.find(p=>img(p)) || products[0]);

  // Category leaf filter chips
  const leafChips = (cat && cat.leaves && cat.leaves.length > 1)
    ? `<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="tag-chip ${!leafFromUrl?'active':''}" href="#/category/${val}" style="${!leafFromUrl?'background:rgba(200,169,110,.22);border-color:rgba(200,169,110,.5)':''}">All</a>
        ${cat.leaves.slice(0,20).map(l=>`<a class="tag-chip ${slug(l)===leafFromUrl?'active':''}" href="#/category/${val}?leaf=${encodeURIComponent(slug(l))}" style="${slug(l)===leafFromUrl?'background:rgba(200,169,110,.22);border-color:rgba(200,169,110,.5)':''}">${esc(l)}</a>`).join('')}
       </div>` : '';

  renderApp(`
    <section class="hero" style="min-height:320px">
      <div class="hero-content">
        <span class="eyebrow">${type==='tag'?'Tag discovery':'type'==='category'?'Category':'Catalog'} ${type==='tag'?'page':type==='category'?'page':'search'}</span>
        <h1>${esc(title)}</h1>
        <p>${esc(subtitle)}. Filter by price, brand, stock and layout.</p>
        ${leafChips}
      </div>
      <div class="blast-badge" aria-hidden="true">${base.length.toLocaleString()}<br>Items</div>
      <div class="hero-float-grid" aria-hidden="true"><span class="float-card" style="right:80px;top:40px"><img src="${esc(heroImg)}" onerror="this.src=fallbackImg" alt="${esc(title)}"><b>${esc(title)}</b></span></div>
    </section>
    <section class="section listing-shell">
      <aside class="filter-panel" aria-label="Product filters">
        <h2 style="margin:0 0 8px;font-size:1.3rem">🎛️ Filters</h2>
        <p style="color:var(--muted2);margin:0 0 14px;font-size:.82rem">Filter by price, tags, brand, stock &amp; video.</p>
        <div class="filter-group">
          <label for="filterQ">Search inside results</label>
          <input id="filterQ" value="${esc(state.filters.q)}" placeholder="Search products..." aria-label="Search within results">
        </div>
        <div class="filter-group">
          <label>Price range (PKR)</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="minP" type="number" placeholder="Min" aria-label="Minimum price">
            <input id="maxP" type="number" placeholder="Max" aria-label="Maximum price">
          </div>
        </div>
        <div class="filter-group">
          <label for="sortBy">Sort by</label>
          <select id="sortBy" aria-label="Sort products">
            <option value="relevant">Most Relevant</option>
            <option value="low">Lowest Price</option>
            <option value="high">Highest Price</option>
            <option value="discount">Biggest Discount</option>
            <option value="new">Newest</option>
            <option value="media">Most Visual</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Popular Tags</label>
          <div class="chip-cloud" id="filterTags"></div>
        </div>
        <div class="filter-group">
          <label for="storeFilter">Store / Brand</label>
          <select id="storeFilter" aria-label="Filter by store"><option value="">All Stores</option></select>
        </div>
        <div class="filter-group">
          <label><input id="stockOnly" type="checkbox" style="width:auto;margin-right:6px"> In stock only</label>
          <label style="margin-top:8px;display:block"><input id="videoOnly" type="checkbox" style="width:auto;margin-right:6px"> Video available</label>
        </div>
        <button class="primary-btn" id="applyFilters" style="width:100%;margin-top:16px">Apply Filters</button>
      </aside>
      <div class="content-panel">
        <div class="listing-tools">
          <div><h2 id="resultTitle" style="font-size:1.4rem;margin:0">${esc(title)}</h2><p id="resultCount" style="margin:.3rem 0 0;color:var(--muted2)">Loading…</p></div>
          <div class="view-toggle">
            <button class="ghost-btn active" data-view="grid" aria-label="Grid view">⊞ Grid</button>
            <button class="ghost-btn" data-view="list" aria-label="List view">≡ List</button>
          </div>
        </div>
        <div id="resultGrid" class="products-row"></div>
        <div class="load-more-wrap"><button class="ghost-btn" id="loadMore">Load more products ↓</button></div>
      </div>
    </section>
  `;
  buildFilterControls(base);
  bindListingControls();
  drawResults();
}


