<?php
/** Explicit consent, double opt-in and encrypted subscriber records. No campaign is sent here. */
namespace Sasta\CJ;
defined('ABSPATH')||exit;
final class Newsletter {
 static function boot(): void {
  add_action('rest_api_init',static function(){register_rest_route(Bridge::NS,'/newsletter',['methods'=>'POST','permission_callback'=>[\GDCS\Storefront::class,'csrf_check'],'callback'=>[self::class,'request']]);});
  add_action('parse_request',static function(){foreach(['smcj_newsletter_confirm','smcj_newsletter_remove'] as $action)if(isset($_GET[$action])){nocache_headers();header('X-Robots-Tag: noindex,nofollow');$token=(string)$_GET[$action];$ok=false;
   if(preg_match('/^[a-f0-9]{64}$/D',$token)){$key='newsletter_token_'.hash('sha256',$token);$record=\GDCS\Vault::get($key);if($record&&($record['expires']??0)>time()&&(($record['purpose']??'confirm')===($action==='smcj_newsletter_remove'?'remove':'confirm'))){$subscriber='newsletter_'.hash_hmac('sha256',$record['email'],wp_salt('auth'));if($action==='smcj_newsletter_remove')\GDCS\Vault::forget($subscriber);else \GDCS\Vault::put($subscriber,['email'=>$record['email'],'country'=>$record['country'],'consent'=>'newsletter_double_opt_in','confirmed_at'=>gmdate('c')]);\GDCS\Vault::forget($key);$ok=true;}}
   wp_die($ok?($action==='smcj_newsletter_remove'?'You have been unsubscribed.':'Your newsletter subscription is confirmed.'):'This link is invalid or expired. Please request a new confirmation.', 'Sasta Milaga newsletter',['response'=>$ok?200:400]);exit;}},-9999);
 }
 static function request($request){
  try{$p=(array)$request->get_json_params();$email=strtolower(trim((string)($p['email']??'')));if(!is_email($email)||strlen($email)>254||($p['consent']??false)!==true)throw new \InvalidArgumentException('Enter a valid email address and agree to receive the newsletter.');
   $ip=(string)($_SERVER['HTTP_CF_CONNECTING_IP']??$_SERVER['REMOTE_ADDR']??'');$rate='smcj_newsletter_rate_'.hash('sha256',$ip.gmdate('YmdH'));$used=(int)get_transient($rate);if($used>=3)return new \WP_REST_Response(['message'=>'Please wait before requesting another confirmation.'],429,['Cache-Control'=>'no-store']);set_transient($rate,$used+1,3600);
   $token=bin2hex(random_bytes(32));$remove=bin2hex(random_bytes(32));$record=['email'=>$email,'country'=>preg_match('/^[A-Z]{2}$/D',(string)($p['country']??''))?$p['country']:'','expires'=>time()+DAY_IN_SECONDS];
   \GDCS\Vault::put('newsletter_token_'.hash('sha256',$token),$record);\GDCS\Vault::put('newsletter_token_'.hash('sha256',$remove),$record+['purpose'=>'remove']);
   $confirm=add_query_arg('smcj_newsletter_confirm',$token,home_url('/'));$unsubscribe=add_query_arg('smcj_newsletter_remove',$remove,home_url('/'));
   $sent=wp_mail($email,'Confirm your Sasta Milaga newsletter subscription',"You requested shopping updates from Sasta Milaga. Confirm within 24 hours:\n".$confirm."\n\nIf you did not request this, ignore this email. To cancel this request:\n".$unsubscribe."\n\nPrivacy: ".home_url('/privacy/'));
   if(!$sent){\GDCS\Vault::forget('newsletter_token_'.hash('sha256',$token));\GDCS\Vault::forget('newsletter_token_'.hash('sha256',$remove));throw new \RuntimeException('Confirmation delivery is unavailable. Please try again later.');}
   return new \WP_REST_Response(['accepted'=>true,'message'=>'Check your email and confirm within 24 hours. You are not subscribed until you confirm.'],202,['Cache-Control'=>'private,no-store']);
  }catch(\Throwable $e){return new \WP_REST_Response(['message'=>$e instanceof \InvalidArgumentException?$e->getMessage():'Confirmation delivery is unavailable. Please try again later.'],$e instanceof \InvalidArgumentException?400:503,['Cache-Control'=>'no-store']);}
 }
}
Newsletter::boot();
