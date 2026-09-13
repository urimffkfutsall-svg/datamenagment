'use strict';
const fs=require('fs');const path=require('path');const crypto=require('crypto');
const ROOT=path.join(__dirname,'..');const DB_FILE=path.join(ROOT,'data','db.json');

/* ---------- helpers ---------- */
const uid=()=>crypto.randomBytes(9).toString('hex');
const iso=()=>new Date().toISOString();
const today=()=>new Date().toISOString().slice(0,10);
const num=v=>{const n=Number(v);return isNaN(n)?0:n;};
const pad=(n,l)=>String(n).padStart(l,'0');
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function subdomainFrom(host){if(!host)return null;const h=host.split(':')[0];const parts=h.split('.');if(h==='localhost'||h.endsWith('.vercel.app')||/^\d+\.\d+\.\d+\.\d+$/.test(h))return null;if(parts.length>=3)return parts[0];return null;}
function hashPw(pw){const salt=crypto.randomBytes(16).toString('hex');const h=crypto.scryptSync(String(pw),salt,64).toString('hex');return salt+':'+h;}
function verifyPw(pw,stored){if(!stored||!stored.includes(':'))return false;const[salt,h]=stored.split(':');const cmp=crypto.scryptSync(String(pw),salt,64).toString('hex');const a=Buffer.from(h,'hex'),b=Buffer.from(cmp,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b);}

/* ---------- storage (Vercel KV in prod, local file in dev) ---------- */
const KV_URL=(process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL||'').replace(/\/+$/,'');
const KV_TOKEN=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN||'';
const USE_KV=!!(KV_URL&&KV_TOKEN);
const DB_KEY=process.env.KV_DB_KEY||'datamanagment:db';
const SECRET=process.env.SESSION_SECRET||'datamanagment-dev-secret-ndrysho-ne-vercel';
let db=null;
function normalize(d){if(d&&typeof d==='object'){['companies','users','clients','operators','sales','expenses','invoices','audit'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[];});}return d;}
async function kvGet(key){const r=await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`,{headers:{Authorization:`Bearer ${KV_TOKEN}`}});if(!r.ok){let t='';try{t=await r.text();}catch{}throw new Error('KV get '+r.status+' '+t.slice(0,200));}const j=await r.json();return j&&j.result!=null?JSON.parse(j.result):null;}
async function kvSet(key,obj){const r=await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`,{method:'POST',headers:{Authorization:`Bearer ${KV_TOKEN}`,'Content-Type':'text/plain'},body:JSON.stringify(obj)});if(!r.ok){let t='';try{t=await r.text();}catch{}throw new Error('KV set '+r.status+' '+t.slice(0,200));}}
async function readStore(){if(USE_KV)return normalize(await kvGet(DB_KEY));try{return normalize(JSON.parse(fs.readFileSync(DB_FILE,'utf8')));}catch{return null;}}
async function writeStore(d){if(USE_KV){await kvSet(DB_KEY,d);return;}fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2));}
async function load(){db=await readStore();}
async function save(){await writeStore(db);}
function mkUser(companyId,username,name,pw,role,email){return{id:uid(),companyId,username,name,email:email||'',role,passwordHash:hashPw(pw),status:'Aktiv',createdAt:iso()};}
function buildSeed(){
 const cid=uid();
 const company={id:cid,name:'Travelia L.L.C.',displayName:'Travelia',subdomain:'travelia',address:'Rr. UÇK, Prishtinë 10000',phone:'+383 44 123 456',email:'info@travelia.datapos.pro',nui:'810123456',status:'Aktiv',createdAt:iso()};
 const users=[mkUser(null,'urimi1806','Urim Krasniqi','1806','SUPER_ADMIN','urim@datapos.pro'),mkUser(cid,'admin.travelia','Arben Krasniqi','Travelia1806!','COMPANY_ADMIN','arben@travelia.datapos.pro'),mkUser(cid,'pun.travelia','Elira Hoxha','Travelia1806!','WORKER','elira@travelia.datapos.pro')];
 const opNames=[['Laura Tours','+30 21 000 111','sales@lauratours.gr'],['Sava Tours','+90 212 000 22','info@savatours.com'],['Max Travel','+34 93 000 33','booking@maxtravel.es']];
 const operators=opNames.map(o=>({id:uid(),companyId:cid,name:o[0],phone:o[1],email:o[2],createdAt:iso()}));
 const clNames=['Fatmir Berisha','Vjosa Gashi','Driton Krasniqi','Blerta Hoxha','Agon Morina','Rina Shala','Endrit Bytyçi','Teuta Kelmendi'];
 const clients=clNames.map((n,i)=>({id:uid(),companyId:cid,name:n,phone:'+383 4'+(4+i%5)+' '+(100000+i*137),email:slugify(n).replace(/-/g,'.')+'@example.com',address:'Prishtinë, Kosovë',notes:'',createdAt:iso()}));
 const hotels=['Mitsis Galini','Xoria Deluxe','TRS Ibiza','JAZ Palmariva'];const dests=['Greqi','Turqi','Spanjë','Egjipt','Itali'];
 const sales=[];for(let i=0;i<12;i++){const sell=1200+((i*173)%2600);const cost=Math.round(sell*(0.62+((i%5)*0.03)));const mth=1+(i%9);const bd=`2026-${pad(mth,2)}-${pad(3+(i%20),2)}`;const td=`2026-${pad(mth,2)}-${pad(15+(i%12),2)}`;const rd=`2026-${pad(mth,2)}-${pad(22+(i%6),2)}`;
  const cp=[];const op=[];if(i%3===0){cp.push({amount:sell,date:bd,method:'Bankë'});}else if(i%3===1){cp.push({amount:Math.round(sell*0.5),date:bd,method:'Kesh'});}
  if(i%2===0)op.push({amount:Math.round(cost*0.6),date:bd});
  sales.push({id:uid(),companyId:cid,bookingId:`TRV-2026-${pad(i+1,6)}`,clientId:clients[i%clients.length].id,operatorId:operators[i%operators.length].id,hotel:hotels[i%hotels.length],destination:dests[i%dests.length],bookingDate:bd,travelDate:td,returnDate:rd,operatorCost:cost,sellingPrice:sell,clientPayments:cp,operatorPayments:op,createdAt:iso()});}
 const expenses=[{id:uid(),companyId:cid,date:'2026-01-12',category:'Marketing',amount:450,note:'Reklama Facebook'},{id:uid(),companyId:cid,date:'2026-02-05',category:'Zyra',amount:300,note:'Qira zyre'},{id:uid(),companyId:cid,date:'2026-03-01',category:'Sistemi',amount:120,note:'Abonim DataManagment'}];
 const invoices=[{id:uid(),companyId:cid,invoiceNo:'FT-2026-00001',clientId:clients[0].id,saleId:sales[0].id,date:'2026-01-20',dueDate:'2026-02-03',items:[{desc:'Paketë turistike Greqi — Mitsis Galini',qty:1,price:sales[0].sellingPrice}],vatRate:18,notes:'Faleminderit që zgjodhët shërbimet tona.',status:'E paguar',createdAt:iso()}];
 return{companies:[company],users,clients,operators,sales,expenses,invoices,audit:[]};
}
async function ensureReady(){await load();if(!db||!Array.isArray(db.companies)||db.companies.length===0){db=buildSeed();await save();}}
/* ---------- sessions (stateless signed cookie) ---------- */
function signToken(userId){const exp=Date.now()+28800*1000;const data=userId+'.'+exp;const sig=crypto.createHmac('sha256',SECRET).update(data).digest('hex');return data+'.'+sig;}
function verifyToken(tok){if(!tok)return null;const parts=String(tok).split('.');if(parts.length!==3)return null;const[userId,exp,sig]=parts;const expect=crypto.createHmac('sha256',SECRET).update(userId+'.'+exp).digest('hex');const a=Buffer.from(sig),b=Buffer.from(expect);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;if(Date.now()>Number(exp))return null;return userId;}
function parseCookies(req){const out={};(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>-1)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());});return out;}
function currentUser(req){const c=parseCookies(req);const id=verifyToken(c.dm_session);if(!id)return null;return db.users.find(u=>u.id===id)||null;}
function sanitizeUser(u){return u&&{id:u.id,name:u.name,username:u.username,role:u.role,companyId:u.companyId,email:u.email,status:u.status};}
/* ---------- views ---------- */
function saleView(s){const clientPaid=(s.clientPayments||[]).reduce((a,p)=>a+num(p.amount),0);const operatorPaid=(s.operatorPayments||[]).reduce((a,p)=>a+num(p.amount),0);const clientDebt=Math.max(0,num(s.sellingPrice)-clientPaid);const operatorDebt=Math.max(0,num(s.operatorCost)-operatorPaid);const profit=num(s.sellingPrice)-num(s.operatorCost);let paymentStatus='Pa paguar';if(clientPaid>=num(s.sellingPrice)&&num(s.sellingPrice)>0)paymentStatus='Paguar';else if(clientPaid>0)paymentStatus='Pjesërisht';const cl=db.clients.find(c=>c.id===s.clientId);const op=db.operators.find(o=>o.id===s.operatorId);return{...s,clientName:cl?cl.name:'—',operatorName:op?op.name:'—',clientPaid,operatorPaid,clientDebt,operatorDebt,profit,paymentStatus};}
function operatorView(o,sales){const mine=sales.filter(s=>s.operatorId===o.id);const totalCost=mine.reduce((a,s)=>a+num(s.operatorCost),0);const paid=mine.reduce((a,s)=>a+(s.operatorPayments||[]).reduce((x,p)=>x+num(p.amount),0),0);return{...o,bookings:mine.length,totalCost,paid,debt:Math.max(0,totalCost-paid)};}
function invoiceView(i){const items=(i.items||[]).map(it=>({desc:it.desc||'',qty:num(it.qty),price:num(it.price)}));const subtotal=items.reduce((a,it)=>a+it.qty*it.price,0);const vatAmount=subtotal*num(i.vatRate)/100;const total=subtotal+vatAmount;const cl=db.clients.find(c=>c.id===i.clientId);return{...i,items,subtotal,vatAmount,total,clientName:cl?cl.name:'—',client:cl?{name:cl.name,address:cl.address,phone:cl.phone,email:cl.email}:{name:i.clientName||'—'}};}
function kpisFor(sales,expenses,clients){const views=sales.map(saleView);const totalSales=views.reduce((a,s)=>a+num(s.sellingPrice),0);const profit=views.reduce((a,s)=>a+s.profit,0);const received=views.reduce((a,s)=>a+s.clientPaid,0);const clientDebt=views.reduce((a,s)=>a+s.clientDebt,0);const operatorDebt=views.reduce((a,s)=>a+s.operatorDebt,0);const exp=expenses.reduce((a,e)=>a+num(e.amount),0);return{totalSales,profit,received,clientDebt,operatorDebt,expenses:exp,bookings:sales.length,clients:clients.length,netProfit:profit-exp};}

/* ---------- http utils ---------- */
function send(res,code,data,headers){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(headers||{})});res.end(JSON.stringify(data));}
function readBody(req){return new Promise((resolve)=>{if(req.body!==undefined&&req.body!==null){if(typeof req.body==='string'){try{resolve(JSON.parse(req.body||'{}'));}catch{resolve({});}}else{resolve(req.body);}return;}let buf='';req.on('data',d=>{buf+=d;if(buf.length>2e6)req.destroy();});req.on('end',()=>{try{resolve(buf?JSON.parse(buf):{});}catch{resolve({});}});});}
function audit(user,action){db.audit.push({id:uid(),companyId:user.companyId||null,at:iso(),who:user.name,action});if(db.audit.length>1000)db.audit=db.audit.slice(-1000);}
function companyScope(user,coll){return db[coll].filter(x=>x.companyId===user.companyId);}
function nextBooking(user){const n=db.sales.filter(s=>s.companyId===user.companyId).length+1;return `TRV-${new Date().getFullYear()}-${pad(n,6)}`;}
function nextInvoiceNo(user){const n=db.invoices.filter(i=>i.companyId===user.companyId).length+1;return `FT-${new Date().getFullYear()}-${pad(n,5)}`;}
function resolveClient(user,b){if(b.clientId)return b.clientId;if(b.newClient&&b.newClient.name){const c={id:uid(),companyId:user.companyId,name:b.newClient.name,phone:b.newClient.phone||'',email:b.newClient.email||'',address:b.newClient.address||'',notes:'',createdAt:iso()};db.clients.push(c);return c.id;}return null;}
function resolveOperator(user,b){if(b.operatorId)return b.operatorId;if(b.newOperator&&b.newOperator.name){const o={id:uid(),companyId:user.companyId,name:b.newOperator.name,phone:b.newOperator.phone||'',email:b.newOperator.email||'',createdAt:iso()};db.operators.push(o);return o.id;}return null;}

/* ---------- api ---------- */
async function api(req,res,url){
 const p=url.pathname;const m=req.method;const seg=p.split('/').filter(Boolean);// ['api',...]
 // public branding
 if(p==='/api/branding'&&m==='GET'){const firm=url.searchParams.get('firm')||subdomainFrom(req.headers.host);const co=firm?db.companies.find(c=>slugify(c.subdomain||'')===slugify(firm)):null;return send(res,200,{subdomain:co?co.subdomain:(firm||null),company:co?{name:co.name,displayName:co.displayName,address:co.address,phone:co.phone,email:co.email,nui:co.nui}:null});}
 if(p==='/api/login'&&m==='POST'){const b=await readBody(req);const u=db.users.find(x=>x.username===b.username);if(!u||!verifyPw(b.password,u.passwordHash))return send(res,401,{error:'Kredenciale të pasakta.'});if(u.status!=='Aktiv')return send(res,403,{error:'Llogaria është joaktive.'});const tok=signToken(u.id);audit(u,'U kyç në sistem');await save();return send(res,200,{user:sanitizeUser(u)},{'Set-Cookie':`dm_session=${tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`});}
 if(p==='/api/logout'&&m==='POST'){return send(res,200,{ok:true},{'Set-Cookie':'dm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
 // authed
 const user=currentUser(req);if(!user)return send(res,401,{error:'Ju lutem kyçuni.'});
 if(p==='/api/me'&&m==='GET')return send(res,200,{user:sanitizeUser(user)});
 if(p==='/api/dashboard'&&m==='GET'){
  if(user.role==='SUPER_ADMIN'){const companies=db.companies.map(co=>({id:co.id,name:co.name,displayName:co.displayName,subdomain:co.subdomain,status:co.status,address:co.address||'',phone:co.phone||'',email:co.email||'',nui:co.nui||'',admins:db.users.filter(u=>u.companyId===co.id&&u.role==='COMPANY_ADMIN').length,sales:db.sales.filter(s=>s.companyId===co.id).length}));return send(res,200,{role:user.role,company:null,companies,users:db.users.filter(u=>u.role!=='SUPER_ADMIN').map(sanitizeUser),audit:db.audit.slice(-200)});}
  const co=db.companies.find(c=>c.id===user.companyId)||null;const sales=companyScope(user,'sales');const clients=companyScope(user,'clients');const operators=companyScope(user,'operators');const expenses=companyScope(user,'expenses');const invoices=companyScope(user,'invoices');
  return send(res,200,{role:user.role,company:co&&{name:co.name,displayName:co.displayName,address:co.address,phone:co.phone,email:co.email,nui:co.nui},kpis:kpisFor(sales,expenses,clients),sales:sales.map(saleView).sort((a,b)=>(b.bookingDate||'').localeCompare(a.bookingDate||'')),clients:clients.map(c=>({...c})),operators:operators.map(o=>operatorView(o,sales)),expenses:expenses.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')),invoices:invoices.map(invoiceView).sort((a,b)=>(b.date||'').localeCompare(a.date||'')),workers:db.users.filter(u=>u.companyId===user.companyId).map(sanitizeUser),me:sanitizeUser(user),audit:db.audit.filter(a=>a.companyId===user.companyId).slice(-200)});
 }
 /* ----- SUPER ADMIN company management ----- */
 if(seg[1]==='companies'){
  if(user.role!=='SUPER_ADMIN')return send(res,403,{error:'Vetëm superadministratori.'});
  if(p==='/api/companies'&&m==='POST'){const b=await readBody(req);if(!b.name||!b.adminUsername||!b.adminPassword||!b.adminName)return send(res,400,{error:'Plotësoni firmën dhe administratorin.'});const sub=slugify(b.subdomain||b.name);if(!sub)return send(res,400,{error:'Subdomaini nuk është i vlefshëm.'});if(db.companies.some(c=>slugify(c.subdomain||'')===sub))return send(res,409,{error:'Ky subdomain është i zënë.'});if(db.users.some(u=>u.username===b.adminUsername))return send(res,409,{error:'Ky emër përdoruesi ekziston.'});const cid=uid();db.companies.push({id:cid,name:b.name,displayName:b.displayName||b.name,subdomain:sub,address:b.address||'',phone:b.phone||'',email:b.email||'',nui:b.nui||'',status:'Aktiv',createdAt:iso()});db.users.push(mkUser(cid,b.adminUsername,b.adminName,b.adminPassword,'COMPANY_ADMIN',b.adminEmail||''));audit(user,`Krijoi firmën ${b.name}`);await save();return send(res,201,{ok:true,subdomain:sub});}
  const cm=seg[2];const co=cm?db.companies.find(x=>x.id===cm):null;
  /* ----- company administrators management (add/edit/remove admins on an EXISTING firm) ----- */
  if(cm&&seg[3]==='admins'){
   if(!co)return send(res,404,{error:'Firma nuk u gjet.'});
   if(!seg[4]&&m==='GET')return send(res,200,{admins:db.users.filter(u=>u.companyId===cm&&u.role==='COMPANY_ADMIN').map(sanitizeUser)});
   if(!seg[4]&&m==='POST'){const b=await readBody(req);if(!b.name||!b.username||!b.password)return send(res,400,{error:'Emri, përdoruesi dhe fjalëkalimi kërkohen.'});if(db.users.some(u=>u.username===b.username))return send(res,409,{error:'Ky emër përdoruesi ekziston.'});const u=mkUser(cm,b.username,b.name,b.password,'COMPANY_ADMIN',b.email);db.users.push(u);audit(user,`Shtoi administratorin ${u.name} për firmën ${co.name}`);await save();return send(res,201,sanitizeUser(u));}
   const aid=seg[4];const a=db.users.find(x=>x.id===aid&&x.companyId===cm&&x.role==='COMPANY_ADMIN');
   if(aid&&m==='PUT'){if(!a)return send(res,404,{error:'Administratori nuk u gjet.'});const b=await readBody(req);if(b.username&&b.username!==a.username){if(db.users.some(u=>u.id!==aid&&u.username===b.username))return send(res,409,{error:'Ky emër përdoruesi ekziston.'});a.username=b.username;}['name','email'].forEach(k=>{if(b[k]!==undefined)a[k]=b[k];});if(b.status)a.status=b.status;if(b.password)a.passwordHash=hashPw(b.password);audit(user,`Përditësoi administratorin ${a.name}`);await save();return send(res,200,sanitizeUser(a));}
   if(aid&&m==='DELETE'){if(!a)return send(res,404,{error:'Administratori nuk u gjet.'});const others=db.users.filter(u=>u.companyId===cm&&u.role==='COMPANY_ADMIN'&&u.id!==aid);if(!others.length)return send(res,400,{error:'Firma duhet të ketë të paktën një administrator.'});db.users=db.users.filter(x=>x.id!==aid);audit(user,`Fshiu administratorin ${a.name}`);await save();return send(res,200,{ok:true});}
   return send(res,404,{error:'Rruga nuk u gjet.'});
  }
  if(cm&&!seg[3]&&m==='PUT'){const b=await readBody(req);if(!co)return send(res,404,{error:'Firma nuk u gjet.'});['name','displayName','address','phone','email','nui','status'].forEach(k=>{if(b[k]!==undefined)co[k]=b[k];});if(b.subdomain){const sub=slugify(b.subdomain);if(db.companies.some(x=>x.id!==cm&&slugify(x.subdomain||'')===sub))return send(res,409,{error:'Subdomaini është i zënë.'});co.subdomain=sub;}audit(user,`Përditësoi firmën ${co.name}`);await save();return send(res,200,{ok:true});}
  if(cm&&!seg[3]&&m==='DELETE'){if(!co)return send(res,404,{error:'Firma nuk u gjet.'});db.companies=db.companies.filter(x=>x.id!==cm);db.users=db.users.filter(u=>u.companyId!==cm);db.sales=db.sales.filter(x=>x.companyId!==cm);db.clients=db.clients.filter(x=>x.companyId!==cm);db.operators=db.operators.filter(x=>x.companyId!==cm);db.expenses=db.expenses.filter(x=>x.companyId!==cm);db.invoices=db.invoices.filter(x=>x.companyId!==cm);audit(user,`Fshiu firmën ${co.name} dhe të gjitha të dhënat e saj`);await save();return send(res,200,{ok:true});}
  return send(res,404,{error:'Rruga nuk u gjet.'});
 }
 if(user.role==='SUPER_ADMIN')return send(res,403,{error:'Superadministratori nuk ka qasje në të dhënat financiare.'});
 /* ----- SALES ----- */
 if(seg[1]==='sales'){
  if(p==='/api/sales'&&m==='POST'){const b=await readBody(req);const clientId=resolveClient(user,b);const operatorId=resolveOperator(user,b);if(!clientId)return send(res,400,{error:'Zgjidhni ose shtoni një klient.'});if(!operatorId)return send(res,400,{error:'Zgjidhni ose shtoni një operator.'});if(!b.sellingPrice||!b.operatorCost)return send(res,400,{error:'Vendosni koston dhe çmimin.'});const s={id:uid(),companyId:user.companyId,bookingId:nextBooking(user),clientId,operatorId,hotel:b.hotel||'',destination:b.destination||'',bookingDate:b.bookingDate||today(),travelDate:b.travelDate||'',returnDate:b.returnDate||'',operatorCost:num(b.operatorCost),sellingPrice:num(b.sellingPrice),clientPayments:[],operatorPayments:[],createdAt:iso()};if(num(b.clientPayment)>0)s.clientPayments.push({amount:num(b.clientPayment),date:b.bookingDate||today(),method:b.clientPaymentMethod||'Kesh'});if(num(b.operatorPayment)>0)s.operatorPayments.push({amount:num(b.operatorPayment),date:b.bookingDate||today()});db.sales.push(s);audit(user,`Krijoi shitjen ${s.bookingId}`);await save();return send(res,201,saleView(s));}
  const sid=seg[2];const s=db.sales.find(x=>x.id===sid&&x.companyId===user.companyId);
  if(sid&&seg[3]==='payment'&&m==='POST'){if(!s)return send(res,404,{error:'Shitja nuk u gjet.'});const b=await readBody(req);const amt=num(b.amount);if(amt<=0)return send(res,400,{error:'Shuma duhet të jetë pozitive.'});if(b.kind==='operator'){s.operatorPayments=s.operatorPayments||[];s.operatorPayments.push({amount:amt,date:b.date||today()});}else{s.clientPayments=s.clientPayments||[];s.clientPayments.push({amount:amt,date:b.date||today(),method:b.method||'Kesh'});}audit(user,`Regjistroi pagesë (${b.kind==='operator'?'operator':'klient'}) për ${s.bookingId}`);await save();return send(res,200,saleView(s));}
  if(sid&&m==='PUT'){if(!s)return send(res,404,{error:'Shitja nuk u gjet.'});const b=await readBody(req);const clientId=resolveClient(user,b);const operatorId=resolveOperator(user,b);if(clientId)s.clientId=clientId;if(operatorId)s.operatorId=operatorId;['hotel','destination','bookingDate','travelDate','returnDate'].forEach(k=>{if(b[k]!==undefined)s[k]=b[k];});if(b.operatorCost!==undefined)s.operatorCost=num(b.operatorCost);if(b.sellingPrice!==undefined)s.sellingPrice=num(b.sellingPrice);audit(user,`Përditësoi shitjen ${s.bookingId}`);await save();return send(res,200,saleView(s));}
  if(sid&&m==='DELETE'){if(!s)return send(res,404,{error:'Shitja nuk u gjet.'});db.sales=db.sales.filter(x=>x.id!==sid);audit(user,`Fshiu shitjen ${s.bookingId}`);await save();return send(res,200,{ok:true});}
 }
 /* ----- CLIENTS ----- */
 if(seg[1]==='clients'){
  if(p==='/api/clients'&&m==='POST'){const b=await readBody(req);if(!b.name)return send(res,400,{error:'Emri kërkohet.'});const c={id:uid(),companyId:user.companyId,name:b.name,phone:b.phone||'',email:b.email||'',address:b.address||'',notes:b.notes||'',createdAt:iso()};db.clients.push(c);audit(user,`Shtoi klientin ${c.name}`);await save();return send(res,201,c);}
  const cid=seg[2];const c=db.clients.find(x=>x.id===cid&&x.companyId===user.companyId);
  if(cid&&m==='PUT'){if(!c)return send(res,404,{error:'Klienti nuk u gjet.'});const b=await readBody(req);['name','phone','email','address','notes'].forEach(k=>{if(b[k]!==undefined)c[k]=b[k];});audit(user,`Përditësoi klientin ${c.name}`);await save();return send(res,200,c);}
  if(cid&&m==='DELETE'){if(!c)return send(res,404,{error:'Klienti nuk u gjet.'});if(db.sales.some(s=>s.clientId===cid))return send(res,409,{error:'Klienti ka shitje të lidhura dhe s\'mund të fshihet.'});db.clients=db.clients.filter(x=>x.id!==cid);audit(user,`Fshiu klientin ${c.name}`);await save();return send(res,200,{ok:true});}
 }
 /* ----- OPERATORS ----- */
 if(seg[1]==='operators'){
  if(p==='/api/operators'&&m==='POST'){const b=await readBody(req);if(!b.name)return send(res,400,{error:'Emri kërkohet.'});const o={id:uid(),companyId:user.companyId,name:b.name,phone:b.phone||'',email:b.email||'',createdAt:iso()};db.operators.push(o);audit(user,`Shtoi operatorin ${o.name}`);await save();return send(res,201,o);}
  const oid=seg[2];const o=db.operators.find(x=>x.id===oid&&x.companyId===user.companyId);
  if(oid&&seg[3]==='payment'&&m==='POST'){if(!o)return send(res,404,{error:'Operatori nuk u gjet.'});const b=await readBody(req);let amt=num(b.amount);if(amt<=0)return send(res,400,{error:'Shuma duhet të jetë pozitive.'});const open=db.sales.filter(s=>s.companyId===user.companyId&&s.operatorId===oid).map(s=>({s,debt:Math.max(0,num(s.operatorCost)-(s.operatorPayments||[]).reduce((a,p)=>a+num(p.amount),0))})).filter(x=>x.debt>0).sort((a,b2)=>(a.s.bookingDate||'').localeCompare(b2.s.bookingDate||''));for(const x of open){if(amt<=0)break;const pay=Math.min(amt,x.debt);x.s.operatorPayments=x.s.operatorPayments||[];x.s.operatorPayments.push({amount:pay,date:b.date||today()});amt-=pay;}audit(user,`Pagoi operatorin ${o.name}`);await save();return send(res,200,operatorView(o,companyScope(user,'sales')));}
  if(oid&&m==='PUT'){if(!o)return send(res,404,{error:'Operatori nuk u gjet.'});const b=await readBody(req);['name','phone','email'].forEach(k=>{if(b[k]!==undefined)o[k]=b[k];});audit(user,`Përditësoi operatorin ${o.name}`);await save();return send(res,200,o);}
  if(oid&&m==='DELETE'){if(!o)return send(res,404,{error:'Operatori nuk u gjet.'});if(db.sales.some(s=>s.operatorId===oid))return send(res,409,{error:'Operatori ka shitje të lidhura.'});db.operators=db.operators.filter(x=>x.id!==oid);audit(user,`Fshiu operatorin ${o.name}`);await save();return send(res,200,{ok:true});}
 }
 /* ----- EXPENSES ----- */
 if(seg[1]==='expenses'){
  if(p==='/api/expenses'&&m==='POST'){const b=await readBody(req);const e={id:uid(),companyId:user.companyId,date:b.date||today(),category:b.category||'Tjetër',amount:num(b.amount),note:b.note||''};db.expenses.push(e);audit(user,`Shtoi shpenzim ${e.category}`);await save();return send(res,201,e);}
  const eid=seg[2];if(eid&&m==='DELETE'){const e=db.expenses.find(x=>x.id===eid&&x.companyId===user.companyId);if(!e)return send(res,404,{error:'Shpenzimi nuk u gjet.'});db.expenses=db.expenses.filter(x=>x.id!==eid);audit(user,'Fshiu një shpenzim');await save();return send(res,200,{ok:true});}
 }
 /* ----- INVOICES ----- */
 if(seg[1]==='invoices'){
  if(p==='/api/invoices'&&m==='POST'){const b=await readBody(req);const clientId=resolveClient(user,b);if(!clientId)return send(res,400,{error:'Zgjidhni ose shtoni një klient.'});const items=(b.items||[]).map(it=>({desc:it.desc||'',qty:num(it.qty),price:num(it.price)}));if(!items.length)return send(res,400,{error:'Shtoni të paktën një artikull.'});const inv={id:uid(),companyId:user.companyId,invoiceNo:nextInvoiceNo(user),clientId,saleId:b.saleId||null,date:b.date||today(),dueDate:b.dueDate||'',items,vatRate:num(b.vatRate),notes:b.notes||'',status:b.status||'E papaguar',createdAt:iso()};db.invoices.push(inv);audit(user,`Krijoi faturën ${inv.invoiceNo}`);await save();return send(res,201,invoiceView(inv));}
  const iid=seg[2];const inv=db.invoices.find(x=>x.id===iid&&x.companyId===user.companyId);
  if(iid&&m==='PUT'){if(!inv)return send(res,404,{error:'Fatura nuk u gjet.'});const b=await readBody(req);const clientId=resolveClient(user,b);if(clientId)inv.clientId=clientId;if(b.items)inv.items=b.items.map(it=>({desc:it.desc||'',qty:num(it.qty),price:num(it.price)}));['date','dueDate','notes','status'].forEach(k=>{if(b[k]!==undefined)inv[k]=b[k];});if(b.vatRate!==undefined)inv.vatRate=num(b.vatRate);audit(user,`Përditësoi faturën ${inv.invoiceNo}`);await save();return send(res,200,invoiceView(inv));}
  if(iid&&m==='DELETE'){if(!inv)return send(res,404,{error:'Fatura nuk u gjet.'});db.invoices=db.invoices.filter(x=>x.id!==iid);audit(user,`Fshiu faturën ${inv.invoiceNo}`);await save();return send(res,200,{ok:true});}
 }
 /* ----- WORKERS ----- */
 if(seg[1]==='workers'){
  if(user.role!=='COMPANY_ADMIN')return send(res,403,{error:'Vetëm administratori i firmës.'});
  if(p==='/api/workers'&&m==='POST'){const b=await readBody(req);if(!b.name||!b.username||!b.password)return send(res,400,{error:'Emri, përdoruesi dhe fjalëkalimi kërkohen.'});if(db.users.some(u=>u.username===b.username))return send(res,409,{error:'Ky emër përdoruesi ekziston.'});const u=mkUser(user.companyId,b.username,b.name,b.password,b.role==='COMPANY_ADMIN'?'COMPANY_ADMIN':'WORKER',b.email);db.users.push(u);audit(user,`Shtoi përdoruesin ${u.name}`);await save();return send(res,201,sanitizeUser(u));}
  const wid=seg[2];const w=db.users.find(x=>x.id===wid&&x.companyId===user.companyId);
  if(wid&&m==='PUT'){if(!w)return send(res,404,{error:'Përdoruesi nuk u gjet.'});const b=await readBody(req);['name','email'].forEach(k=>{if(b[k]!==undefined)w[k]=b[k];});if(b.role&&w.role!=='SUPER_ADMIN')w.role=b.role==='COMPANY_ADMIN'?'COMPANY_ADMIN':'WORKER';if(b.status)w.status=b.status;if(b.password)w.passwordHash=hashPw(b.password);audit(user,`Përditësoi përdoruesin ${w.name}`);await save();return send(res,200,sanitizeUser(w));}
  if(wid&&m==='DELETE'){if(!w)return send(res,404,{error:'Përdoruesi nuk u gjet.'});if(w.id===user.id)return send(res,400,{error:'Nuk mund të fshini veten.'});db.users=db.users.filter(x=>x.id!==wid);audit(user,`Fshiu përdoruesin ${w.name}`);await save();return send(res,200,{ok:true});}
 }
 return send(res,404,{error:'Rruga nuk u gjet.'});
}

/* ---------- entry ---------- */
async function handleApi(req,res){try{await ensureReady();const url=new URL(req.url||'/','http://'+(req.headers.host||'localhost'));return await api(req,res,url);}catch(e){console.error(e);try{send(res,500,{error:'Gabim i brendëshëm: '+(e&&e.message?e.message:'panjohur')});}catch{}}}
module.exports={handleApi,ensureReady,USE_KV,getDb:()=>db};
