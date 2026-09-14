const express=require('express');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const app=express();
app.use(express.json({limit:'2mb'}));
app.use(express.static(__dirname));

const DB_FILE=path.join(__dirname,'db.json');
function freshDB(){return {adminPassword:'ADMIN',members:[],pins:[],messages:[]};}
function load(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}catch(e){const d=freshDB();save(d);return d}}
function save(d){fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2))}
let db=load();

function id(){return 'B5-'+crypto.randomBytes(3).toString('hex').toUpperCase()}
function pin(){return 'B5-'+crypto.randomBytes(3).toString('hex').toUpperCase()}
function memberPublic(m){return {memberId:m.memberId,name:m.name,mobile:m.mobile,status:m.status,referral:m.referral}}
function memberDetails(m){return {...m}}
function todayCount(){const d=new Date();const y=d.getFullYear(),mo=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0');const key=`${y}-${mo}-${da}`;return db.members.filter(m=>String(m.registeredAt||'').slice(0,10)===key).length}
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
 return {received:ps.length,used:ps.filter(p=>p.status==='USED').length,available:ps.filter(p=>p.status==='AVAILABLE').length,pins:ps.filter(p=>p.status==='AVAILABLE')};
}
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'member.html')));
app.get('/member.html',(req,res)=>res.sendFile(path.join(__dirname,'member.html')));
app.get('/admin.html',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));

app.post('/api/admin/login',(req,res)=>{if(req.body.password!==db.adminPassword)return res.status(401).json({error:'Incorrect password'});res.json({ok:true})});
app.post('/api/admin/password',(req,res)=>{if(req.body.oldPassword!==db.adminPassword)return res.status(401).json({error:'Current password is incorrect'});db.adminPassword=String(req.body.newPassword||'');save(db);res.json({ok:true})});
app.get('/api/admin/dashboard',(req,res)=>{
 const total=db.members.length,pending=db.members.filter(m=>m.status==='Pending').length,verified=db.members.filter(m=>m.status==='Verified').length;
 const report=db.members.map(m=>{const w=wallet(m.memberId);return {name:m.name,memberId:m.memberId,received:w.received,used:w.used,available:w.available}});
 res.json({total,pending,verified,todayRegistrations:todayCount(),members:db.members.map(memberPublic),pinReport:report,pinSummary:{sent:db.pins.length,used:db.pins.filter(p=>p.status==='USED').length,leaders:new Set(db.pins.filter(p=>p.assignedTo).map(p=>p.assignedTo)).size}});
});
app.get('/api/admin/members',(req,res)=>res.json({members:findMember(req.query.q).map(memberPublic)}));
app.get('/api/admin/member-details/:id',(req,res)=>{const m=db.members.find(x=>x.memberId===req.params.id);if(!m)return res.status(404).json({error:'Member not found'});res.json({member:memberDetails(m)});});
app.post('/api/admin/member-status',(req,res)=>{const m=db.members.find(x=>x.memberId===req.body.memberId);if(!m)return res.status(404).json({error:'Member not found'});m.status=req.body.status;save(db);res.json({ok:true,member:memberPublic(m)})});
app.post('/api/admin/message',(req,res)=>{if(req.body.to==='all'){db.messages.push({to:'ALL',message:req.body.message,at:new Date().toISOString()})}else{if(!db.members.some(m=>m.memberId===req.body.memberId))return res.status(404).json({error:'Member not found'});db.messages.push({to:req.body.memberId,message:req.body.message,at:new Date().toISOString()})}save(db);res.json({ok:true})});
app.post('/api/admin/pins/generate',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.body.memberId);if(!m)return res.status(404).json({error:'Member not found'});
 const n=Math.min(500,Math.max(1,Number(req.body.quantity)||1)),out=[];
 for(let i=0;i<n;i++){let p=pin();while(db.pins.some(x=>x.pin===p))p=pin();const row={pin:p,assignedTo:m.memberId,status:'AVAILABLE',usedBy:null,createdAt:new Date().toISOString()};db.pins.push(row);out.push(row)}
 save(db);const w=wallet(m.memberId);res.json({pins:out,member:memberPublic(m),available:w.available,used:w.used});
});

app.post('/api/member/send-otp',(req,res)=>{if(!/^\d{10}$/.test(String(req.body.mobile||'')))return res.status(400).json({error:'Invalid mobile number'});res.json({ok:true,otp:'123456'})});
app.post('/api/member/login',(req,res)=>{const m=db.members.find(x=>x.mobile===req.body.mobile);if(req.body.otp!=='123456')return res.status(401).json({error:'OTP சரியாக இல்லை'});if(!m)return res.status(404).json({error:'Member not found. Please register first.'});res.json({member:memberPublic(m)})});
app.post('/api/member/check-pin',(req,res)=>{const p=String(req.body.pin||'').toUpperCase();if(!db.pins.some(x=>x.pin===p&&x.status==='AVAILABLE'))return res.status(400).json({error:'Invalid or unavailable Joining PIN'});res.json({ok:true})});
app.post('/api/member/register',(req,res)=>{
 const b=req.body;
 if(!/^\d{10}$/.test(String(b.mobile||'')))return res.status(400).json({error:'Mobile Number must be exactly 10 digits'});
 if(db.members.some(m=>m.mobile===b.mobile))return res.status(409).json({error:'Mobile number already registered'});
 const p=String(b.pin||'').toUpperCase(),pr=db.pins.find(x=>x.pin===p&&x.status==='AVAILABLE');
 if(!pr)return res.status(400).json({error:'Invalid or unavailable Joining PIN'});
 if(b.referral!=='FIRST MEMBER'&&!db.members.some(m=>m.memberId===b.referral))return res.status(400).json({error:'Invalid Referral ID'});
 const m={...b,memberId:id(),status:'Pending',registeredAt:new Date().toISOString()};
 delete m.pin;db.members.push(m);pr.status='USED';pr.usedBy=m.memberId;pr.usedAt=new Date().toISOString();save(db);res.json({member:memberPublic(m)});
});
app.get('/api/member/messages/:id',(req,res)=>{const id=req.params.id;if(!db.members.some(m=>m.memberId===id))return res.status(404).json({error:'Member not found'});res.json({messages:db.messages.filter(x=>x.to===id||x.to==='ALL').sort((a,b)=>String(b.at).localeCompare(String(a.at)))});});
app.get('/api/member/dashboard/:id',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.params.id);if(!m)return res.status(404).json({error:'Member not found'});
 const lv=descendants(m.memberId),w=wallet(m.memberId);
 const levels={};for(let i=1;i<=7;i++)levels[i]=lv[i].map(memberPublic);
 res.json({member:memberPublic(m),levels,tree:tree(m.memberId),wallet:w});
});
app.get('/api/member/level/:id/:level',(req,res)=>{
 const m=db.members.find(x=>x.memberId===req.params.id),l=Number(req.params.level);if(!m||l<1||l>7)return res.status(404).json({error:'Not found'});
 const lv=descendants(m.memberId);res.json({members:lv[l].map(memberPublic)});
});
app.post('/api/member/use-pin',(req,res)=>{
 const p=db.pins.find(x=>x.assignedTo===req.body.memberId&&x.status==='AVAILABLE');if(!p)return res.status(400).json({error:'No available PIN'});
 p.status='USED';p.usedBy=req.body.memberId;p.usedAt=new Date().toISOString();save(db);res.json({wallet:wallet(req.body.memberId)});
});
const PORT=process.env.PORT||10000;
app.listen(PORT,'0.0.0.0',()=>console.log('BORNTOWIN5 running on '+PORT));
