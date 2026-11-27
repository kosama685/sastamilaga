"""Narrow public-GET Google crawler exemption for Cloudflare-verified bots.

The rule trusts Cloudflare's own verified-bot validation (`cf.client.bot`), so it
keeps working when Google rotates or widens its crawler ranges. An earlier version
pinned Google's published IPs from common-crawlers.json, which covers only part of
the Googlebot ranges and not the sitemap fetcher, so real Googlebot requests kept
falling through to the managed ruleset and were answered with 403.

No global security setting and no existing rule is removed.
"""
import json, os, pathlib, urllib.request

BASE = 'https://api.cloudflare.com/client/v4'


def api(path, method='GET', body=None):
    headers = {'Authorization': 'Bearer ' + os.environ['CLOUDFLARE_API_TOKEN']}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(
        BASE + path,
        headers=headers,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=35) as r:
        d = json.load(r)
    if not d.get('success'):
        raise RuntimeError('Cloudflare API did not confirm success')
    return d['result']


GOOGLE_UAS = ['Googlebot', 'GoogleOther', 'Google-InspectionTool', 'Googlebot-Fetch', 'Storebot-Google', 'Google-Site-Verification']

expression = '(http.host in {"sastamilaga.com" "www.sastamilaga.com"} and cf.client.bot and (' + ' or '.join(
    'http.user_agent contains "%s"' % ua for ua in GOOGLE_UAS
) + ') and http.request.method in {"GET" "HEAD"}'
for prefix in ['/wp-admin', '/wp-login', '/wp-json', '/api/', '/wc-api', '/_sasta', '/smcs-oauth', '/cart', '/checkout', '/my-account', '/account', '/ur/cart', '/ur/checkout', '/ur/my-account', '/.git', '/private/', '/backup/', '/staging/', '/test/']:
    expression += ' and not starts_with(lower(http.request.uri.path),"' + prefix + '")'
expression += ' and not (starts_with(http.request.uri.path,"/wp-content/uploads/") and ends_with(http.request.uri.path,"/"))'
for key in ['add-to-cart', 'sm_buy_now', 'wc-ajax', 'rest_route', 'order_key', 'remove_item']:
    expression += ' and not (http.request.uri.query contains "' + key + '")'
expression += ')'
if len(expression) > 4096:
    raise RuntimeError('Expression exceeds the safe rule budget')

zones = api('/zones?name=sastamilaga.com')
zone = zones[0]['id']
sets = api(f'/zones/{zone}/rulesets')
entry = next(x for x in sets if x['phase'] == 'http_request_firewall_custom' and x['kind'] == 'zone')
path = f'/zones/{zone}/rulesets/{entry["id"]}'
before = api(path)
ref = 'sasta_verified_google_public_crawl_v1'
rule = {
    'ref': ref,
    'description': 'Verified Google crawlers (Cloudflare-verified bots): public read-only crawling; private and transactional routes excluded',
    'expression': expression,
    'action': 'skip',
    'action_parameters': {
        'ruleset': 'current',
        'phases': ['http_request_firewall_managed', 'http_ratelimit'],
        'products': ['bic', 'securityLevel'],
    },
    'logging': {'enabled': True},
    'enabled': True,
}
existing = next((x for x in before.get('rules', []) if x.get('ref') == ref), None)
if existing:
    api(path + '/rules/' + existing['id'], 'PATCH', rule)
else:
    if before.get('rules'):
        rule['position'] = {'before': before['rules'][0]['id']}
    api(path + '/rules', 'POST', rule)

after = api(path)
preserved = {x['id'] for x in before.get('rules', []) if x.get('ref') != ref}
assert preserved <= {x['id'] for x in after.get('rules', [])}
saved = next(x for x in after['rules'] if x.get('ref') == ref)
assert saved['expression'] == expression and saved['enabled']
assert 'ip.src in' not in saved['expression']
result = {
    'rule_id': saved['id'],
    'requires_cloudflare_verified_bot': True,
    'ip_list_dependency': 'none',
    'existing_rules_preserved': True,
    'private_routes_excluded': True,
    'google_user_agents': GOOGLE_UAS,
    'expression': saved['expression'],
}
pathlib.Path('artifacts').mkdir(exist_ok=True)
pathlib.Path('artifacts/googlebot-rule.json').write_text(json.dumps(result, indent=2))
print(json.dumps({k: v for k, v in result.items() if k != 'expression'}))
