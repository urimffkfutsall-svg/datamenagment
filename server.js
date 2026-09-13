'use strict';
// Serveri lokal për zhvillim (npm start). Në Vercel përdoret api/[...path].js.
const http=require('http');const fs=require('fs');const path=require('path');
const{handleApi,ensureReady,USE_KV}=require('./lib/handler');
const PORT=process.env.PORT||3000;const PUB=path.join(__dirname,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try{
  if((req.url||'').startsWith('/api/'))return await handleApi(req,res);
  const u=new URL(req.url||'/','http://localhost');
  let file=path.join(PUB,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
  if(!file.startsWith(PUB)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(PUB,'index.html');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);try{res.writeHead(500);res.end('Gabim i brendëshëm.');}catch{}}
});
ensureReady().then(()=>server.listen(PORT,'0.0.0.0',()=>{
 console.log(`\nDataManagment është aktive: http://localhost:${PORT}`);
 console.log(`Ruajtja: ${USE_KV?'Vercel KV (Redis)':'skedar lokal (data/db.json)'}\n`);
})).catch(e=>{console.error('Nuk u nis dot:',e);process.exit(1);});
