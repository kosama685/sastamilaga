// Read-only Cloudflare edge diagnostic. Prints only the zone id, recent firewall
// events and the custom/rate-limit rules, so the log stays small. No tokens printed.
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

const now = new Date();
const from = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
const gql = async (label, query) => {
  const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query }) });
  console.log('GQL<' + label + '>', r.status, (r.json ? JSON.stringify(r.json) : r.text.slice(0, 300)).slice(0, 2800));
};
const tag = zone.id;
await gql('events-by-rule', `{ viewer { zones(filter:{zoneTag:"${tag}"}) { firewallEventsAdaptiveGroups(limit:25, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}"}, orderBy:[count_DESC]) { count dimensions { action source ruleId edgeResponseStatus } } } } } }`);
await gql('403-by-asn', `{ viewer { zones(filter:{zoneTag:"${tag}"}) { httpRequestsAdaptiveGroups(limit:20, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}", clientRequestHTTPHost:"sastamilaga.com", edgeResponseStatus:403}, orderBy:[count_DESC]) { count dimensions { clientAsn clientCountryName } } } } } }`);
await gql('status-mix', `{ viewer { zones(filter:{zoneTag:"${tag}"}) { httpRequestsAdaptiveGroups(limit:15, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}", clientRequestHTTPHost:"sastamilaga.com"}, orderBy:[count_DESC]) { count dimensions { edgeResponseStatus } } } } } }`);

const sets = await api(`/zones/${zone.id}/rulesets`);
for (const item of sets.json?.result || []) {
  if (item.phase !== 'http_request_firewall_custom' && item.phase !== 'http_ratelimit') continue;
  console.log(`== PHASE ${item.phase} name=${item.name}`);
  const full = await api(`/zones/${zone.id}/rulesets/${item.id}`);
  const rules = full.json?.result?.rules || [];
  console.log('rule_count=' + rules.length);
  for (const rule of rules) {
    console.log('RULE ' + JSON.stringify({ ref: rule.ref, action: rule.action, enabled: rule.enabled, description: rule.description, expression: rule.expression }).slice(0, 1200));
  }
}
console.log('DIAGNOSTIC_COMPLETE');
