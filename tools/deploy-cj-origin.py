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
# Preserve refresh tokens and wait for the account-wide refresh already in flight.
old_lock="if (!Database::lock('cj_token',90)) { throw new ApiException('CJ authentication is already running. Try again shortly.', 'auth_busy',true); }"
new_lock="""if (!Database::lock('cj_token',90)) {
            $deadline=microtime(true)+10;
            do { usleep(150000);$ready=Vault::get('tokens');if(!empty($ready['accessToken'])&&strtotime($ready['accessTokenExpiryDate']??'')>time()+3600){return $ready['accessToken'];} } while(microtime(true)<$deadline);
            throw new ApiException('CJ authentication refresh did not finish. Try again shortly.','auth_busy',true);
        }"""
if old_lock in after:after=after.replace(old_lock,new_lock)
refresh_anchor="                Vault::forget('tokens');\n                return $this->raw($path,$params,$method,$this->token());"
refresh_next="""                $saved=Vault::get('tokens');$saved['accessTokenExpiryDate']='1970-01-01T00:00:00Z';Vault::put('tokens',$saved);
                try {$answer=$this->raw($path,$params,$method,$this->token());delete_option('smcj_auth_failures');return $answer;}
                catch(ApiException $again){$n=2+(int)get_option('smcj_auth_failures',0);update_option('smcj_auth_failures',$n,false);if($n>=2){Logger::write('error','cj.authentication_alarm',['failures'=>$n,'request_id'=>$this->last_response()['request_id']??null]);}throw $again;}"""
if refresh_anchor in after:after=after.replace(refresh_anchor,refresh_next)
if 'public function last_response()' not in after:
 after=after.replace('final class Api {','final class Api {\n    private array $requestTrace=[];\n    public function last_response(): array { return $this->requestTrace; }')
 trace_anchor="        update_option('gdcs_last_api',['http_status'"
 after=after.replace(trace_anchor,"        $this->requestTrace=['http_status'=>$http,'api_code'=>(string)($body['code']??$http),'request_id'=>$request_id,'time'=>gmdate('c'),'duration_ms'=>(int)((microtime(true)-$started)*1000)];\n"+trace_anchor)
guard="        if ((!($path==='shopping/pay/getBalance'&&$method==='GET') && preg_match('#(?:^|/)(?:pay|payment|payBalance[A-Za-z0-9]*|balancePayment[A-Za-z0-9]*)(?:/|$)#i',$path)) || (str_contains($path,'createOrder') && (int)($params['payType']??0)!==3)) { throw new ApiException('Manual CJ settlement is mandatory. Supplier payment API calls are disabled.','manual_settlement_required'); }"
scoped_guard="""        if (in_array($path,['product/list','logistic/getTrackInfo','shopping/order/createOrder','shopping/pay/payBalance'],true)) {throw new ApiException('This deprecated CJ endpoint is disabled.','deprecated_endpoint');}
        $confirmed_settlement=defined('SM_CJ_CONFIRMED_SETTLEMENT')&&SM_CJ_CONFIRMED_SETTLEMENT===true&&current_user_can('manage_options')&&in_array($path,['shopping/pay/payBalanceV2','shopping/order/createOrderV2','shopping/order/createOrderV3'],true);
        if (!$confirmed_settlement && ((!($path==='shopping/pay/getBalance'&&$method==='GET') && preg_match('#(?:^|/)(?:pay|payment|payBalance[A-Za-z0-9]*|balancePayment[A-Za-z0-9]*)(?:/|$)#i',$path)) || (str_contains($path,'createOrder') && (int)($params['payType']??0)!==3))) { throw new ApiException('Manual CJ settlement is mandatory. Supplier payment API calls are disabled.','manual_settlement_required'); }"""
if guard in after:after=after.replace(guard,scoped_guard)
elif '$confirmed_settlement=' not in after:raise RuntimeError('Supplier settlement guard changed; no deployment performed')
bridge=(ROOT/'server/cj-storefront.php').read_bytes().replace(b'\r\n',b'\n')
account=(ROOT/'server/cj-account.php').read_bytes().replace(b'\r\n',b'\n')
remote('mkdir -p '+PRIVATE+' && chmod 700 '+PRIVATE)
remote('cat > '+PRIVATE+'/api-reviewed.php',after.encode())
remote('cat > '+PRIVATE+'/bridge-reviewed.php',bridge)
remote('cat > '+PRIVATE+'/account-reviewed.php',account)
script=f'''set -eu
php_bin=/opt/alt/php82/usr/bin/php
"$php_bin" -l {PRIVATE}/api-reviewed.php
"$php_bin" -l {PRIVATE}/bridge-reviewed.php
"$php_bin" -l {PRIVATE}/account-reviewed.php
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
cp {PRIVATE}/account-reviewed.php {ORIGIN}/wp-content/mu-plugins/sasta-cj-account.php.sm-new
chmod 644 {ORIGIN}/wp-content/mu-plugins/sasta-cj-account.php.sm-new
mv -f {ORIGIN}/wp-content/mu-plugins/sasta-cj-account.php.sm-new {ORIGIN}/wp-content/mu-plugins/sasta-cj-account.php
echo 'Additive CJ bridge deployed; checkout and credentials preserved.'
'''
print(remote('bash -s',script.encode()).decode())
print('API before SHA256',hashlib.sha256(before.encode()).hexdigest())
print('API after SHA256',hashlib.sha256(after.encode()).hexdigest())
