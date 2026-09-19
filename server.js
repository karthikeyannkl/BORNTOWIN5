const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=__dirname, PORT=Number(process.env.PORT||10000);
function mime(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js'))return'application/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function send(res,file){if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found: '+path.basename(file));}res.writeHead(200,{'Content-Type':mime(file)});res.end(fs.readFileSync(file))}
const routes={
 '/':'index.html','/index.html':'index.html',
 '/admin':'admin.html','/admin.html':'admin.html',
 '/product.html':'product.html','/product_admin.html':'product_admin.html',
 '/referral.html':'referral.html','/referral_admin.html':'referral_admin.html',
 '/level.html':'level.html','/server-sync.js':'server-sync.js'
};
http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  if(routes[u.pathname]) return send(res,path.join(ROOT,routes[u.pathname]));
  if(u.pathname==='/api/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,mode:'MAGIZH MASTER FLAT TEST'}))}
  // The master customer/referral API is served by the integrated test server only in the full build.
  res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'Route not found'}));
 }catch(e){res.writeHead(500);res.end(e.message)}
}).listen(PORT,'0.0.0.0',()=>console.log('MAGIZH MASTER FLAT TEST on '+PORT));
