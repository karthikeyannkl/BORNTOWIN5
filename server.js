const express=require('express');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const app=express();
app.use(express.json({limit:'2mb'}));
app.use(express.static(__dirname));

const DB_FILE=path.join(__dirname,'magizh_master_db.json');
function freshDB(){return {adminPassword:'ADMIN',members:[],pins:[],messages:[],leveltrackRequests:[],leveltrackUpgrades:[],leveltrackPayments:[],leveltrackMessages:[]};}
function load(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}catch(e){const d=freshDB();save(d);return d}}
function save(d){fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2))}
let db=load();
// Backward-compatible defaults for existing db.json files.
db.members=db.members||[];db.pins=db.pins||[];db.messages=db.messages||[];
db.leveltrackRequests=db.leveltrackRequests||[];db.leveltrackUpgrades=db.leveltrackUpgrades||[];
db.leveltrackPayments=db.leveltrackPayments||[];db.leveltrackMessages=db.leveltrackMessages||[];
// First Joining PIN required by the original BORNTOWIN5 registration flow.
if(!db.pins.some(x=>x.pin==='B5-FMUXNF' && x.status==='AVAILABLE')){
  const old=db.pins.find(x=>x.pin==='B5-FMUXNF');
  if(!old) db.pins.push({pin:'B5-FMUXNF',assignedTo:null,status:'AVAILABLE',usedBy:null,createdAt:new Date().toISOString(),system:true});
  else if(!old.usedBy){old.status='AVAILABLE';old.assignedTo=null;}
}
save(db);

function id(){return 'B5-'+crypto.randomBytes(3).toString('hex').toUpperCase()}
function pin(){return 'B5-'+crypto.randomBytes(3).toString('hex').toUpperCase()}
function memberPublic(m){return {memberId:m.memberId,name:m.name,mobile:m.mobile,status:(m.status==='Rejected'?'Rejected':'ACTIVE'),referral:m.referral,level:Number(m.level||1),levelMemberId:m.levelMemberId||null,joinedAt:m.joinedAt||m.registeredAt||null,upgradeDate:m.upgradeDate||null}}
function findMember(q){q=String(q||'').toLowerCase();return db.members.filter(m=>(m.name+' '+m.memberId+' '+m.mobile).toLowerCase().includes(q))}
function descendants(rootId){
 let levels={1:[],2:[],3:[],4:[],5:[],6:[],7:[]}, current=[rootId];
 for(let l=1;l<=7;l++){const next=db.members.filter(m=>current.includes(m.referral)).map(m=>m.memberId);levels[l]=db.members.filter(m=>next.includes(m.memberId));current=next;if(!current.length)break}
 return levels;
}
function tree(rootId){
 const root=db.members.find(m=>m.memberId===rootId);
 if(!root)return {name:'நீங்கள்',id:'Not Registered',children:[]};
 const kids=(id)=>db.members.filter(m=>m.referral===id).map(m=>({name:m.name,id:m.memberId,children:kids(m.memberId)}));
 return {name:root.name,id:root.memberId,children:kids(root.memberId)};
}
function wallet(memberId){
 const ps=db.pins.filter(p=>p.assignedTo===memberId);
 return {received:ps.length,used:ps.filter(p=>p.status==='USED').length,available:ps.filter(p=>p.status==='AVAILABLE').length,pins:ps.slice(-50)};
}

app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.get('/index.html',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.get('/admin.html',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));
app.get('/product.html',(req,res)=>res.sendFile(path.join(__dirname,'product.html')));
app.get('/product_admin.html',(req,res)=>res.sendFile(path.join(__dirname,'product_admin.html')));
app.get('/referral.html',(req,res)=>res.sendFile(path.join(__dirname,'referral.html')));
app.get('/referral_admin.html',(req,res)=>res.sendFile(path.join(__dirname,'referral_admin.html')));
app.get('/level.html',(req,res)=>res.sendFile(path.join(__dirname,'level.html')));
app.get('/level_admin.html',(req,res)=>res.sendFile(path.join(__dirname,'level_admin.html')));
app.get('/server-sync.js',(req,res)=>res.sendFile(path.join(__dirname,'server-sync.js')));


app.post('/api/admin/login',(req,res)=>{if(req.body.password!==db.adminPassword)return res.status(401).json({error:'Incorrect password'});res.json({ok:true})});
app.post('/api/admin/password',(req,res)=>{if(req.body.oldPassword!==db.adminPassword)return res.status(401).json({error:'Current password is incorrect'});db.adminPassword=String(req.body.newPassword||'');save(db);res.json({ok:true})});
app.get('/api/admin/dashboard',(req,res)=>{
 const today=new Date().toISOString().slice(0,10);
 const total=db.members.length,pending=db.members.filter(m=>m.status==='Pending').length,verified=db.members.filter(m=>m.status==='Verified').length;
 const todayMembers=db.members.filter(m=>String(m.registeredAt||m.joinedAt||'').slice(0,10)===today).map(memberPublic);
 const report=db.members.map(m=>{const w=wallet(m.memberId);return {name:m.name,memberId:m.memberId,received:w.received,used:w.used,available:w.available}});
 const sent=db.pins.filter(p=>p.assignedTo).length;
 const used=db.pins.filter(p=>p.status==='USED').length;
 const leaders=new Set(db.pins.filter(p=>p.assignedTo).map(p=>p.assignedTo)).size;
 res.json({total,pending,verified,todayRegistrations:todayMembers.length,members:db.members.map(memberPublic),pinSummary:{sent,used,leaders},pinReport:report});
});
app.get('/api/admin/members',(req,res)=>res.json({members:findMember(req.query.q).map(memberPublic)}));
app.get('/api/admin/member-details/:id',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.params.id);
 if(!m)return res.status(404).json({error:'Member not found'});
 const kids=(id)=>db.members.filter(x=>x.referral===id).map(x=>({memberId:x.memberId,name:x.name,mobile:x.mobile,status:x.status,level:Number(x.level||1),levelMemberId:x.levelMemberId||null,children:kids(x.memberId)}));
 res.json({member:memberPublic(m),details:m,referralTree:{memberId:m.memberId,name:m.name,mobile:m.mobile,status:m.status,level:Number(m.level||1),levelMemberId:m.levelMemberId||null,children:kids(m.memberId)},directReferrals:db.members.filter(x=>x.referral===m.memberId).length,totalDownline:downlineCount(m.memberId)});
});
app.post('/api/admin/member-status',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.body.memberId);
 if(!m)return res.status(404).json({error:'Member not found'});
 m.status=req.body.status;
 if(req.body.status==='Verified'){
   if(!m.level)m.level=1;
   if(!m.levelMemberId)m.levelMemberId=nextLevelMemberId(m.level);
   if(!m.joinedAt)m.joinedAt=new Date().toISOString();
 }
 save(db);res.json({ok:true,member:memberPublic(m)})
});
app.post('/api/admin/message',(req,res)=>{if(req.body.to==='all'){db.messages.push({to:'ALL',message:req.body.message,at:new Date().toISOString()})}else{if(!db.members.some(m=>m.memberId===req.body.memberId))return res.status(404).json({error:'Member not found'});db.messages.push({to:req.body.memberId,message:req.body.message,at:new Date().toISOString()})}save(db);res.json({ok:true})});
app.post('/api/admin/pins/generate',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.body.memberId);if(!m)return res.status(404).json({error:'Member not found'});
 const n=Math.min(500,Math.max(1,Number(req.body.quantity)||1)),out=[];
 for(let i=0;i<n;i++){let p=pin();while(db.pins.some(x=>x.pin===p))p=pin();const row={pin:p,assignedTo:m.memberId,status:'AVAILABLE',usedBy:null,createdAt:new Date().toISOString()};db.pins.push(row);out.push(row)}
 save(db);const w=wallet(m.memberId);res.json({pins:out,member:memberPublic(m),available:w.available,used:w.used});
});

app.get('/api/member/referral-info/:id',(req,res)=>{
 const id=String(req.params.id||'').trim();
 if(!id||id==='FIRST MEMBER')return res.json({valid:id==='FIRST MEMBER',member:null});
 const m=db.members.find(x=>x.memberId===id);
 if(!m)return res.status(404).json({valid:false,error:'Referral ID not found'});
 res.json({valid:true,member:{memberId:m.memberId,name:m.name,mobile:m.mobile,level:Number(m.level||1)}});
});
app.post('/api/member/send-otp',(req,res)=>{if(!/^\d{10}$/.test(String(req.body.mobile||'')))return res.status(400).json({error:'Invalid mobile number'});res.json({ok:true,otp:'123456'})});
app.post('/api/member/login',(req,res)=>{const m=db.members.find(x=>x.mobile===req.body.mobile);if(req.body.otp!=='123456')return res.status(401).json({error:'OTP சரியாக இல்லை'});if(!m)return res.status(404).json({error:'Member not found. Please register first.'});res.json({member:memberPublic(m)})});
app.post('/api/member/check-pin',(req,res)=>{const p=String(req.body.pin||'').toUpperCase();if(!db.pins.some(x=>x.pin===p&&x.status==='AVAILABLE'))return res.status(400).json({error:'Invalid or unavailable Joining PIN'});res.json({ok:true})});
app.post('/api/member/register',(req,res)=>{
 const b=req.body;
 if(db.members.some(m=>m.mobile===b.mobile))return res.status(409).json({error:'Mobile number already registered'});
 const p=String(b.pin||'').toUpperCase(),pr=db.pins.find(x=>x.pin===p&&x.status==='AVAILABLE');
 if(!pr)return res.status(400).json({error:'Invalid or unavailable Joining PIN'});
 if(b.referral!=='FIRST MEMBER'&&!db.members.some(m=>m.memberId===b.referral))return res.status(400).json({error:'Invalid Referral ID'});
 const m={...b,memberId:id(),status:'Verified',level:1,levelMemberId:nextLevelMemberId(1),registeredAt:new Date().toISOString(),joinedAt:new Date().toISOString()};
 delete m.pin;db.members.push(m);pr.status='USED';pr.usedBy=m.memberId;pr.usedAt=new Date().toISOString();save(db);res.json({member:memberPublic(m)});
});
app.get('/api/member/dashboard/:id',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.params.id);if(!m)return res.status(404).json({error:'Member not found'});
 const lv=descendants(m.memberId),w=wallet(m.memberId);
 const levels={};for(let i=1;i<=7;i++)levels[i]=lv[i].map(memberPublic);
 const messages=[...db.messages.filter(x=>x.to===m.memberId||x.to==='ALL'),...db.leveltrackMessages.filter(x=>x.to===m.memberId)].sort((a,b)=>String(b.at).localeCompare(String(a.at))).map(x=>({to:x.to,message:x.message,at:x.at}));
 res.json({member:memberPublic(m),levels,tree:tree(m.memberId),wallet:w,messages});
});
app.get('/api/member/level/:id/:level',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.params.id),l=Number(req.params.level);if(!m||l<1||l>7)return res.status(404).json({error:'Not found'});
 const lv=descendants(m.memberId);res.json({members:lv[l].map(memberPublic)});
});
app.post('/api/member/use-pin',(req,res)=>{
 const p=db.pins.find(x=>x.assignedTo===req.body.memberId&&x.status==='AVAILABLE');if(!p)return res.status(400).json({error:'No available PIN'});
 p.status='USED';p.usedBy=req.body.memberId;p.usedAt=new Date().toISOString();save(db);res.json({wallet:wallet(req.body.memberId)});
});

app.put('/api/member/profile/:id',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.params.id);if(!m)return res.status(404).json({error:'Member not found'});
 const b=req.body||{};Object.assign(m,{dob:b.dob||m.dob,gender:b.gender||m.gender,email:b.email||m.email,address:b.address||m.address,city:b.city||m.city,district:b.district||m.district,state:b.state||m.state,pincode:b.pincode||m.pincode,accountHolder:b.accountHolder||m.accountHolder,account:b.account||m.account,ifsc:b.ifsc||m.ifsc,bank:b.bank||m.bank,branch:b.branch||m.branch,upi:b.upi||m.upi,nominee:b.nominee||m.nominee});save(db);res.json({member:{...m,status:m.status==='Rejected'?'Rejected':'ACTIVE'}});
});


// ---------------- LEVELTRACK SERVER API ----------------
const LEVEL_RULES={
  1:{provide:500,upgrade:1000,self:500,trust:0,required:3},
  2:{provide:1000,upgrade:3000,self:2000,trust:0,required:6},
  3:{provide:3000,upgrade:20000,self:10000,trust:0,required:9},
  4:{provide:20000,upgrade:100000,self:70000,trust:30000,required:12},
  5:{provide:100000,upgrade:200000,self:200000,trust:100000,required:15},
  6:{provide:200000,upgrade:500000,self:300000,trust:200000,required:18},
  7:{provide:500000,upgrade:0,self:1500000,trust:1000000,required:18}
};
function nextLevelMemberId(level){
  const prefix='L'+level+'-';
  const nums=db.members.map(m=>String(m.levelMemberId||'')).filter(x=>x.startsWith(prefix)).map(x=>Number(x.slice(prefix.length))).filter(Number.isFinite);
  return prefix+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
}
function ltMember(id){return db.members.find(m=>m.memberId===id)}
function direct(id){return db.members.filter(m=>m.referral===id)}
function downlineCount(id){
  let count=0,queue=[id],seen=new Set([id]);
  while(queue.length){const cur=queue.shift();for(const m of db.members){if(m.referral===cur&&!seen.has(m.memberId)){seen.add(m.memberId);count++;queue.push(m.memberId)}}}
  return count;
}
function ltTree(id){
  const root=ltMember(id); if(!root)return null;
  const make=m=>({memberId:m.memberId,name:m.name,mobile:m.mobile,status:m.status,level:Number(m.level||1),levelMemberId:m.levelMemberId||null,children:direct(m.memberId).map(make)});
  return make(root);
}
function ltStatusUpgrade(memberId){
  return db.leveltrackUpgrades.filter(u=>u.memberId===memberId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;
}
function ltHistory(memberId){
  return db.leveltrackUpgrades.filter(u=>u.memberId===memberId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(u=>({id:u.id,from:u.from,to:u.to,amount:u.amount,utr:u.utr||'',memberPaid:!!u.memberPaid,receiverApproved:!!u.receiverApproved,adminApproved:!!u.adminApproved,date:u.completedAt||u.createdAt}));
}
function ltDashboard(memberId){
  const m=ltMember(memberId); if(!m)return null;
  if(!m.level)m.level=1;
  if(m.status==='Verified'&&!m.levelMemberId)m.levelMemberId=nextLevelMemberId(m.level);
  const requests=db.leveltrackRequests.filter(r=>r.memberId===memberId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const latestRequest=requests[0]||null;
  const relatedUpgrades=db.leveltrackUpgrades.filter(u=>u.memberId===memberId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  let upgrade=(latestRequest && db.leveltrackUpgrades.find(u=>u.requestId===latestRequest.id)) || relatedUpgrades[0] || null;
  if(upgrade && latestRequest){ upgrade={...latestRequest,...upgrade}; }
  if(!upgrade && latestRequest && latestRequest.status==='Assigned'){ upgrade={...latestRequest}; }
  const payments=db.leveltrackPayments.filter(p=>p.receiverMemberId===memberId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const directReferrals=direct(memberId).length;
  const requiredDirectReferrals={1:3,2:6,3:9,4:12,5:15,6:18}[Number(m.level||1)]||0;
  const msgs=[...db.messages.filter(x=>x.to===memberId||x.to==='ALL'),...db.leveltrackMessages.filter(x=>x.to===memberId)].sort((a,b)=>String(b.at).localeCompare(String(a.at))).map(x=>({message:x.message,at:x.at}));
  return {member:memberPublic(m),directReferrals,totalDownline:downlineCount(memberId),tree:ltTree(memberId),upgrade,requests,incomingPayments:payments,history:ltHistory(memberId),requiredDirectReferrals,messages:msgs};
}
app.get('/leveltrack-admin.html',(req,res)=>res.sendFile(path.join(__dirname,'leveltrack-admin.html')));
app.get('/leveltrack-member.html',(req,res)=>res.sendFile(path.join(__dirname,'leveltrack-member.html')));
app.get('/api/leveltrack/admin/dashboard',(req,res)=>{
  const levels={1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  db.members.forEach(m=>{const l=Math.min(7,Math.max(1,Number(m.level||1)));levels[l]++});
  res.json({levels,members:db.members.map(memberPublic),requests:db.leveltrackRequests.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))),upgrades:db.leveltrackUpgrades.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))),payments:db.leveltrackPayments.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))});
});
app.get('/api/leveltrack/admin/members',(req,res)=>res.json({members:findMember(req.query.q).map(memberPublic)}));
app.get('/api/leveltrack/admin/member-details/:id',(req,res)=>{
  const m=ltMember(req.params.id);if(!m)return res.status(404).json({error:'Member not found'});
  res.json({member:memberPublic(m),directReferrals:direct(m.memberId).length,totalDownline:downlineCount(m.memberId),tree:ltTree(m.memberId)});
});
app.post('/api/leveltrack/admin/requests/:id/assign',(req,res)=>{
  const r=db.leveltrackRequests.find(x=>x.id===req.params.id);if(!r)return res.status(404).json({error:'Upgrade request not found'});
  if(r.status!=='Requested')return res.status(400).json({error:'Request is not pending'});
  const m=ltMember(r.memberId);if(!m)return res.status(404).json({error:'Member not found'});
  const amount=Number(req.body.amount||LEVEL_RULES[r.from]?.upgrade||0);if(!amount)return res.status(400).json({error:'Upgrade amount required'});
  Object.assign(r,{status:'Assigned',assignedAt:new Date().toISOString(),payee:req.body.payee||'',accountHolder:req.body.accountHolder||'',payeeId:req.body.payeeId||'',amount,account:req.body.account||'',bank:req.body.bank||'',ifsc:req.body.ifsc||'',upi:req.body.upi||'',adminMessage:req.body.adminMessage||''});
  let u=db.leveltrackUpgrades.find(x=>x.requestId===r.id);if(!u){u={id:'LTU-'+crypto.randomBytes(4).toString('hex').toUpperCase(),requestId:r.id,memberId:m.memberId,from:r.from,to:r.to,createdAt:new Date().toISOString()};db.leveltrackUpgrades.push(u)}
  Object.assign(u,{amount,payee:r.payee,accountHolder:r.accountHolder||'',payeeId:r.payeeId,account:r.account,bank:r.bank,ifsc:r.ifsc,upi:r.upi,adminMessage:r.adminMessage||'',detailsSent:true,detailsSentAt:new Date().toISOString()});
  db.leveltrackMessages.push({to:m.memberId,message:`LevelTrack payment details sent for L${r.from} → L${r.to}. Amount ₹${amount.toLocaleString()}.`,at:new Date().toISOString()});save(db);res.json({ok:true,request:r,upgrade:{...r,...u}});
});
app.post('/api/leveltrack/admin/payments/:id/verify',(req,res)=>{
  const p=db.leveltrackPayments.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:'Payment not found'});
  if(!p.memberAccepted)return res.status(400).json({error:'Receiver has not accepted the payment'});
  p.adminApproved=true;p.adminVerifiedAt=new Date().toISOString();
  const u=db.leveltrackUpgrades.find(x=>x.id===p.upgradeId);if(u){u.receiverApproved=true;}
  save(db);res.json({ok:true,payment:p});
});
app.post('/api/leveltrack/admin/upgrades/:id/final-approve',(req,res)=>{
  const u=db.leveltrackUpgrades.find(x=>x.id===req.params.id);if(!u)return res.status(404).json({error:'Upgrade not found'});
  const p=db.leveltrackPayments.find(x=>x.upgradeId===u.id);if(!u.memberPaid||!u.receiverApproved||!p?.adminApproved)return res.status(400).json({error:'Payment must be paid, accepted and admin verified first'});
  const m=ltMember(u.memberId);if(!m)return res.status(404).json({error:'Member not found'});
  if(Number(m.level)!==Number(u.from))return res.status(400).json({error:'Member level changed already'});
  m.level=Number(u.to);m.levelMemberId=nextLevelMemberId(m.level);m.upgradeDate=new Date().toISOString();m.status='Verified';u.adminApproved=true;u.completedAt=new Date().toISOString();
  const r=db.leveltrackRequests.find(x=>x.id===u.requestId);if(r)r.status='Completed';
  db.leveltrackMessages.push({to:m.memberId,message:`Level upgrade completed. You are now Level ${m.level}.`,at:new Date().toISOString()});save(db);res.json({ok:true,member:memberPublic(m),upgrade:u});
});
app.get('/api/leveltrack/admin/daily-report',(req,res)=>{
  const date=String(req.query.date||new Date().toISOString().slice(0,10));
  const upgrades=db.leveltrackUpgrades.filter(u=>u.adminApproved&&String(u.completedAt||'').slice(0,10)===date).map(u=>({from:u.from,to:u.to,amount:u.amount,date:String(u.completedAt).slice(0,10),member:memberPublic(ltMember(u.memberId))}));
  res.json({date,count:upgrades.length,upgrades});
});
app.get('/api/leveltrack/member/dashboard/:id',(req,res)=>{
  const d=ltDashboard(req.params.id);if(!d)return res.status(404).json({error:'Member not found'});save(db);res.json(d);
});
app.post('/api/leveltrack/member/upgrade-request',(req,res)=>{
  const m=ltMember(req.body.memberId);if(!m)return res.status(404).json({error:'Member not found'});
  const from=Number(m.level||1),to=from+1;if(from>=7)return res.status(400).json({error:'Level 7 is the final level'});
  const pending=db.leveltrackRequests.find(r=>r.memberId===m.memberId&&r.status!=='Completed');if(pending)return res.status(400).json({error:'Upgrade request already pending'});
  const r={id:'LTR-'+crypto.randomBytes(4).toString('hex').toUpperCase(),memberId:m.memberId,from,to,status:'Requested',date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()};db.leveltrackRequests.push(r);db.leveltrackMessages.push({to:'ADMIN',message:`New LevelTrack upgrade request: ${m.name} — L${from} → L${to}.`,at:new Date().toISOString()});save(db);res.json({ok:true,request:r});
});
app.post('/api/leveltrack/member/upgrade/:id/pay',(req,res)=>{
  const u=db.leveltrackUpgrades.find(x=>x.id===req.params.id);if(!u)return res.status(404).json({error:'Upgrade not found'});
  if(u.memberId!==req.body.memberId)return res.status(403).json({error:'Not your upgrade'});
  const utr=String(req.body.utr||'').trim();if(!utr)return res.status(400).json({error:'UTR required'});
  u.memberPaid=true;u.utr=utr;u.paidAt=new Date().toISOString();
  let p=db.leveltrackPayments.find(x=>x.upgradeId===u.id);if(!p){p={id:'LTP-'+crypto.randomBytes(4).toString('hex').toUpperCase(),upgradeId:u.id,fromMemberId:u.memberId,receiverMemberId:u.payeeId,from:ltMember(u.memberId)?.name||u.memberId,to:u.payee||u.payeeId,amount:u.amount,utr,memberAccepted:false,adminApproved:false,createdAt:new Date().toISOString()};db.leveltrackPayments.push(p)} else {p.utr=utr;p.memberPaid=true;}
  db.leveltrackMessages.push({to:u.payeeId,message:`Payment received for L${u.from} → L${u.to}. Please accept the payment.`,at:new Date().toISOString()});save(db);res.json({ok:true,upgrade:u,payment:p});
});
app.post('/api/leveltrack/member/incoming/:id/accept',(req,res)=>{
  const p=db.leveltrackPayments.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:'Payment not found'});
  if(p.receiverMemberId!==req.body.memberId)return res.status(403).json({error:'Not your payment'});
  p.memberAccepted=true;p.acceptedAt=new Date().toISOString();const u=db.leveltrackUpgrades.find(x=>x.id===p.upgradeId);if(u)u.receiverApproved=true;save(db);res.json({ok:true,payment:p});
});
app.get('/api/leveltrack/member/messages/:id',(req,res)=>{
  const msgs=[...db.messages.filter(x=>x.to===req.params.id||x.to==='ALL').map(x=>({message:x.message,at:x.at})),...db.leveltrackMessages.filter(x=>x.to===req.params.id).map(x=>({message:x.message,at:x.at}))].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  res.json({messages:msgs});
});


// ---------------- PRODUCT MODULE SERVER-SYNC STATE ----------------
const PRODUCT_STATE_FILE=path.join(__dirname,'magizh_product_state.json');
const PRODUCT_DEFAULT={magizhUsers:{},magizhOrders:[],magizhProducts:null,magizhCategories:null,magizhSettings:{},magizhB5:{},magizhCoinWallet:'0',magizhAdminPassword:null,magizhCurrentUser:null,magizhCurrentUserId:'GUEST'};
function loadProductState(){try{const x=JSON.parse(fs.readFileSync(PRODUCT_STATE_FILE,'utf8'));return {...PRODUCT_DEFAULT,...(x||{})}}catch(e){return {...PRODUCT_DEFAULT}}}
function saveProductState(s){fs.writeFileSync(PRODUCT_STATE_FILE,JSON.stringify(s,null,2))}
app.get('/api/state',(req,res)=>{const s=loadProductState();const raw=String(req.query.keys||'').trim();const keys=raw?raw.split(',').map(x=>x.trim()).filter(Boolean):null;const state=keys?Object.fromEntries(keys.map(k=>[k,Object.prototype.hasOwnProperty.call(s,k)?s[k]:null])):s;res.json({ok:true,state,updatedAt:new Date().toISOString()})});
app.put('/api/state',(req,res)=>{const b=req.body||{};if(!b.key)return res.status(400).json({error:'key required'});const s=loadProductState();s[b.key]=b.value;saveProductState(s);res.json({ok:true,key:b.key})});
app.post('/api/state/bulk',(req,res)=>{const b=req.body||{};if(!b.state||typeof b.state!=='object')return res.status(400).json({error:'state object required'});const s=loadProductState();Object.assign(s,b.state);saveProductState(s);res.json({ok:true})});
app.post('/api/reset',(req,res)=>{saveProductState({...PRODUCT_DEFAULT});res.json({ok:true,message:'Temporary product test data reset'})});
app.get('/api/product-health',(req,res)=>res.json({ok:true,service:'magizh-product-sync'}));

app.get('/api/health',(req,res)=>res.json({ok:true,status:'live',service:'MAGIZH_MASTER_FINAL_V2',serverTime:new Date().toISOString()}));
const PORT=process.env.PORT||10000;
app.listen(PORT,'0.0.0.0',()=>console.log('BORNTOWIN5 running on '+PORT));
