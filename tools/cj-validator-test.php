<?php
// Pure validation tests: no WordPress boot, provider credentials or live writes.
define('ABSPATH',__DIR__);
function add_action(...$a){}function add_filter(...$a){}
function get_current_user_id(){return 10;}
function wc_get_order($id){return new class {function get_customer_id(){return 11;}};}
require __DIR__.'/../server/cj-storefront.php';
require __DIR__.'/../server/cj-account.php';
use Sasta\CJ\Bridge;
$cases=[['page'=>1001],['page'=>601,'size'=>10],['size'=>101],['countryCode'=>'SA,US'],['sort'=>'random'],['productType'=>99],['startSellPrice'=>50,'endSellPrice'=>10],['startWarehouseInventory'=>-1],['timeStart'=>100,'timeEnd'=>90],['unknown_filter'=>'silently-ignore'],['features'=>['fake_feature']]];
foreach($cases as $i=>$p){try{Bridge::listing_params($p);throw new RuntimeException('Invalid case accepted: '.$i);}catch(InvalidArgumentException $e){}}
$p=Bridge::listing_params(['page'=>1,'size'=>10,'productFlag'=>0,'countryCode'=>'SA','features'=>[]]);
if($p['productFlag']!==0||$p['countryCode']!=='SA'||$p['features']!==[])throw new RuntimeException('Valid filter values were changed.');
if(isset(Bridge::listing_params([])['countryCode']))throw new RuntimeException('An implicit warehouse country was inserted.');
foreach(Bridge::OPS as $op=>[$path,$method]){if(in_array($path,['product/list','logistic/getTrackInfo','shopping/order/createOrder','shopping/pay/payBalance'],true))throw new RuntimeException('Deprecated operation is registered.');if(!in_array($method,['GET','POST','PATCH'],true))throw new RuntimeException('Unverified HTTP method.');}
$items=[['lineItemId'=>'42','quantity'=>2,'price'=>9.5,'canChoose'=>true]];
$selected=\Sasta\CJ\Account::product_selection($items,[['lineItemId'=>'42','quantity'=>1,'price'=>0.01]]);
if($selected[0]['price']!==9.5)throw new RuntimeException('A customer changed the supplier case price.');
foreach([[['lineItemId'=>'wrong','quantity'=>1]],[['lineItemId'=>'42','quantity'=>3]]] as $bad){try{\Sasta\CJ\Account::product_selection($items,$bad);throw new RuntimeException('Invalid case product was accepted.');}catch(InvalidArgumentException $e){}}
try{\Sasta\CJ\Account::owned('123');throw new RuntimeException('Cross-customer order access was allowed.');}catch(InvalidArgumentException $e){}
echo "CJ validator: ".count($cases)." invalid cases rejected; valid zero/empty values preserved; all registered operations checked.\n";
