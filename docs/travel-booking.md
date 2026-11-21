# Flight search, booking and payment (`/travel/`)

Status 21 Nov 2026: **request mode is live** (no supplier key needed). **Duffel online booking is built, tested against a mocked
Duffel API on the live server (31/31) and in a real browser (22/22), and switched off** until the owner completes the go-live
checklist below. Payments always use the shop's own WooCommerce PayPal Payments buttons (PayPal + Debit or Credit Card).

## 1. What the customer gets

| Mode | When | Journey |
|---|---|---|
| **Request** (no API key) | Default, and whenever live search is off or fails | Search → "Get your best fare" sheet (name, WhatsApp, optional email, consent) → **request number** + confirmation email → the team quotes and sends a **payment link** (Travel Ops → request → *Payment link* box) → customer pays on the order-pay page with PayPal / card → request moves to *Paid* → team issues the ticket |
| **Live fares, ask the team** | Duffel search on, online booking off | Live airline fares → "Request this fare" sends the chosen fare to the team (same request flow) |
| **Online booking** | Duffel search on **and** online booking on | Live fare → "Book this fare" → price re-checked at the airline → passenger + passport details → seats **held** at the airline when the airline allows it → WooCommerce order in the fare currency → order-pay page (same PayPal / card buttons as checkout) → payment recorded → Duffel is paid from the agency balance → airline booking reference (PNR) and e-ticket numbers on the thank-you page, in My account and in the order email |

If anything goes wrong after the customer has paid (price rose more than 2 %, fare sold out, balance empty, network), the order goes **on hold**,
the team gets an email, and the order screen shows a **Retry ticketing** button. Nothing is booked twice and nothing is charged twice.

## 2. How the money moves

```
Customer ──PayPal / card──▶ WooCommerce PayPal Payments ──▶ your PayPal business account
                                   │ payment recorded (processing)
                                   ▼
                     sm-flight-booking.php ──balance payment──▶ Duffel ──▶ airline ticket (PNR)
```

You are the merchant: the customer pays you; you pay Duffel from your prepaid Duffel balance. Your margin is the markup
(Settings → Global Travel, default 20 % of the airline **base** fare; taxes are passed through unchanged).

## 3. Code map

| Piece | Where | Notes |
|---|---|---|
| Booking engine + request route | `wordpress/mu-plugins/sm-flight-booking.php` (live in `wp-content/mu-plugins/`) | Duffel client, re-pricing, hold/instant orders, ticketing hook, cancellation, pay-page notice, order box, settings page, admin routes |
| Payment links for quotes | `wordpress/mu-plugins/sm-travel-pay.php` | Staff create a USD order from any Travel Ops request |
| Search adapter (existing) | plugin `sm-global-travel` → `class-sm-duffel-provider.php` | `duffel/flights`, `duffel/stays`, token storage page *Settings → Duffel Travel API* |
| Search page script | `assets/js/travel.js` | Loads the sheets on first use, decides the mode at runtime from `booking/config` |
| Sheets | `assets/js/travel-booking.js`, `assets/css/travel-booking.css` | Request sheet, booking sheet; no HTML change to the generated pages |
| Tests | `tools/smfb-mock-e2e.php` (server, Duffel mocked), `tools/travel-booking.e2e.mjs` (browser, live page, routes mocked) | Both clean up after themselves; neither books nor charges |
| GitHub → WordPress settings | `.github/workflows/travel-booking-settings.yml` | Sends switches and tokens; prints yes/no only |

## 4. API routes (namespace `/wp-json/sm-travel/v1/`)

| Method + route | Who | Purpose |
|---|---|---|
| `GET booking/config` | public | `{mode: request\|duffel, search, booking, currencies[], hours}`; cached 60 s |
| `POST request` | public, 6 per 15 min per visitor | Trip + `name`, `phone`, `email?`, `notes?`, `consent`, `key` (idempotency), `offer?` → `{request, ref, whatsapp, email}`. Creates a Travel Ops request, emails the team and (if given) the customer |
| `GET booking/offer?id=off_…` | public, only when online booking is on | Fresh price (with markup), passenger slots, passport requirement, refund/change rules, hold availability |
| `POST booking/start` | public, only when online booking is on; 4 per 15 min per visitor, 60 per day site-wide | `{offer_id, passengers[{id,title,given_name,family_name,born_on,passport?,passport_country?,passport_expiry?}], contact{email,phone}, key}` → `{order, pay_url, mode: hold\|instant, held_until, amount, currency}` |
| `GET admin/status` | administrators (cookie or application password) | Readiness flags; never returns tokens |
| `POST admin/settings` | administrators | `duffel_test_token`, `duffel_live_token`, `environment`, `production_approved`, `flights_search`, `online_booking`, `ack_balance`, `ack_paypal`, `markup_percent` |
| `GET suggest?q=`, `GET hotel-suggest?q=` | public (existing) | Airport / city suggestions from the site's own index (Arabic/Urdu names too) |
| `POST duffel/flights`, `POST duffel/stays` | public when Duffel search is on (existing) | Live offers, sorted by price, markup applied |
| `POST trip-request` | public (existing, kept for old pages) | Old WhatsApp hand-off without contact capture |
| `fare-search`, `fare-calendar`, `fare-link`, `popular-routes` | retired 5 Nov 2026 (410 / empty) | Travelpayouts affiliate flows; not used |

Duffel endpoints used server-side: `POST /air/offer_requests`, `GET /air/offers/{id}`, `POST /air/orders` (`type: hold` or `instant`),
`GET /air/orders/{id}`, `POST /air/payments` (`type: balance`), `POST /air/order_cancellations` + `/actions/confirm`. Header `Duffel-Version: v2`.

## 5. Keys and variables: where they live

Never put a supplier token in the repository, in `assets/`, or in page HTML: the static site is public, and so is everything the browser loads.

| Name | Kind | Where to set it | Used for |
|---|---|---|---|
| Duffel **live** token `duffel_live_…` | secret | WordPress: *Settings → Duffel Travel API* (encrypted), or GitHub secret `DUFFEL_LIVE_TOKEN` + the workflow | Live search, holds, payments |
| Duffel **test** token `duffel_test_…` | secret | Same page, or GitHub secret `DUFFEL_TEST_TOKEN` | Sandbox self-test |
| `WORDPRESS_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APP_PASSWORD` | GitHub secrets (already exist) | GitHub → Settings → Secrets and variables → Actions | Lets the workflow call `admin/settings`; the user must be an administrator |
| `TRAVEL_MARKUP_PERCENT` | GitHub variable (optional) | … → Variables | Markup on the airline base fare |
| PayPal client ID / secret | WooCommerce | *WooCommerce → Settings → Payments → PayPal* (already connected) | All payments, including travel. The old `PAYPAL_*` GitHub secrets belong to the retired `workers/paypal` sandbox Worker and are not used here |

To use GitHub: add the secrets, open **Actions → Travel booking settings (WordPress) → Run workflow**, untick *status only*, choose the switches, run.
The job summary lists the resulting flags. Run it once with *status only* ticked first to check the credentials.

## 6. Go-live checklist (owner)

1. **Rotate the Duffel live token.** The 5 Nov 2026 audit found the stored live token had been shared before. In the Duffel dashboard: Developers → Access tokens → create a new live token, revoke the old one, paste the new one on *Settings → Duffel Travel API* (or GitHub secret + workflow).
2. **Create a Duffel test token** and run *Settings → Flight booking → Run sandbox booking test*. It books a Duffel Airways test fare through the customer code path and must report *passed* with a booking reference.
3. **Fund the Duffel balance** (Duffel dashboard → Balance). Tickets are paid from it straight after the customer pays.
4. **PayPal approval for airline tickets.** PayPal lists airlines and charter flights among activities that need pre-approval; ask PayPal (business support / sales) to approve the account for flight sales, otherwise payments can be held or the account limited.
5. Turn on *Flights search enabled* (Settings → Duffel Travel API, environment **live**, production approved) and check real fares on `/travel/`.
6. Tick both confirmations and *Let customers book and pay online* on **Settings → Flight booking**.
7. Make one real low-fare booking yourself, check the PNR on the airline website, then cancel/refund according to the fare rules.

## 7. When something needs attention (runbook)

- **Order on hold with "Ticketing did not complete (price_increased)"**: the airline price rose more than 2 % after payment. If you accept the higher cost, book it in the Duffel dashboard, add the booking reference as a customer note and complete the order; otherwise refund from the order (WooCommerce refunds go back through PayPal) and tell the customer.
- **…(insufficient balance / http_4xx)**: top up the Duffel balance, then press **Retry ticketing** on the order.
- **…(http_500 / http_502 / network)**: the airline payment may have gone through. Look up the order in the Duffel dashboard first; only then retry.
- **Customer asks for a refund or change after ticketing**: follow the fare rules shown at booking (stored on the order); process changes in Duffel, refunds in WooCommerce.
- **Undo the whole feature**: delete `wp-content/mu-plugins/sm-flight-booking.php` (search falls back to the WhatsApp hand-off; orders and requests stay).

## 8. Similar providers (checked 21 Nov 2026)

| Provider | Model | Fit for Sasta Milaga |
|---|---|---|
| **Duffel** | Booking API (you take the payment, pay from balance); free sign-up, instant test mode, hold orders, 300+ airlines | **Integrated.** Best self-service option today |
| Travelport, Sabre, Amadeus (Enterprise) | GDS booking APIs | Need IATA accreditation or a consolidator contract; good for PIA and Gulf carriers |
| Amadeus Self-Service | — | **Closed**: the self-service portal was decommissioned in 2026; flight APIs now need an Enterprise contract |
| Kiwi.com Tequila | Booking/affiliate API | **Invite-only** since 2024 (public self-sign-up closed) |
| TBO, Mystifly, Trawex | B2B wholesalers / aggregators (flights, hotels) | Agency onboarding and certification; TBO is strong in South Asia and the Gulf |
| Hotelbeds, WebBeds, Expedia Rapid, Duffel Stays | Hotel booking APIs | Contracts or separate access; Duffel Stays plugs into the existing adapter |
| Travelpayouts (Aviasales, Trip.com, Booking.com, Agoda, Klook) | Affiliate: partner takes the payment, you earn commission (paid to PayPal/bank) | Retired on this site 5 Nov 2026 (0 commission in 30 days, customers left the site). Optional as price insight only |
| Skyscanner, Kayak, Wego, Trip.com, Booking.com, Agoda, GetYourGuide, Viator, Airalo | Affiliate / partner programmes | Approval and terms per programme; no customer payment to you |

## 9. Developer prompt (to extend this feature)

> You are working on Sasta Milaga's travel booking (`docs/travel-booking.md`). WordPress + WooCommerce (HPOS) serve
> `/wp-json/sm-travel/v1/*` and `/checkout/order-pay/`; the public pages are static (GitHub Pages behind Cloudflare Workers) and
> must not contain secrets. Payments must use WooCommerce PayPal Payments on the order-pay page; never add a second PayPal
> integration. Supplier calls happen only in PHP (`sm-flight-booking.php`), tokens come from the encrypted `sm_duffel_settings`
> option. Button/link texts must not match `/add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i`
> (edge click guard). Keep the request flow working when any supplier is off. Never invent prices, availability or booking
> references; show the supplier's rules. Add tests in the style of `tools/smfb-mock-e2e.php` (mock with `pre_http_request`) and
> `tools/travel-booking.e2e.mjs`, run both, deploy mu-plugins with php -l + backup + home-page check + rollback, and document new
> routes in section 4. Next candidates: Duffel Stays booking (same order flow), seat/bag extras (`return_available_services`),
> multi-city search, PKR display with USD charge.
