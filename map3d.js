import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RAYONS,LAYOUT as L} from './config.js';
let stop;
const label=t=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#7b2d3e';x.font='bold 90px Georgia';x.textAlign='center';x.fillText(t,64,95);return new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c)}))};
export function showMap(el,b){stop?.();const w=el.clientWidth,h=el.clientHeight,r=new T.WebGLRenderer({antialias:true});r.setSize(w,h);el.replaceChildren(r.domElement);
 const s=new T.Scene();s.background=new T.Color(0xf4efe6);const cx=(L.perRow-1)*L.gapX/2,cam=new T.PerspectiveCamera(50,w/h,.1,100);cam.position.set(cx+5,9,13);
 const oc=new OrbitControls(cam,r.domElement);oc.target.set(cx,1,-L.gapZ/2);
 s.add(new T.AmbientLight(0xffffff,.9));const d=new T.DirectionalLight(0xfff0d0,1.2);d.position.set(5,12,8);s.add(d);
 const fl=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:0xe9e1d3}));fl.rotation.x=-Math.PI/2;s.add(fl);
 let tx=0,tz=0;
 RAYONS.forEach((id,i)=>{const x=(i%L.perRow)*L.gapX,z=-Math.floor(i/L.perRow)*L.gapZ,hit=id==b.rayon;if(hit){tx=x;tz=z}
  const m=new T.Mesh(new T.BoxGeometry(L.w,L.h,.5),new T.MeshStandardMaterial({color:hit?0xb5651d:0xcdbfa6}));m.position.set(x,L.h/2,z);s.add(m);
  for(let k=0;k<=L.shelves;k++){const p=new T.Mesh(new T.BoxGeometry(L.w,.05,.7),new T.MeshStandardMaterial({color:0x8a6d3b}));p.position.set(x,k*L.h/L.shelves,z+.1);s.add(p)}
  const l=label(id);l.position.set(x,L.h+.7,z);s.add(l)});
 const bw=L.w/L.blocs,hl=new T.Mesh(new T.BoxGeometry(bw*.9,L.h/L.shelves*.8,.15),new T.MeshStandardMaterial({color:0xffd24a,emissive:0xffd24a}));
 hl.position.set(tx-L.w/2+(b.bloc-.5)*bw,(b.etagere-.5)*L.h/L.shelves,tz+.4);s.add(hl);
 const ex=cx/ (L.perRow-1||1)/2*1+L.gapX/2,az=tz+1.8,P=[[ex,.05,8],[ex,.05,az],[hl.position.x,.05,az],[hl.position.x,.05,az-.7]];
 s.add(new T.Line(new T.BufferGeometry().setFromPoints(P.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color:0x7b2d3e})));
 const en=label('Entrée');en.position.set(ex,1,8.6);en.scale.set(2,2,1);s.add(en);
 let id,on=true;const tick=t=>{if(!on)return;hl.material.emissiveIntensity=.6+.6*Math.sin(t/180);oc.update();r.render(s,cam);id=requestAnimationFrame(tick)};tick(0);
 stop=()=>{on=false;cancelAnimationFrame(id);r.dispose()}}
