import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(resolve(root, 'portal', 'portal-template.html'), 'utf8');
const output = resolve(root, 'workflows');
mkdirSync(output, { recursive: true });

const shared = String.raw`
const fs = require('fs');
const path = require('path');
const ROOT = '/files/postagem-redes';
const INPUT = path.join(ROOT, 'entrada');
const STATE = path.join(ROOT, 'state.json');
const allowedStatuses = new Set(['pendente','aprovado','agendado','rejeitado','incompleto','publicado']);
function slug(value) { const base=String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,70)||'conteudo'; let h=0; for(const c of String(value)) h=((h<<5)-h+c.charCodeAt(0))|0; return base+'-'+(h>>>0).toString(36); }
function safeText(value,max=5000){return String(value??'').replace(/\0/g,'').trim().slice(0,max)}
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}}
function saveState(state){const lock=STATE+'.lock'; let fd; try{fd=fs.openSync(lock,'wx')}catch{throw new Error('Outra alteração está em andamento. Atualize a página e tente novamente.')} try{const temp=STATE+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2),'utf8');fs.renameSync(temp,STATE)}finally{if(fd!==undefined)fs.closeSync(fd);try{fs.unlinkSync(lock)}catch{}}}
function scan(){
  fs.mkdirSync(INPUT,{recursive:true});
  const state=readJson(STATE,{version:1,records:{}}); state.records??={};
  const folders=fs.readdirSync(INPUT,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name);
  const items=[];
  for(const folder of folders){
    const dir=path.join(INPUT,folder);
    const files=fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isFile()).map(x=>x.name);
    const slides=files.filter(x=>/\.(png|jpe?g|webp)$/i.test(x)).sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));
    const assetVersion=Math.max(0,...slides.map(file=>Math.floor(fs.statSync(path.join(dir,file)).mtimeMs)));
    const captionFile=files.find(x=>x.toLowerCase()==='texto.txt');
    const originalCaption=captionFile?safeText(fs.readFileSync(path.join(dir,captionFile),'utf8')):'';
    const id=slug(folder); const old=state.records[id]||{};
    const status=slides.length<1||!originalCaption&&!old.caption?'incompleto':allowedStatuses.has(old.status)?old.status:'pendente';
    items.push({id,folder,title:old.title||folder,slides,assetVersion,caption:old.caption??originalCaption,status,networks:Array.isArray(old.networks)?old.networks:[],scheduleAt:old.scheduleAt||'',updatedAt:old.updatedAt||'',audit:Array.isArray(old.audit)?old.audit:[]});
  }
  return {state,items};
}
`;

const portalCode = `${shared}
const {items}=scan();
const template=${JSON.stringify(template)};
const data=JSON.stringify(items).replace(/</g,'\\u003c');
return [{json:{html:template.replace('__POSTAGEM_REDES_DATA__',data)}}];`;

const actionCode = `${shared}
const item=$input.first(); const body=item.json.body||item.json||{}; const action=safeText(body.action,30); const operator=safeText(body.operator,80); if(!operator) throw new Error('Informe o nome do responsável.');
const now=new Date().toISOString(); const {state,items}=scan();
if(action==='upload'){
 const title=safeText(body.title,120); const caption=safeText(body.caption,5000); if(!title||!caption) throw new Error('Título e legenda são obrigatórios.');
 let order=[]; try{order=JSON.parse(body.order||'[]')}catch{} const rank=new Map(order.map((key,index)=>[String(key),index]));
 const entries=Object.entries(item.binary||{}).filter(([,file])=>['image/png','image/jpeg','image/webp'].includes(String(file.mimeType||'').toLowerCase())); if(entries.length<1||entries.length>10) throw new Error('Envie de 1 a 10 imagens PNG, JPG ou WEBP.');
 entries.sort(([a],[b])=>(rank.get(a)??999)-(rank.get(b)??999)||a.localeCompare(b));
 const base='rapido-'+Date.now()+'-'+slug(title).slice(0,24); const dir=path.join(INPUT,base); fs.mkdirSync(dir,{recursive:false}); try{for(let index=0;index<entries.length;index++){const [binaryName,file]=entries[index];const ext=file.mimeType==='image/png'?'.png':file.mimeType==='image/webp'?'.webp':'.jpg';const buffer=await this.helpers.getBinaryDataBuffer(0,binaryName);fs.writeFileSync(path.join(dir,String(index+1).padStart(2,'0')+ext),buffer)}}catch(error){try{fs.rmSync(dir,{recursive:true,force:true})}catch{}throw new Error('Não foi possível gravar as imagens enviadas. Tente novamente.')} fs.writeFileSync(path.join(dir,'Texto.txt'),caption,'utf8'); const id=slug(base); state.records[id]={title,caption,status:'pendente',networks:[],updatedAt:now,audit:[{at:now,operator,action:'criou conteúdo rápido',comment:entries.length+' slide(s) organizado(s) antes do envio.'}]}; saveState(state); return [{json:{ok:true,message:'Publicação criada e enviada para aprovação.',id}}];
}
const id=safeText(body.contentId,130); const content=items.find(x=>x.id===id); if(!content) throw new Error('Conteúdo não encontrado. Atualize a página.'); const previous=state.records[id]||{};
if(action==='reorder'){
 let requested=[]; try{requested=JSON.parse(body.slides||'[]')}catch{} if(!Array.isArray(requested)||requested.length!==content.slides.length||new Set(requested).size!==content.slides.length||requested.some(file=>!content.slides.includes(file))) throw new Error('A nova ordem de slides é inválida. Atualize a página e tente novamente.');
 const dir=path.join(INPUT,content.folder); const token=Date.now()+'-'+Math.random().toString(36).slice(2,8); const moves=requested.map((file,index)=>({from:path.join(dir,file),temp:path.join(dir,'.reordenar-'+token+'-'+index+path.extname(file)),to:path.join(dir,String(index+1).padStart(2,'0')+path.extname(file))}));
 try{moves.forEach(move=>fs.renameSync(move.from,move.temp));moves.forEach(move=>fs.renameSync(move.temp,move.to))}catch(error){try{moves.forEach(move=>{if(fs.existsSync(move.temp))fs.renameSync(move.temp,move.from)})}catch{}throw new Error('Não foi possível reorganizar os slides. Nenhuma decisão foi salva.');}
 state.records[id]={...previous,title:content.title,caption:content.caption,status:content.status,networks:content.networks||[],scheduleAt:content.scheduleAt||'',updatedAt:now,audit:[...(previous.audit||[]),{at:now,operator,action:'reorganizou slides',comment:'Ordem do carrossel atualizada no portal.'}]}; saveState(state); return [{json:{ok:true,message:'Ordem do carrossel atualizada.'}}];
}
if(action!=='save') throw new Error('Ação não reconhecida.'); const title=safeText(body.title,120); const caption=safeText(body.caption,5000); const status=safeText(body.status,30); if(!title) throw new Error('Informe o título interno da publicação.'); if(!allowedStatuses.has(status)||status==='publicado') throw new Error('Status inválido.'); if(!caption) throw new Error('A legenda não pode ficar vazia.'); if(status==='agendado'&&!safeText(body.scheduleAt,40)) throw new Error('Informe data e hora para o agendamento.'); let networks=[]; try{networks=JSON.parse(body.networks||'[]')}catch{} networks=[...new Set(networks.filter(x=>['instagram','facebook','linkedin','x'].includes(x)))]; if((status==='aprovado'||status==='agendado')&&!networks.length) throw new Error('Selecione pelo menos uma rede.'); const comment=safeText(body.comment,1000); state.records[id]={...previous,title,caption,status,networks,scheduleAt:status==='agendado'?safeText(body.scheduleAt,40):'',updatedAt:now,audit:[...(previous.audit||[]),{at:now,operator,action:status,comment,networks}]}; saveState(state); return [{json:{ok:true,message:status==='aprovado'?'Conteúdo aprovado e adicionado à fila de homologação.':status==='agendado'?'Conteúdo aprovado e agendado para a fila.':'Atualização salva com sucesso.'}}];`;

const assetCode = `${shared}
const query=$input.first().json.query||{}; const id=safeText(query.id,130); const file=safeText(query.file,200); if(!id||!file||path.basename(file)!==file||!/^.+\\.(png|jpe?g|webp)$/i.test(file)) throw new Error('Arquivo inválido.'); const {items}=scan(); const content=items.find(x=>x.id===id); if(!content||!content.slides.includes(file)) throw new Error('Imagem não encontrada.'); const full=path.join(INPUT,content.folder,file); const data=fs.readFileSync(full); const mime=/\\.png$/i.test(file)?'image/png':/\\.webp$/i.test(file)?'image/webp':'image/jpeg'; return [{json:{},binary:{data:{data:data.toString('base64'),mimeType:mime,fileName:file}}}];`;

function workflow(name,path,method,code,respondWith='text') { return {name,active:false,settings:{executionOrder:'v1',availableInMCP:false},nodes:[{parameters:{httpMethod:method,path,responseMode:'responseNode',options:{}},id:'trigger',name:'Webhook',type:'n8n-nodes-base.webhook',typeVersion:2,position:[-280,0],webhookId:`postagem-redes-${path}`},{parameters:{jsCode:code},id:'code',name:'Processar',type:'n8n-nodes-base.code',typeVersion:2,position:[0,0]},{parameters:respondWith==='binary'?{respondWith:'binary',responseBinaryPropertyName:'data',options:{responseHeaders:{entries:[{name:'Cache-Control',value:'private, max-age=604800, immutable'}]}}}:{respondWith:'text',responseBody:'={{ $json.html }}',options:{responseHeaders:{entries:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'}]}}},id:'respond',name:'Responder',type:'n8n-nodes-base.respondToWebhook',typeVersion:1.4,position:[260,0]}],connections:{Webhook:{main:[[{node:'Processar',type:'main',index:0}]]},Processar:{main:[[{node:'Responder',type:'main',index:0}]]}},pinData:{}}; }
function actionWorkflow(){const w=workflow('Postagem Redes — Portal: Ações','postagem-redes-api','POST',actionCode);w.nodes[2].parameters={respondWith:'json',responseBody:'={{ JSON.stringify($json) }}',options:{responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}};return w;}
writeFileSync(resolve(output,'04-portal-visual.sanitized.json'),JSON.stringify(workflow('Postagem Redes — Portal Visual','postagem-redes','GET',portalCode),null,2)+'\n');
writeFileSync(resolve(output,'05-portal-acoes.sanitized.json'),JSON.stringify(actionWorkflow(),null,2)+'\n');
writeFileSync(resolve(output,'06-portal-arquivos.sanitized.json'),JSON.stringify(workflow('Postagem Redes — Portal: Arquivos','postagem-redes-arquivo','GET',assetCode,'binary'),null,2)+'\n');
console.log('Workflows do portal gerados em workflows/.');
