/* ===== SENARA PRODUCT DATA =====
   Starting products. The owner can also edit everything in the admin page (open index.html#admin).
   - Model photo (the one in the swipe scene):      images/look1.png ... look6.png
   - Dress-only photos (folded/flat, for the detail page and the small strip pictures):
       put them in /images as dress3-1.jpg, dress3-2.jpg ... and set the "flat" count in the mk() line below.
   - Names, prices, sizes and descriptions below are SAMPLES written from the photos. The owner must confirm them.
   If the browser still shows old data after you edit this file, change DATA_VERSION (e.g. 'v5'). */
const DATA_VERSION = 'v4';

function seed(){
  const cats=[['women','Women’s Wear','gown']];

  // mk(photo no., name, price ₹, fallback colour, description, includes, ornament/work, number of dress-only photos)
  const mk=(n,name,price,color,desc,includes,ornament,flat=0)=>({
    id:'p'+n,cat:'women',name,price,color,
    img:'images/look'+n+'.png',
    gallery:Array.from({length:flat},(_,j)=>`images/dress${n}-${j+1}.jpg`),
    sizes:'S, M, L, XL',fabric:'',desc,includes,ornament
  });

  return{
    shop:{name:'Senara'},
    banners:[
      {id:'b1',title:'Festive collection',sub:'Kurta sets for every occasion',color:'#6B1F26',kind:'gown'},
      {id:'b2',title:'New arrivals',sub:'Fresh styles, just in',color:'#3B4A6B',kind:'top'},
      {id:'b3',title:'Everyday elegance',sub:'Easy pieces you will love',color:'#2F5D50',kind:'gown'}],
    categories:cats.map(([id,name,kind])=>({id,name,kind})),
    products:[
      mk(1,'Striped embroidered shirt set',999,'#6B1F26','Relaxed striped shirt with purple embroidered panels, styled with wide-leg pants.','Shirt, pants','Purple embroidery panels'),
      mk(2,'Sage floral maxi dress',1499,'#2F5D50','Flowing sage-green maxi dress with a floral print and 3D flower detailing at the shoulders.','Dress','3D flower detailing'),
      mk(3,'Printed kurta set with dupatta',1799,'#8A5A44','Printed kurta set with an embroidered neckline and a matching printed dupatta.','Kurta, dupatta, pants','Embroidered neckline'),
      mk(4,'Plum embroidered suit set',1899,'#6B1F26','Plum kurta set with gold embroidery, a printed dupatta and flared palazzo pants.','Kurta, dupatta, palazzo','Gold embroidery at neckline and hem'),
      mk(5,'Navy floral suit set',1999,'#3B4A6B','Navy and cream kurta set with floral embroidery, a printed dupatta and palazzo pants.','Kurta, dupatta, palazzo','Floral embroidery, tassel hem'),
      mk(6,'Leopard print maxi dress',1599,'#1B1B1D','Long-sleeved maxi dress in a leopard print.','Dress','')
    ]
  };
}
