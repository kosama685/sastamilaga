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
  
  renderApp('<div>test</div>');
  startCountdown();
}
