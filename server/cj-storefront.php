<?php
/** Plugin Name: Sasta Milaga CJ Storefront Bridge
 * Public catalog reads, API provenance and merchant-only operations.
 * Credentials and supplier settlement remain in the existing GDCS service.
 */
namespace Sasta\CJ;
defined('ABSPATH') || exit;

final class Bridge {
    private static array $currentTrace=[];
    const VERSION='2026.11.15.1';
    const NS='sm-cj/v1';
    const OPS=[
        'settings'=>['setting/get','GET',[],3600,'admin'],
        'categories'=>['product/getCategory','GET',[],3600,'public'],
        'list'=>['product/listV2','GET',[],300,'public'],
        'warehouses'=>['product/globalWarehouseList','GET',[],3600,'public'],
        'product'=>['product/query','GET',['pid'],300,'public'],
        'variants'=>['product/variant/query','GET',['pid'],300,'public'],
        'variant'=>['product/variant/queryByVid','GET',['vid'],60,'public'],
        'stock'=>['product/stock/queryByVid','GET',['vid'],30,'public'],
        'warehouse'=>['warehouse/detail','GET',['id'],3600,'public'],
        'storage'=>['warehouse/list','GET',[],3600,'public'],
        'freight'=>['logistic/freightCalculate','POST',['startCountryCode','endCountryCode','products'],120,'quote'],
        'freight-accurate'=>['logistic/freightCalculateTip','POST',['reqDTOS'],120,'quote'],
        'freight-diagnostics'=>['logistic/unavailableShippingMethods','POST',['reqDTOS'],120,'admin'],
        'shipping-methods'=>['logistic/getAvailableLogistics','POST',['sku','startCountryCode'],300,'admin'],
        'shipping-countries'=>['logistic/getReachableCountry','POST',['sku','logisticsName'],3600,'admin'],
        'tracking'=>['logistic/trackInfo','GET',['trackNumber'],60,'admin'],
        'tracking-replacement'=>['logistic/getOrderTrackHistory','POST',['trackNumbers'],60,'admin'],
        'create-v3'=>['shopping/order/createOrderV3','POST',['orderNumber','products','payType'],0,'admin'],
        'create-v2'=>['shopping/order/createOrderV2','POST',['orderNumber','products','payType'],0,'admin'],
        'orders'=>['shopping/order/list','GET',[],0,'admin'],
        'order'=>['shopping/order/getOrderDetail','GET',['orderId'],0,'admin'],
        'confirm-order'=>['shopping/order/confirmOrder','PATCH',['orderId'],0,'admin'],
        'balance'=>['shopping/pay/getBalance','GET',[],0,'admin'],
        'pay-balance'=>['shopping/pay/payBalanceV2','POST',['shipmentOrderId'],0,'admin'],
        'dispute-products'=>['disputes/disputeProducts','GET',['orderId'],0,'admin'],
        'dispute-confirm'=>['disputes/disputeConfirmInfo','POST',['orderId','productInfoList'],0,'admin'],
        'dispute-create'=>['disputes/create','POST',['orderId','businessDisputeId','disputeReasonId','expectType','refundType','messageText','productInfoList'],0,'admin'],
        'dispute-upload'=>['disputes/uploadFile','POST',['fileUrl'],0,'admin'],
        'dispute-cancel'=>['disputes/cancel','POST',['orderId','disputeId'],0,'admin'],
        'disputes'=>['disputes/getDisputeList','GET',[],0,'admin'],
        'order-logs'=>['shopping/order/queryOrderLog','POST',['orderCode'],0,'admin'],
        'api-logs'=>['apiCallLog/queryPage','POST',[],0,'admin'],
        'connection-logs'=>['product/conn/connectionLog/queryPage','POST',[],0,'admin'],
    ];
    const LIST_KEYS=['keyWord','page','size','categoryId','lv2categoryList','lv3categoryList','countryCode','startSellPrice','endSellPrice','addMarkStatus','productType','productFlag','startWarehouseInventory','endWarehouseInventory','verifiedWarehouse','timeStart','timeEnd','zonePlatform','isWarehouse','sort','orderBy','features','supplierId','hasCertification','isSelfPickup','customization'];
    static function boot(): void {
        add_action('woocommerce_after_checkout_validation',[self::class,'checkout_stock'],100,2);
        add_action('rest_api_init',static function(){
            foreach(['bootstrap','home','listing','detail','inventory','shipping','sitemap'] as $name) register_rest_route(self::NS,'/'.$name,['methods'=>$name==='shipping'?'POST':'GET','permission_callback'=>$name==='shipping'?[\GDCS\Storefront::class,'csrf_check']:'__return_true','callback'=>static function($r)use($name){return self::response($name,$r);}]);
            register_rest_route(self::NS,'/merchant/(?P<operation>[a-z0-9-]+)',['methods'=>'GET,POST','permission_callback'=>[\GDCS\Rest::class,'permission'],'callback'=>static function($r){return self::merchant($r);}]);
        });
        add_action('admin_menu',static function(){add_submenu_page('woocommerce','CJ API operations','CJ API operations','manage_woocommerce','sm-cj-operations',[self::class,'admin']);});
        add_action('sm_cj_refresh_home',[self::class,'warm']);
        add_filter('cron_schedules',static function($s){$s['sm_cj_five_minutes']=['interval'=>300,'display'=>'CJ active storefront refresh'];return $s;});
        add_action('init',static function(){if(!wp_next_scheduled('sm_cj_refresh_home'))wp_schedule_event(time()+300,'sm_cj_five_minutes','sm_cj_refresh_home');});
    }
    static function id($id): string {if(!is_scalar($id)||!preg_match('/^[A-Za-z0-9-]{1,100}$/D',(string)$id))throw new \InvalidArgumentException('Invalid supplier identifier.');return (string)$id;}
    static function trace(): array {return self::$currentTrace?:((array)get_option('gdcs_last_api',[]));}
    static function call(string $op,array $params=[],bool $fresh=false): array {
        if(!isset(self::OPS[$op]))throw new \InvalidArgumentException('Unsupported operation.');
        [$path,$method,$required,$ttl,$access]=self::OPS[$op];
        foreach($required as $key)if(!isset($params[$key])||$params[$key]===''||$params[$key]===[])throw new \InvalidArgumentException('Missing '.$key.'.');
        self::validate_operation($op,$params);
        if($op==='list')$params=self::listing_params($params);
        ksort($params);$key='smcj_'.md5($op.wp_json_encode($params));
        if(!$fresh&&$ttl&&($hit=get_transient($key))!==false){$hit['cache']='hit';return $hit;}
        if(!\GDCS\Database::lock($key,50)){
            for($i=0;$i<20;$i++){usleep(150000);if(($hit=get_transient($key))!==false){$hit['cache']='coalesced';return $hit;}}
            throw new \RuntimeException('This supplier request is already running. Retry shortly.');
        }
        try{
            $api=new \GDCS\Api();try{$data=$api->request($path,$params,$method);}finally{self::$currentTrace=method_exists($api,'last_response')?$api->last_response():(array)get_option('gdcs_last_api',[]);}
            $trace=self::trace();$result=['data'=>$data,'checked_at'=>gmdate('c'),'expires_at'=>gmdate('c',time()+$ttl),'requestId'=>$trace['request_id']??null,'endpoint'=>$path,'cache'=>'miss'];
            if($ttl)set_transient($key,$result,$ttl);
            return $result;
        }finally{\GDCS\Database::unlock($key);}
    }
    static function listing_params(array $p): array {
        $unknown=array_diff(array_keys($p),self::LIST_KEYS);if($unknown)throw new \InvalidArgumentException('Unsupported CJ filter: '.reset($unknown));
        $out=[];
        foreach($p as $key=>$v){
            if($v===''||$v===null)continue;
            if(in_array($key,['features','lv2categoryList','lv3categoryList'],true)){
                $a=is_array($v)?$v:explode(',',(string)$v);if(count($a)>30)throw new \InvalidArgumentException('Too many '.$key.' values.');
                $out[$key]=array_values(array_unique(array_map(static function($x)use($key){if(!is_scalar($x)||strlen((string)$x)>100)throw new \InvalidArgumentException('Invalid list filter.');if($key==='features'&&!in_array($x,['enable_description','enable_category','enable_combine','enable_video'],true))throw new \InvalidArgumentException('Invalid feature.');return (string)$x;},$a)));continue;
            }
            if(!is_scalar($v)||strlen((string)$v)>200)throw new \InvalidArgumentException('Invalid '.$key.'.');
            $out[$key]=(string)$v;
        }
        foreach(['page'=>[1,1000,1],'size'=>[1,100,10],'orderBy'=>[0,4,0],'productFlag'=>[0,3,null],'verifiedWarehouse'=>[0,2,null],'addMarkStatus'=>[0,1,null]] as $k=>[$min,$max,$default]){
            if(!isset($out[$k])){if($default!==null)$out[$k]=$default;continue;}
            $n=filter_var($out[$k],FILTER_VALIDATE_INT);if($n===false||$n<$min||$n>$max)throw new \InvalidArgumentException('Invalid '.$k.' range.');$out[$k]=$n;
        }
        if(isset($out['countryCode'])&&!preg_match('/^[A-Z]{2}$/D',$out['countryCode']))throw new \InvalidArgumentException('Choose a valid ship-from country.');
        if(isset($out['sort'])&&!in_array($out['sort'],['asc','desc'],true))throw new \InvalidArgumentException('Invalid sort direction.');
        if(isset($out['productType'])&&!in_array((int)$out['productType'],[4,10,11],true))throw new \InvalidArgumentException('Invalid product type.');
        foreach(['startSellPrice','endSellPrice','startWarehouseInventory','endWarehouseInventory','timeStart','timeEnd'] as $k)if(isset($out[$k])&&(!is_numeric($out[$k])||(float)$out[$k]<0))throw new \InvalidArgumentException('Invalid '.$k.'.');
        foreach([['startSellPrice','endSellPrice'],['startWarehouseInventory','endWarehouseInventory'],['timeStart','timeEnd']] as [$a,$b])if(isset($out[$a],$out[$b])&&(float)$out[$a]>(float)$out[$b])throw new \InvalidArgumentException('Minimum must not exceed maximum.');
        if((int)$out['page']*(int)$out['size']>6000)throw new \InvalidArgumentException('This search is capped at 6,000 records. Narrow the category or listing dates.');
        return $out;
    }
    static function validate_operation(string $op,array $p): void {
        foreach(['pid','vid','orderId','disputeId','shipmentOrderId','businessDisputeId','orderCode','id'] as $key)if(isset($p[$key]))self::id($p[$key]);
        if(strlen(wp_json_encode($p))>65536)throw new \InvalidArgumentException('The supplier request is too large.');
        if(isset($p['orderNumber'])&&(!is_scalar($p['orderNumber'])||strlen((string)$p['orderNumber'])>50))throw new \InvalidArgumentException('Order numbers must be 50 characters or fewer.');
        foreach(['countryCode','startCountryCode','endCountryCode','destCountryCode','fromCountryCode','shippingCountryCode'] as $k)if(isset($p[$k])&&(!is_string($p[$k])||!preg_match('/^[A-Z]{2}$/D',$p[$k])))throw new \InvalidArgumentException('Invalid country code in '.$k.'.');
        if(isset($p['products'])){if(!is_array($p['products'])||count($p['products'])>100)throw new \InvalidArgumentException('Use at most 100 product lines.');foreach($p['products'] as $line){self::id($line['vid']??'');$q=filter_var($line['quantity']??0,FILTER_VALIDATE_INT);if(!$q||$q<1||$q>100)throw new \InvalidArgumentException('Use a quantity between 1 and 100.');}}
        if(isset($p['shippingMode'])&&(int)$p['shippingMode']===1&&empty($p['platforms']))throw new \InvalidArgumentException('Platform logistics requires platforms.');
        if(isset($p['reqDTOS'])){if(!is_array($p['reqDTOS'])||!$p['reqDTOS']||count($p['reqDTOS'])>20)throw new \InvalidArgumentException('Choose 1 to 20 shipping groups.');foreach($p['reqDTOS'] as $i=>$row){foreach(['weight','volume'] as $field)if(!isset($row[$field])||!is_numeric($row[$field])||!is_finite((float)$row[$field])||(float)$row[$field]<=0)throw new \InvalidArgumentException('reqDTOS['.$i.'].'.$field.' must be greater than 0.');foreach(['srcAreaCode','destAreaCode'] as $field)if(!preg_match('/^[A-Z]{2}$/D',(string)($row[$field]??'')))throw new \InvalidArgumentException('Missing valid '.$field.'.');if(empty($row['productProp']))throw new \InvalidArgumentException('Supplier logistics properties are required.');}}
        if(isset($p['trackNumbers'])&&(!is_array($p['trackNumbers'])||count($p['trackNumbers'])<1||count($p['trackNumbers'])>10))throw new \InvalidArgumentException('Use 1 to 10 tracking numbers.');
        foreach([['startDate','endDate',90],['updateDateFrom','updateDateTo',31]] as [$start,$end,$days])if(isset($p[$start])||isset($p[$end])){if(!isset($p[$start],$p[$end])||!is_numeric($p[$start])||!is_numeric($p[$end])||(float)$p[$end]<(float)$p[$start]||(float)$p[$end]-(float)$p[$start]>$days*86400000)throw new \InvalidArgumentException('Use paired dates within '.$days.' days.');}
        if($op==='dispute-create'&&(!in_array((int)$p['expectType'],[1,2],true)||!in_array((int)$p['refundType'],[1,2],true)||!is_string($p['messageText'])||mb_strlen($p['messageText'])>500))throw new \InvalidArgumentException('Choose valid dispute options and a message of up to 500 characters.');
    }
    static function price(float $usd): ?float {
        if($usd<=0)return null;
        $p=\GDCS\Pricing::preview($usd,['country'=>'']);return round(\GDCS\Currency::convert((float)$p['retail'],(string)$p['currency'],'USD'),2);
    }
    static function row(array $r): array {
        $raw=$r['sellPrice']??null;$min=null;$max=null;
        if(is_numeric($raw))$min=$max=(float)$raw;
        elseif(is_string($raw)&&preg_match('/^([0-9.]+)\s*--?\s*([0-9.]+)$/D',$raw,$m)){ $min=(float)$m[1];$max=(float)$m[2]; }
        return ['id'=>self::id($r['id']??$r['pid']??''),'name'=>sanitize_text_field($r['nameEn']??$r['productNameEn']??''),'image'=>\GDCS\LiveCatalog::image($r['bigImage']??$r['productImage']??''),'price'=> $min!==null?self::price($min):null,'max_price'=>$max!==null?self::price($max):null,'sku'=>sanitize_text_field($r['sku']??''),'category_id'=>$r['categoryId']??'','category_name'=>$r['threeCategoryName']??'','supplier'=>$r['supplierName']??null,'free_shipping'=>(int)($r['addMarkStatus']??0)===1,'video'=>(bool)($r['isVideo']??$r['isVedio']??false),'listed'=>$r['listedNum']??null,'origin'=>$r['countryCode']??null,'verifiedWarehouse'=>$r['verifiedWarehouse']??null,'description'=>wp_strip_all_tags((string)($r['description']??''))];
    }
    static function bootstrap(): array {
        $categories=self::call('categories');$warehouses=self::call('warehouses');
        $rates=[];foreach(\GDCS\Currency::supported() as $c){try{$rates[$c]=\GDCS\Currency::rate_info($c);}catch(\Throwable $e){}}
        $country_currency=[];foreach(WC()->countries->get_countries() as $code=>$label){$currency=\GDCS\Currency::suggest($code);$country_currency[$code]=$code!=='PK'&&$currency==='PKR'?'USD':$currency;}
        return ['version'=>self::VERSION,'categories'=>$categories,'warehouses'=>$warehouses,'currencies'=>array_keys($rates),'exchange_rates'=>$rates,'countries'=>WC()->countries->get_countries(),'country_currency'=>$country_currency,'currency_source'=>'store exchange-rate provider','checkout_ready'=>\GDCS\VirtualCheckout::ready()];
    }
    static function listing(array $params): array {
        $params=self::listing_params($params);$params['features']=$params['features']??['enable_category','enable_description'];$r=self::call('list',$params);$d=(array)$r['data'];$items=[];$related=[];
        foreach($d['content']??[] as $group){foreach($group['productList']??[] as $p)$items[]=self::row($p);foreach($group['relatedCategoryList']??[] as $c)$related[]=$c;}
        $r['data']=['items'=>$items,'relatedCategoryList'=>$related,'page'=>(int)($d['pageNumber']??$params['page']),'size'=>(int)($d['pageSize']??$params['size']),'total'=>min(6000,(int)($d['totalRecords']??0)),'pages'=>min(1000,(int)($d['totalPages']??0)),'filters'=>$params];return $r;
    }
    static function home(string $origin='',bool $mark_view=true): array {
        if($mark_view)update_option('smcj_home_last_view',time(),false);$tree=self::call('categories');$sections=[];
        foreach($tree['data'] as $first){
            $seconds=(array)($first['categoryFirstList']??[]);$ids=array_column($seconds,'categorySecondId');
            $params=['page'=>1,'size'=>10,'features'=>['enable_category','enable_description']];
            if($ids)$params['lv2categoryList']=$ids;
            else{$leaf=$seconds[0]['categorySecondList'][0]['categoryId']??'';if($leaf)$params['categoryId']=$leaf;else throw new \RuntimeException('CJ returned a category without listing identifiers.');}
            if($origin!=='')$params['countryCode']=$origin;
            try{$listing=self::listing($params);$sections[]=['category'=>$first,'listing'=>$listing];if(count($listing['data']['items'])!==10)\GDCS\Logger::write('info','storefront.short_category',['category_id'=>$first['categoryFirstId']??'','count'=>count($listing['data']['items']),'request_id'=>$listing['requestId']]);}
            catch(\Throwable $e){$sections[]=['category'=>$first,'error'=>self::error($e)];}
        }
        $expiries=array_map(static fn($s)=>strtotime($s['listing']['expires_at']??'now'),$sections);
        return ['categories'=>$tree,'sections'=>$sections,'origin'=>$origin,'checked_at'=>gmdate('c'),'expires_at'=>gmdate('c',min($expiries?:[time()]))];
    }
    static function detail(string $pid): array {
        $r=self::call('product',['pid'=>self::id($pid)]);$d=$r['data'];
        if(isset($d['status'])&&(string)$d['status']!=='3')throw new \OutOfBoundsException('This product is no longer on sale.');
        $r['data']['description']=wp_kses_post((string)($d['description']??''));
        $variants=self::call('variants',['pid'=>$pid]);foreach($variants['data'] as &$v){$v['retail_usd']=is_numeric($v['variantSellPrice']??null)?self::price((float)$v['variantSellPrice']):null;}unset($v);
        $seen=(array)get_option('smcj_seen_products',[]);$text=wp_strip_all_tags((string)($d['description']??''));
        if(strlen($text)>=180&&$variants['data']){
            $old=$seen[$pid]??[];$hash=hash('sha256',wp_json_encode([$d,$variants['data']]));
            $seen[$pid]=['id'=>$pid,'name'=>sanitize_text_field($d['productNameEn']??$pid),'image'=>\GDCS\LiveCatalog::image($d['productImage']??''),'content_hash'=>$hash,'first_seen'=>$old['first_seen']??gmdate('c'),'changed_at'=>($old['content_hash']??'')===$hash?($old['changed_at']??gmdate('c')):gmdate('c'),'checked_at'=>gmdate('c')];
            if(count($seen)>2000)$seen=array_slice($seen,-2000,null,true);update_option('smcj_seen_products',$seen,false);
        }
        return ['product'=>$r,'variants'=>$variants,'checkout_ready'=>\GDCS\VirtualCheckout::ready()];
    }
    static function inventory(string $vid): array {return ['variant'=>self::call('variant',['vid'=>self::id($vid)]),'stock'=>self::call('stock',['vid'=>$vid],true)];}
    static function shipping(array $p): array {
        $vid=self::id($p['vid']??'');$qty=filter_var($p['quantity']??1,FILTER_VALIDATE_INT);if(!$qty||$qty>100)throw new \InvalidArgumentException('Choose 1 to 100 items.');
        $inventory=self::inventory($vid);$v=$inventory['variant']['data'];$stock=$inventory['stock']['data'];$origin=\GDCS\VirtualCheckout::available_origin($stock,$qty,(string)($p['origin']??''));
        $dest=strtoupper((string)($p['country']??''));if(!isset(WC()->countries->get_countries()[$dest]))throw new \InvalidArgumentException('Choose a destination.');
        $simple=self::call('freight',['startCountryCode'=>$origin,'endCountryCode'=>$dest,'zip'=>sanitize_text_field($p['zip']??''),'products'=>[['vid'=>$vid,'quantity'=>$qty]]]);
        $detail=self::call('product',['pid'=>self::id($v['pid']??$p['pid']??'')]);$prod=$detail['data'];
        $weight=(float)($v['variantWeight']??0);$volume=(float)($v['variantVolume']??0);$prop=$prod['productProEnSet']??[];if(is_string($prop))$prop=json_decode($prop,true)?:array_filter(explode(',',$prop));
        $accurate=null;$accurate_error=null;
        if($weight>0&&$volume>0&&$prop){
            $row=['srcAreaCode'=>$origin,'destAreaCode'=>$dest,'weight'=>$weight*$qty,'volume'=>$volume*$qty,'productProp'=>array_values($prop),'totalGoodsAmount'=>(float)($v['variantSellPrice']??0)*$qty,'freightTrialSkuList'=>[['skuQuantity'=>$qty,'sku'=>$v['variantSku']??'']]];
            try{$accurate=self::call('freight-accurate',['reqDTOS'=>[$row]]);}catch(\Throwable $e){$accurate_error=self::error($e);}
        }else $accurate_error=['code'=>'missing_supplier_shipping_properties','message'=>'An accurate quote requires supplier weight, volume and logistics properties. The simple quote is shown separately.','requestId'=>$detail['requestId']];
        return ['simple'=>$simple,'accurate'=>$accurate,'accurate_error'=>$accurate_error,'origin'=>$origin,'country'=>$dest,'stock'=>$inventory['stock'],'fees_included'=>false];
    }
    static function error(\Throwable $e): array {
        $trace=$e instanceof \GDCS\ApiException?self::trace():[];return ['code'=>$e instanceof \GDCS\ApiException?$e->reason:($e instanceof \InvalidArgumentException?'invalid_input':'supplier_unavailable'),'message'=>$e instanceof \InvalidArgumentException?$e->getMessage():'Supplier data could not be verified. Retry shortly or contact support with this reference.','requestId'=>$trace['request_id']??null];
    }
    static function response(string $name,$r){
        try{
            if(!class_exists('\GDCS\Api'))throw new \RuntimeException('Supplier integration is unavailable.');
            $ip=(string)($_SERVER['HTTP_CF_CONNECTING_IP']??$_SERVER['REMOTE_ADDR']??'');$budget='smcj_rate_'.md5($ip.gmdate('YmdHi'));$used=(int)get_transient($budget);if($used>=40)return new \WP_REST_Response(['code'=>'request_rate_limited','message'=>'Please wait before requesting more supplier data.'],429,['Retry-After'=>'60','Cache-Control'=>'no-store']);set_transient($budget,$used+1,70);
            $p=$r->get_params();if(($p['view']??'')==='suggest'){unset($p['view']);$p['features']=[];$p['size']=5;}
            $result=match($name){'bootstrap'=>self::bootstrap(),'home'=>self::home((string)($p['countryCode']??'')),'listing'=>self::listing($p),'detail'=>self::detail(self::id($p['pid']??'')),'inventory'=>self::inventory(self::id($p['vid']??'')),'shipping'=>self::shipping((array)$r->get_json_params()),'sitemap'=>['products'=>array_values(array_filter((array)get_option('smcj_seen_products',[]),static fn($x)=>strtotime($x['checked_at']??'')>time()-DAY_IN_SECONDS))]};
            return new \WP_REST_Response($result,200,['Cache-Control'=>$name==='inventory'||$name==='shipping'?'private,no-store':'public,max-age=60,s-maxage=180','X-Sasta-CJ'=>self::VERSION]);
        }catch(\Throwable $e){return new \WP_REST_Response(self::error($e),$e instanceof \InvalidArgumentException?400:($e instanceof \OutOfBoundsException?404:503),['Cache-Control'=>'no-store','Retry-After'=>'30']);}
    }
    static function warm(): void {
        if((int)get_option('smcj_home_last_view',0)<time()-900)return;
        try{foreach(self::call('categories')['data'] as $first){
            $ids=array_column((array)($first['categoryFirstList']??[]),'categorySecondId');if(!$ids)continue;
            $p=self::listing_params(['page'=>1,'size'=>10,'features'=>['enable_category','enable_description'],'lv2categoryList'=>$ids]);ksort($p);$hit=get_transient('smcj_'.md5('list'.wp_json_encode($p)));
            if($hit===false||strtotime($hit['expires_at'])<time()+65)self::call('list',$p,true);
        }}catch(\Throwable $e){\GDCS\Logger::write('error','storefront.warm_failed',self::error($e));}
    }
    static function checkout_stock($data,$errors): void {
        if(!WC()->cart||!\GDCS\Shipping::has_cj())return;
        foreach(WC()->cart->get_cart() as $row){
            $s=$row['gdcs_virtual']??null;$product=$row['data']??null;
            $vid=$s['vid']??($product?$product->get_meta('_gdcs_cj_variant_id'):'');if(!$vid)continue;
            $origin=$s['origin']??($product?$product->get_meta('_gdcs_origin'):'');
            try{$stock=self::call('stock',['vid'=>self::id($vid)],true);\GDCS\VirtualCheckout::available_origin((array)$stock['data'],(int)$row['quantity'],(string)$origin);}
            catch(\Throwable $e){$ref=self::error($e);$errors->add('smcj_stock_changed','Supplier stock could not be confirmed for the selected option and origin. Review your cart before paying. Reference: '.($ref['requestId']??$ref['code']));}
        }
    }
    static function merchant($r){
        try{
            if(!current_user_can('manage_woocommerce'))throw new \InvalidArgumentException('Store management permission is required.');
            $op=(string)$r['operation'];if(!isset(self::OPS[$op]))throw new \InvalidArgumentException('Unknown operation.');
            $params=(array)($r->get_json_params()['params']??[]);
            if(self::OPS[$op][1]!=='GET'&&$r->get_method()!=='POST')throw new \InvalidArgumentException('Use the confirmed action form.');
            if(self::OPS[$op][1]!=='GET'&&($r->get_json_params()['confirmed']??false)!==true)throw new \InvalidArgumentException('Explicit merchant confirmation is required.');
            $settles=$op==='pay-balance'||(in_array($op,['create-v2','create-v3'],true)&&(int)($params['payType']??0)===2);
            if($settles){if(!current_user_can('manage_options')||($r->get_json_params()['authorize_supplier_settlement']??false)!==true)throw new \InvalidArgumentException('A store administrator must explicitly authorize supplier balance spending for this action.');define('SM_CJ_CONFIRMED_SETTLEMENT',true);}
            if(in_array($op,['create-v2','create-v3'],true))return new \WP_REST_Response(self::create_order($op,$params),200,['Cache-Control'=>'private,no-store']);
            return new \WP_REST_Response(self::call($op,$params,true),200,['Cache-Control'=>'private,no-store']);
        }catch(\Throwable $e){return new \WP_REST_Response(self::error($e),422,['Cache-Control'=>'private,no-store']);}
    }
    static function create_order(string $op,array $p): array {
        $number=(string)($p['orderNumber']??'');if($number===''||strlen($number)>50||!preg_match('/^[A-Za-z0-9_-]+$/D',$number))throw new \InvalidArgumentException('Use a unique order number of up to 50 letters, digits, hyphens or underscores.');
        if(!in_array((int)($p['payType']??0),[2,3],true))throw new \InvalidArgumentException('Choose create-only or explicitly authorized balance payment.');
        $products=(array)($p['products']??[]);if(!$products||count($products)>20)throw new \InvalidArgumentException('Use 1 to 20 product lines.');
        $origin=strtoupper((string)($p['fromCountryCode']??''));if(!preg_match('/^[A-Z]{2}$/D',$origin))throw new \InvalidArgumentException('Choose one verified ship-from country per supplier order.');
        foreach($products as $product){$vid=self::id($product['vid']??'');$quantity=filter_var($product['quantity']??0,FILTER_VALIDATE_INT);if(!$quantity||$quantity<1||$quantity>100)throw new \InvalidArgumentException('Invalid supplier quantity.');self::call('variant',['vid'=>$vid],true);$stock=self::call('stock',['vid'=>$vid],true);\GDCS\VirtualCheckout::available_origin((array)$stock['data'],$quantity,$origin);}
        $key='smcj_order_'.md5($number);if(!add_option($key,['state'=>'started','at'=>time()],'','no'))throw new \RuntimeException('This supplier order number already started. Reconcile it before attempting another submission.');
        $attempts=[];
        try{$r=self::call($op,$p,true);$attempts[]=['version'=>$op,'requestId'=>$r['requestId']];}
        catch(\GDCS\ApiException $e){$attempts[]=['version'=>$op,'error'=>$e->reason,'requestId'=>self::trace()['request_id']??null];
            // Only an explicit V3 parameter rejection proves that no order was accepted.
            if($op!=='create-v3'||$e->reason!=='cj_1600100'){update_option($key,['state'=>'reconcile','attempts'=>$attempts,'at'=>time()],false);throw $e;}
            try{$r=self::call('create-v2',$p,true);$attempts[]=['version'=>'create-v2','requestId'=>$r['requestId']];}catch(\Throwable $fallback){$attempts[]=['version'=>'create-v2','error'=>$fallback->getMessage(),'requestId'=>self::trace()['request_id']??null];update_option($key,['state'=>'reconcile','attempts'=>$attempts,'at'=>time()],false);throw $fallback;}
        }
        update_option($key,['state'=>'created','orderId'=>$r['data']['orderId']??null,'attempts'=>$attempts,'at'=>time()],false);$r['attempts']=$attempts;return $r;
    }
    static function admin(): void {
        if(!current_user_can('manage_woocommerce'))return;
        echo '<div class="wrap"><h1>CJ API operations</h1><p>Merchant-only diagnostics. Customer orders and payments remain in WooCommerce. Supplier write actions require an explicit confirmation and the existing settlement policy.</p><label>Operation <select id="smcj-op">';
        foreach(self::OPS as $op=>[$path,$method])echo '<option value="'.esc_attr($op).'">'.esc_html($method.' '.$path).'</option>';
        echo '</select></label><p><label>Parameters (JSON)<br><textarea id="smcj-json" rows="12" cols="100">{}</textarea></label></p><p><label><input type="checkbox" id="smcj-confirm"> I confirm this merchant operation and its effects.</label></p><p><label><input type="checkbox" id="smcj-settlement"> Authorize supplier balance settlement for this action. This can spend store funds.</label></p><button class="button button-primary" id="smcj-run">Run operation</button><pre id="smcj-result" style="white-space:pre-wrap"></pre><h2>Last supplier response</h2><pre>'.esc_html(wp_json_encode(self::trace(),JSON_PRETTY_PRINT)).'</pre></div>';
        echo '<script>document.getElementById("smcj-run").onclick=async function(){let out=document.getElementById("smcj-result");try{let op=document.getElementById("smcj-op").value,params=JSON.parse(document.getElementById("smcj-json").value),r=await fetch('.wp_json_encode(rest_url(self::NS.'/merchant/')).'+op,{method:"POST",headers:{"Content-Type":"application/json","X-WP-Nonce":'.wp_json_encode(wp_create_nonce('wp_rest')).'},body:JSON.stringify({params,confirmed:document.getElementById("smcj-confirm").checked,authorize_supplier_settlement:document.getElementById("smcj-settlement").checked})});out.textContent=JSON.stringify(await r.json(),null,2);}catch(e){out.textContent=e.message;}};</script>';
    }
}
Bridge::boot();
