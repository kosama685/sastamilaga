<?php
namespace GDCS {
    final class Api {public static array $calls=[];function request($path,$params,$method){self::$calls[]=[$path,$method,$params];return ['fixture'=>true];}function last_response(){return ['request_id'=>'unit-test-reference','api_code'=>'200'];}}
    final class Database {static function lock(...$a){return true;}static function unlock(...$a){}}
}
namespace {
define('ABSPATH',__DIR__);
function add_action(...$a){}function add_filter(...$a){}
function wp_json_encode($x){return json_encode($x);}
function get_transient($key){return $GLOBALS['smcj_test_cache'][$key]??false;}
function set_transient($key,$value,$ttl){$GLOBALS['smcj_test_cache'][$key]=$value;}
function get_option($key,$default=[]){return $default;}
function current_user_can($cap){return false;}
class WP_REST_Response {public function __construct(public $data,public $status=200,public $headers=[]) {}}
require __DIR__.'/../server/cj-storefront.php';
$seed=['pid'=>'PID-123','vid'=>'VID-123','id'=>'WAREHOUSE-1','orderId'=>'ORDER-1','shipmentOrderId'=>'SHIPMENT-1','businessDisputeId'=>'CASE-1','disputeId'=>'DISPUTE-1','orderCode'=>'SD-1','orderNumber'=>'SM-TEST-1','payType'=>3,'products'=>[['vid'=>'VID-1','quantity'=>1]],'productInfoList'=>[['lineItemId'=>'LINE-1','quantity'=>1,'price'=>10]],'startCountryCode'=>'CN','endCountryCode'=>'SA','sku'=>'SKU-1','logisticsName'=>'API METHOD','trackNumber'=>'TRACK-1','trackNumbers'=>['TRACK-1'],'disputeReasonId'=>1,'expectType'=>1,'refundType'=>2,'messageText'=>'Test fixture only','fileUrl'=>'https://example.com/evidence.jpg','reqDTOS'=>[['srcAreaCode'=>'CN','destAreaCode'=>'SA','weight'=>100,'volume'=>120,'productProp'=>['COMMON']]]];
$checked=0;
foreach(\Sasta\CJ\Bridge::OPS as $op=>[$path,$method,$required]){
    $p=[];foreach($required as $key)$p[$key]=$seed[$key]??'test';
    $result=\Sasta\CJ\Bridge::call($op,$p,true);$actual=end(\GDCS\Api::$calls);
    if($actual[0]!==$path||$actual[1]!==$method||$result['requestId']!=='unit-test-reference')throw new \RuntimeException('Contract mismatch: '.$op);
    foreach($required as $key){$invalid=$p;unset($invalid[$key]);$before=count(\GDCS\Api::$calls);try{\Sasta\CJ\Bridge::call($op,$invalid,true);throw new \RuntimeException('Required field accepted: '.$op.' '.$key);}catch(\InvalidArgumentException $e){}if(count(\GDCS\Api::$calls)!==$before)throw new \RuntimeException('Invalid request reached provider.');}
    $checked++;
}
$bad=[['freight-accurate',['reqDTOS'=>[['srcAreaCode'=>'CN','destAreaCode'=>'SA','weight'=>0,'volume'=>1,'productProp'=>['COMMON']]]]],['freight',['startCountryCode'=>'CN','endCountryCode'=>'SA','products'=>[['vid'=>'VID-1','quantity'=>0]]]],['disputes',['startDate'=>0,'endDate'=>91*86400000]],['disputes',['updateDateFrom'=>0,'updateDateTo'=>32*86400000]]];
foreach($bad as [$op,$p]){try{\Sasta\CJ\Bridge::call($op,$p,true);throw new \RuntimeException('Invalid operational payload accepted.');}catch(\InvalidArgumentException $e){}}
echo $checked." endpoint contracts checked, including methods, mandatory fields and request references. Invalid freight, stock quantity and dispute date windows rejected before network I/O.\n";
}
