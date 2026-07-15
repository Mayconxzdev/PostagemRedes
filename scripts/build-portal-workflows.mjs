import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Keep the generated JSON byte-stable on Windows and Linux. Without this,
// the embedded HTML inherited the checkout's line endings and CI rebuilt a
// different export from the exact same source.
const template = readFileSync(resolve(root, 'portal', 'portal-template.html'), 'utf8').replace(/\r\n?/g, '\n');
const output = resolve(root, 'workflows');
mkdirSync(output, { recursive: true });

const shared = String.raw`
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
    items.push({id,folder,title:old.title||folder,slides,assetVersion,caption:old.caption??originalCaption,brief:old.brief||'',status,networks:Array.isArray(old.networks)?old.networks:[],scheduleAt:old.scheduleAt||'',updatedAt:old.updatedAt||'',aiDraft:old.aiDraft&&typeof old.aiDraft==='object'?old.aiDraft:null,deliveries:old.deliveries&&typeof old.deliveries==='object'?old.deliveries:{},audit:Array.isArray(old.audit)?old.audit:[]});
  }
  return {state,items};
}
`;

const portalCode = `${shared}
const {items}=scan(); const publicBase=String($vars.SOCIAL_PUBLIC_MEDIA_BASE_URL||'').replace(/\\/+$/,''); const signingSecret=String($vars.SOCIAL_MEDIA_SIGNING_SECRET||'');
if(publicBase&&signingSecret){const expires=Math.floor(Date.now()/1000)+7200; for(const content of items){content.assetUrls={}; for(const file of content.slides){const signature=crypto.createHmac('sha256',signingSecret).update(content.id+':'+file+':'+expires).digest('base64url');content.assetUrls[file]=publicBase+'?id='+encodeURIComponent(content.id)+'&file='+encodeURIComponent(file)+'&exp='+expires+'&sig='+encodeURIComponent(signature)}}}
const template=${JSON.stringify(template)};
const data=JSON.stringify(items).replace(/</g,'\\u003c');
return [{json:{html:template.replace('__POSTAGEM_REDES_DATA__',data)}}];`;

const actionCode = `${shared}
const item=$input.first(); const body=item.json.body||item.json||{}; const action=safeText(body.action,30); const operator=safeText(body.operator,80); if(!operator) throw new Error('Informe o nome do responsável.');
const now=new Date().toISOString(); const {state,items}=scan();
if(action==='generate'){
 const id=safeText(body.contentId,130); const content=items.find(x=>x.id===id); if(!content) throw new Error('Conteúdo não encontrado. Atualize a página.');
 if(String($vars.SOCIAL_AI_ENABLED||'').toLowerCase()!=='true') return [{json:{ok:false,route:'respond',message:'A IA está desativada. Configure SOCIAL_AI_ENABLED=true e a credencial OpenAI no workflow Portal: Ações.'}}];
 const brief=safeText(body.brief??content.brief,1600); const prompt=['Você é redator de marketing B2B industrial em português do Brasil.','Crie apenas uma sugestão para revisão humana; não invente especificações, certificações, clientes, preços ou resultados.','Retorne JSON válido sem markdown com as chaves: baseCaption (string), variants (objeto com instagram, facebook, linkedin e xThread; xThread é array de 1 a 4 strings), hashtags (array até 12), reviewNotes (array até 5).','Adapte tom e tamanho à rede. Inclua CTA discreto quando fizer sentido.','Título interno: '+content.title,'Brief: '+brief,'Legenda atual: '+content.caption,'Quantidade de slides: '+content.slides.length].join('\\n');
 return [{json:{route:'ai',contentId:id,operator,brief,aiPrompt:prompt}}];
}
if(action==='upload'){
 const title=safeText(body.title,120); const caption=safeText(body.caption,5000); if(!title||!caption) throw new Error('Título e legenda são obrigatórios.');
 let order=[]; try{order=JSON.parse(body.order||'[]')}catch{} const rank=new Map(order.map((key,index)=>[String(key),index]));
 const entries=Object.entries(item.binary||{}).filter(([,file])=>['image/png','image/jpeg','image/webp'].includes(String(file.mimeType||'').toLowerCase())); if(entries.length<1||entries.length>10) throw new Error('Envie de 1 a 10 imagens PNG, JPG ou WEBP.');
 entries.sort(([a],[b])=>(rank.get(a)??999)-(rank.get(b)??999)||a.localeCompare(b));
 const base='rapido-'+Date.now()+'-'+slug(title).slice(0,24); const dir=path.join(INPUT,base); fs.mkdirSync(dir,{recursive:false}); try{for(let index=0;index<entries.length;index++){const [binaryName,file]=entries[index];const ext=file.mimeType==='image/png'?'.png':file.mimeType==='image/webp'?'.webp':'.jpg';const buffer=await this.helpers.getBinaryDataBuffer(0,binaryName);fs.writeFileSync(path.join(dir,String(index+1).padStart(2,'0')+ext),buffer)}}catch(error){try{fs.rmSync(dir,{recursive:true,force:true})}catch{}throw new Error('Não foi possível gravar as imagens enviadas. Tente novamente.')} fs.writeFileSync(path.join(dir,'Texto.txt'),caption,'utf8'); const id=slug(base); state.records[id]={title,caption,status:'pendente',networks:[],deliveries:{},updatedAt:now,audit:[{at:now,operator,action:'criou conteúdo rápido',comment:entries.length+' slide(s) organizado(s) antes do envio.'}]}; saveState(state); return [{json:{ok:true,route:'respond',message:'Publicação criada e enviada para aprovação.',id}}];
}
const id=safeText(body.contentId,130); const content=items.find(x=>x.id===id); if(!content) throw new Error('Conteúdo não encontrado. Atualize a página.'); const previous=state.records[id]||{};
if(action==='reorder'){
 let requested=[]; try{requested=JSON.parse(body.slides||'[]')}catch{} if(!Array.isArray(requested)||requested.length!==content.slides.length||new Set(requested).size!==content.slides.length||requested.some(file=>!content.slides.includes(file))) throw new Error('A nova ordem de slides é inválida. Atualize a página e tente novamente.');
 const dir=path.join(INPUT,content.folder); const token=Date.now()+'-'+Math.random().toString(36).slice(2,8); const moves=requested.map((file,index)=>({from:path.join(dir,file),temp:path.join(dir,'.reordenar-'+token+'-'+index+path.extname(file)),to:path.join(dir,String(index+1).padStart(2,'0')+path.extname(file))}));
 try{moves.forEach(move=>fs.renameSync(move.from,move.temp));moves.forEach(move=>fs.renameSync(move.temp,move.to))}catch(error){try{moves.forEach(move=>{if(fs.existsSync(move.temp))fs.renameSync(move.temp,move.from)})}catch{}throw new Error('Não foi possível reorganizar os slides. Nenhuma decisão foi salva.');}
 state.records[id]={...previous,title:content.title,caption:content.caption,brief:content.brief||'',status:content.status,networks:content.networks||[],scheduleAt:content.scheduleAt||'',updatedAt:now,audit:[...(previous.audit||[]),{at:now,operator,action:'reorganizou slides',comment:'Ordem do carrossel atualizada no portal.'}]}; saveState(state); return [{json:{ok:true,route:'respond',message:'Ordem do carrossel atualizada.'}}];
}
if(action!=='save') throw new Error('Ação não reconhecida.'); const title=safeText(body.title,120); const caption=safeText(body.caption,5000); const brief=safeText(body.brief,1600); const status=safeText(body.status,30); if(!title) throw new Error('Informe o título interno da publicação.'); if(!allowedStatuses.has(status)||status==='publicado') throw new Error('Status inválido.'); if(!caption) throw new Error('A legenda não pode ficar vazia.'); if(status==='agendado'&&!safeText(body.scheduleAt,40)) throw new Error('Informe data e hora para o agendamento.'); let networks=[]; try{networks=JSON.parse(body.networks||'[]')}catch{} networks=[...new Set(networks.filter(x=>['instagram','facebook','linkedin','x'].includes(x)))]; if((status==='aprovado'||status==='agendado')&&!networks.length) throw new Error('Selecione pelo menos uma rede.'); const comment=safeText(body.comment,1000); const deliveries={}; for(const network of networks){const prior=previous.deliveries?.[network]||{}; deliveries[network]={status:(status==='aprovado'||status==='agendado')?'queued':'draft',attempts:0,queuedAt:(status==='aprovado'||status==='agendado')?now:'',lastRemoteId:'',lastPermalink:'',lastError:'',...((prior.status==='published'&&previous.caption===caption&&previous.title===title)?prior:{})};} state.records[id]={...previous,title,caption,brief,status,networks,deliveries,scheduleAt:status==='agendado'?safeText(body.scheduleAt,40):'',updatedAt:now,audit:[...(previous.audit||[]),{at:now,operator,action:status,comment,networks}]}; saveState(state); return [{json:{ok:true,route:'respond',message:status==='aprovado'?'Conteúdo aprovado e adicionado à fila de homologação.':status==='agendado'?'Conteúdo aprovado e agendado para a fila.':'Atualização salva com sucesso.'}}];`;

const aiPersistCode = `${shared}
const request=$items('Processar')[0]?.json||{}; const id=safeText(request.contentId,130); const operator=safeText(request.operator,80)||'Sistema'; const {state,items}=scan(); const content=items.find(x=>x.id===id); if(!content) throw new Error('Conteúdo não encontrado ao salvar a sugestão.');
 const candidate=$json.output_text||$json.text||$json.content||$json.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')||$json.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||''; let draft; try{draft=JSON.parse(candidate)}catch{throw new Error('A IA não retornou um JSON válido. Nenhuma legenda foi alterada.')}
const text=v=>safeText(v,5000); const variants=draft&&typeof draft.variants==='object'?draft.variants:{}; const normalized={baseCaption:text(draft.baseCaption),variants:{instagram:text(variants.instagram),facebook:text(variants.facebook),linkedin:text(variants.linkedin),xThread:Array.isArray(variants.xThread)?variants.xThread.map(v=>text(v,280)).filter(Boolean).slice(0,4):[]},hashtags:Array.isArray(draft.hashtags)?draft.hashtags.map(v=>text(v,80)).filter(Boolean).slice(0,12):[],reviewNotes:Array.isArray(draft.reviewNotes)?draft.reviewNotes.map(v=>text(v,240)).filter(Boolean).slice(0,5):[],generatedAt:new Date().toISOString(),model:safeText($json.model||$json.model_id||$vars.SOCIAL_AI_MODEL||'OpenAI',80)}; if(!normalized.baseCaption) throw new Error('A IA não retornou uma legenda-base válida. Nenhuma alteração foi salva.');
const previous=state.records[id]||{}; const now=new Date().toISOString(); state.records[id]={...previous,brief:safeText(request.brief,1600),aiDraft:normalized,updatedAt:now,audit:[...(previous.audit||[]),{at:now,operator,action:'gerou sugestão IA',comment:'Rascunho salvo para revisão humana; a legenda atual não foi substituída.'}]}; saveState(state); return [{json:{ok:true,route:'respond',message:'Sugestão da IA salva para revisão. A legenda atual não foi alterada.',draft:normalized}}];`;

// The publication lane deliberately reserves a delivery before calling a network.
// This prevents duplicate posts after a retry or an n8n restart. It returns no item
// until publishing is explicitly enabled in n8n Variables.
const reserveQueueCode = `${shared}
const enabled=String($vars.SOCIAL_PUBLISH_ENABLED||'').toLowerCase()==='true'; if(!enabled) return [];
const now=new Date(); const nowIso=now.toISOString(); const {state,items}=scan(); const outgoing=[]; const publicMediaBase=String($vars.SOCIAL_PUBLIC_MEDIA_BASE_URL||'').replace(/\\/+$/,''); const requireSignature=String($vars.SOCIAL_MEDIA_REQUIRE_SIGNED_URLS||'').toLowerCase()==='true'; const signingSecret=String($vars.SOCIAL_MEDIA_SIGNING_SECRET||'');
function signedAssetUrl(contentId,file){if(!publicMediaBase) return ''; const base=publicMediaBase+'?id='+encodeURIComponent(contentId)+'&file='+encodeURIComponent(file); if(!requireSignature) return base; if(!signingSecret) throw new Error('SOCIAL_MEDIA_SIGNING_SECRET é obrigatório quando SOCIAL_MEDIA_REQUIRE_SIGNED_URLS=true.'); const exp=Math.floor(Date.now()/1000)+7200; const sig=crypto.createHmac('sha256',signingSecret).update(contentId+':'+file+':'+exp).digest('base64url'); return base+'&exp='+exp+'&sig='+encodeURIComponent(sig)}
for(const content of items){
 const due=content.status==='aprovado'||(content.status==='agendado'&&content.scheduleAt&&new Date(content.scheduleAt)<=now); if(!due) continue;
 for(const network of content.networks||[]){ const delivery=state.records[content.id]?.deliveries?.[network]; if(!delivery) continue;
  const retryAt=delivery.retryAt?new Date(delivery.retryAt):null; const eligible=['queued','retry'].includes(delivery.status)&&(!retryAt||retryAt<=now); if(!eligible) continue;
  delivery.status='dispatching'; delivery.attempts=Number(delivery.attempts||0)+1; delivery.dispatchId=crypto.randomUUID(); delivery.lastAttemptAt=nowIso; delivery.lastError='';
  const variant=network==='x'?(content.aiDraft?.variants?.xThread||[]):safeText(content.aiDraft?.variants?.[network]||content.caption,5000);
  const assetUrls=Object.fromEntries((content.slides||[]).map(file=>[file,signedAssetUrl(content.id,file)])); outgoing.push({json:{contentId:content.id,folder:content.folder,title:content.title,caption:content.caption,brief:content.brief||'',network,slides:content.slides,assetVersion:content.assetVersion,variant,dispatchId:delivery.dispatchId,attempt:delivery.attempts,publicMediaBase,assetUrls}});
 }
}
if(outgoing.length){for(const payload of outgoing){const record=state.records[payload.json.contentId]; record.updatedAt=nowIso; record.audit=[...(record.audit||[]),{at:nowIso,operator:'Sistema',action:'reservou publicação',comment:'Entrega '+payload.json.network+' reservada com idempotência.',network:payload.json.network,dispatchId:payload.json.dispatchId}]} saveState(state)}
return outgoing;`;

const socialPreflightCode = `${shared}
const payload=$input.first().json; const network=safeText(payload.network,30); const now=new Date().toISOString(); const requirements={instagram:['SOCIAL_META_ENABLED','SOCIAL_META_INSTAGRAM_ACCOUNT_ID','SOCIAL_PUBLIC_MEDIA_BASE_URL'],facebook:['SOCIAL_META_ENABLED','SOCIAL_META_PAGE_ID','SOCIAL_PUBLIC_MEDIA_BASE_URL'],linkedin:['SOCIAL_LINKEDIN_ENABLED','SOCIAL_LINKEDIN_ORGANIZATION_URN'],x:['SOCIAL_X_ENABLED']}[network]||[]; const missing=requirements.filter(key=>!safeText($vars[key],400));
if(!missing.length) return [{json:payload}];
const {state}=scan(); const delivery=state.records?.[payload.contentId]?.deliveries?.[network]; if(delivery&&delivery.dispatchId===payload.dispatchId){delivery.status='blocked'; delivery.retryAt=''; delivery.lastError='Configuração pendente: '+missing.join(', '); state.records[payload.contentId].updatedAt=now; state.records[payload.contentId].audit=[...(state.records[payload.contentId].audit||[]),{at:now,operator:'Sistema',action:'bloqueou publicação',comment:delivery.lastError,network,dispatchId:payload.dispatchId}]; saveState(state)}
return [];`;

const deliverySuccessCode = `${shared}
const payload=$('Loop de entregas').item.json; const now=new Date().toISOString(); const {state}=scan(); const delivery=state.records?.[payload.contentId]?.deliveries?.[payload.network]; if(!delivery||delivery.dispatchId!==payload.dispatchId) throw new Error('A confirmação recebida não corresponde à entrega reservada.'); const remoteId=safeText($json.id||$json.data?.id||$json.postId||$json.value?.id||'',200); const permalink=safeText($json.permalink_url||$json.permalink||'',1000); delivery.status='published'; delivery.publishedAt=now; delivery.retryAt=''; delivery.lastRemoteId=remoteId; delivery.lastPermalink=permalink; delivery.lastError=''; const record=state.records[payload.contentId]; const allDone=(record.networks||[]).every(network=>record.deliveries?.[network]?.status==='published'); if(allDone) record.status='publicado'; record.updatedAt=now; record.audit=[...(record.audit||[]),{at:now,operator:'Sistema',action:'publicou conteúdo',comment:'Confirmação recebida da API.',network:payload.network,dispatchId:payload.dispatchId,remoteId}]; saveState(state); return [{json:{...payload,ok:true,remoteId,permalink}}];`;

const deliveryFailureCode = `${shared}
const payload=$('Loop de entregas').item.json; const now=new Date(); const nowIso=now.toISOString(); const {state}=scan(); const delivery=state.records?.[payload.contentId]?.deliveries?.[payload.network]; const raw=safeText($json.error?.message||$json.message||$json.description||'Falha sem detalhe retornado pela rede.',500); if(delivery&&delivery.dispatchId===payload.dispatchId){const attempts=Number(delivery.attempts||1); const canRetry=attempts<3; delivery.status=canRetry?'retry':'failed'; delivery.retryAt=canRetry?new Date(now.getTime()+Math.min(60,2**attempts)*60000).toISOString():''; delivery.lastError=raw; const record=state.records[payload.contentId]; record.updatedAt=nowIso; record.audit=[...(record.audit||[]),{at:nowIso,operator:'Sistema',action:canRetry?'agendou nova tentativa':'falhou publicação',comment:raw,network:payload.network,dispatchId:payload.dispatchId}]; saveState(state)} return [{json:{...payload,ok:false,error:raw}}];`;

const assembleInstagramCode = `const parent=$('Pré-validar publicação').first().json; const children=$input.all().map(item=>item.json.id).filter(Boolean); if(children.length!==parent.slides.length) throw new Error('A Meta não retornou todos os containers do carrossel.'); return [{json:{...parent,children}}];`;
const expandInstagramCode = `const parent=$input.first().json; if(parent.slides.length<2||parent.slides.length>10) throw new Error('O carrossel do Instagram deve ter entre 2 e 10 imagens.'); if(!parent.publicMediaBase) throw new Error('Instagram requer uma URL pública HTTPS para as imagens.'); return parent.slides.map(file=>{const url=parent.assetUrls?.[file]; if(!url) throw new Error('Não foi possível gerar a URL segura da imagem '+file+'.'); return {json:{...parent,file,url}}});`;
const inspectInstagramCode = `const status=String($json.status_code||'').toUpperCase(); if(status!=='FINISHED') throw new Error('O carrossel do Instagram ainda não terminou de processar (status: '+(status||'indisponível')+'). A entrega será tentada novamente.'); return $input.all();`;
const expandFacebookCode = `const parent=$input.first().json; if(!parent.publicMediaBase) throw new Error('Facebook requer uma URL pública HTTPS para as imagens neste fluxo.'); return parent.slides.map(file=>{const url=parent.assetUrls?.[file]; if(!url) throw new Error('Não foi possível gerar a URL segura da imagem '+file+'.'); return {json:{...parent,file,url}}});`;
const assembleFacebookCode = `const parent=$('Pré-validar publicação').first().json; const media=$input.all().map(item=>item.json.id).filter(Boolean).map(media_fbid=>({media_fbid})); if(media.length!==parent.slides.length) throw new Error('A Meta não retornou todas as fotos não publicadas do Facebook.'); return [{json:{...parent,attachedMedia:media}}];`;
const expandLinkedInCode = `const parent=$input.first().json; if(!parent.slides.length) throw new Error('Não há imagens para enviar ao LinkedIn.'); return parent.slides.map(file=>({json:{...parent,file,filePath:'/files/postagem-redes/entrada/'+parent.folder+'/'+file}}));`;
const assembleLinkedInCode = `const parent=$('Pré-validar publicação').first().json; const images=$('Inicializar upload LinkedIn').all().map(item=>item.json.value?.image||item.json.image||item.json.id).filter(Boolean); if(images.length!==parent.slides.length) throw new Error('O LinkedIn não retornou URNs para todas as imagens.'); return [{json:{...parent,images}}];`;
const prepareXCode = `const payload=$input.first().json; const thread=Array.isArray(payload.variant)?payload.variant.filter(Boolean):[]; const chunks=(thread.length?thread:[payload.caption]).map(value=>String(value).trim()).filter(Boolean).slice(0,4); if(!chunks.length) throw new Error('Não há texto para a thread do X.'); return [{json:{...payload,chunks}}];`;

const assetCode = `${shared}
const query=$input.first().json.query||{}; const id=safeText(query.id,130); const file=safeText(query.file,200); if(!id||!file||path.basename(file)!==file||!/^.+\\.(png|jpe?g|webp)$/i.test(file)) throw new Error('Arquivo inválido.'); const requireSignature=String($vars.SOCIAL_MEDIA_REQUIRE_SIGNED_URLS||'').toLowerCase()==='true'; if(requireSignature){const exp=Number(query.exp); const supplied=String(query.sig||''); const secret=String($vars.SOCIAL_MEDIA_SIGNING_SECRET||''); if(!secret||!Number.isFinite(exp)||exp<Math.floor(Date.now()/1000)||exp>Math.floor(Date.now()/1000)+21600||!supplied) throw new Error('Link de mídia ausente, expirado ou inválido.'); const expected=crypto.createHmac('sha256',secret).update(id+':'+file+':'+exp).digest('base64url'); const valid=supplied.length===expected.length&&crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)); if(!valid) throw new Error('Assinatura de mídia inválida.')} const {items}=scan(); const content=items.find(x=>x.id===id); if(!content||!content.slides.includes(file)) throw new Error('Imagem não encontrada.'); const full=path.join(INPUT,content.folder,file); const data=fs.readFileSync(full); const mime=/\\.png$/i.test(file)?'image/png':/\\.webp$/i.test(file)?'image/webp':'image/jpeg'; return [{json:{},binary:{data:{data:data.toString('base64'),mimeType:mime,fileName:file}}}];`;

function workflow(name,path,method,code,respondWith='text',note='') {
 const responseParameters=respondWith==='binary'
  ?{respondWith:'binary',responseBinaryPropertyName:'data',options:{responseHeaders:{entries:[{name:'Cache-Control',value:'private, max-age=604800, immutable'}]}}}
  :{respondWith:'text',responseBody:'={{ $json.html }}',options:{responseHeaders:{entries:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'}]}}};
 const nodes=[
  {parameters:{content:note,width:520,height:175,color:5},id:'summary',name:'Resumo operacional',type:'n8n-nodes-base.stickyNote',typeVersion:1,position:[-360,-290]},
  {parameters:{httpMethod:method,path,responseMode:'responseNode',options:{}},id:'trigger',name:'Webhook',type:'n8n-nodes-base.webhook',typeVersion:2.1,position:[-280,0],webhookId:`postagem-redes-${path}`},
  {parameters:{jsCode:code},id:'code',name:'Processar',type:'n8n-nodes-base.code',typeVersion:2,position:[0,0]},
  {parameters:responseParameters,id:'respond',name:'Responder',type:'n8n-nodes-base.respondToWebhook',typeVersion:1.5,position:[280,0]},
 ];
 return {name,active:false,settings:{executionOrder:'v1',availableInMCP:false},nodes,connections:{Webhook:{main:[[{node:'Processar',type:'main',index:0}]]},Processar:{main:[[{node:'Responder',type:'main',index:0}]]}},pinData:{}};
}
function actionWorkflow() {
 const node=(id,name,type,typeVersion,parameters,position,extra={})=>({id,name,type,typeVersion,parameters,position,...extra});
 const failure=node('delivery-failure','Registrar falha e retry','n8n-nodes-base.code',2,{jsCode:deliveryFailureCode},[2860,1260]);
 const success=node('delivery-success','Registrar publicação e histórico','n8n-nodes-base.code',2,{jsCode:deliverySuccessCode},[2860,820]);
 const http=(id,name,parameters,position)=>node(id,name,'n8n-nodes-base.httpRequest',4.4,parameters,position,{onError:'continueErrorOutput'});
 const code=(id,name,jsCode,position)=>node(id,name,'n8n-nodes-base.code',2,{jsCode},position,{onError:'continueErrorOutput'});
 const ifNode=(id,name,left,position)=>node(id,name,'n8n-nodes-base.if',2.3,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:left,rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}]},options:{}},position);
 return {
  name:'Postagem Redes — Portal: Ações',
  active:false,
  settings:{executionOrder:'v1',availableInMCP:false},
  pinData:{},
  nodes:[
   node('canvas-summary','Orquestrador de publicação','n8n-nodes-base.stickyNote',1,{content:'## Produção controlada\n\n**Uma fila, quatro redes, três provedores de IA.**\n\n- Ações do portal sempre exigem revisão humana.\n- A fila só dispara quando SOCIAL_PUBLISH_ENABLED=true.\n- Cada entrega é reservada antes da chamada externa; falhas recebem até 3 tentativas com espera exponencial.\n- Credenciais ficam somente no cofre do n8n, nunca neste workflow.',width:550,height:270,color:6},[-650,-470]),
   node('canvas-ia','01 · Portal e IA','n8n-nodes-base.stickyNote',1,{content:'## 01 · Portal e IA\n\nA sugestão nunca publica conteúdo.\n\nOpenAI é o provedor primário; Gemini e Ollama só entram quando a variável de fallback correspondente estiver habilitada.',width:510,height:180,color:4},[180,-470]),
   node('canvas-fila','02 · Fila protegida','n8n-nodes-base.stickyNote',1,{content:'## 02 · Fila, reserva e validação\n\nCada destino recebe um `dispatchId` antes da chamada externa. A trava global e as variáveis por rede são verificadas antes de publicar.',width:560,height:185,color:5},[-650,340]),
   node('canvas-redes','03 · Publicadores por rede','n8n-nodes-base.stickyNote',1,{content:'## 03 · APIs oficiais\n\nCada faixa segue a regra própria da plataforma. HTTP Request fica apenas onde não há operação nativa completa no n8n.',width:500,height:165,color:2},[1550,120]),
   node('canvas-resultados','04 · Resultado e recuperação','n8n-nodes-base.stickyNote',1,{content:'## 04 · Resultado por entrega\n\nSucesso e falha são gravados no estado e no Ledger nativo. Falhas têm até três tentativas com espera exponencial.',width:520,height:170,color:3},[2700,510]),
   node('portal-actions-webhook','Webhook do portal','n8n-nodes-base.webhook',2.1,{httpMethod:'POST',path:'postagem-redes-api',responseMode:'responseNode',options:{}},[-620,0],{webhookId:'postagem-redes-postagem-redes-api'}),
   node('portal-actions-process','Processar ação do portal','n8n-nodes-base.code',2,{jsCode:actionCode},[-390,0]),
   node('portal-actions-router','Roteador da ação','n8n-nodes-base.switch',3.4,{mode:'rules',rules:{values:[
    {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.route }}',rightValue:'ai',operator:{type:'string',operation:'equals'}}]},renameOutput:true,outputKey:'Gerar IA'},
    {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.route }}',rightValue:'respond',operator:{type:'string',operation:'equals'}}]},renameOutput:true,outputKey:'Responder'},
   ]},options:{fallbackOutput:'none',ignoreCase:false}},[-135,0]),
   node('portal-actions-openai','OpenAI · sugestão primária','@n8n/n8n-nodes-langchain.openAi',2.3,{resource:'text',operation:'response',modelId:{mode:'id',value:'={{ $vars.SOCIAL_AI_MODEL || "gpt-5-mini" }}'},responses:{values:[{type:'text',role:'user',content:'={{ $json.aiPrompt }}'}]},simplify:true,options:{instructions:'Retorne somente JSON válido conforme o pedido; não use markdown.',maxTokens:1800}},[130,-150],{onError:'continueErrorOutput'}),
   ifNode('ai-gemini-enabled','Fallback Gemini habilitado?','={{ String($vars.SOCIAL_AI_GEMINI_FALLBACK_ENABLED || "").toLowerCase() === "true" }}',[390,-80]),
   node('portal-actions-gemini','Gemini · fallback','@n8n/n8n-nodes-langchain.googleGemini',1.2,{resource:'text',operation:'message',modelId:{mode:'id',value:'={{ $vars.SOCIAL_GEMINI_MODEL || "gemini-3.5-flash" }}'},messages:{values:[{role:'user',content:'={{ $("Processar ação do portal").item.json.aiPrompt }}'}]},simplify:true,jsonOutput:true,options:{systemMessage:'Retorne somente JSON válido conforme o pedido; não use markdown.',maxOutputTokens:1800}},[640,-160],{onError:'continueErrorOutput'}),
   ifNode('ai-ollama-enabled','Fallback Ollama habilitado?','={{ String($vars.SOCIAL_AI_OLLAMA_FALLBACK_ENABLED || "").toLowerCase() === "true" }}',[900,-60]),
   node('portal-actions-ollama','Ollama · fallback local','@n8n/n8n-nodes-langchain.ollama',1,{resource:'text',operation:'message',modelId:{mode:'id',value:'={{ $vars.SOCIAL_OLLAMA_MODEL || "llama3.2" }}'},messages:{values:[{role:'user',content:'={{ $("Processar ação do portal").item.json.aiPrompt }}'}]},simplify:true,options:{system:'Retorne somente JSON válido conforme o pedido; não use markdown.',temperature:0.3,num_predict:1800}},[1150,-160],{onError:'continueErrorOutput'}),
   node('portal-actions-ai-save','Validar e salvar sugestão IA','n8n-nodes-base.code',2,{jsCode:aiPersistCode},[1430,-150],{onError:'continueErrorOutput'}),
   node('ai-failure','Registrar indisponibilidade da IA','n8n-nodes-base.code',2,{jsCode:"return [{json:{ok:false,route:'respond',message:'Não foi possível gerar a sugestão. Revise as credenciais OpenAI/Gemini/Ollama ou tente novamente.'}}];"},[1420,10]),
   node('portal-actions-respond','Responder ao portal','n8n-nodes-base.respondToWebhook',1.5,{respondWith:'firstIncomingItem',options:{responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}},[1690,0]),

   node('schedule','Schedule Trigger · a cada 5 minutos','n8n-nodes-base.scheduleTrigger',1.3,{rule:{interval:[{field:'minutes',minutesInterval:5}]}},[-620,620]),
   node('ledger-create','Garantir Data Table · Ledger','n8n-nodes-base.dataTable',1.1,{resource:'table',operation:'create',tableName:'Postagem Redes - Ledger',columns:{column:[{name:'content_id',type:'string'},{name:'network',type:'string'},{name:'status',type:'string'},{name:'remote_id',type:'string'},{name:'permalink',type:'string'},{name:'error',type:'string'},{name:'dispatch_id',type:'string'},{name:'occurred_at',type:'string'}]},options:{createIfNotExists:true}},[-500,620]),
   node('reserve-queue','Reservar entregas elegíveis','n8n-nodes-base.code',2,{jsCode:reserveQueueCode},[-390,620]),
   node('delivery-loop','Loop de entregas','n8n-nodes-base.splitInBatches',3,{batchSize:1,options:{}},[-150,620]),
   node('social-preflight','Pré-validar publicação','n8n-nodes-base.code',2,{jsCode:socialPreflightCode},[90,620],{onError:'continueErrorOutput'}),
   node('social-router','Roteador por rede','n8n-nodes-base.switch',3.4,{mode:'rules',rules:{values:[
    {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.network }}',rightValue:'instagram',operator:{type:'string',operation:'equals'}}]},renameOutput:true,outputKey:'Instagram'},
    {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.network }}',rightValue:'facebook',operator:{type:'string',operation:'equals'}}]},renameOutput:true,outputKey:'Facebook'},
    {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.network }}',rightValue:'linkedin',operator:{type:'string',operation:'equals'}}]},renameOutput:true,outputKey:'LinkedIn'},
    {conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{leftValue:'={{ $json.network }}',rightValue:'x',operator:{type:'string',operation:'equals'}}]},renameOutput:true,outputKey:'X / thread'},
   ]},options:{fallbackOutput:'none',ignoreCase:false}},[340,620]),

   code('ig-expand','Instagram · preparar slides',expandInstagramCode,[610,340]),
   http('ig-containers','Instagram · criar containers',{method:'POST',url:'={{ "https://graph.facebook.com/"+($vars.SOCIAL_META_GRAPH_VERSION || "v23.0")+"/"+$vars.SOCIAL_META_INSTAGRAM_ACCOUNT_ID+"/media" }}',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendBody:true,contentType:'form-urlencoded',bodyParameters:{parameters:[{name:'image_url',value:'={{ $json.url }}'},{name:'is_carousel_item',value:'true'}]},options:{timeout:60000}},[850,340]),
   code('ig-assemble','Instagram · reunir containers',assembleInstagramCode,[1090,340]),
   http('ig-carousel','Instagram · criar carrossel',{method:'POST',url:'={{ "https://graph.facebook.com/"+($vars.SOCIAL_META_GRAPH_VERSION || "v23.0")+"/"+$vars.SOCIAL_META_INSTAGRAM_ACCOUNT_ID+"/media" }}',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendBody:true,contentType:'form-urlencoded',bodyParameters:{parameters:[{name:'media_type',value:'CAROUSEL'},{name:'children',value:'={{ $json.children.join(",") }}'},{name:'caption',value:'={{ $json.variant || $json.caption }}'}]},options:{timeout:60000}},[1330,340]),
   node('ig-wait','Instagram · aguardar processamento','n8n-nodes-base.wait',1.1,{resume:'timeInterval',amount:30,unit:'seconds'},[1570,340]),
   http('ig-status','Instagram · consultar status do carrossel',{method:'GET',url:'={{ "https://graph.facebook.com/"+($vars.SOCIAL_META_GRAPH_VERSION || "v23.0")+"/"+$("Instagram · criar carrossel").item.json.id+"?fields=status_code" }}',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',options:{timeout:60000}},[1810,340]),
   code('ig-ready','Instagram · validar processamento',inspectInstagramCode,[2050,340]),
   http('ig-publish','Instagram · publicar carrossel',{method:'POST',url:'={{ "https://graph.facebook.com/"+($vars.SOCIAL_META_GRAPH_VERSION || "v23.0")+"/"+$vars.SOCIAL_META_INSTAGRAM_ACCOUNT_ID+"/media_publish" }}',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendBody:true,contentType:'form-urlencoded',bodyParameters:{parameters:[{name:'creation_id',value:'={{ $("Instagram · criar carrossel").item.json.id }}'}]},options:{timeout:60000}},[2290,340]),

   code('fb-expand','Facebook · preparar slides',expandFacebookCode,[610,560]),
   http('fb-photos','Facebook · enviar fotos não publicadas',{method:'POST',url:'={{ "https://graph.facebook.com/"+($vars.SOCIAL_META_GRAPH_VERSION || "v23.0")+"/"+$vars.SOCIAL_META_PAGE_ID+"/photos" }}',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendBody:true,contentType:'form-urlencoded',bodyParameters:{parameters:[{name:'url',value:'={{ $json.url }}'},{name:'published',value:'false'}]},options:{timeout:60000}},[850,560]),
   code('fb-assemble','Facebook · reunir IDs das fotos',assembleFacebookCode,[1090,560]),
   http('fb-post','Facebook · publicar carrossel',{method:'POST',url:'={{ "https://graph.facebook.com/"+($vars.SOCIAL_META_GRAPH_VERSION || "v23.0")+"/"+$vars.SOCIAL_META_PAGE_ID+"/feed" }}',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify({ message: $json.variant || $json.caption, attached_media: $json.attachedMedia }) }}',options:{timeout:60000}},[1330,560]),

   code('li-expand','LinkedIn · preparar arquivos',expandLinkedInCode,[610,780]),
   node('li-read','LinkedIn · ler imagem local','n8n-nodes-base.readWriteFile',1.1,{operation:'read',fileSelector:'={{ $json.filePath }}',options:{dataPropertyName:'data'}},[850,780],{onError:'continueErrorOutput'}),
   http('li-init','Inicializar upload LinkedIn',{method:'POST',url:'https://api.linkedin.com/rest/images?action=initializeUpload',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendHeaders:true,headerParameters:{parameters:[{name:'LinkedIn-Version',value:'={{ $vars.SOCIAL_LINKEDIN_VERSION || "202607" }}'},{name:'X-Restli-Protocol-Version',value:'2.0.0'}]},sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify({ initializeUploadRequest: { owner: $vars.SOCIAL_LINKEDIN_ORGANIZATION_URN } }) }}',options:{timeout:60000}},[1090,780]),
   http('li-upload','LinkedIn · enviar binário',{method:'PUT',url:'={{ $json.value.uploadUrl }}',sendBody:true,contentType:'raw',inputDataFieldName:'data',options:{timeout:60000}},[1330,780]),
   code('li-assemble','LinkedIn · reunir URNs',assembleLinkedInCode,[1570,780]),
   http('li-post','LinkedIn · criar post multi-imagem',{method:'POST',url:'https://api.linkedin.com/rest/posts',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendHeaders:true,headerParameters:{parameters:[{name:'LinkedIn-Version',value:'={{ $vars.SOCIAL_LINKEDIN_VERSION || "202607" }}'},{name:'X-Restli-Protocol-Version',value:'2.0.0'}]},sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify({ author: $vars.SOCIAL_LINKEDIN_ORGANIZATION_URN, commentary: $json.variant || $json.caption, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false, content: { multiImage: { images: $json.images.map(id => ({ id })) } } }) }}',options:{timeout:60000}},[1810,780]),

   code('x-prepare','X · adaptar sequência',prepareXCode,[610,1020]),
   node('x-read','X · ler primeira imagem','n8n-nodes-base.readWriteFile',1.1,{operation:'read',fileSelector:'={{ "/files/postagem-redes/entrada/"+$json.folder+"/"+$json.slides[0] }}',options:{dataPropertyName:'data'}},[850,1020],{onError:'continueErrorOutput'}),
   http('x-upload','X · enviar mídia v2',{method:'POST',url:'https://api.x.com/2/media/upload',authentication:'genericCredentialType',genericAuthType:'oAuth2Api',sendBody:true,contentType:'multipart-form-data',bodyParameters:{parameters:[{parameterType:'formBinaryData',name:'media',inputDataFieldName:'data'}]},options:{timeout:60000}},[1090,1020]),
   node('x-first','X · publicar post inicial','n8n-nodes-base.twitter',2,{resource:'tweet',operation:'create',text:'={{ $("X · adaptar sequência").item.json.chunks[0] }}',additionalFields:{attachments:'={{ $("X · enviar mídia v2").item.json.data.id }}'}},[1330,1020],{onError:'continueErrorOutput'}),
   ifNode('x-has-2','X · há resposta 2?','={{ $("X · adaptar sequência").item.json.chunks.length >= 2 }}',[1570,980]),
   node('x-reply-2','X · publicar resposta 2','n8n-nodes-base.twitter',2,{resource:'tweet',operation:'create',text:'={{ $("X · adaptar sequência").item.json.chunks[1] }}',additionalFields:{inReplyToStatusId:{mode:'id',value:'={{ $json.data.id }}'}}},[1810,940],{onError:'continueErrorOutput'}),
   ifNode('x-has-3','X · há resposta 3?','={{ $("X · adaptar sequência").item.json.chunks.length >= 3 }}',[2050,980]),
   node('x-reply-3','X · publicar resposta 3','n8n-nodes-base.twitter',2,{resource:'tweet',operation:'create',text:'={{ $("X · adaptar sequência").item.json.chunks[2] }}',additionalFields:{inReplyToStatusId:{mode:'id',value:'={{ $json.data.id }}'}}},[2290,940],{onError:'continueErrorOutput'}),
   ifNode('x-has-4','X · há resposta 4?','={{ $("X · adaptar sequência").item.json.chunks.length >= 4 }}',[2530,980]),
   node('x-reply-4','X · publicar resposta 4','n8n-nodes-base.twitter',2,{resource:'tweet',operation:'create',text:'={{ $("X · adaptar sequência").item.json.chunks[3] }}',additionalFields:{inReplyToStatusId:{mode:'id',value:'={{ $json.data.id }}'}}},[2770,940],{onError:'continueErrorOutput'}),
   failure, success,
   node('ledger-insert','Registrar no Data Table · Ledger','n8n-nodes-base.dataTable',1.1,{resource:'row',operation:'insert',dataTableId:{mode:'name',value:'Postagem Redes - Ledger'},columns:{mappingMode:'defineBelow',value:{content_id:'={{ $json.contentId }}',network:'={{ $json.network }}',status:'={{ $json.ok ? "published" : "failed" }}',remote_id:'={{ $json.remoteId || "" }}',permalink:'={{ $json.permalink || "" }}',error:'={{ $json.error || "" }}',dispatch_id:'={{ $json.dispatchId }}',occurred_at:'={{ $now.toISO() }}'}},options:{optimizeBulk:true}},[3140,1040],{onError:'continueErrorOutput'}),
  ],
  connections:{
   'Webhook do portal':{main:[[{node:'Processar ação do portal',type:'main',index:0}]]},
   'Processar ação do portal':{main:[[{node:'Roteador da ação',type:'main',index:0}]]},
   'Roteador da ação':{main:[[{node:'OpenAI · sugestão primária',type:'main',index:0}],[{node:'Responder ao portal',type:'main',index:0}]]},
   'OpenAI · sugestão primária':{main:[[{node:'Validar e salvar sugestão IA',type:'main',index:0}],[{node:'Fallback Gemini habilitado?',type:'main',index:0}]]},
   'Fallback Gemini habilitado?':{main:[[{node:'Gemini · fallback',type:'main',index:0}],[{node:'Fallback Ollama habilitado?',type:'main',index:0}]]},
   'Gemini · fallback':{main:[[{node:'Validar e salvar sugestão IA',type:'main',index:0}],[{node:'Fallback Ollama habilitado?',type:'main',index:0}]]},
   'Fallback Ollama habilitado?':{main:[[{node:'Ollama · fallback local',type:'main',index:0}],[{node:'Registrar indisponibilidade da IA',type:'main',index:0}]]},
   'Ollama · fallback local':{main:[[{node:'Validar e salvar sugestão IA',type:'main',index:0}],[{node:'Registrar indisponibilidade da IA',type:'main',index:0}]]},
   'Validar e salvar sugestão IA':{main:[[{node:'Responder ao portal',type:'main',index:0}],[{node:'Registrar indisponibilidade da IA',type:'main',index:0}]]},
   'Registrar indisponibilidade da IA':{main:[[{node:'Responder ao portal',type:'main',index:0}]]},

   'Schedule Trigger · a cada 5 minutos':{main:[[{node:'Garantir Data Table · Ledger',type:'main',index:0}]]},
   'Garantir Data Table · Ledger':{main:[[{node:'Reservar entregas elegíveis',type:'main',index:0}]]},
   'Reservar entregas elegíveis':{main:[[{node:'Loop de entregas',type:'main',index:0}]]},
   'Loop de entregas':{main:[[{node:'Pré-validar publicação',type:'main',index:0}]]},
   'Pré-validar publicação':{main:[[{node:'Roteador por rede',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Roteador por rede':{main:[
    [{node:'Instagram · preparar slides',type:'main',index:0}],
    [{node:'Facebook · preparar slides',type:'main',index:0}],
    [{node:'LinkedIn · preparar arquivos',type:'main',index:0}],
    [{node:'X · adaptar sequência',type:'main',index:0}],
   ]},
   'Instagram · preparar slides':{main:[[{node:'Instagram · criar containers',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Instagram · criar containers':{main:[[{node:'Instagram · reunir containers',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Instagram · reunir containers':{main:[[{node:'Instagram · criar carrossel',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Instagram · criar carrossel':{main:[[{node:'Instagram · aguardar processamento',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Instagram · aguardar processamento':{main:[[{node:'Instagram · consultar status do carrossel',type:'main',index:0}]]},
   'Instagram · consultar status do carrossel':{main:[[{node:'Instagram · validar processamento',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Instagram · validar processamento':{main:[[{node:'Instagram · publicar carrossel',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Instagram · publicar carrossel':{main:[[{node:'Registrar publicação e histórico',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},

   'Facebook · preparar slides':{main:[[{node:'Facebook · enviar fotos não publicadas',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Facebook · enviar fotos não publicadas':{main:[[{node:'Facebook · reunir IDs das fotos',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Facebook · reunir IDs das fotos':{main:[[{node:'Facebook · publicar carrossel',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Facebook · publicar carrossel':{main:[[{node:'Registrar publicação e histórico',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},

   'LinkedIn · preparar arquivos':{main:[[{node:'LinkedIn · ler imagem local',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'LinkedIn · ler imagem local':{main:[[{node:'Inicializar upload LinkedIn',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Inicializar upload LinkedIn':{main:[[{node:'LinkedIn · enviar binário',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'LinkedIn · enviar binário':{main:[[{node:'LinkedIn · reunir URNs',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'LinkedIn · reunir URNs':{main:[[{node:'LinkedIn · criar post multi-imagem',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'LinkedIn · criar post multi-imagem':{main:[[{node:'Registrar publicação e histórico',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},

   'X · adaptar sequência':{main:[[{node:'X · ler primeira imagem',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'X · ler primeira imagem':{main:[[{node:'X · enviar mídia v2',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'X · enviar mídia v2':{main:[[{node:'X · publicar post inicial',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'X · publicar post inicial':{main:[[{node:'X · há resposta 2?',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'X · há resposta 2?':{main:[[{node:'X · publicar resposta 2',type:'main',index:0}],[{node:'Registrar publicação e histórico',type:'main',index:0}]]},
   'X · publicar resposta 2':{main:[[{node:'X · há resposta 3?',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'X · há resposta 3?':{main:[[{node:'X · publicar resposta 3',type:'main',index:0}],[{node:'Registrar publicação e histórico',type:'main',index:0}]]},
   'X · publicar resposta 3':{main:[[{node:'X · há resposta 4?',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'X · há resposta 4?':{main:[[{node:'X · publicar resposta 4',type:'main',index:0}],[{node:'Registrar publicação e histórico',type:'main',index:0}]]},
   'X · publicar resposta 4':{main:[[{node:'Registrar publicação e histórico',type:'main',index:0}],[{node:'Registrar falha e retry',type:'main',index:0}]]},
   'Registrar publicação e histórico':{main:[[{node:'Registrar no Data Table · Ledger',type:'main',index:0}]]},
   'Registrar falha e retry':{main:[[{node:'Registrar no Data Table · Ledger',type:'main',index:0}]]},
   'Registrar no Data Table · Ledger':{main:[[{node:'Loop de entregas',type:'main',index:0}],[{node:'Loop de entregas',type:'main',index:0}]]},
  },
 };
}
writeFileSync(resolve(output,'04-portal-visual.sanitized.json'),JSON.stringify(workflow('Postagem Redes — Portal Visual','postagem-redes','GET',portalCode,'text','## Portal Visual\n\nEntrega a biblioteca, filtros, modais e prévias para a operação diária.\n\n**Sem publicação externa:** este workflow somente renderiza a interface.'),null,2)+'\n');
writeFileSync(resolve(output,'05-portal-acoes.sanitized.json'),JSON.stringify(actionWorkflow(),null,2)+'\n');
writeFileSync(resolve(output,'06-portal-arquivos.sanitized.json'),JSON.stringify(workflow('Postagem Redes — Portal: Arquivos','postagem-redes-arquivo','GET',assetCode,'binary','## Arquivos protegidos\n\nEntrega somente mídia pertencente a um conteúdo conhecido.\n\nQuando a URL pública estiver habilitada, valida expiração e assinatura HMAC antes de ler o arquivo.'),null,2)+'\n');
console.log('Workflows do portal gerados em workflows/.');
