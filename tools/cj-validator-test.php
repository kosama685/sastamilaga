<?php
// Pure validation tests: no WordPress boot, provider credentials or live writes.
define('ABSPATH',__DIR__);
function add_action(...$a){}function add_filter(...$a){}
require __DIR__.'/../server/cj-storefront.php';
use Sasta\CJ\Bridge;
$cases=[['page'=>1001],['page'=>601,'size'=>10],['size'=>101],['countryCode'=>'SA,US'],['sort'=>'random'],['productType'=>99],['startSellPrice'=>50,'endSellPrice'=>10],['startWarehouseInventory'=>-1],['timeStart'=>100,'timeEnd'=>90],['unknown_filter'=>'silently-ignore'],['features'=>['fake_feature']]];
foreach($cases as $i=>$p){try{Bridge::listing_params($p);throw new RuntimeException('Invalid case accepted: '.$i);}catch(InvalidArgumentException $e){}}
$p=Bridge::listing_params(['page'=>1,'size'=>10,'productFlag'=>0,'countryCode'=>'SA','features'=>[]]);
if($p['productFlag']!==0||$p['countryCode']!=='SA'||$p['features']!==[])throw new RuntimeException('Valid filter values were changed.');
if(isset(Bridge::listing_params([])['countryCode']))throw new RuntimeException('An implicit warehouse country was inserted.');
foreach(Bridge::OPS as $op=>[$path,$method]){if(in_array($path,['product/list','logistic/getTrackInfo','shopping/order/createOrder','shopping/pay/payBalance'],true))throw new RuntimeException('Deprecated operation is registered.');if(!in_array($method,['GET','POST','PATCH'],true))throw new RuntimeException('Unverified HTTP method.');}
echo "CJ validator: ".count($cases)." invalid cases rejected; valid zero/empty values preserved; all registered operations checked.\n";
