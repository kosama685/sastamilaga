import {campaignText} from './campaign-i18n.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const campaignTypes=['offers','events','special-days'];
export function campaignNavigation({rel,lang}){
 const t=campaignText(lang),labels=[t.offers,t.events,t.days],hub=rel==='shipping-to';
 return `<section class="smc-discover" aria-label="${esc(t.discover)}"><h2>${esc(t.discover)}</h2><nav class="smc-nav">${campaignTypes.map((kind,i)=>`<a href="/${hub?'':rel+'/'}${kind}/" class="smc-nav-card smc-nav-card--${i}"><span aria-hidden="true">${['✦','◷','✿'][i]}</span><strong>${esc(labels[i])}</strong></a>`).join('')}</nav></section>`;
}
