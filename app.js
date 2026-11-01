import * as THREE from './vendor/three.module.min.js';
import { items } from './data.js';

const $ = s => document.querySelector(s);
let index = 0, filter = 'すべて', spinning = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, model, anim, fallbackContext;
const canvas = $('#canvas');
const typeLabel = t => t === 'ビル' ? 'BUILDING' : t === '橋' ? 'BRIDGE' : t === '煙突' ? 'CHIMNEY' : t === '送電鉄塔' ? 'PYLON' : 'TOWER';
function resetModel() { if (!model) return; scene.remove(model); model.traverse(x=>{x.geometry?.dispose();if(x.material){(Array.isArray(x.material)?x.material:[x.material]).forEach(m=>m.dispose())}}); model=null; }
function init3d(){
 try {
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30,1,.1,120); camera.position.set(9,7.8,14.6); camera.lookAt(0,3.05,0);
  scene.add(new THREE.HemisphereLight(0xe2f0ef,0x35434c,2.2));
  let key=new THREE.DirectionalLight(0xffe2c4,2.4);key.position.set(-6,10,6);scene.add(key);
  let back=new THREE.DirectionalLight(0xa8c8d1,1.3);back.position.set(5,7,-6);scene.add(back);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(3.15,80),new THREE.MeshStandardMaterial({color:0x46555a,transparent:true,opacity:.56,roughness:1,side:THREE.DoubleSide}));disk.rotation.x=-Math.PI/2;disk.position.y=-.075;scene.add(disk);
  for(let radius of [1.4,2.3,3.1]){let pts=[];for(let i=0;i<96;i++){let a=2*Math.PI*i/96;pts.push(new THREE.Vector3(Math.cos(a)*radius,-.052,Math.sin(a)*radius))}const ln=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x95aba6,transparent:true,opacity:.2}));scene.add(ln)}
  const resize=()=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.position.set(rect.width/rect.height<.8?10:9,7.8,rect.width/rect.height<.8?18:14.6);camera.lookAt(0,3.05,0);camera.updateProjectionMatrix()};
  new ResizeObserver(resize).observe(canvas);resize();
  const frame=()=>{anim=requestAnimationFrame(frame);if(model&&spinning) model.rotation.y+=0.003;renderer.render(scene,camera)};frame();
 }catch(e){console.warn('WebGL unavailable; using illustrated rendering');canvas.hidden=true;document.querySelector('.viewer-label').innerHTML='<i></i> 立体イメージ';document.querySelector('.viewer-meta>span:last-child').textContent='SWIPE TO EXPLORE ↔';const fb=$('#fallback-canvas');fb.hidden=false;fallbackContext=fb.getContext('2d');if(fallbackContext){new ResizeObserver(()=>drawFallback(items[index])).observe(fb);drawFallback(items[index]);$('#spin-toggle').hidden=true}else{$('#fallback').hidden=false;}}
}
function material(color,metalness=.15){return new THREE.MeshStandardMaterial({color,metalness,roughness:.64})}
function addBox(g,w,h,d,x,y,z,color,edge=true){let mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y+h/2,z);g.add(mesh);if(edge){let line=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0xe1e3d9,transparent:true,opacity:.38}));line.position.copy(mesh.position);g.add(line)}return mesh}
function cylinder(g,top,bottom,h,x,y,z,color,radial=24){let m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,radial),material(color));m.position.set(x,y+h/2,z);g.add(m);return m}
function line(g,points,color=0xd4e0db,opacity=.55){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity}));g.add(ln)}
function beam(g,a,b,r,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const diff=end.clone().sub(start);const obj=new THREE.Mesh(new THREE.CylinderGeometry(r,r,diff.length(),6),material(color,.22));obj.position.copy(start).add(end).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());g.add(obj)}
function makeTruss(g,{height=5.7,base=1.4,tip=.18,color=0xe4e5d9,sides=4,redWhite=false,antenna=true}){
 const point=(level,k)=>{const radius=base+(tip-base)*level;const angle=k*Math.PI*2/sides+Math.PI/4;return [Math.cos(angle)*radius,height*level,Math.sin(angle)*radius]};
 for(let k=0;k<sides;k++){beam(g,point(0,k),point(1,k),.035,color)}
 const sections=16;
 for(let i=0;i<sections;i++){let low=i/sections,high=(i+1)/sections;let c=redWhite?(i%4<2?0xc85e48:0xe9e7dc):color;
  for(let k=0;k<sides;k++){let n=(k+1)%sides;beam(g,point(low,k),point(low,n),.013,c);beam(g,point(low,k),point(high,n),.012,c);if(i%2===0)beam(g,point(high,k),point(low,n),.009,c)}
 }
 if(antenna)cylinder(g,.025,.045,.38,0,height,0,0xe0e4dc,8);
}
function skyscraper(g,item,idx){
 const seed=[...item.name].reduce((a,c)=>a+c.codePointAt(0),0),variant=seed%7;
 let h=5.8,w=1.65+(seed%5)*.08,d=1.26+((seed>>2)%4)*.08;
 const color=[0x9fb8b9,0xaeb9b1,0x92abb2,0xb8c1bb,0x93a7a6,0xc0c5b7,0x9baeb0][variant];
 if(item.name.includes('東京都庁')){
   addBox(g,2.8,3.2,1.35,0,0,0,0xb9bbb1);addBox(g,1.12,2.65,1.15,-.78,3.2,0,color);addBox(g,1.12,2.65,1.15,.78,3.2,0,color);w=2.8;d=1.35;
 }else if(item.name.includes('コクーン')){
   const geo=new THREE.CylinderGeometry(.35,.4,5.9,24,18);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),factor=1+2.4*Math.sqrt(Math.max(0,1-(y/3.08)**2));p.setX(i,p.getX(i)*factor);p.setZ(i,p.getZ(i)*factor)}geo.computeVertexNormals();let mesh=new THREE.Mesh(geo,material(0x97b9bd));mesh.position.y=2.95;g.add(mesh);for(let i=0;i<8;i++){let a=i*Math.PI/4;line(g,[[Math.cos(a)*.38,.1,Math.sin(a)*.38],[Math.cos(a+1)*1.03,3,Math.sin(a+1)*1.03],[Math.cos(a+2)*.36,5.85,Math.sin(a+2)*.36]],0xf1f1e8,.9)}
 }else if(item.name.includes('横浜ランドマーク')){
  addBox(g,1.9,5.22,1.46,0,0,0,color);addBox(g,1.5,.43,1.16,0,5.22,0,0xc0c9c3);addBox(g,1.05,.22,.9,0,5.65,0,0xc7d0c7);w=1.9;d=1.46;
 }else if(item.name.includes('麻布台ヒルズ森JP')){
  addBox(g,2.4,1.45,1.72,0,0,0,color);addBox(g,2.15,2.65,1.55,0,1.45,0,color);addBox(g,1.72,1.67,1.25,0,4.1,0,color);w=2.15;d=1.55;
 }else if(item.name.includes('あべのハルカス')){
  addBox(g,2,4.5,1.4,0,0,0,color);addBox(g,1.75,1.22,1.24,-.12,4.5,0,color);addBox(g,.88,.3,1.04,-.4,5.72,0,0xc7d4cb);w=2;d=1.4;
 }else if(item.name.includes('NTTドコモ代々木')){
  addBox(g,1.85,4.15,1.45,0,0,0,color);addBox(g,1.42,.65,1.12,0,4.15,0,0xc5cbc2);cylinder(g,.07,.62,1.03,0,4.8,0,0xb7c5bf,4);cylinder(g,.025,.045,.3,0,5.83,0,0xe1e6df,8);w=1.85;d=1.45;
 }else if(variant===0||variant===5){
  addBox(g,w,4.55,d,0,0,0,color);addBox(g,w*.85,1.25,d*.9,-w*.075,4.55,0,color);
 }else if(variant===3){
  addBox(g,w*.85,5.8,d,-w*.07,0,0,color);addBox(g,w*.22,4.5,d*.98,w*.45,0,0,0xb7c6c1);w*=1.12;
 }else{
  addBox(g,w,h,d,0,0,0,color);
  if(variant===2)addBox(g,w*.76,.15,d*.77,0,h,0,0xd1d6cd);
 }
 if(!item.name.includes('コクーン')&&!item.name.includes('東京都庁')){
  const facade=new THREE.LineBasicMaterial({color:0xe3ece3,transparent:true,opacity:.27});const points=[];
  for(let y=.23;y<5.68;y+=.22){points.push(-w*.49,y,d*.501,w*.49,y,d*.501);points.push(w*.501,y,-d*.49,w*.501,y,d*.49)}
  for(let x=-w*.4;x<w*.43;x+=w/6){points.push(x,.1,d*.502,x,Math.min(5.65,h),d*.502)}
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.add(new THREE.LineSegments(geometry,facade));
 }
}
function structure(item,idx){
 let g=new THREE.Group();
 switch(item.shape){
 case 'skytree':{
  makeTruss(g,{height:4.15,base:1.02,tip:.32,color:0xcddbd6,sides:3,antenna:false});
  cylinder(g,.37,.48,.9,0,4.15,0,0xa8c1be,18);cylinder(g,.58,.48,.16,0,4.08,0,0xdee7df,18);cylinder(g,.49,.59,.17,0,4.24,0,0xc9d8d3,18);cylinder(g,.33,.41,.14,0,4.87,0,0xe5e9db,18);cylinder(g,.11,.25,.17,0,5.05,0,0xdbe4db,18);cylinder(g,.035,.1,.78,0,5.21,0,0xe1e6dc,10);break;
 }
 case 'tokyo':{
  makeTruss(g,{height:4.55,base:1.35,tip:.21,color:0xd56c56,sides:4,redWhite:true,antenna:false});
  addBox(g,.8,.35,.8,0,2.4,0,0xf5e7d5);addBox(g,.55,.17,.55,0,3.82,0,0xf0e6db);cylinder(g,.03,.12,1.22,0,4.55,0,0xf2eae1,8);break;
 }
 case 'bridge':{
  const color=0xd7dbd1;
  for(let x of [-1.45,1.45]){for(let z of [-.45,.45])addBox(g,.22,5.5,.22,x,0,z,color);for(let y of [1.65,3.3,5.4])addBox(g,.24,.2,1.12,x,y,0,color)}
  addBox(g,5.1,.16,1.25,0,1.27,0,0xb5c6c3);
  for(let side of [-1,1])for(let x of [-1.45,1.45]){line(g,[[x,5.5,side*.4],[0,2.55,side*.4],[-x,5.5,side*.4]],0xe0ded3,.65);for(let q=-1;q<=1;q+=.25)line(g,[[x*q,1.43,side*.4],[x*q,2.52+Math.abs(q)*2.8,side*.4]],0xd1ddd4,.32)}break;
 }
 case 'mast':{
  makeTruss(g,{height:5.55,base:.18,tip:.12,color:0xd6dbd2,sides:3,redWhite:true});for(let y of [2,3.8,5.4])for(let a=0;a<3;a++){let t=a*Math.PI*2/3;line(g,[[0,y,0],[2.15*Math.cos(t),0,2.15*Math.sin(t)]],0xcad8d0,.65)}break;
 }
 case 'lattice':makeTruss(g,{height:5.65,base:.75,tip:.15,color:0xd8e0d8,sides:4,redWhite:true});break;
 case 'pylon':{
  makeTruss(g,{height:5.65,base:.7,tip:.2,color:0xd1d8d1,sides:4});for(let y of [3.5,4.25,4.95]){addBox(g,2.55,.07,.1,0,y,0,0xcad7d1);for(let x of [-1.18,1.18])line(g,[[x,y,0],[x,y-.35,0]],0xd1dbd3,.6)}break;
 }
 case 'media':{
  addBox(g,1.7,2.4,1.3,0,0,0,0xaebdb6);let t=new THREE.Group();t.position.y=2.4;t.scale.set(.7,.55,.7);g.add(t);makeTruss(t,{height:5.7,base:.8,tip:.12,color:0xdbddd5,sides:4,redWhite:true});break;
 }
 case 'fukuoka':{
  const geo=new THREE.CylinderGeometry(.48,.8,5.75,3,1);const tower=new THREE.Mesh(geo,material(0xa8c9cb,.5));tower.position.y=2.875;tower.rotation.y=Math.PI/6;g.add(tower);cylinder(g,.65,.65,.4,0,4.14,0,0xd7e4dc,3);cylinder(g,.03,.06,.3,0,5.75,0,0xe6e5dc,8);break;
 }
 case 'chimney':{
  const seed=[...item.name].reduce((a,c)=>a+c.codePointAt(0),0);for(let i=0;i<6;i++)cylinder(g,.34-(i*.015),.37-(i*.015),.96,0,i*.96,0,(seed%3===0?0xd4d8cb:(i%2?0xe2dfd2:0xc96d59)),20);cylinder(g,.32,.34,.08,0,5.76,0,0xdce0d5,20);break;
 }
 case 'test':addBox(g,1.45,5.85,1.35,0,0,0,0xb0c3bd);addBox(g,1.8,.25,1.6,0,5.6,0,0xd7ded5);for(let x of [-.35,0,.35])line(g,[[x,.15,.681],[x,5.6,.681]],0xe2eee6,.65);break;
 default:skyscraper(g,item,idx);
 }
 return g;
}
function drawFallback(item){
 if(!fallbackContext||!item)return;const c=$('#fallback-canvas'),ctx=fallbackContext;const bounds=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!bounds.width||!bounds.height)return;c.width=Math.round(bounds.width*dpr);c.height=Math.round(bounds.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,bounds.width,bounds.height);
 const sc=Math.min(bounds.width/8.3,bounds.height/7.5),cx=bounds.width*.5,base=bounds.height*.83;ctx.save();ctx.translate(cx,base);ctx.scale(sc,sc);
 const poly=(points,fill,stroke,alpha=1)=>{ctx.globalAlpha=alpha;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;if(fill)ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.018;ctx.stroke()}ctx.globalAlpha=1};
 const ln=(a,b,color='#cfddd5',width=.018)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
 ctx.beginPath();ctx.ellipse(0,0,2.5,.43,0,0,Math.PI*2);ctx.fillStyle='#a9c3b033';ctx.fill();ctx.strokeStyle='#a9c3b04d';ctx.lineWidth=.013;ctx.stroke();
 const box=(x,y,w,h,d,front='#a8bfbc')=>{const k=d*.35;poly([[x,y],[x+w,y],[x+w,y-h],[x,y-h]],front,'#dce7dc');poly([[x+w,y],[x+w+k,y-k],[x+w+k,y-h-k],[x+w,y-h]],'#789a9b','#cddfd5');poly([[x,y-h],[x+w,y-h],[x+w+k,y-h-k],[x+k,y-h-k]],'#d5dfd4','#d5e3d9');};
 const truss=(height,spread,col,deck)=>{for(let i=0;i<17;i++){let a=i/17,b=(i+1)/17;let w1=spread*(1-a)+.07,w2=spread*(1-b)+.07,y1=-height*a,y2=-height*b;ln([-w1,y1],[-w2,y2],col,.035);ln([w1,y1],[w2,y2],col,.035);ln([-w1,y1],[w1,y1],col,.016);ln([-w1,y1],[w2,y2],col,.013);ln([w1,y1],[-w2,y2],col,.013)}if(deck){box(-.46,-3.45,.92,.32,.3,'#d5e2d8');box(-.28,-4.75,.56,.17,.22,'#dbe8df')}ln([0,-height],[0,-height-.45],'#e8eee7',.04)};
 switch(item.shape){
 case 'skytree':truss(4.9,.75,'#dbe9e1',true);box(-.48,-3.4,.96,.21,.4,'#b0c8c5');break;
 case 'tokyo':truss(5.25,1.3,'#e19077',true);break;
 case 'mast':case 'lattice':case 'pylon':case 'media':truss(5.4,.7,item.shape==='pylon'?'#d5e2d9':'#db9a88',false);if(item.shape==='mast'){ln([0,-5.2],[-2.1,0]);ln([0,-5.2],[2.1,0]);ln([0,-3.1],[-1.6,0]);ln([0,-3.1],[1.6,0])}if(item.shape==='pylon')for(let y of [-3,-3.9,-4.7])ln([-1.2,y],[1.2,y],'#d5e2d9',.045);break;
 case 'bridge':box(-2,-1.2,4,.18,.6,'#b3c5bf');for(let x of [-1.25,1.25]){box(x-.13,0,.26,5.5,.35,'#bdcbc5');ln([x,-5.3],[0,-2.4]);ln([x,-5.3],[x<0?-2.3:2.3,-1.4])}break;
 case 'chimney':for(let i=0;i<6;i++){let y=-i*.92,w=.49-i*.025;poly([[-w,y],[w,y],[w-.025,y-.93],[-w+.025,y-.93]],i%2?'#dce2d7':'#d3917c','#dce5dc')}break;
 case 'fukuoka':poly([[-.6,0],[.7,0],[.4,-5.7],[-.4,-5.7]],'#9fc4c3','#d4e6de');box(-.55,-4.1,1.1,.35,.3,'#c8d9cf');break;
 default:{let seed=[...item.name].reduce((a,ch)=>a+ch.codePointAt(0),0);let w=1.7+(seed%5)*.08;box(-w/2,0,w,5.8,.9,'#acc3bf');for(let y=-.23;y>-5.7;y-=.22)ln([-w/2+.03,y],[w/2-.03,y],'#e2eee577',.014);for(let x=-w/2+.18;x<w/2;x+=.26)ln([x,-.08],[x,-5.7],'#e5f0e777',.009);if(item.name.includes('東京都庁'))box(-.95,-3.4,.7,2.2,.25,'#d4ded4');}
 }
 ctx.restore();
}
function update(){
 const item=items[index];if(!item)return;
 $('#name').textContent=item.name;$('#rank').textContent=String(item.rank).padStart(2,'0');$('#position').textContent=String(index+1).padStart(3,'0');$('#total').textContent=items.length;
 $('#type').textContent=item.type+' / '+typeLabel(item.type);$('#pref').textContent=item.place;$('#height').textContent=item.height.toLocaleString('ja-JP',{maximumFractionDigits:3});
 $('#description').textContent=item.desc;$('#year').textContent=item.year?`${item.year}年`:'要確認';$('#basis').textContent=item.dataOrigin;
 $('#ratio').textContent=`${(item.height/634*100).toFixed(1).replace(/\.0$/,'')}%`;$('#bar').style.width=`${item.height/634*100}%`;$('#source').href=item.source;
 $('#prev').disabled=index===0;$('#next').disabled=index===items.length-1;
 if(renderer&&scene){resetModel();model=structure(item,index);scene.add(model)} else if(fallbackContext){drawFallback(item)}
 document.title=`${item.name} | 高さの図鑑`;
}
function go(n){const nextIndex=Math.min(items.length-1,Math.max(0,n));if(nextIndex===index)return;const cls=nextIndex>index?"slide-right":"slide-left";index=nextIndex;update();for(const el of [document.querySelector(".detail-content"),document.querySelector(".model-stage")]){el.classList.remove("slide-right","slide-left");void el.offsetWidth;el.classList.add(cls)}}
function show(id){const el=$(id);el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('locked');if(id==='#drawer'){renderList();setTimeout(()=>$('#search').focus(),80)}}
function closeAll(){document.querySelectorAll('.overlay').forEach(el=>{el.classList.remove('open');el.setAttribute('aria-hidden','true')});document.body.classList.remove('locked')}
function renderList(){const q=$('#search').value.trim().toLowerCase().replace(/\s+/g,'');const result=items.filter(item=>{const txt=`${item.name}${item.place}${item.type}`.toLowerCase().replace(/\s+/g,'');let ok=filter==='すべて'||item.type===filter||(filter==='塔'&&['電波塔','通信塔','送電鉄塔','試験塔','展望塔'].includes(item.type));return ok&&txt.includes(q)});$('#result-count').textContent=`${result.length} 件`;$('#list').replaceChildren();if(!result.length){let p=document.createElement('p');p.className='empty';p.textContent='該当する建造物が見つかりませんでした。';$('#list').append(p);return}for(const item of result){const button=document.createElement('button');button.className='list-item';const rank=document.createElement('span');rank.className='list-rank';rank.textContent=String(item.rank).padStart(2,'0');const name=document.createElement('span');name.className='list-name';name.textContent=item.name;const place=document.createElement('small');place.className='list-place';place.textContent=item.place;name.append(place);const height=document.createElement('span');height.className='list-height';height.textContent=`${item.height.toLocaleString('ja-JP')} m`;button.append(rank,name,height);button.addEventListener('click',()=>{closeAll();go(items.indexOf(item));document.querySelector('.atlas').scrollIntoView({behavior:'smooth',block:'start'})});$('#list').append(button)}}
$('#prev').addEventListener('click',()=>go(index-1));$('#next').addEventListener('click',()=>go(index+1));
$('#index-open').addEventListener('click',()=>show('#drawer'));$('#index-open-bottom').addEventListener('click',()=>show('#drawer'));$('#about-open').addEventListener('click',()=>show('#about'));$('#about-open-footer').addEventListener('click',()=>show('#about'));
document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',closeAll));$('#search').addEventListener('input',renderList);$('#filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('#filters button').forEach(x=>x.classList.toggle('active',x===b));renderList()});
$('#spin-toggle').addEventListener('click',()=>{spinning=!spinning;$('#spin-toggle span').textContent=spinning?'回転中':'回転停止中';$('#spin-toggle').setAttribute('aria-label',spinning?'自動回転の停止':'自動回転を開始')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAll();return}if(document.querySelector('.overlay.open')||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowRight')go(index+1);if(e.key==='ArrowLeft')go(index-1)});
let startX=0,startY=0;function touchHandlers(el){el.addEventListener('touchstart',e=>{if(e.touches.length===1){startX=e.touches[0].clientX;startY=e.touches[0].clientY}},{passive:true});el.addEventListener('touchend',e=>{if(!e.changedTouches.length)return;let dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35)go(index+(dx<0?1:-1))},{passive:true})}touchHandlers(canvas);touchHandlers($('#fallback-canvas'));touchHandlers($('#slide-area'));
let dragging=false,lastX=0;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging||!model)return;model.rotation.y+=(e.clientX-lastX)*.01;lastX=e.clientX});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
if(matchMedia('(pointer:coarse)').matches)document.querySelector('.viewer-meta>span:last-child').innerHTML='SWIPE TO EXPLORE <span class="tiny-arrow">↔</span>';
init3d();update();
