<?php
/** Private customer order/support projection. No anonymous CJ order lookups. */
namespace Sasta\CJ;
defined('ABSPATH')||exit;
final class Account {
    static function boot(): void {
        add_action('parse_request',static function(){if(!isset($_GET['smcj_account_data']))return;nocache_headers();header('Cache-Control: private,no-store');header('Vary: Cookie');header('Content-Type: application/json; charset=utf-8');
            try{echo wp_json_encode(self::page(sanitize_key($_GET['smcj_account_data']),(string)($_GET['smcj_order']??'')));}catch(\Throwable $e){status_header($e instanceof \InvalidArgumentException?404:503);echo wp_json_encode(Bridge::error($e));}exit;},-10000);
        add_action('rest_api_init',static function(){register_rest_route(Bridge::NS,'/customer/(?P<action>[a-z-]+)',['methods'=>'POST','permission_callback'=>static function(){return get_current_user_id()>0?true:new \WP_Error('authentication_required','Sign in to manage your orders.',['status'=>401]);},'callback'=>static function($r){try{return new \WP_REST_Response(self::operation((string)$r['action'],(array)$r->get_json_params()),200,['Cache-Control'=>'private,no-store','Vary'=>'Cookie']);}catch(\Throwable $e){return new \WP_REST_Response(Bridge::error($e),$e instanceof \InvalidArgumentException?400:409,['Cache-Control'=>'private,no-store']);}}]);});
    }
    static function owned(string $number){
        $uid=get_current_user_id();if(!$uid||!ctype_digit($number))throw new \InvalidArgumentException('This order is unavailable.');
        $order=wc_get_order((int)$number);if(!$order||(int)$order->get_customer_id()!==$uid)throw new \InvalidArgumentException('This order is unavailable.');return $order;
    }
    static function shipments($order): array {
        global $wpdb;$rows=$wpdb->get_results($wpdb->prepare('SELECT id,origin,state,cj_order_id,order_number FROM '.\GDCS\Database::table('fulfillment').' WHERE order_id=%d ORDER BY id ASC',$order->get_id()),ARRAY_A);
        return is_array($rows)?$rows:[];
    }
    static function shipment($order,string $selected): array {foreach(self::shipments($order) as $s)if((string)$s['id']===$selected&&$s['cj_order_id'])return $s;throw new \InvalidArgumentException('This shipment is unavailable for the selected order.');}
    static function summary($o): array {return ['id'=>(string)$o->get_id(),'number'=>(string)$o->get_order_number(),'status'=>$o->get_status(),'status_label'=>wc_get_order_status_name($o->get_status()),'total'=>$o->get_total(),'currency'=>$o->get_currency(),'created_at'=>$o->get_date_created()?$o->get_date_created()->date(DATE_ATOM):null,'items'=>array_values(array_map(static fn($i)=>['name'=>$i->get_name(),'quantity'=>$i->get_quantity()],$o->get_items()))];}
    static function page(string $view,string $number=''): array {
        if(!get_current_user_id())return ['authenticated'=>false,'login_url'=>home_url('/my-account/')];
        $out=['authenticated'=>true,'nonce'=>wp_create_nonce('wp_rest'),'view'=>$view,'orders'=>[]];
        if($view==='settings'){$u=wp_get_current_user();$out['display_name']=$u->display_name;$out['account_url']=wc_get_account_endpoint_url('edit-account');return $out;}
        if($number===''){
            foreach(wc_get_orders(['customer_id'=>get_current_user_id(),'limit'=>20,'orderby'=>'date','order'=>'DESC']) as $o)$out['orders'][]=self::summary($o);return $out;
        }
        $order=self::owned($number);$out['order']=self::summary($order);$out['shipments']=[];
        foreach(self::shipments($order) as $s){$entry=['id'=>(string)$s['id'],'origin'=>$s['origin'],'state'=>$s['state'],'has_supplier_order'=>!empty($s['cj_order_id'])];
            if($s['cj_order_id'])try{
                $r=Bridge::call('order',['orderId'=>$s['cj_order_id']],true);$d=(array)$r['data'];$entry['requestId']=$r['requestId'];$entry['supplier_status']=$d['orderStatus']??$d['status']??null;
                $tracking=$d['trackNumber']??$d['trackingNumber']??'';$entry['tracking_number']=sanitize_text_field(is_scalar($tracking)?(string)$tracking:'');
                $code=(string)($d['cjOrderCode']??$d['orderCode']??'');if($code!==''){try{$logs=Bridge::call('order-logs',['orderCode'=>$code,'fullTimeline'=>true],true);$entry['timeline']=array_values(array_map(static fn($x)=>['time'=>$x['createDate']??'','status'=>$x['nodeName']??'','message'=>sanitize_text_field($x['logContent']??'')],(array)$logs['data']));}catch(\Throwable $e){$entry['timeline_error']=Bridge::error($e);}}
                if($entry['tracking_number']!=='')try{$track=Bridge::call('tracking',['trackNumber'=>$entry['tracking_number']],true);$entry['tracking']=$track['data'];}catch(\Throwable $e){$entry['tracking_error']=Bridge::error($e);}
                $list=Bridge::call('disputes',['orderId'=>$s['cj_order_id'],'pageNum'=>1,'pageSize'=>20],true);$entry['disputes']=array_values(array_map(static fn($x)=>array_intersect_key($x,array_flip(['disputeId','status','disputeReason','createDate','updateDate'])),(array)($list['data']['list']??[])));
            }catch(\Throwable $e){$entry['error']=Bridge::error($e);}
            $out['shipments'][]=$entry;
        }return $out;
    }
    static function product_selection(array $available,array $requested): array {
        if(!$requested||count($requested)>20)throw new \InvalidArgumentException('Select the affected products.');$out=[];
        foreach($requested as $p){$found=null;foreach($available as $a)if((string)($a['lineItemId']??'')===(string)($p['lineItemId']??'')&&!empty($a['canChoose']))$found=$a;
            $quantity=filter_var($p['quantity']??0,FILTER_VALIDATE_INT);if(!$found||!$quantity||$quantity<1||$quantity>(int)$found['quantity'])throw new \InvalidArgumentException('This product or quantity is not eligible for a case.');
            $out[]=['lineItemId'=>(string)$found['lineItemId'],'quantity'=>$quantity,'price'=>(float)$found['price']];
        }return $out;
    }
    static function operation(string $action,array $p): array {
        $order=self::owned((string)($p['order']??''));$shipment=self::shipment($order,(string)($p['shipment']??''));$cj=$shipment['cj_order_id'];
        if($action==='products'){$r=Bridge::call('dispute-products',['orderId'=>$cj],true);$items=array_values(array_map(static fn($x)=>array_intersect_key($x,array_flip(['lineItemId','quantity','cjProductName','cjImage','canChoose'])),(array)($r['data']['productInfoList']??[])));return ['products'=>$items,'requestId'=>$r['requestId']];}
        if($action==='confirm'){
            $r=Bridge::call('dispute-products',['orderId'=>$cj],true);$products=self::product_selection((array)($r['data']['productInfoList']??[]),(array)($p['products']??[]));
            $c=Bridge::call('dispute-confirm',['orderId'=>$cj,'productInfoList'=>$products],true);$d=(array)$c['data'];$token=wp_generate_uuid4();
            set_transient('smcj_case_'.$token,['uid'=>get_current_user_id(),'order'=>$order->get_id(),'shipment'=>(string)$shipment['id'],'cj'=>$cj,'products'=>$products,'business'=>'SM-'.wp_generate_uuid4(),'confirmation'=>$d],600);
            return ['confirmation'=>$token,'outcomes'=>$d['expectResultOptionList']??[],'reasons'=>$d['disputeReasonList']??[],'requestId'=>$c['requestId']];
        }
        if($action==='cancel'){
            $id=Bridge::id($p['disputeId']??'');$r=Bridge::call('disputes',['orderId'=>$cj,'disputeId'=>$id,'pageNum'=>1,'pageSize'=>20],true);$found=false;foreach($r['data']['list']??[] as $x)if((string)($x['disputeId']??'')===$id)$found=true;if(!$found)throw new \InvalidArgumentException('This case is unavailable.');
            return Bridge::call('dispute-cancel',['orderId'=>$cj,'disputeId'=>$id],true);
        }
        if($action==='create'){
            $token=Bridge::id($p['confirmation']??'');$c=get_transient('smcj_case_'.$token);if(!$c||(int)$c['uid']!==get_current_user_id()||(int)$c['order']!==$order->get_id()||$c['shipment']!==(string)$shipment['id'])throw new \InvalidArgumentException('Refresh the case eligibility before submitting.');
            $expect=(int)($p['expectType']??0);$allowed=array_map('intval',(array)($c['confirmation']['expectResultOptionList']??[]));$reasons=array_map('intval',array_column((array)($c['confirmation']['disputeReasonList']??[]),'disputeReasonId'));$reason=(int)($p['reason']??0);$message=trim(sanitize_textarea_field($p['message']??''));
            if(!in_array($expect,$allowed,true)||!in_array($reason,$reasons,true)||$message===''||mb_strlen($message)>500)throw new \InvalidArgumentException('Choose an available reason/outcome and describe the issue in up to 500 characters.');
            $key='smcj_case_submit_'.md5($c['business']);if(!add_option($key,['state'=>'started','at'=>time()],'','no'))throw new \RuntimeException('This submission already started. Check your order before submitting another case.');
            $images=[];$videos=[];$attachments=(array)($p['attachments']??[]);if(count($attachments)>3)throw new \InvalidArgumentException('Use at most three evidence attachments.');
            foreach($attachments as $url){if(!is_string($url)||strlen($url)>2000||!str_starts_with($url,'https://')||!wp_http_validate_url($url))throw new \InvalidArgumentException('Evidence must use a publicly accessible HTTPS URL.');$copy=Bridge::call('dispute-upload',['fileUrl'=>$url],true);$file=(array)$copy['data'];if(($file['fileType']??'')==='IMAGE')$images[]=$file['url'];elseif(($file['fileType']??'')==='VIDEO')$videos[]=$file['url'];else throw new \RuntimeException('The evidence file type could not be verified.');}
            $r=Bridge::call('dispute-create',['orderId'=>$cj,'businessDisputeId'=>$c['business'],'disputeReasonId'=>$reason,'expectType'=>$expect,'refundType'=>2,'messageText'=>$message,'imageUrl'=>$images,'videoUrl'=>$videos,'productInfoList'=>$c['products']],true);
            update_option($key,['state'=>'submitted','requestId'=>$r['requestId'],'at'=>time()],false);$order->add_order_note('Customer supplier case submitted. Reference '.$c['business'].'; API request '.$r['requestId']);delete_transient('smcj_case_'.$token);
            return ['submitted'=>true,'reference'=>$c['business'],'requestId'=>$r['requestId'],'message'=>'Your supplier case was submitted. Any buyer refund is reviewed separately against your store order and payment.'];
        }
        throw new \InvalidArgumentException('Unsupported customer action.');
    }
}
Account::boot();
