const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const raw=fs.readFileSync('index.html','utf8');
 // No external scripts, fonts, frames or personal sessions in this isolated rendering.
 const html=raw.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/gi,'')
 .replace(/<iframe\b[\s\S]*?<\/iframe>/gi,'<p>Mapa externo desativado nesta captura isolada.</p>')
 .replace(/<link\b[^>]*href=["']https?:[^>]*>/gi,'');
 assert(!/<(?:input|textarea)\b/i.test(html),'Unexpected user-data fields');
 const browser=await chromium.launch({headless:true});
 try {
 for(const width of [390,1280]) for(const failed of [false,true]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/*',r=>r.abort());
 await page.addInitScript(()=>{});
 await page.evaluate(({failed})=>{
 window.fetch=async url=>({ok:!failed,status:failed?429:200,json:async()=>url.includes('marine-api')?
 {current:{time:'2026-11-15T10:00',wave_height:0.8,wave_period:9,wave_direction:120},daily:{time:['2026-11-15','2026-11-16'],wave_height_max:[0.8,1.2]}}:
 {current:{time:'2026-11-15T10:00',wind_speed_10m:12,wind_direction_10m:90}}});
 },{failed});
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#updated-now')?.textContent.includes('Consulta às')||document.querySelector('#updated-now')?.textContent.includes('indisponíveis'));
 await page.evaluate(()=>{
 const b=document.createElement('div');b.id='qa-watermark';b.textContent='PRÉVIA DE TESTE • DADOS FICTÍCIOS • NÃO USAR PARA NAVEGAÇÃO OU SURF';
 b.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#ffef00;color:#000;padding:12px;font:bold 16px sans-serif;text-align:center';document.body.append(b);
 document.querySelectorAll('#grid .card').forEach(c=>c.insertAdjacentHTML('afterbegin','<strong>DADOS FICTÍCIOS</strong>'));
 });
 const text=await page.locator('body').innerText();
 assert(text.includes('DADOS FICTÍCIOS'));
 assert(!/Bearer\s|ghp_|github_pat_|password\s*[:=]|access_token\s*[:=]/i.test(text),'Sensitive-looking content');
 assert.equal(await page.locator('#grid .card').count(),failed?0:8);
 await page.screenshot({path:'qa-screenshots/central-'+width+'-'+(failed?'unavailable':'fixture')+'.png',fullPage:true});
 console.log('PASS isolated visual fixture',width,failed?'unavailable':'fixture');
 await page.close();
 }
 // Exercise the existing footer link with each language, using synthetic pages only.
 for(const width of [390,1280]) for(const english of [false,true]) {
   const page=await browser.newPage({viewport:{width,height:900}});
   const origin='https://previsao.asf.surf/'+(english?'?lang=en':'');
   const destination='https://asf.surf/?lang='+(english?'en':'pt-BR')+'#forecast-home-card';
   await page.route('**/*',route=>{
     const url=new URL(route.request().url());
     if(url.href===origin) return route.fulfill({contentType:'text/html',body:html.replace('<p>Mapa externo desativado nesta captura isolada.</p>','<iframe class="embed" title="Mapa isolado"></iframe>')});
     if(url.origin==='https://asf.surf' && url.pathname==='/' && url.search===new URL(destination).search) return route.fulfill({contentType:'text/html',body:'<a id="forecast-home-card">Destino simulado</a>'});
     return route.abort();
   });
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   const link=page.getByRole('link',{name:english?'Main app':'App principal',exact:true});
   assert.equal(await link.count(),1);
   assert.equal(await link.getAttribute('href'),destination);
   await link.press('Tab');
   await page.getByRole('link',{name:english?'Safety guide':'Guia de segurança',exact:true}).press('Shift+Tab');
   assert.ok(await link.evaluate(element=>element===document.activeElement&&element.matches(':focus-visible')));
   await link.press('Enter');
   await page.waitForURL(destination);
   await page.close();
 }
 }finally{await browser.close();}
})();
