// Checks a real authorized CJ video and a real video-free product.
// No CJ secrets or direct supplier URLs are exposed to GitHub Actions.
const site='https://sastamilaga.com';
const timeout=ms=>AbortSignal.timeout(ms);
async function check(pid,expectVideo){
 const r=await fetch(site+'/cjv/resolve?pid='+pid,{signal:timeout(30000),headers:{'accept':'application/json'}});
 if(!r.ok)throw Error(pid+': resolver HTTP '+r.status);
 const d=await r.json();
 if(expectVideo){
  if(d.status!=='available'||!/^\/cjv\/v1\/[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(String(d.video?.src||'')))
   throw Error(pid+': expected a signed eligible supplier video, got '+d.status);
  const media=await fetch(site+d.video.src,{signal:timeout(30000),headers:{Range:'bytes=0-1'}});
  const type=(media.headers.get('content-type')||'').toLowerCase();
  const ok=[200,206].includes(media.status)&&/^video\/(mp4|webm|x-m4v)/.test(type);
  const status=media.status;
  await media.body?.cancel().catch(()=>{});
  if(!ok)throw Error(pid+': signed proxy playback HTTP '+status+' '+type);
  console.log(pid+': playable signed media status='+status);
 }else{
  if(d.status!=='unavailable')throw Error(pid+': no-video fixture changed: '+d.status);
  console.log(pid+': no eligible video (correct omission)');
 }
}
await check('1964955178105954305',true);
await check('2011982827504136193',false);
