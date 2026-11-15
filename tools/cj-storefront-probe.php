<?php
// Read-only deployment probe. Never returns credentials, account profile or orders.
$api=new \GDCS\Api();$out=['at'=>gmdate('c'),'checkout_ready'=>\GDCS\VirtualCheckout::ready(),'calls'=>[]];
foreach(['categories'=>['product/getCategory',[]],'list'=>['product/listV2',['page'=>1,'size'=>10,'features'=>['enable_category','enable_description']]],'warehouses'=>['product/globalWarehouseList',[]]] as $key=>[$path,$params]){
 try{$data=$api->request($path,$params);$out['calls'][$key]=['ok'=>true,'data'=>$data,'trace'=>get_option('gdcs_last_api',[])];}
 catch(Throwable $e){$out['calls'][$key]=['ok'=>false,'code'=>$e instanceof \GDCS\ApiException?$e->reason:get_class($e),'message'=>$e->getMessage(),'trace'=>get_option('gdcs_last_api',[])];}
}
echo wp_json_encode($out,JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
