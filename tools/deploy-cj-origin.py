"""Deploy only the reviewed CJ compatibility patch and additive MU bridge, atomically."""
from pathlib import Path
import subprocess,hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
SSH=['ssh','-T','-oBatchMode=yes','-oStrictHostKeyChecking=yes','-oConnectTimeout=15','-p','21098','altugpaa@162.0.232.232']
ORIGIN='/home/altugpaa/sastamilaga.com'
PRIVATE='/home/altugpaa/gdcs-private/cj-storefront-20261115'
def remote(cmd,body=None):
 r=subprocess.run(SSH+[cmd],input=body,capture_output=True,check=True);return r.stdout
api_path=ORIGIN+'/wp-content/plugins/global-dropshipping-commerce/includes/Api.php'
before=remote('cat '+api_path).decode()
anchor="$video_success=$path==='product/queryVideosByProductId' && ($body['success']??false)===true && isset($body['code']) && (int)$body['code']===0;"
replacement="$video_success=($path==='product/queryVideosByProductId' || ($method==='GET' && in_array($path,['product/globalWarehouseList','warehouse/list','warehouse/detail'],true))) && ($body['success']??false)===true && isset($body['code']) && (int)$body['code']===0 && isset($body['data']);"
if replacement in before:
 after=before
elif before.count(anchor)==1:
 after=before.replace(anchor,replacement)
else:raise RuntimeError('API compatibility anchor changed; no origin files modified')
bridge=(ROOT/'server/cj-storefront.php').read_bytes().replace(b'\r\n',b'\n')
remote('mkdir -p '+PRIVATE+' && chmod 700 '+PRIVATE)
remote('cat > '+PRIVATE+'/api-reviewed.php',after.encode())
remote('cat > '+PRIVATE+'/bridge-reviewed.php',bridge)
script=f'''set -eu
php_bin=/opt/alt/php82/usr/bin/php
"$php_bin" -l {PRIVATE}/api-reviewed.php
"$php_bin" -l {PRIVATE}/bridge-reviewed.php
test -f {api_path}
if ! test -f {PRIVATE}/Api.before.php; then cp -p {api_path} {PRIVATE}/Api.before.php; fi
mkdir -p {ORIGIN}/wp-content/mu-plugins
if test -f {ORIGIN}/wp-content/mu-plugins/sasta-cj-storefront.php; then cp -p {ORIGIN}/wp-content/mu-plugins/sasta-cj-storefront.php {PRIVATE}/bridge.before.php; fi
cp {PRIVATE}/api-reviewed.php {api_path}.sm-new
chmod 644 {api_path}.sm-new
mv -f {api_path}.sm-new {api_path}
cp {PRIVATE}/bridge-reviewed.php {ORIGIN}/wp-content/mu-plugins/sasta-cj-storefront.php.sm-new
chmod 644 {ORIGIN}/wp-content/mu-plugins/sasta-cj-storefront.php.sm-new
mv -f {ORIGIN}/wp-content/mu-plugins/sasta-cj-storefront.php.sm-new {ORIGIN}/wp-content/mu-plugins/sasta-cj-storefront.php
echo 'Additive CJ bridge deployed; checkout and credentials preserved.'
'''
print(remote('bash -s',script.encode()).decode())
print('API before SHA256',hashlib.sha256(before.encode()).hexdigest())
print('API after SHA256',hashlib.sha256(after.encode()).hexdigest())
