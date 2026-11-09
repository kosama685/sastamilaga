/* Sasta Milaga blog posts.
   Each post appears on the site from its `publish` date (YYYY-MM-DD, Pakistan time).
   To schedule a post: add it here with a future date and push. The daily GitHub Action
   (.github/workflows/blog-schedule.yml) builds its static page and sitemap entry when it is due.
   Fields: slug, title, description (≤160 chars), publish, updated, author, category, tags, image,
           body (HTML), faq [{q, a}], links [[label, href]] */
window.SM_BLOG = [
  {
    slug: 'how-cash-on-delivery-works',
    title: 'How cash on delivery works at Sasta Milaga',
    description: 'Order now, pay when the parcel reaches you. A step-by-step guide to cash on delivery across Pakistan, including delivery charges and returns.',
    publish: '2026-11-09', updated: '2026-11-09', author: 'Sasta Milaga team', category: 'Shopping guides',
    tags: ['cash on delivery', 'COD Pakistan', 'how to order'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>Cash on delivery (COD) lets you order without paying online. You pay the courier in cash when your parcel arrives, so you only pay for orders that actually reach you.</p>
<h2>Ordering with cash on delivery</h2>
<ol><li><strong>Add products to your cart.</strong> Your cart stays saved on your phone or computer.</li>
<li><strong>Open checkout and choose “Cash on Delivery (COD)”.</strong> Enter your name, phone number and full address with a nearby landmark.</li>
<li><strong>Confirm on the phone.</strong> Our team calls or messages you on WhatsApp to confirm the items, delivery charge and timing before dispatch.</li>
<li><strong>Pay the courier.</strong> Keep the exact amount ready to make delivery quicker.</li></ol>
<h2>What delivery costs</h2>
<p>Local delivery in Pakistan is Rs 250, and free on orders above Rs 5,000. The total you see at checkout is the total you pay the courier.</p>
<h2>If something is wrong</h2>
<p>Check the parcel when it arrives. If an item is damaged or not what you ordered, send a photo on WhatsApp within 7 days and we will arrange a return or replacement.</p>`,
    faq: [
      { q: 'Is cash on delivery available everywhere in Pakistan?', a: 'Cash on delivery is available for Sasta Milaga Local products delivered within Pakistan. Global items are prepaid.' },
      { q: 'How much is delivery?', a: 'Rs 250 per order, free on orders above Rs 5,000.' },
      { q: 'Can I return a COD order?', a: 'Yes. Send a photo on WhatsApp within 7 days if an item is damaged or wrong.' }
    ],
    links: [['Start shopping', '#/shop'], ['How to order', '#/how-to-order'], ['Returns & refunds', '#/returns']]
  },
  {
    slug: 'umrah-travel-checklist',
    title: 'Umrah travel checklist: documents, packing and planning',
    description: 'A practical Umrah checklist: passport and visa documents, what to pack for Makkah and Madinah, health preparation and booking tips.',
    publish: '2026-11-10', updated: '2026-11-10', author: 'Sasta Milaga travel team', category: 'Travel',
    tags: ['Umrah', 'Umrah checklist', 'Saudi Arabia travel'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>Good preparation makes Umrah calmer and lets you focus on worship. Use this checklist a few weeks before you travel.</p>
<h2>Documents</h2>
<ul><li>Passport valid for at least six months from your travel date, with blank pages.</li>
<li>Umrah or tourist visa approval, printed and saved on your phone.</li>
<li>Return flight ticket and hotel confirmations for Makkah and Madinah.</li>
<li>Vaccination records your airline or the Saudi authorities require at the time of travel.</li></ul>
<h2>Packing</h2>
<ul><li>Ihram sheets (men) and comfortable modest clothing (women), plus a spare set.</li>
<li>Comfortable sandals you can walk in for long distances, and a small bag for shoes at the mosque.</li>
<li>Unscented toiletries for the state of ihram, a small prayer mat and a refillable water bottle.</li>
<li>Power bank, universal adapter and any medicines in their original packaging.</li></ul>
<h2>Booking tips</h2>
<p>Prices for flights and hotels near the Haram change with the season. Travelling outside school holidays and Ramadan is usually cheaper. Send your dates through our travel search and the team will reply on WhatsApp with options you can compare before paying.</p>`,
    faq: [
      { q: 'How early should I book Umrah?', a: 'Book flights and hotels as early as you can, especially for Ramadan and school holidays when prices rise.' },
      { q: 'What documents do I need for Umrah?', a: 'A valid passport, an approved visa, return tickets and hotel bookings. Check current health requirements with your airline before travel.' }
    ],
    links: [['Search Umrah flights and hotels', '#/travel?tab=flights'], ['Travel & outdoor products', '#/category/travel-and-outdoor']]
  },
  {
    slug: 'choosing-wireless-earbuds-on-a-budget',
    title: 'Choosing wireless earbuds on a budget',
    description: 'What matters in budget wireless earbuds: fit, battery life, Bluetooth version, noise cancelling and the case. A simple guide before you buy.',
    publish: '2026-11-12', updated: '2026-11-12', author: 'Sasta Milaga team', category: 'Buying guides',
    tags: ['earbuds', 'Bluetooth', 'electronics'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>Budget earbuds have improved a lot. These points help you pick a pair that suits how you use them.</p>
<h2>What to check</h2>
<ul><li><strong>Fit:</strong> look for several ear-tip sizes in the box. A good seal improves bass and blocks noise.</li>
<li><strong>Battery:</strong> compare playtime per charge and total playtime with the case.</li>
<li><strong>Bluetooth version:</strong> 5.0 or newer usually connects faster and more steadily.</li>
<li><strong>Noise cancelling (ANC):</strong> useful on buses and in busy places; it uses more battery.</li>
<li><strong>Controls and calls:</strong> touch controls and a microphone on each bud make calls easier.</li></ul>
<h2>Watch before you buy</h2>
<p>Many products on Sasta Milaga include a video. Watching it shows the real size of the case and how the controls work.</p>`,
    faq: [
      { q: 'Is ANC worth it on cheap earbuds?', a: 'If you commute or work in noisy places, yes. In quiet rooms a good fit matters more than ANC.' },
      { q: 'Which Bluetooth version should I choose?', a: 'Bluetooth 5.0 or newer for a steadier connection and better battery use.' }
    ],
    links: [['Search earbuds', '#/search?q=earbuds'], ['Electronics & appliances', '#/category/electronics-and-appliances'], ['Product videos', '#/videos']]
  },
  {
    slug: 'kitchen-organisation-ideas-small-homes',
    title: 'Kitchen organisation ideas for small homes',
    description: 'Make a small kitchen easier to use with racks, stackable containers, hooks and drawer organisers. Practical ideas that work in rented homes too.',
    publish: '2026-11-14', updated: '2026-11-14', author: 'Sasta Milaga team', category: 'Home & living',
    tags: ['kitchen storage', 'home organisation', 'small kitchen'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>A small kitchen works best when everything has a place you can reach. Start with the items you use every day.</p>
<h2>Use the walls</h2><p>Adhesive hooks and wall racks hold ladles, towels and lids without drilling, which suits rented homes.</p>
<h2>Stack, don't spread</h2><p>Clear stackable containers for rice, lentils and spices save shelf space and show when you're running low.</p>
<h2>Divide the drawers</h2><p>Drawer organisers stop cutlery and tools from piling up, so you can find them quickly while cooking.</p>
<h2>Under the sink</h2><p>A two-level rack under the sink doubles the space for cleaning supplies.</p>`,
    faq: [{ q: 'How do I organise a kitchen without drilling?', a: 'Use adhesive hooks, over-the-door racks, stackable containers and drawer organisers.' }],
    links: [['Home & living', '#/category/home-and-living'], ['Search storage boxes', '#/search?q=storage']]
  },
  {
    slug: 'ordering-global-items-price-confirmation',
    title: 'Ordering global items: how price and shipping confirmation works',
    description: 'Global items ship from our supplier network. Here is how we confirm stock, options, shipping and the final price before you pay.',
    publish: '2026-11-18', updated: '2026-11-18', author: 'Sasta Milaga team', category: 'Shopping guides',
    tags: ['global shop', 'worldwide delivery', 'prepaid'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>The global shop lists products from our supplier network that can ship to many countries. Because stock and shipping change often, we confirm every global order with you before payment.</p>
<h2>How it works</h2>
<ol><li><strong>Choose a product</strong> and note the estimated price, shown in US dollars.</li>
<li><strong>Send a request</strong> with the quantity, any size or colour, and your country and city. It opens WhatsApp with the details filled in.</li>
<li><strong>Get the confirmed total.</strong> We check stock and shipping to your address and send the final price.</li>
<li><strong>Pay securely</strong> by card or PayPal link once you are happy with the total.</li></ol>
<p>You never pay before you have seen the final price including shipping.</p>`,
    faq: [
      { q: 'Why are global prices estimates?', a: 'Supplier prices and shipping change. We confirm the final total, including delivery to your address, before you pay.' },
      { q: 'Can I pay cash on delivery for global items?', a: 'No. Global items are prepaid after we confirm the total.' }
    ],
    links: [['Open the global shop', '#/global'], ['Global product videos', '#/global/videos']]
  },
  {
    slug: 'finding-cheaper-flights-flexible-dates',
    title: 'Finding cheaper flights with flexible dates and routes',
    description: 'Simple ways to lower airfare: flexible dates, nearby airports, one-way combinations and booking at the right time.',
    publish: '2026-11-20', updated: '2026-11-20', author: 'Sasta Milaga travel team', category: 'Travel',
    tags: ['cheap flights', 'flight booking', 'travel tips'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>Airfares depend on demand, so small changes to your plans can make a real difference.</p>
<ul><li><strong>Move your dates by a day or two.</strong> Midweek departures are often cheaper than weekends.</li>
<li><strong>Compare nearby airports.</strong> For example Lahore and Islamabad, or Dubai and Sharjah.</li>
<li><strong>Check one-way combinations.</strong> Two one-way tickets on different airlines can cost less than a return.</li>
<li><strong>Avoid peak periods</strong> such as Eid, school holidays and Ramadan when you can.</li>
<li><strong>Check baggage rules</strong> before you compare prices; a cheaper fare without luggage may cost more in the end.</li></ul>
<p>Use the flight search to send your route and dates. Our team replies on WhatsApp with fares you can compare, and you confirm the final price before paying.</p>`,
    faq: [{ q: 'Which day is cheapest to fly?', a: 'It varies by route, but midweek departures are often cheaper than Fridays and weekends.' }],
    links: [['Search flights', '#/travel?tab=flights'], ['Budget hotels', '#/travel?tab=stays']]
  },
  {
    slug: 'winter-skincare-basics',
    title: 'Winter skincare basics for dry weather',
    description: 'Keep skin comfortable in cold, dry weather with a gentle cleanser, moisturiser, lip care and sunscreen. A simple routine anyone can follow.',
    publish: '2026-11-23', updated: '2026-11-23', author: 'Sasta Milaga team', category: 'Health & beauty',
    tags: ['winter skincare', 'moisturiser', 'beauty'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>Cold air and heaters dry out skin. A short, steady routine helps more than many products.</p>
<ol><li><strong>Cleanse gently</strong> with lukewarm water and a mild, fragrance-free cleanser.</li>
<li><strong>Moisturise on damp skin</strong> so the cream holds in water. Thicker creams suit winter.</li>
<li><strong>Protect lips and hands</strong> with a balm and hand cream, especially after washing.</li>
<li><strong>Keep using sunscreen</strong> on sunny winter days.</li></ol>
<p>If you have a skin condition, follow your doctor's advice before trying new products.</p>`,
    faq: [{ q: 'Do I need sunscreen in winter?', a: 'Yes, on sunny days. Ultraviolet light still reaches your skin in winter.' }],
    links: [['Health & beauty', '#/category/health-and-beauty'], ['Search moisturiser', '#/search?q=moisturizer']]
  },
  {
    slug: 'gift-ideas-under-2000',
    title: 'Gift ideas under Rs 2,000',
    description: 'Thoughtful gifts that cost less than Rs 2,000: home décor, beauty sets, gadgets and accessories, with links to browse each one.',
    publish: '2026-11-26', updated: '2026-11-26', author: 'Sasta Milaga team', category: 'Buying guides',
    tags: ['gift ideas', 'budget gifts', 'Eid gifts'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>A good gift doesn't need a big budget. These categories have plenty of choices under Rs 2,000.</p>
<ul><li><strong>Home décor:</strong> wall art, candles and small lamps.</li>
<li><strong>Beauty and grooming:</strong> skincare sets, hair tools and fragrances.</li>
<li><strong>Gadgets:</strong> phone stands, power banks and earbuds.</li>
<li><strong>Kitchen:</strong> mugs, bottles and storage sets.</li></ul>
<p>Use the price filter on any category page: set the maximum price to 2000 and sort by lowest price.</p>`,
    faq: [{ q: 'How do I find products under Rs 2,000?', a: 'Open any category, type 2000 in the maximum price filter and sort by lowest price.' }],
    links: [['Budget finds', '#/shop?sort=low'], ['Events & gifting', '#/search?q=gift']]
  },
  {
    slug: 'watching-live-tv-on-sasta-milaga',
    title: 'Watching Live TV on Sasta Milaga',
    description: 'How the Live TV page works: reviewed channels by country and category, saving recent channels and what to do if a stream does not load.',
    publish: '2026-11-30', updated: '2026-11-30', author: 'Sasta Milaga team', category: 'Live TV',
    tags: ['live TV', 'news channels', 'streaming'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<p>Live TV lists channels that broadcasters make available online. Each channel is reviewed before it appears.</p>
<h2>Finding a channel</h2><p>Pick a category such as News, Sports, Kids or Religious, or filter by country. Channels you watch are saved under “Recent” on your device.</p>
<h2>If a stream doesn't play</h2><p>Broadcasters sometimes change or pause their streams. Try again later or choose another channel. Some streams only work in certain countries.</p>`,
    faq: [{ q: 'Is Live TV free?', a: 'Yes. Channels play in your browser without an account.' }],
    links: [['Open Live TV', '#/live-tv']]
  },
  {
    slug: 'car-care-essentials',
    title: 'Car care essentials every driver should keep',
    description: 'A short list of car care items worth keeping in your boot: tyre inflator, jump starter, microfibre cloths, phone holder and an emergency kit.',
    publish: '2026-12-03', updated: '2026-12-03', author: 'Sasta Milaga team', category: 'Automotive',
    tags: ['car accessories', 'car care', 'automotive'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<ul><li><strong>Portable tyre inflator</strong> to keep tyres at the right pressure.</li>
<li><strong>Jump starter or jumper cables</strong> for a flat battery.</li>
<li><strong>Microfibre cloths</strong> for glass and dashboards without scratches.</li>
<li><strong>Phone holder</strong> so navigation stays in view.</li>
<li><strong>First-aid kit, torch and reflective triangle</strong> for emergencies.</li></ul>
<p>Check tyre pressure and fluids monthly, and before long journeys.</p>`,
    faq: [{ q: 'How often should I check tyre pressure?', a: 'At least once a month and before long trips, when the tyres are cold.' }],
    links: [['Automotive', '#/category/automotive'], ['Global automotive parts', '#/global/g/automotive']]
  },
  {
    slug: 'hajj-umrah-luggage-tips',
    title: 'Hajj and Umrah luggage tips',
    description: 'Pack light and smart for Hajj and Umrah: luggage size, a small day bag, labelling, and items to keep in your hand luggage.',
    publish: '2026-12-07', updated: '2026-12-07', author: 'Sasta Milaga travel team', category: 'Travel',
    tags: ['Hajj', 'Umrah', 'luggage'],
    image: 'assets/brand/og-default-1200x630.jpg',
    body: `<ul><li><strong>Check your airline's baggage allowance</strong> for checked and hand luggage before you buy bags.</li>
<li><strong>Use a small cross-body bag</strong> for your passport, phone and money while in the Haram.</li>
<li><strong>Label every bag</strong> with your name, phone number and hotel.</li>
<li><strong>Keep essentials in hand luggage:</strong> medicines, one change of clothes, ihram, chargers and documents.</li>
<li><strong>Leave space</strong> for Zamzam and gifts on the way back, within the airline's rules.</li></ul>`,
    faq: [{ q: 'What should go in hand luggage for Umrah?', a: 'Passport and visa, medicines, ihram, a change of clothes, chargers and valuables.' }],
    links: [['Search travel bags', '#/search?q=travel bag'], ['Plan Umrah travel', '#/travel']]
  }
];
