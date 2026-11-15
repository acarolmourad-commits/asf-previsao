const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('const praias=')||x.includes('const praias ='));
async function run(data,status=200){
 const d=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true});d.window.fetch=async url=>({ok:status===200,status,json:async()=>typeof data==='function'?data(url):data});
 d.window.setInterval=()=>0;d.window.eval(script);await new Promise(r=>setTimeout(r,25));return d.window.document;
}
(async()=>{
 assert(script);
 for(const [name,data,status] of [['429',{error:true},429],['empty',{},200],['api-error',{error:true},200],['bad-values',{current:{wave_height:'bad'},daily:{time:['a'],wave_height_max:['bad']}},200]]){
 const d=await run(data,status);assert.match(d.querySelector('#updated-now').textContent,/Dados indisponíveis/);assert.equal(d.querySelectorAll('#grid .card').length,0); console.log('PASS',name);}
 for(const [h,label] of [[0,'abaixo de 0,8'],[0.79,'abaixo de 0,8'],[0.8,'0,8 a menos'],[1.5,'a partir']]){
 const d=await run({current:{wave_height:h,wave_period:9},daily:{time:['2026-11-15'],wave_height_max:[h]}});
 assert.match(d.querySelector('#grid .badge').textContent,new RegExp(label));assert.match(d.querySelector('#updated-now').textContent,/Consulta às/);assert.doesNotMatch(d.querySelector('#grid').textContent,/iniciantes|intermediário/);console.log('PASS boundary',h);}
 const d=await run({daily:{time:['2026-11-15'],wave_height_max:[0.6]}});
 assert.match(d.querySelector('#updated-now').textContent,/Dados atuais: 0/);assert.equal(d.querySelectorAll('#grid .card').length,0);console.log('PASS daily-only');
})();
