// Experimental 2.5D bridge: rigged GLB models follow the 2D physics.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.getElementById('character3d'),status=document.getElementById('characterStatus');
let renderer,scene,camera,model,bones={},base={},ticket=0,activeId='cowboy';
try {
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xffffff,0x6a7180,2));
 const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-100,300,400);scene.add(sun);
 camera=new THREE.OrthographicCamera(-500,500,300,-300,0.1,2000);
 camera.position.set(0,0,1000);camera.lookAt(0,0,0);
} catch(e){status.textContent='3D unavailable — 2D ragdoll active';}
const parts=['LeftShoulder','RightShoulder','Hips','Spine','Spine1','Spine2','Head','Neck','LeftArm','LeftForeArm','RightArm','RightForeArm','LeftUpLeg','LeftLeg','RightUpLeg','RightLeg'];
const urls={cowboy:'./western_cowboy_rigged.glb',human:'./rigged_t-pose_human_male_w_50_face_blendshapes.glb',meshy:'./Meshy_AI_scared_crash_characte_All_Animations.glb'};
function bone(part){
 // Blender/Mixamo names differ: mixamorig:Hips_01 versus mixamorig_Hips_01.
 // GLTFLoader can sanitize ':' into '_' as well.
 const wanted=part.toLowerCase();
 let found=null;
 model?.traverse(n=>{
  if(!n.isBone||found)return;
  let name=n.name.toLowerCase().replace(/^mixamorig[:_]?/,'');
  if(name===wanted || name.startsWith(wanted+'_') || new RegExp('(?:^|[:_])'+part+'(?:[_0-9]|$)','i').test(n.name))found=n;
 });
 return found;
}
async function load(id){
 const mine=++ticket;window.characterOverlayReady=false;
 status.textContent='Checking '+id+' character file…';
 try {
  const check=await fetch(urls[id],{method:'HEAD',cache:'no-store'});
  if(!check.ok)throw new Error('Model file missing: '+urls[id]);
  status.textContent='Loading '+id+' model…';
  const g=await new GLTFLoader().loadAsync(urls[id]);if(mine!==ticket)return;
  if(model)scene.remove(model);
  model=g.scene;scene.add(model);model.updateMatrixWorld(true);
  // Use bind pose rather than the cowboy's bundled animation; physics owns movement.
  model.traverse(n=>{if(n.isSkinnedMesh){n.frustumCulled=false;}});
  const box=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();
  box.getSize(size);if(!(size.y>0))throw Error('Empty model');
  model.scale.multiplyScalar(121/size.y);model.updateMatrixWorld(true);
  const mid=new THREE.Vector3();new THREE.Box3().setFromObject(model).getCenter(mid);
  model.position.x-=mid.x;model.position.y-=mid.y;
  bones={};base={};
  for(const part of parts){const b=bone(part);if(b){bones[part]=b;base[part]=b.quaternion.clone()}}
  if(!bones.Hips){console.warn('Hip bone unmatched; bones found:',Object.keys(bones));}
  if(Object.keys(bones).length<5)throw Error('Unable to map character joints');
  activeId=id;
  applySittingPose();
  document.querySelectorAll('[data-character]').forEach(b=>b.classList.toggle('selected',b.dataset.character===id));
  window.characterOverlayReady=true;
  status.textContent=({cowboy:'Cowboy',human:'Human',meshy:'Crash Character'}[id]||id)+' · 3D active';
 } catch(e){
  console.warn('3D model not loaded; retaining 2D ragdoll',e);
  status.textContent='Could not load '+id+' · '+(e?.message||'model error');
  window.characterOverlayReady=false;
 }
}
document.querySelectorAll('[data-character]').forEach(b=>b.addEventListener('click',()=>load(b.dataset.character)));
const direction=(a,b)=>Math.atan2(-(b.y-a.y),b.x-a.x);
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
function rotate(part,angle){
 if(!bones[part])return;
 bones[part].quaternion.copy(base[part]).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle));
}
// Pose rotations are layered on each character's original bind pose.
function pose(part,x=0,y=0,z=0){
 const b=bones[part];if(!b)return;
 b.quaternion.copy(base[part]);
 b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ')));
}
function applySittingPose(){
 for(const part of parts)if(bones[part])bones[part].quaternion.copy(base[part]);
 // Reverse hip/knee pitch: knees must fold forward, not under the pelvis.
 pose('LeftUpLeg',1.25,0,0);
 pose('RightUpLeg',1.25,0,0);
 pose('LeftLeg',-1.35,0,0);
 pose('RightLeg',-1.35,0,0);
 pose('Spine',.08,0,0);
 // Bring T-pose arms down, then bend elbows loosely over the lap.
 pose('LeftShoulder',0,0,-.65);
 pose('RightShoulder',0,0,.65);
 pose('LeftArm',.35,0,-.68);
 pose('RightArm',.35,0,.68);
 pose('LeftForeArm',-.6,0,0);
 pose('RightForeArm',-.6,0,0);
}

function animate(){
 requestAnimationFrame(animate);
 if(!renderer||!camera)return;
 const state=window.launcherVisualState;if(!state)return;
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
 if(model&&window.characterOverlayReady){
  model.visible=true;
  const {rag,tip,phase,theta}=state;
  if(rag){
   const tilt=direction(rag.hip,rag.chest)-Math.PI/2;
   model.position.x=rag.hip.x-state.camera-w/2;
   model.position.y=h/2-rag.hip.y-21;
   model.rotation.order='YXZ';
   model.rotation.y=Math.PI/2;
   model.rotation.z=tilt;
   const a=(p,q)=>direction(rag[p],rag[q]);
   rotate('LeftArm',norm(a('ls','le')-tilt+Math.PI/2));
   rotate('RightArm',norm(a('rs','re')-tilt+Math.PI/2));
   rotate('LeftForeArm',norm(a('le','lh')-a('ls','le')));
   rotate('RightForeArm',norm(a('re','rh')-a('rs','re')));
   rotate('LeftUpLeg',norm(a('hip','lk')-tilt+Math.PI/2));
   rotate('RightUpLeg',norm(a('hip','rk')-tilt+Math.PI/2));
   rotate('LeftLeg',norm(a('lk','lf')-a('hip','lk')));
   rotate('RightLeg',norm(a('rk','rf')-a('hip','rk')));
   rotate('Head',norm(a('neck','head')-tilt-Math.PI/2)*.35);
  } else {
   model.position.x=tip.x-state.camera-w/2;
   model.position.y=h/2-tip.y-15;
   model.rotation.order='YXZ';
   model.rotation.y=Math.PI/2;
   model.rotation.z=phase==='launching'?-theta*.25:0;
   applySittingPose();
  }
 }else if(model){model.visible=false;}
 renderer.render(scene,camera);
}
if(renderer){load('cowboy');animate();}
