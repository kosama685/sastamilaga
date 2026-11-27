// Read-only edge diagnostic: firewall events (correct GraphQL) + a US-side fetch probe.
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('CLOUDFLARE_API_TOKEN unavailable');
const BASE = 'https://api.cloudflare.com/client/v4';
const api = async (path, init = {}) => {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
};

const zones = await api('/zones?name=sastamilaga.com');
const zone = zones.json?.result?.[0];
if (!zone) { console.log('ZONE_LOOKUP_FAILED', zones.status); process.exit(0); }
console.log('ZONE', zone.id, zone.plan?.name);
const tag = zone.id;
const now = new Date();
const from = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
const A = from.toISOString();
const B = now.toISOString();

const gql = async (label, query) => {
  const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query }) });
  const out = r.json ? JSON.stringify(r.json) : r.text.slice(0, 300);
  console.log('GQL<' + label + '>', r.status, out.slice(0, 2600));
};
await gql('firewall-actions', `query{viewer{zones(filter:{zoneTag:"${tag}"}){firewallEventsAdaptiveGroups(limit:20,filter:{datetime_geq:"${A}",datetime_leq:"${B}"},orderBy:[count_DESC]){count dimensions{action source ruleId clientAsn}}}}}`);
await gql('status-by-asn', `query{viewer{zones(filter:{zoneTag:"${tag}"}){httpRequestsAdaptiveGroups(limit:20,filter:{datetime_geq:"${A}",datetime_leq:"${B}",clientRequestHTTPHost:"sastamilaga.com"},orderBy:[count_DESC]){count dimensions{edgeResponseStatus clientAsn clientCountryName}}}}}`);

// Probe from this runner (US/Azure) with and without a Googlebot user agent.
for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36']) {
  const res = await fetch('https://sastamilaga.com/?probe=' + Date.now(), { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(30000) });
  const body = (await res.text()).slice(0, 500).replace(/\s+/g, ' ');
  console.log('PROBE', ua.includes('Googlebot') ? 'googlebot' : 'browser', 'status=' + res.status, 'server=' + res.headers.get('server'), 'cf-mitigated=' + res.headers.get('cf-mitigated'), 'x-github=' + (res.headers.get('x-github-request-id') ? 'yes' : 'no'));
  console.log('PROBE_BODY ' + body);
}

for (const u of ['https://sastamilaga.com/sitemap.xml', 'https://sastamilaga.com/robots.txt']) {
  const res = await fetch(u + '?probe=' + Date.now(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, signal: AbortSignal.timeout(30000) });
  console.log('PROBE_URL', u, 'status=' + res.status, 'type=' + res.headers.get('content-type'), 'server=' + res.headers.get('server'));
}
console.log('DIAGNOSTIC_COMPLETE');
