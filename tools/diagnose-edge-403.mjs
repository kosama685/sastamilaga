// Read-only Cloudflare edge diagnostic for "Googlebot gets 403" investigations.
// Prints rule expressions, actions and zone settings. Never prints tokens.
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token) throw new Error('CLOUDFLARE_API_TOKEN unavailable');

const BASE = 'https://api.cloudflare.com/client/v4';

async function api(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

const zones = await api('/zones?name=sastamilaga.com');
const zone = zones.json?.result?.[0];
if (!zone) {
  console.log('ZONE_LOOKUP_FAILED', zones.status, zones.text.slice(0, 400));
  process.exit(0);
}
console.log('ZONE', zone.id, zone.name, 'plan=' + (zone.plan?.name || '?'), 'status=' + zone.status);

// 1. Zone-wide security settings that can produce 403s.
for (const setting of ['security_level', 'browser_check', 'challenge_ttl', 'privacy_pass', 'ssl']) {
  const r = await api(`/zones/${zone.id}/settings/${setting}`);
  console.log(`SETTING ${setting}:`, r.status, JSON.stringify(r.json?.result ?? r.text.slice(0, 200)));
}

// 2. Bot management (if the plan exposes it).
const bot = await api(`/zones/${zone.id}/bot_management`);
console.log('BOT_MANAGEMENT:', bot.status, JSON.stringify(bot.json?.result ?? bot.text.slice(0, 300)));

// 3. Every ruleset and its rules.
const sets = await api(`/zones/${zone.id}/rulesets`);
console.log('RULESET_LIST_STATUS', sets.status);
for (const item of sets.json?.result || []) {
  console.log(`RULESET phase=${item.phase} kind=${item.kind} name=${item.name} id=${item.id} version=${item.version}`);
  if (!['http_request_firewall_custom', 'http_request_firewall_managed', 'http_ratelimit', 'http_request_transform', 'http_request_dynamic_redirect', 'http_request_redirect', 'http_request_sanitize'].includes(item.phase)) continue;
  const full = await api(`/zones/${zone.id}/rulesets/${item.id}`);
  for (const rule of full.json?.result?.rules || []) {
    console.log(JSON.stringify({
      phase: item.phase,
      id: rule.id,
      ref: rule.ref,
      action: rule.action,
      enabled: rule.enabled,
      description: rule.description,
      expression: rule.expression,
      action_parameters: rule.action_parameters,
    }));
  }
}

// 4. Legacy firewall rules API.
const legacy = await api(`/zones/${zone.id}/firewall/rules?per_page=100`);
console.log('LEGACY_FIREWALL_RULES:', legacy.status, JSON.stringify(legacy.json?.result ?? legacy.text.slice(0, 300)).slice(0, 3000));

// 5. Managed challenge/bot products that block outside rulesets.
for (const path of ['/zones/' + zone.id + '/settings/bot_fight_mode', '/zones/' + zone.id + '/settings/security_header']) {
  const r = await api(path);
  if (r.status === 200) console.log('EXTRA', path, JSON.stringify(r.json?.result));
}

// 6. Recent firewall events for Googlebot user agents.
const now = new Date();
const from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
const gql = async (query) => {
  const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query }) });
  console.log('GRAPHQL', r.status, r.json ? JSON.stringify(r.json).slice(0, 4000) : r.text.slice(0, 600));
  return r.json;
};
const tag = zone.id;
await gql(`{ viewer { zones(filter:{zoneTag:"${tag}"}) { firewallEventsAdaptive(limit:50, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}", clientRequestHTTPHost:"sastamilaga.com"}, orderBy:[count_DESC]) { count dimensions { action source ruleId clientAsn clientCountryName clientRequestPath clientRequestHTTPHost } } } } } }`);
await gql(`{ viewer { zones(filter:{zoneTag:"${tag}"}) { firewallEventsAdaptiveGroups(limit:50, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}"}, orderBy:[count_DESC]) { count dimensions { action source ruleId edgeResponseStatus clientRequestHTTPHost } } } } } }`);
await gql(`{ viewer { zones(filter:{zoneTag:"${tag}"}) { httpRequestsAdaptiveGroups(limit:30, filter:{datetime_geq:"${from.toISOString()}", datetime_leq:"${now.toISOString()}", clientRequestHTTPHost:"sastamilaga.com"}, orderBy:[count_DESC]) { count dimensions { edgeResponseStatus clientCountryName } } } } } }`);

console.log('DIAGNOSTIC_COMPLETE');
