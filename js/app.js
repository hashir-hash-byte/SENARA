/* ===== SENARA STOREFRONT LOGIC =====
   Needs js/data.js loaded first (it defines seed() and DATA_VERSION).
   Sections: 1 STORAGE · 2 SPLASH · 3 HOME · 4 CATEGORY ANIMATION · 5 CART · 6 ACCOUNT & ORDERS · 7 ADMIN · 8 ROUTER
   Backend hand-off: search for "BACKEND:" to find every spot to swap for real API calls. */

/* ===== 1. STORAGE & HELPERS ===== */
// Product silhouettes (SVG paths, viewBox 0 0 60 120). Used when a product has no image.
const SHAPES={
  gown:{h:14,p:'M24 22h12l2 28 10 68H12l10-68z'},
  top:{h:14,p:'M16 24h28l6 16-8 4v26H18V44l-8-4z'},
  pant:{h:14,p:'M20 30h20l4 88H33l-3-62-3 62H16z'},
  kurta:{h:14,p:'M18 24h24l4 20-4 4 2 48H16l2-48-4-4z'},
  kids:{h:40,p:'M24 50h12l2 16 8 34H14l8-34z'}
};
const fig=(color,kind)=>{const s=SHAPES[kind]||SHAPES.gown;
  return `<svg viewBox="0 0 60 120" aria-hidden="true"><circle cx="30" cy="${s.h}" r="7" fill="${color}"/><path d="${s.p}" fill="${color}"/></svg>`};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inr=n=>'₹'+Number(n).toLocaleString('en-IN');

// BACKEND: replace load()/save() with GET/PUT calls to your API (e.g. fetch('/api/store')).
const KEY='senara-store-'+DATA_VERSION;
function load(){try{const r=localStorage.getItem(KEY);if(r)return JSON.parse(r)}catch(e){}return seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch(e){toast('Browser storage is full. Use fewer or smaller photos (the real backend removes this limit).');return false}}
// Make sure every product has the newer fields (older saved data may not).
const norm=d=>{d.products.forEach(p=>{p.img=p.img||'';p.gallery=Array.isArray(p.gallery)?p.gallery:[];['sizes','desc','fabric','includes','ornament'].forEach(k=>p[k]=p[k]||'')});return d};
let db=norm(load());
let cart=[];
try{cart=JSON.parse(localStorage.getItem('senara-cart')||'[]')}catch(e){}
const $=id=>document.getElementById(id);
const saveCart=()=>{try{localStorage.setItem('senara-cart',JSON.stringify(cart))}catch(e){}};
const prod=id=>db.products.find(p=>p.id===id);
const catOf=id=>db.categories.find(c=>c.id===id);
const pic=(p,kind)=>p.img?`<img src="${esc(p.img)}" alt="${esc(p.name)}">`:fig(p.color,kind||(catOf(p.cat)||{}).kind);
// Small picture for the strip: first dress-only photo, else the model photo.
const thumb=(p,kind)=>{const s=p.gallery[0]||p.img;return s?`<img class="cover" src="${esc(s)}" alt="${esc(p.name)}">`:fig(p.color,kind||(catOf(p.cat)||{}).kind)};

/* ===== 2. SPLASH ===== */
// Letters fade in one by one, the logo disc zooms in, and the shop eases into view behind it.
$('splashName').innerHTML=[...db.shop.name].map((ch,i)=>`<i style="--i:${i}">${esc(ch)}</i>`).join('');
setTimeout(()=>$('splash').classList.add('ring'),2200);
setTimeout(()=>{$('splash').classList.add('zoom');document.body.classList.remove('intro')},3200);
setTimeout(()=>$('splash').classList.add('out'),3800);

/* ===== 3. HOME ===== */
let slideIx=0,slideTimer;
function renderHome(){
  document.title=db.shop.name+' – Women’s & Kids’ Collection';
  ['logo','sBrand'].forEach(i=>$(i).textContent=db.shop.name);
  $('track').innerHTML=db.banners.map(b=>`<div class="slide" style="background:linear-gradient(120deg,${esc(b.color)},#0F1216)"><h3>${esc(b.title)}</h3><p>${esc(b.sub)}</p>${fig('#E6E1DA',b.kind)}</div>`).join('');
  $('dots').innerHTML=db.banners.map(()=>'<i></i>').join('');
  $('cats').innerHTML=db.categories.map(c=>`<button class="cat" data-cat="${esc(c.id)}"><div class="ico">${fig('#6B1F26',c.kind)}</div>${esc(c.name)}</button>`).join('');
  $('trending').innerHTML=db.products.slice(0,8).map(p=>`
    <div class="pcard" data-view="${esc(p.id)}" style="cursor:pointer"><div class="pimg">${pic(p)}</div><div class="pinfo"><b>${esc(p.name)}</b><span>${inr(p.price)}</span>
    <button class="add" data-view="${esc(p.id)}">View details</button></div></div>`).join('');
  goSlide(0);clearInterval(slideTimer);
  slideTimer=setInterval(()=>goSlide((slideIx+1)%Math.max(db.banners.length,1)),3500);
}
function goSlide(i){slideIx=i;$('track').style.transform=`translateX(-${i*100}%)`;
  [...$('dots').children].forEach((d,k)=>d.classList.toggle('on',k===i))}
// Home = banner + trending. Categories = only the category tiles.
function showView(v){
  ['hero','trendTitle','trending'].forEach(i=>$(i).classList.toggle('hidden',v==='cats'));
  $('cats').classList.toggle('big',v==='cats');
  $('homeBtn').classList.toggle('on',v==='home');$('catBtn').classList.toggle('on',v==='cats');
  $('catTitle').textContent=v==='cats'?'Women’s wear':'Shop by category';
}
const nav=v=>{closeDetail();closeStage();$('cart').classList.remove('open');$('acct').classList.remove('open');showView(v);scrollTo({top:0})};
$('homeBtn').onclick=()=>nav('home');
$('catBtn').onclick=()=>nav('cats');

/* ===== 4. CATEGORY ANIMATION ===== */
// Black screen + typed headline -> dresses rise -> black-to-white wipe -> product strip slides up.
let seqTimers=[],typeTimer,autoT,idleUntil=0,focusIx=-1,curList=[],raf;
function openCategory(id,pid){ // pid given = show only that one dress (used by Trending cards)
  const c=catOf(id);if(!c)return;
  closeStage(true);
  curList=db.products.filter(p=>p.cat===id&&(!pid||p.id===pid));focusIx=-1;
  const st=$('stage'),car=$('sCar');
  car.innerHTML=curList.map(p=>`<div class="dress" data-view="${esc(p.id)}">${pic(p,c.kind)}</div>`).join('');
  $('sStrip').innerHTML=curList.map((p,i)=>`<button class="tile" data-go="${i}"><div class="pimg">${thumb(p,c.kind)}</div><b>${esc(p.name)}</b><span>${inr(p.price)}</span></button>`).join('');
  car.scrollLeft=0;$('sStrip').scrollLeft=0;$('sInfo').innerHTML=curList.length?'':'<span>No products in this category yet.</span>';
  const text=`${c.name}, made to make an entrance.`;let n=0;$('sTitle').textContent='';
  st.className='open';
  typeTimer=setInterval(()=>{$('sTitle').textContent=text.slice(0,++n);if(n>=text.length)clearInterval(typeTimer)},45);
  const at=(ms,fn)=>seqTimers.push(setTimeout(fn,ms));
  at(900,()=>{st.classList.add('show');tilt();autoPlay()});
  at(2800,()=>st.classList.add('white'));
  at(3600,()=>st.classList.add('strip-on'));
}
function tilt(){ // scale/rotate each dress by its distance from the centre; update info + strip
  const car=$('sCar'),box=car.getBoundingClientRect(),mid=box.left+box.width/2;let best=0,bd=1e9;
  [...car.children].forEach((el,i)=>{const r=el.getBoundingClientRect(),d=(r.left+r.width/2-mid)/212,a=Math.min(Math.abs(d),2);
    el.style.transform=`rotateY(${-d*30}deg) scale(${1.08-a*.2})`;el.style.opacity=1-a*.3;
    if(Math.abs(d)<bd){bd=Math.abs(d);best=i}});
  if(curList.length&&best!==focusIx){focusIx=best;const p=curList[best];
    $('sInfo').innerHTML=`<b>${esc(p.name)}</b><span>${inr(p.price)} · ${best+1} of ${curList.length}</span><button class="add" data-view="${esc(p.id)}">View details</button>`;
    const sp=$('sStrip'),tiles=[...sp.children];tiles.forEach((t,i)=>t.classList.toggle('on',i===best));
    const t=tiles[best];if(t)sp.scrollTo({left:t.offsetLeft-sp.clientWidth/2+t.offsetWidth/2,behavior:'smooth'})}
}
$('sCar').addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(tilt)});
// Tap a tile in the strip to bring that dress to the front.
$('sStrip').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;
  idleUntil=Date.now()+4000;$('sCar').scrollTo({left:+b.dataset.go*212,behavior:'smooth'})});
// Auto-swipe: next dress every 2.2s, loops. Touching or dragging pauses it for 4s.
['pointerdown','touchmove','wheel'].forEach(ev=>$('sCar').addEventListener(ev,()=>idleUntil=Date.now()+4000,{passive:true}));
function autoPlay(){
  const car=$('sCar'),step=212;
  autoT=setInterval(()=>{if(Date.now()<idleUntil||curList.length<2)return;
    const max=car.scrollWidth-car.clientWidth,next=Math.round(car.scrollLeft/step)*step+step;
    car.scrollTo({left:next>max+2?0:next,behavior:'smooth'})},2200);
}
function closeStage(quiet){seqTimers.forEach(clearTimeout);clearInterval(typeTimer);clearInterval(autoT);if(!quiet)$('stage').className=''}
$('sClose').onclick=()=>closeStage();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('detail').classList.contains('open'))closeDetail();else{closeStage();$('cart').classList.remove('open')}}});

/* ===== 4b. PRODUCT DETAIL PAGE ===== */
// Opens when someone taps a model photo or a Trending card. Gallery = model photo + dress-only photos.
let dP=null,dSize='';
function openDetail(id){const p=prod(id);if(!p)return;dP=p;dSize='';renderDetail();$('detail').classList.add('open');$('detail').scrollTop=0}
function closeDetail(){$('detail').classList.remove('open')}
function renderDetail(){
  const p=dP,c=catOf(p.cat)||{},imgs=[p.img,...p.gallery].filter(Boolean);
  const slides=imgs.length?imgs.map((s,i)=>`<div class="gs${i===0&&p.img?' model':''}"><img src="${esc(s)}" alt="${esc(p.name)} photo ${i+1}"></div>`).join(''):`<div class="gs model">${fig(p.color,c.kind)}</div>`;
  const sizes=p.sizes.split(',').map(x=>x.trim()).filter(Boolean);
  const rows=[['Fabric',p.fabric],['Includes',p.includes],['Ornament / work',p.ornament],['Sizes',sizes.join(', ')]].filter(r=>r[1]);
  $('dBody').innerHTML=`<div class="dwrap">
    <div><div class="gal" id="gal">${slides}</div><div class="gdots" id="gdots">${imgs.length>1?imgs.map((_,i)=>`<i${i===0?' class="on"':''}></i>`).join(''):''}</div></div>
    <div class="dinfo"><h1>${esc(p.name)}</h1><div class="dprice">${inr(p.price)}</div>
      ${sizes.length?`<div class="dlab">Select size</div><div class="chips">${sizes.map(x=>`<button class="chip" data-size="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''}
      <button class="btn big" id="dAdd">Add to cart</button>
      ${p.desc?`<p class="ddesc">${esc(p.desc)}</p>`:''}
      ${rows.length?`<dl class="dl">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`:''}
    </div></div>`;
  $('gal').addEventListener('scroll',()=>{const g=$('gal'),i=Math.round(g.scrollLeft/g.clientWidth);[...$('gdots').children].forEach((d,k)=>d.classList.toggle('on',k===i))});
}
$('dClose').onclick=closeDetail;
$('dBody').addEventListener('click',e=>{
  const z=e.target.closest('[data-size]');
  if(z){dSize=z.dataset.size;[...document.querySelectorAll('.chip')].forEach(b=>b.classList.toggle('on',b.dataset.size===dSize));return}
  if(e.target.id==='dAdd'){
    if(dP.sizes.split(',').some(x=>x.trim())&&!dSize)return toast('Please choose a size');
    addToCart(dP.id,dSize)}
});

/* ===== 5. CART ===== */
// BACKEND: send cart to your API / checkout endpoint instead of keeping it only in the browser.
const ck=x=>x.id+'|'+(x.size||''); // one cart line per product + size
function addToCart(id,size){const n={id,size:size||''},it=cart.find(x=>ck(x)===ck(n));it?it.q++:cart.push({id,size:n.size,q:1});saveCart();renderCart();toast('Added to cart')}
function renderCart(){
  const items=cart.map(x=>({...x,p:prod(x.id)})).filter(x=>x.p);
  $('cartCount').textContent=items.reduce((a,x)=>a+x.q,0);
  $('cartItems').innerHTML=items.length?items.map(x=>`<div class="row"><div class="pimg">${pic(x.p)}</div><div><b>${esc(x.p.name)}</b><br>${x.size?'Size '+esc(x.size)+' · ':''}${inr(x.p.price)}</div>
    <span class="qty"><button data-q="${esc(ck(x))}" data-d="-1" aria-label="Less">−</button> ${x.q} <button data-q="${esc(ck(x))}" data-d="1" aria-label="More">+</button></span></div>`).join(''):'<p class="empty">Your cart is empty. Tap a dress to add it.</p>';
  $('cartTotal').textContent=inr(items.reduce((a,x)=>a+x.p.price*x.q,0));
}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1400)}
$('cartBtn').onclick=()=>{$('acct').classList.remove('open');$('cart').classList.add('open')};
$('cartClose').onclick=()=>$('cart').classList.remove('open');
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-add]'),c=e.target.closest('[data-cat]'),q=e.target.closest('[data-q]'),v=e.target.closest('[data-view]');
  if(a)addToCart(a.dataset.add);
  else if(c)openCategory(c.dataset.cat);
  else if(v)openDetail(v.dataset.view)
  else if(q){const it=cart.find(x=>ck(x)===q.dataset.q);it.q+=+q.dataset.d;if(it.q<1)cart=cart.filter(x=>x!==it);saveCart();renderCart()}
});

/* ===== 6. ACCOUNT & ORDERS ===== */
// BACKEND: replace these localStorage helpers with real sign-up/login (user) and POST /api/orders (orders).
const rd=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let user=rd('senara-user',{}),orders=rd('senara-orders',[]),wantOrder=false;
const userOk=u=>u.name&&/^\d{10}$/.test(u.phone||'')&&u.address;
function renderAccount(msg){
  const mine=user.phone?orders.filter(o=>o.customer.phone===user.phone):[];
  $('acctBody').innerHTML=`${msg?`<p class="note" style="color:var(--maroon);font-weight:600">${esc(msg)}</p>`:''}
  <div class="f"><input id="uName" placeholder="Full name" value="${esc(user.name||'')}" autocomplete="name"></div>
  <div class="f"><input id="uPhone" type="tel" inputmode="numeric" maxlength="10" placeholder="Phone (10 digits)" value="${esc(user.phone||'')}" autocomplete="tel"></div>
  <div class="f"><input id="uEmail" type="email" placeholder="Email (optional)" value="${esc(user.email||'')}" autocomplete="email"></div>
  <div class="f"><input id="uAddr" placeholder="Delivery address" value="${esc(user.address||'')}" autocomplete="street-address"></div>
  <div class="f"><input id="uCity" placeholder="City" value="${esc(user.city||'')}"><input id="uPin" inputmode="numeric" maxlength="6" placeholder="Pincode" value="${esc(user.pin||'')}"></div>
  <button class="btn" id="uSave" style="width:100%;padding:12px">${wantOrder?'Save & place order':'Save details'}</button>
  <h3 style="font-family:var(--serif);font-size:20px;margin:22px 0 8px">My orders</h3>
  ${mine.length?mine.map(o=>`<div class="row"><div><b>#${esc(o.id)}</b> · ${esc(o.status)}<br>${o.items.map(i=>esc(i.name)+' ×'+i.q).join(', ')}</div><b>${inr(o.total)}</b></div>`).join(''):'<p class="empty">No orders yet.</p>'}`;
}
function openAccount(msg){$('cart').classList.remove('open');renderAccount(msg);$('acct').classList.add('open')}
$('accBtn').onclick=()=>{wantOrder=false;openAccount()};
$('acctClose').onclick=()=>{wantOrder=false;$('acct').classList.remove('open')};
$('acctBody').addEventListener('click',e=>{
  if(e.target.id!=='uSave')return;
  const v=id=>$(id).value.trim(),u={name:v('uName'),phone:v('uPhone'),email:v('uEmail'),address:v('uAddr'),city:v('uCity'),pin:v('uPin')};
  if(!u.name)return toast('Please enter your name');
  if(!/^\d{10}$/.test(u.phone))return toast('Enter a 10-digit phone number');
  if(!u.address)return toast('Please enter your address');
  user=u;wr('senara-user',user);
  if(wantOrder){wantOrder=false;placeOrder()}else{renderAccount();toast('Details saved')}
});
// Place order: needs name, phone and address. If missing, the account form opens first.
$('orderBtn').onclick=()=>{
  if(!cart.some(x=>prod(x.id)))return toast('Your cart is empty');
  if(!userOk(user)){wantOrder=true;return openAccount('Add your details to place the order.')}
  placeOrder();
};
function placeOrder(){
  const items=cart.map(x=>({p:prod(x.id),q:x.q,size:x.size})).filter(x=>x.p).map(x=>({id:x.p.id,name:x.p.name+(x.size?' ('+x.size+')':''),price:x.p.price,q:x.q}));
  const o={id:String(Date.now()).slice(-7),date:new Date().toISOString(),customer:{...user},items,total:items.reduce((a,i)=>a+i.price*i.q,0),status:'New'};
  orders.unshift(o);wr('senara-orders',orders); // BACKEND: POST /api/orders with `o`
  cart=[];saveCart();renderCart();$('cart').classList.remove('open');
  renderAccount('Thank you! Your order #'+o.id+' is placed.');$('acct').classList.add('open');toast('Order placed');
}

/* ===== 7. ADMIN (open with #admin) ===== */
// AUTH: add real authentication here before showing the admin view.
// BACKEND: every edit below calls save(); replace it with POST/PUT/DELETE requests.
function renderAdmin(){
  const catOpts=sel=>db.categories.map(c=>`<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join('');
  const kindOpts=sel=>Object.keys(SHAPES).map(k=>`<option ${k===sel?'selected':''}>${k}</option>`).join('');
  // BACKEND: load orders from your API instead of localStorage.
  const ordersPanel=`<div class="panel"><h3>Orders (${orders.length})</h3><p class="note">New orders appear here with the customer’s details.</p>${orders.length?orders.map((o,i)=>`<div class="row" style="align-items:flex-start"><div><b>#${esc(o.id)}</b> · ${esc(new Date(o.date).toLocaleString())}<br>${esc(o.customer.name)} · ${esc(o.customer.phone)}${o.customer.email?' · '+esc(o.customer.email):''}<br>${esc(o.customer.address)}, ${esc(o.customer.city||'')} ${esc(o.customer.pin||'')}<br>${o.items.map(x=>esc(x.name)+' ×'+x.q).join(', ')}<br><b>${inr(o.total)}</b></div><select data-ord="${i}">${['New','Packed','Shipped','Delivered'].map(t=>`<option ${t===o.status?'selected':''}>${t}</option>`).join('')}</select></div>`).join(''):'<p class="empty">No orders yet.</p>'}</div>`;
  $('adminBody').innerHTML=`
  ${ordersPanel}
  <div class="panel"><h3>Shop</h3><div class="f"><input data-e="shop.name" value="${esc(db.shop.name)}" placeholder="Shop name"></div></div>
  <div class="panel"><h3>Banners</h3><p class="note">Shown in the auto-scrolling hero.</p>
    ${db.banners.map((b,i)=>`<div class="f"><input data-e="banners.${i}.title" value="${esc(b.title)}" placeholder="Title"><input data-e="banners.${i}.sub" value="${esc(b.sub)}" placeholder="Subtitle"><input type="color" data-e="banners.${i}.color" value="${esc(b.color)}"><select data-e="banners.${i}.kind">${kindOpts(b.kind)}</select><button class="btn ghost" data-del="banners.${i}">Delete</button></div>`).join('')}
    <button class="btn" data-new="banner">Add banner</button></div>
  <div class="panel"><h3>Categories</h3>
    ${db.categories.map((c,i)=>`<div class="f"><input data-e="categories.${i}.name" value="${esc(c.name)}"><select data-e="categories.${i}.kind">${kindOpts(c.kind)}</select><button class="btn ghost" data-del="categories.${i}">Delete</button></div>`).join('')}
    <button class="btn" data-new="category">Add category</button></div>
  <div class="panel"><h3>Products</h3><p class="note">For each product: one main photo of the model, plus up to 4 photos of the dress itself (folded or flat). The first dress photo becomes the small picture in the bottom strip. Photos uploaded here stay in this browser only (demo).</p>
    ${db.products.map((p,i)=>`<div class="pbox">
      <div class="f"><input data-e="products.${i}.name" value="${esc(p.name)}" placeholder="Product name"><input type="number" data-e="products.${i}.price" value="${p.price}" style="flex:0 1 90px" placeholder="Price"><select data-e="products.${i}.cat">${catOpts(p.cat)}</select></div>
      <div class="f"><input data-e="products.${i}.sizes" value="${esc(p.sizes)}" placeholder="Sizes, e.g. S, M, L, XL"><input data-e="products.${i}.fabric" value="${esc(p.fabric)}" placeholder="Fabric"></div>
      <div class="f"><input data-e="products.${i}.includes" value="${esc(p.includes)}" placeholder="Includes, e.g. Kurta, dupatta, pants"><input data-e="products.${i}.ornament" value="${esc(p.ornament)}" placeholder="Ornament / work, e.g. gold embroidery"></div>
      <div class="f"><textarea data-e="products.${i}.desc" rows="3" placeholder="Description">${esc(p.desc)}</textarea></div>
      <div class="lab">Main photo (model)</div>
      <div class="ph">${p.img?`<div class="th"><img src="${esc(p.img)}" alt=""></div>`:''}<input type="file" accept="image/*" data-up="${i}"></div>
      <div class="lab">Dress photos (up to 4)</div>
      <div class="ph">${p.gallery.map((g,j)=>`<div class="th"><img src="${esc(g)}" alt=""><button class="x" data-rm="${i}.${j}" aria-label="Remove photo">×</button></div>`).join('')}${p.gallery.length<4?`<input type="file" accept="image/*" multiple data-gal="${i}">`:''}</div>
      <button class="btn ghost" data-del="products.${i}">Delete product</button></div>`).join('')}
    <button class="btn" data-new="product">Add product</button></div>
  <button class="btn ghost" id="reset">Reset to sample data</button>`;
}
function setPath(path,val){const k=path.split('.');let o=db;k.slice(0,-1).forEach(x=>o=o[x]);o[k.at(-1)]=val}
$('adminBody').addEventListener('change',e=>{
  const p=e.target.dataset.e;if(!p)return;
  setPath(p,e.target.type==='number'?+e.target.value:e.target.value);save();renderHome();toast('Saved')});
$('adminBody').addEventListener('click',e=>{
  const d=e.target.dataset;
  if(d.rm){const [i,j]=d.rm.split('.');db.products[+i].gallery.splice(+j,1);save();renderAdmin();renderHome();return}
  if(d.del){const k=d.del.split('.');db[k[0]].splice(+k[1],1);save();renderAdmin();renderHome()}
  if(d.new==='banner')db.banners.push({id:'b'+Date.now(),title:'New banner',sub:'Describe it',color:'#6B1F26',kind:'gown'});
  if(d.new==='category')db.categories.push({id:'c'+Date.now(),name:'New category',kind:'top'});
  if(d.new==='product')db.products.push({id:'p'+Date.now(),cat:(db.categories[0]||{}).id||'',name:'New product',price:599,color:'#6B1F26',img:'',gallery:[],sizes:'S, M, L, XL',desc:'',fabric:'',includes:'',ornament:''});
  if(d.new){save();renderAdmin();renderHome()}
  if(e.target.id==='reset'){db=norm(seed());save();renderAdmin();renderHome();toast('Reset')}
});
// Photo upload. Model photo keeps its transparent background (WebP/PNG); dress photos are JPEG to stay small.
function readPhoto(file,transparent){return new Promise(res=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const k=Math.min(1,800/img.height),cv=document.createElement('canvas');cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
    const x=cv.getContext('2d');if(!transparent){x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height)}
    x.drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(url);
    let d=transparent?cv.toDataURL('image/webp',.85):cv.toDataURL('image/jpeg',.82);
    if(transparent&&!d.startsWith('data:image/webp'))d=cv.toDataURL('image/png');
    res(d)};
  img.onerror=()=>res(null);img.src=url})}
$('adminBody').addEventListener('change',async e=>{
  const t=e.target;
  if(t.dataset.up!==undefined&&t.files[0]){const d=await readPhoto(t.files[0],true);if(d){db.products[t.dataset.up].img=d;save();renderAdmin();renderHome();toast('Main photo added')}}
  if(t.dataset.gal!==undefined&&t.files.length){const p=db.products[t.dataset.gal];
    for(const f of [...t.files]){if(p.gallery.length>=4)break;const d=await readPhoto(f,false);if(d)p.gallery.push(d)}
    save();renderAdmin();renderHome();toast('Dress photos added')}
});
$('adminBody').addEventListener('change',e=>{const i=e.target.dataset.ord;if(i===undefined)return;orders[i].status=e.target.value;wr('senara-orders',orders);toast('Status updated')});
$('backShop').onclick=()=>{location.hash='home'};

/* ===== 8. ROUTER ===== */
function route(){
  const isAdmin=location.hash==='#admin';
  $('admin').classList.toggle('hidden',!isAdmin);
  $('shop').classList.toggle('hidden',isAdmin);
  if(isAdmin){closeDetail();closeStage();renderAdmin()}else renderHome();
}
addEventListener('hashchange',route);
showView('home');renderCart();route();
