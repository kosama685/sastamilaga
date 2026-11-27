// Read-only Cloudflare edge diagnostic: custom WAF rules + recent firewall events only.
// Managed rulesets are deliberately skipped so the log stays small. Never prints tokens.
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
if (!zone) { console.log('ZONE_LOOKUP_FAILED', zones.status, zones.text.slice(0, 300)); process.exit(0); }
console.log('ZONE', zone.id, zone.plan?.name);

const sets = await api(`/zones/${zone.id}/rulesets`);
const interesting = (sets.json?.result || []).filter((x) => x.phase !== 'http_request_firewall_managed' && x.phase !== 'http_request_sanitize' && x.phase !== 'http_response_firewall_custom');
for (const item of interesting) {
  console.log(`== PHASE ${item.phase} kind=${item.kind} name=${item.name}`);
  const full = await api(`/zones/${zone.id}/rulesets/${item.id}`);
  for (const rule of full.json?.result?.rules || []) {
    console.log('RULE ' + JSON.stringify({
      phase: item.phase,
      ref: rule.ref,
      action: rule.action,
      enabled: rule.enabled,
      description: rule.description,
      expression: rule.expression,
      action_parameters: rule.action_parameters,
    }));
  }
}

const legacy = await api(`/zones/${zone.id}/firewall/rules?per_page=100`);
console.log('LEGACY_FIREWALL_RULES_STATUS', legacy.status, 'count=' + (legacy.json?.result?.length ?? 'n/a'));

const now = new Date();
const from = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
const gql = async (label, query) => {
  const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query }) });
  const payload = r.json ? JSON.stringify(r.json) : r.text.slice(0, 500);
  console.log('GRAPHQL<' + label + '>', r.status, payload.slice(0, 3500));
};
const tag = zone.id;
await gql('events-by-rule', `{ viewer { zones(filter:{zoneTag:"${tag}"}) { firewallEventsAdaptiveGroups(limit:40, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}"}, orderBy:[count_DESC]) { count dimensions { action source ruleId edgeResponseStatus clientRequestHTTPHost } } } } } }`);
await gql('requests-by-ua-asn', `{ viewer { zones(filter:{zoneTag:"${tag}"}) { httpRequestsAdaptiveGroups(limit:25, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}", clientRequestHTTPHost:"sastamilaga.com", edgeResponseStatus:403}, orderBy:[count_DESC]) { count dimensions { clientAsn clientCountryName edgeResponseStatus clientRequestPath } } } } } }`);
await gql('all-status', `{ viewer { zones(filter:{zoneTag:"${tag}"}) { httpRequestsAdaptiveGroups(limit:20, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}", clientRequestHTTPHost:"sastamilaga.com"}, orderBy:[count_DESC]) { count dimensions { edgeResponseStatus clientCountryName } } } } } }`);
console.log('DIAGNOSTIC_COMPLETE');
