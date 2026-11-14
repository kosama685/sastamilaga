<?php
// Executed by WP-CLI only. Refreshes the existing provider, never replays WP-Cron.
if(!defined('WP_CLI')||!WP_CLI){exit(1);}
try{
    $status=\GDCS\Currency::refresh_rates();
    $pkr=\GDCS\Currency::rate_info('PKR');
    echo wp_json_encode(['event'=>'currency_refresh','at'=>gmdate('c'),'provider_updated_at'=>$status['updated_at'],'pkr_source'=>$pkr['source'],'pkr_available'=>true])."\n";
}catch(Throwable $error){
    fwrite(STDERR,wp_json_encode(['event'=>'currency_refresh_failed','at'=>gmdate('c'),'message'=>$error->getMessage()])."\n");exit(1);
}
