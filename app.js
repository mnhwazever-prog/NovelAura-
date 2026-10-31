// ======== Settings (publishable key is safe to expose; never put the service_role key here) ========
const SB_URL="https://eosccauingnmjwcxfztn.supabase.co";
const SB_KEY="sb_publishable_e-8IcxGvQba2B2AtQSi3SA_NmWX_mLN";
// ===========================================================================================
const sb=supabase.createClient(SB_URL,SB_KEY);
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const ago=t=>{const h=(Date.now()-new Date(t))/36e5;return h<1?"just now":h<24?Math.floor(h)+"h ago":Math.floor(h/24)+"d ago"};
let user=null,isAdmin=false,rows=[],bm=store.get("bm",[]),prog=store.get("prog",{}),pref=store.get("pref",{fs:18});
let S={q:"",st:"",sort:"updated"},A={tab:"stats",edit:null,ch:null,chEdit:null,msg:""};
const cnt=r=>r.chapters&&r.chapters[0]?r.chapters[0].count:0;
const cover=r=>`<div class="cv" style="background:linear-gradient(160deg,hsl(${(r.id*47)%360} 55% 42%),hsl(${(r.id*47+50)%360} 60% 22%))">${r.cover_url?`<img src="${esc(r.cover_url)}" alt="" loading="lazy">`:esc(r.title)}</div>`;
const card=r=>`<a class="card" href="/series/${r.slug}">${cover(r)}<div class="ct">${esc(r.title)}<span>${cnt(r)} chapters · ${r.views||0} views</span></div></a>`;
async function load(){const{data,error}=await sb.from("series").select("*,chapters(count)").order("updated_at",{ascending:false});if(error)throw error;rows=data||[]}
// ---- visit tracking (skipped for the admin so stats stay clean) ----
function track(seriesId){if(isAdmin)return;let v=store.get("vid",null);if(!v){v=Math.random().toString(36).slice(2)+Date.now().toString(36);store.set("vid",v)}sb.rpc("track_visit",{p_path:location.pathname,p_series:seriesId||null,p_visitor:v}).then(()=>{},()=>{})}
// ---- views ----
function home(){
  const top=[...rows].sort((a,b)=>b.views-a.views).slice(0,6),done=rows.filter(r=>r.status=="Completed").slice(0,6);
  if(!rows.length)return `<div class="empty">No series yet.${isAdmin?" Open your profile (top right) to add one.":""}</div>`;
  const f=rows[0];
  return `<div class="hero">${cover(f)}<div><h1 style="margin:0 0 6px">${esc(f.title)}</h1><div>${(f.genres||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}<span class="tag">${esc(f.status)}</span></div><p style="color:var(--mu)">${esc((f.description||"").slice(0,300))}</p><a class="btn" href="/series/${f.slug}">Read now</a></div></div>
  <h2>Latest updates<a href="/novels">View all</a></h2><div class="grid">${rows.slice(0,12).map(card).join("")}</div><div class="ad" id="ad2"></div>
  <h2>Most viewed</h2><div class="grid">${top.map(card).join("")}</div>
  ${done.length?`<h2>Completed novels</h2><div class="grid">${done.map(card).join("")}</div>`:""}`;
}
function novels(){
  let l=rows.filter(r=>(!S.q||(r.title+" "+(r.author||"")).toLowerCase().includes(S.q.toLowerCase()))&&(!S.st||r.status==S.st));
  l.sort((a,b)=>S.sort=="views"?b.views-a.views:S.sort=="title"?a.title.localeCompare(b.title):new Date(b.updated_at)-new Date(a.updated_at));
  const o=(v,t,c)=>`<option value="${v}" ${v==c?"selected":""}>${t}</option>`;
  return `<h2 style="margin-top:0">Novels${S.q?` · “${esc(S.q)}”`:""}</h2><div class="filters"><select id="fs">${o("","Any status",S.st)}${o("Ongoing","Ongoing",S.st)}${o("Completed","Completed",S.st)}${o("Dropping soon","Dropping soon",S.st)}</select><select id="fo">${o("updated","Recently updated",S.sort)}${o("views","Most viewed",S.sort)}${o("title","A–Z",S.sort)}</select></div>${l.length?`<div class="grid">${l.map(card).join("")}</div>`:`<div class="empty">No series found.</div>`}`;
}
function bookmarks(){const l=rows.filter(r=>bm.includes(r.id));return `<h2 style="margin-top:0">Bookmarks</h2>${l.length?`<div class="grid">${l.map(card).join("")}</div>`:`<div class="empty">Nothing here yet. Open a series and press “Bookmark”.</div>`}`}
async function series(id){
  const r=rows.find(x=>x.slug==id);if(!r)return nf();id=r.id;
  const{data}=await sb.from("chapters").select("id,number,title,created_at").eq("series_id",id).order("number",{ascending:!S.rev});
  const p=prog[id]||0,chs=data||[];
  const asc=[...chs].sort((a,b)=>a.number-b.number),next=asc.find(c=>c.number>p)||asc[0];
  track(id);
  return `<div class="hero">${cover(r)}<div><h1 style="margin:0 0 4px">${esc(r.title)}</h1><div style="color:var(--mu);margin-bottom:8px">by ${esc(r.author||"Unknown")} · ${chs.length} chapters · ${esc(r.status)} · ${r.views||0} views</div><div>${(r.genres||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div><p>${esc(r.description||"")}</p>${next?`<a class="btn" href="/read/${r.slug}/${next.number}">${p?"Continue · Ch. "+next.number:"Start reading"}</a> `:""}<button class="btn ghost" id="bk" data-id="${id}">${bm.includes(r.id)?"★ Bookmarked":"☆ Bookmark"}</button></div></div>
  <h2>Chapters <button class="ic" id="rv">${S.rev?"Oldest first":"Newest first"}</button></h2>${chs.length?`<div class="chl">${chs.map(c=>`<a class="${c.number<=p?"done":""}" href="/read/${r.slug}/${c.number}"><span>Chapter ${c.number}${c.title?" – "+esc(c.title):""}</span><span>${c.number<=p?"Read":ago(c.created_at)}</span></a>`).join("")}</div>`:`<div class="empty">No chapters yet.</div>`}`;
}
async function read(id,n){
  const r=rows.find(x=>x.slug==id);if(!r)return nf();id=r.id;
  const{data}=await sb.from("chapters").select("*").eq("series_id",id).eq("number",n).maybeSingle();
  if(!data)return nf();
  const[{data:pv},{data:nx}]=await Promise.all([sb.from("chapters").select("number").eq("series_id",id).lt("number",n).order("number",{ascending:false}).limit(1),sb.from("chapters").select("number").eq("series_id",id).gt("number",n).order("number").limit(1)]);
  prog[id]=Math.max(prog[id]||0,n);store.set("prog",prog);track(null);
  const nav=`<div class="bar">${pv&&pv[0]?`<a class="btn ghost" href="/read/${r.slug}/${pv[0].number}">← Prev</a>`:""}<a class="btn ghost" href="/series/${r.slug}">Chapters</a><button class="ic" data-fz="-2">A−</button><button class="ic" data-fz="2">A+</button>${nx&&nx[0]?`<a class="btn" href="/read/${r.slug}/${nx[0].number}">Next →</a>`:""}</div>`;
  const body=(data.content||"").split(/\n\s*\n|\n/).filter(x=>x.trim()).map(p=>`<p>${esc(p)}</p>`).join("");
  return `<div class="rd"><div class="sub"><a href="/series/${r.slug}">${esc(r.title)}</a></div><h1>Chapter ${data.number}</h1><div class="sub">${esc(data.title||"")}</div>${nav}<div class="txt" style="font-size:${pref.fs}px">${body}</div>${nav}</div>`;
}
const nf=()=>`<div class="empty">Page not found. <a href="/" style="color:var(--ac)">Go home</a></div>`;
const L=(h,t)=>`<a style="color:var(--ac)" href="/${h}">${t}</a>`;
const AUTH=["login","signup","forgot","recover"];
function authBox(kind){
  const t={login:"Sign in",signup:"Create account",forgot:"Reset password",recover:"Set a new password"}[kind];
  const em=`<label>Email</label><input name="email" type="email" required autocomplete="username">`;
  const pw=l=>`<label>${l}</label><input name="pw" type="password" required minlength="6" autocomplete="${kind=="login"?"current-password":"new-password"}">`;
  const f={login:em+pw("Password"),signup:em+pw("Password (6+ characters)"),forgot:em,recover:pw("New password")}[kind];
  const links=kind=="login"?L("forgot","Forgot password?")+" · "+L("signup","Create account"):kind=="signup"?"Already have an account? "+L("login","Sign in"):L("login","Back to sign in");
  return `<div class="box"><h2 style="margin-top:0">${t}</h2><form data-f="${kind}">${f}<p id="lerr" style="min-height:1.2em;color:var(--dg)"></p><button class="btn" style="width:100%">${t}</button></form><p style="text-align:center;color:var(--mu);font-size:14px">${links}</p></div>`;
}
function profile(){
  if(!user)return authBox("login");
  return `<div class="box"><h2 style="margin-top:0">My account</h2><p>${esc(user.email)}</p>${isAdmin?`<p><span class="tag">Admin</span></p>`:""}<p><a class="btn ghost sm" href="/bookmarks">Bookmarks</a> <button class="btn dg sm" id="lo">Sign out</button></p></div>`;
}
// ---- router ----
async function route(){
  const h=location.hash.slice(1),P=location.pathname.split("/").filter(Boolean),v=P[0]||"home",a=P[1],b=P[2],app=$("#app");
  if(h.includes("access_token")||h.includes("type=recovery"))return;
  app.innerHTML=`<div class="empty">Loading…</div>`;
  try{
    if(!AUTH.includes(v))await load();
    app.innerHTML=v=="home"?(track(),home()):v=="novels"?(track(),novels()):v=="bookmarks"?bookmarks():v=="series"?await series(a):v=="read"?await read(a,+b):AUTH.includes(v)?authBox(v):v=="profile"?profile():nf();
  }catch(e){app.innerHTML=`<div class="empty">Could not load data. Check that the SQL was run in Supabase.<br><small>${esc(e.message||e)}</small></div>`}
  document.querySelectorAll("#nav a").forEach(x=>x.classList.toggle("on",x.dataset.v==v||(v=="series"&&x.dataset.v=="novels")));
  window.scrollTo(0,0);document.title=(v=="series"&&rows.find(x=>x.slug==a)?rows.find(x=>x.slug==a).title+" – ":"")+"Novelfly";
  foot();admRender();ads(v);
}
function go(p){history.pushState(null,"",p);route()}
function acct(){let e=$("#acct");if(!e){e=document.createElement("span");e.id="acct";$("#th").before(e)}e.innerHTML=user?`<a class="ic" href="/profile">👤 ${isAdmin?"Admin":"Account"}</a>`:`<a class="btn sm" href="/login">Sign in</a>`}
const AD1="//gn.upfolddoter.com/rQbZQFbhO8LM/160099",AD2="//kp.delugedkeens.com/sgmxJN9J5JaC/160098",DIRECT="https://xj.leavycranes.com/igP6r2Ai1YavcpTW/160100";
let adHits=0;
// ads: only on browsing pages (never while reading, never for the admin), and at most every 3rd page view
function ads(v){
  document.querySelectorAll(".ad").forEach(e=>{e.innerHTML=""});
  if(isAdmin||!["home","novels","series","bookmarks"].includes(v)||adHits++%3)return;
  [["ad1",AD1],["ad2",AD2]].forEach(([id,src])=>{const box=document.getElementById(id);if(!box)return;const s=document.createElement("script");s.async=true;s.setAttribute("data-cfasync","false");s.src=src;box.appendChild(s)});
}
function foot(){$("#ft").innerHTML=`© 2026 Novelfly · <a href="${DIRECT}" target="_blank" rel="sponsored noopener noreferrer">Sponsored link</a>`;acct()}
// ---- admin panel (shown below the site only when signed in) ----
async function admRender(){
  const el=$("#adm");if(!user||!isAdmin||location.pathname!="/profile"){el.innerHTML="";return}
  const tab=(k,t)=>`<button class="${A.tab==k?"on":""}" data-tab="${k}">${t}</button>`;
  let body="";
  try{
    if(A.tab=="stats"){
      const{data:s,error}=await sb.rpc("admin_stats");if(error)throw error;
      const d=s.daily||[],mx=Math.max(1,...d.map(x=>x.c));
      body=`<div class="stats">${[["Total visits",s.visits_total],["Today",s.visits_today],["Last 7 days",s.visits_7d],["Unique (7d)",s.unique_7d],["Series",s.series],["Chapters",s.chapters]].map(([t,n])=>`<div class="stat"><b>${n}</b><span>${t}</span></div>`).join("")}</div>
      <h3>Visits – last 14 days</h3><div class="bars">${d.map(x=>`<i style="height:${x.c/mx*100}%" title="${x.day}: ${x.c}"></i>`).join("")||"<span class='empty'>No data yet</span>"}</div>
      <h3>Top series</h3>${(s.top||[]).map(t=>`<div class="arow"><span>${esc(t.title)}</span><b>${t.views}</b></div>`).join("")||"<div class='empty'>No views yet</div>"}`;
    }else if(A.tab=="series"){
      const e=A.edit;
      body=(e?`<form data-f="series"><input type="hidden" name="id" value="${e.id||""}"><div class="fg"><div><label>Title</label><input name="title" required value="${esc(e.title||"")}"></div><div><label>Author</label><input name="author" value="${esc(e.author||"")}"></div><div><label>Genres (comma separated)</label><input name="genres" value="${esc((e.genres||[]).join(", "))}"></div><div><label>Status</label><select name="status">${["Ongoing","Completed","Dropping soon"].map(x=>`<option ${e.status==x?"selected":""}>${x}</option>`).join("")}</select></div><div><label>Cover image (upload)</label><input type="file" name="file" accept="image/*"></div><div><label>…or cover URL</label><input name="cover_url" value="${esc(e.cover_url||"")}"></div></div><label>Description</label><textarea name="description" rows="4">${esc(e.description||"")}</textarea><p><button class="btn">Save</button> <button type="button" class="btn ghost" data-act="cancel">Cancel</button></p></form>`
      :`<p><button class="btn" data-act="new">+ New series</button></p>`)+rows.map(r=>`<div class="arow"><span><b>${esc(r.title)}</b><br><small>${cnt(r)} chapters · ${r.views||0} views · ${esc(r.status)}</small></span><button class="btn ghost sm" data-act="edit" data-id="${r.id}">Edit</button><button class="btn ghost sm" data-act="chs" data-id="${r.id}">Chapters</button><button class="btn dg sm" data-act="delS" data-id="${r.id}">Delete</button></div>`).join("");
    }else{
      const r=rows.find(x=>x.id==A.ch);
      if(!r){body=`<div class="empty">Pick a series from the Series tab, then press “Chapters”.</div>`}
      else{
        const{data:cl}=await sb.from("chapters").select("id,number,title").eq("series_id",r.id).order("number",{ascending:false});
        const c=A.chEdit||{};
        body=`<h3>${esc(r.title)}</h3><form data-f="chapter"><input type="hidden" name="id" value="${c.id||""}"><input type="hidden" name="sid" value="${r.id}"><div class="fg"><div><label>Chapter number</label><input name="number" type="number" step="any" required value="${c.number??((cl&&cl[0]?cl[0].number:0)+1)}"></div><div><label>Title (optional)</label><input name="title" value="${esc(c.title||"")}"></div></div><label>Text</label><textarea name="content" rows="10" required>${esc(c.content||"")}</textarea><p><button class="btn">${c.id?"Update chapter":"Add chapter"}</button> ${c.id?`<button type="button" class="btn ghost" data-act="chCancel">Cancel</button>`:""}</p></form>`+(cl||[]).map(x=>`<div class="arow"><span>Chapter ${x.number}${x.title?" – "+esc(x.title):""}</span><button class="btn ghost sm" data-act="chEdit" data-id="${x.id}">Edit</button><button class="btn dg sm" data-act="delC" data-id="${x.id}">Delete</button></div>`).join("");
      }
    }
  }catch(e){body=`<div class="msg">Error: ${esc(e.message||e)}</div>`}
  el.innerHTML=`<div><h2 style="margin:0">⚙ Admin panel</h2><div class="tabs">${tab("stats","Statistics")}${tab("series","Series")}${tab("chapters","Chapters")}</div>${A.msg?`<div class="msg">${esc(A.msg)}</div>`:""}${body}</div>`;
}
async function touchSeries(id){await sb.from("series").update({updated_at:new Date().toISOString()}).eq("id",id)}
const slug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)+"-"+Date.now().toString(36);
async function done(msg){A.msg=msg;await load();admRender();if(/^\/(novels|series)?$|^\/series\//.test(location.pathname))route()}
document.addEventListener("submit",async e=>{
  const f=e.target.dataset.f;if(!f)return;e.preventDefault();const d=new FormData(e.target);
  try{
    if(f=="login"||f=="signup"){
      const c={email:d.get("email").trim(),password:d.get("pw")};
      const r=f=="login"?await sb.auth.signInWithPassword(c):await sb.auth.signUp(c);
      if(r.error){$("#lerr").textContent=r.error.message;return}
      if(r.data.session)go("/");else{$("#lerr").style.color="var(--ac)";$("#lerr").textContent="Check your email to confirm your account, then sign in."}
    }
    if(f=="forgot"){const{error}=await sb.auth.resetPasswordForEmail(d.get("email").trim(),{redirectTo:location.origin+"/"});$("#lerr").style.color=error?"var(--dg)":"var(--ac)";$("#lerr").textContent=error?error.message:"If this email is registered, a reset link was sent."}
    if(f=="recover"){const{error}=await sb.auth.updateUser({password:d.get("pw")});if(error){$("#lerr").textContent=error.message;return}go("/profile")}
    if(f=="series"){
      let url=d.get("cover_url"),file=d.get("file");
      if(file&&file.size){const p=Date.now()+"-"+file.name.replace(/[^a-z0-9.]+/gi,"_");const up=await sb.storage.from("covers").upload(p,file,{upsert:true});if(up.error)throw up.error;url=sb.storage.from("covers").getPublicUrl(p).data.publicUrl}
      const row={title:d.get("title"),author:d.get("author"),description:d.get("description"),cover_url:url||null,status:d.get("status"),genres:d.get("genres").split(",").map(x=>x.trim()).filter(Boolean),updated_at:new Date().toISOString()};
      const id=d.get("id");const r=id?await sb.from("series").update(row).eq("id",id):await sb.from("series").insert({...row,slug:slug(row.title)});
      if(r.error)throw r.error;A.edit=null;await done("Series saved ✓");
    }
    if(f=="chapter"){
      const row={series_id:+d.get("sid"),number:+d.get("number"),title:d.get("title"),content:d.get("content")},id=d.get("id");
      const r=id?await sb.from("chapters").update(row).eq("id",id):await sb.from("chapters").insert(row);
      if(r.error)throw r.error;A.chEdit=null;await touchSeries(row.series_id);await done("Chapter saved ✓");
    }
  }catch(err){A.msg="Error: "+(err.message||err);admRender()}
});
document.addEventListener("click",async e=>{
  const t=e.target.closest("button,a");if(!t)return;
  const hr=t.tagName=="A"&&t.getAttribute("href");if(hr&&hr[0]=="/"&&hr[1]!="/"&&!t.target&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(hr!=location.pathname)history.pushState(null,"",hr);route();return}
  if(t.id=="lo"){await sb.auth.signOut();go("/");return}
  if(t.id=="bk"){const id=+t.dataset.id;bm=bm.includes(id)?bm.filter(x=>x!=id):[...bm,id];store.set("bm",bm);t.textContent=bm.includes(id)?"★ Bookmarked":"☆ Bookmark";return}
  if(t.id=="rv"){S.rev=!S.rev;route();return}
  if(t.dataset.fz){pref.fs=Math.min(30,Math.max(14,pref.fs+ +t.dataset.fz));store.set("pref",pref);document.querySelector(".txt").style.fontSize=pref.fs+"px";return}
  if(t.dataset.tab){A.tab=t.dataset.tab;A.msg="";admRender();return}
  const act=t.dataset.act;if(!act)return;const id=+t.dataset.id;A.msg="";
  try{
    if(act=="new"){A.edit={};}
    if(act=="cancel"){A.edit=null}
    if(act=="edit"){A.edit=rows.find(x=>x.id==id)}
    if(act=="chs"){A.ch=id;A.tab="chapters";A.chEdit=null}
    if(act=="chCancel"){A.chEdit=null}
    if(act=="chEdit"){const{data}=await sb.from("chapters").select("*").eq("id",id).single();A.chEdit=data}
    if(act=="delS"&&confirm("Delete this series and ALL its chapters?")){const r=await sb.from("series").delete().eq("id",id);if(r.error)throw r.error;return done("Series deleted")}
    if(act=="delC"&&confirm("Delete this chapter?")){const r=await sb.from("chapters").delete().eq("id",id);if(r.error)throw r.error;return done("Chapter deleted")}
  }catch(err){A.msg="Error: "+(err.message||err)}
  admRender();
});
$("#q").addEventListener("keydown",e=>{if(e.key=="Enter"){S.q=e.target.value.trim();location.pathname=="/novels"?route():go("/novels")}});
$("#th").onclick=()=>{const r=document.documentElement,d=r.dataset.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");r.dataset.theme=d=="dark"?"light":"dark";store.set("theme",r.dataset.theme)};
{const t=store.get("theme",null);if(t)document.documentElement.dataset.theme=t}
document.addEventListener("change",e=>{if(e.target.id=="fs"){S.st=e.target.value;route()}if(e.target.id=="fo"){S.sort=e.target.value;route()}});
async function setUser(u){user=u;isAdmin=false;if(u){try{const{data}=await sb.from("admins").select("user_id").eq("user_id",u.id).maybeSingle();isAdmin=!!data}catch(e){}}}
sb.auth.onAuthStateChange((ev,s)=>{
  if(ev=="PASSWORD_RECOVERY"){user=s.user;go("/recover");return}
  setTimeout(async()=>{const was=user&&user.id;await setUser(s?s.user:null);if(was!=(user&&user.id)){foot();admRender();if(ev=="SIGNED_IN"&&/^\/(login|signup)/.test(location.pathname))go("/")}},0);
});
addEventListener("popstate",route);
sb.auth.getSession().then(async({data})=>{await setUser(data.session?data.session.user:null);route()});
