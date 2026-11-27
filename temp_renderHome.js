function renderHome(){
  setSEO({
    title: "Pakistan's Affordable Marketplace – Best Prices on Fashion, Electronics & More",
    description: `Shop ${products.length.toLocaleString()} products across ${categories.length} categories at Sasta Milaga – Pakistan's go-to marketplace for fashion, electronics, beauty, home decor and groceries. Best prices guaranteed.`,
    image: `${SITE_URL}/sasta-milaga-logo-final.png`,
    url: `${SITE_URL}/`,
    ldJson: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Sasta Milaga Featured Categories",
      "itemListElement": categories.slice(0,10).map((c,i)=>({
        "@type": "ListItem",
        "position": i+1,
        "name": c.name,
        "url": `${SITE_URL}/#/category/${c.slug}`
      }))
    }
  });

  const flash = getDeals().slice(0,8);
  const heroProducts = flash.slice(0,3);
  const deal = flash[0] || products[0];
  const heroCards = heroProducts.map(p=>`<a class="float-card" href="#/product/${p._slug}"><img src="${esc(img(p))}" onerror="this.src=fallbackImg" alt="${esc(p.n)}" loading="lazy"><b>${esc(p.n)}</b></a>`).join('');
  const trendingTags = topTags.slice(0,32).map(t=>`<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)} <small>${t.count}</small></a>`).join('');
  const masonryItems = shuffle(products).slice(0,48).map(masonryCard).join('');
  renderApp(`
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow">🇵🇰 Pakistan's #1 Affordable Marketplace</span>
        <h1>Everything <span class="gradient-text">Milaga.</span><br>Sasta <span class="gradient-text">Milaga.</span></h1>
        <p>Discover ${products.length.toLocaleString()} products across ${categories.length} categories. Shop fashion, electronics, beauty, groceries and more – all at the lowest prices in Pakistan.</p>
        <div class="hero-actions">
          <a class="primary-btn" href="#/deals">⚡ Shop Flash Deals</a>
          <a class="ghost-btn" href="#/category/${categories[0]?.slug||''}">Browse Categories</a>
          <button class="ghost-btn" onclick="document.querySelector('#openBot').click()">🤖 Ask Sasta AI</button>
        </div>
      </div>
      <div class="hero-float-grid" aria-hidden="true">
        ${heroCards}
      </div>
      <div class="blast-badge" aria-hidden="true">Best Price<br>Blast ⚡</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>Shop by Category</h2><p>${categories.length} categories auto-generated from your product catalog.</p></div>
        <a class="ghost-btn" href="#/search?q=">View all →</a>
      </div>
      <div class="card-grid">
        ${categories.slice(0,15).map(categoryCard).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>⚡ Flash Sales</h2><p>Biggest discounts, in-stock products with quick-cart actions.</p></div>
        <span class="eyebrow" id="countdown">Sale refreshes soon</span>
      </div>
      <div class="products-row">${flash.slice(0,4).map(productCard).join('')}</div>
    </section>

    <section class="section">
      <div class="deal-layout">
        <div class="detail-panel" style="padding:24px">
          <span class="eyebrow">Deal of the Day 🔥</span>
          <h2>${esc(deal.n)}</h2>
          <p>${esc(deal.sd || deal.seoD || 'A hot pick from the Sasta Milaga catalog.')}</p>
          <div class="tags-wrap">${(deal.tags||[]).slice(0,8).map(tagLink).join('')}</div>
          <div style="display:flex;align-items:flex-end;gap:14px;margin:18px 0">
            <span class="big-price">${PKR.format(price(deal))}</span>
            ${oldPrice(deal)>price(deal)?`<span class="old-price">${PKR.format(oldPrice(deal))}</span>`:''}
          </div>
          <a class="primary-btn" href="#/product/${deal._slug}">Open Product →</a>
        </div>
        <a class="category-card" style="min-height:420px" href="#/product/${deal._slug}">
          <img src="${esc(img(deal))}" alt="${esc(deal.n)}" onerror="this.src=fallbackImg" loading="lazy">
          <div><b>${discount(deal) || 'Hot'}% Off Today</b><small>${esc(deal.m)} · ${esc(deal.leaf)}</small></div>
        </a>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Trending Tags</h2><p>Tag-based discovery routes for faster browsing.</p></div></div>
      <div class="visual-strip">${trendingTags}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Discover More Products</h2><p>Pinterest-style visual discovery feed.</p></div></div>
      <div class="masonry">${masonryItems}</div>
    </section>
  `;
  startCountdown();
}


