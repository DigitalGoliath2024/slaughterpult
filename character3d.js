// Experimental 2.5D bridge: rigged GLB models follow the 2D physics.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.getElementById('character3d'),status=document.getElementById('characterStatus');
let renderer,scene,camera,model,bones={},base={},ticket=0,activeId='cowboy',seatBends={},armPose={},seatRoot=null,seatReady=false;
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

const chairURL='./Meshy_AI_catapult_seat_3d_1013060518_image-to-3d-texture_optimized.glb';
async function loadChair(){
 try{
  const response=await fetch(chairURL,{method:'HEAD'});
  if(!response.ok)throw Error('Chair GLB not uploaded');
  const gltf=await new GLTFLoader().loadAsync(chairURL);
  seatRoot=new THREE.Group();
  // 3D seat stays fixed on the arm, not on the airborne ragdoll.
  const chair=gltf.scene;
  const box=new THREE.Box3().setFromObject(chair),span=new THREE.Vector3();
  box.getSize(span);
  if(span.y<=0)throw Error('Invalid chair dimensions');
  chair.scale.multiplyScalar(104/span.y);
  chair.updateMatrixWorld(true);
  const scaled=new THREE.Box3().setFromObject(chair);
  const mid=scaled.getCenter(new THREE.Vector3());
  chair.position.sub(mid);
  // The Meshy chair has its wide side profile in the Y/Z plane; turn it 90°
  // so its profile faces the orthographic camera looking down Z.
  chair.rotation.y=Math.PI/2;
  chair.traverse(n=>{if(n.isMesh){n.frustumCulled=false;n.material?.side!==undefined&&(n.material.side=THREE.DoubleSide);}});
  console.info('Slaughterpult chair loaded',span);
  // Local origin is the centerline of the catapult girder at its tip.
  // The imported Meshy chair is 104 units tall, so its lowest foot is ~52
  // units below its centered origin. Lift it until its foot rests on a bracket.
  chair.position.y+=64;
  seatRoot.add(chair);
  // A visible welded saddle, cross plate, and four clamp bolts connect the
  // chair's lower frame to the metal throwing arm; all move as one assembly.
  const steel=new THREE.MeshStandardMaterial({color:0x465563,metalness:.85,roughness:.36});
  const edge=new THREE.MeshStandardMaterial({color:0x9eafb9,metalness:.8,roughness:.32});
  const bolt=new THREE.MeshStandardMaterial({color:0xc7cdd1,metalness:.9,roughness:.24});
  function block(w,h,d,x,y,z,mat){
   const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
   part.position.set(x,y,z);
   seatRoot.add(part);
   return part;
  }
  block(54,7,14,0,1,0,steel);       // flange welded across girder
  block(14,12,16,0,9,0,steel);      // riser under the seat
  block(42,5,17,0,15,0,edge);      // chair base mounting plate
  for(const x of [-16,16])for(const z of [-7,7]){
   const b=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.8,2,8),bolt);
   b.rotation.x=Math.PI/2;b.position.set(x,18,z);
   seatRoot.add(b);
  }
  scene.add(seatRoot);
  seatReady=true;window.seatOverlayReady=true;
  status.textContent='3D chair loaded · '+(activeId==='cowboy'?'Cowboy':activeId==='human'?'Human':'Crash Character');
 }catch(e){
  console.warn('3D chair unavailable, original basket retained',e);
  status.textContent='Chair could not load: '+(e?.message||'unknown error');
  window.seatOverlayReady=false;
 }
}
function positionChair(state,w,h){
 if(!seatRoot||!seatReady)return;
 // The bracket origin stays physically on the steel girder tip.
 seatRoot.visible=state.camera<750;
 seatRoot.position.set(state.tip.x-state.camera-w/2-18,h/2-state.tip.y,12);
 // Zero rotation at the loaded angle; rotate with the arm as it fires.
 seatRoot.rotation.z=state.theta-Math.PI;
}

const parts=['LeftShoulder','RightShoulder','LeftHand','RightHand','Hips','Spine','Spine1','Spine2','Head','Neck','LeftArm','LeftForeArm','RightArm','RightForeArm','LeftUpLeg','LeftLeg','RightUpLeg','RightLeg','LeftFoot','RightFoot'];
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
  calibrateSeatBends();
  calibrateArms();
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
// Determine pose signs from *actual joint positions*, instead of assuming all
// imported characters share the same bone orientation. Screen-right is launch-right.
function jointScreen(part){
 const b=bones[part];if(!b)return null;
 model.updateMatrixWorld(true);
 const p=new THREE.Vector3();b.getWorldPosition(p);
 // Model is drawn side-on by rotating +90 degrees around world Y.
 return {x:p.z, y:p.y};
}
function calibrateSeatBends(){
 seatBends={};
 for(const side of ['Left','Right']){
  const upper=side+'UpLeg',knee=side+'Leg',foot=side+'Foot';
  if(!bones[upper]||!bones[knee])continue;
  // Try both hip flexion directions and select knees projecting forward.
  let selected=0,best=-Infinity;
  for(const sign of [-1,1]){
   pose(upper,sign*1.15,0,0);
   const kp=jointScreen(knee),hp=jointScreen(upper);
   const advance=kp.x-hp.x;
   if(advance>best){best=advance;selected=sign;}
  }
  seatBends[upper]=selected*1.15;
  pose(upper,seatBends[upper]);
  // Choose knee fold that keeps ankles low and near the seat instead of kicking back.
  if(bones[foot]){
   let winner=0,score=-Infinity;
   for(const sign of [-1,1]){
    pose(knee,sign*1.22,0,0);
    const k=jointScreen(knee),f=jointScreen(foot);
    const v=(k.y-f.y)*2-Math.abs(f.x-k.x)*0.25;
    if(v>score){score=v;winner=sign;}
   }
   seatBends[knee]=winner*1.22;
  }else seatBends[knee]=-selected*1.22;
  pose(upper,0);pose(knee,0);
 }
}
// Measure where each wrist points on the 3D model. Choose shoulder/elbow
// rotations based on actual results, avoiding T-pose arms drifting behind it.
function calibrateArms(){
 armPose={};
 for(const side of ['Left','Right']){
  const upper=side+'Arm',lower=side+'ForeArm',hand=side+'Hand';
  if(!bones[upper]||!bones[lower])continue;
  const shoulder=jointScreen(upper);
  let best=-Infinity,chosen={x:0,z:0};
  for(const x of [-1.2,-.6,0,.6,1.2]){
   for(const z of [-1.4,-.7,0,.7,1.4]){
    pose(upper,x,0,z);
    const elbow=jointScreen(lower);
    const dx=elbow.x-shoulder.x,dy=elbow.y-shoulder.y;
    // Left hangs down; right is lifted forward to taunt.
    const score=side==='Left' ? -Math.abs(dx)*.9-dy*2 : dx*1.6+dy*1.2;
    if(score>best){best=score;chosen={x,z};}
   }
  }
  armPose[upper]=chosen;
  pose(upper,0,0,0);
  if(bones[hand])armPose[lower]=side==='Left'?{x:.12,z:0}:{x:-.75,z:0};
 }
}
function applySittingPose(){
 for(const part of parts)if(bones[part])bones[part].quaternion.copy(base[part]);
 for(const [part,angle] of Object.entries(seatBends))pose(part,angle,0,0);
 pose('Spine',.08,0,0);
 // Preserve shoulders in their bind orientation and bend the arms at the
 // mapped upper-arm joints. Calibrated per loaded character.
 for(const [part,v] of Object.entries(armPose))pose(part,v.x,0,v.z);
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
   model.position.x=tip.x-state.camera-w/2-7;
   model.position.y=h/2-tip.y-34;
   model.rotation.order='YXZ';
   model.rotation.y=Math.PI/2;
   model.rotation.z=phase==='launching'?-theta*.25:0;
   applySittingPose();
  }
 }else if(model){model.visible=false;}
 positionChair(state,w,h);
 renderer.render(scene,camera);
 drawBasket(state,w,h);
}
// Foreground basket lip: the seated character should visibly sit INSIDE the
// launcher rather than having both legs painted over the front wall.
const basketCanvas=document.createElement('canvas');
basketCanvas.id='basketForeground';
basketCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
canvas.parentElement.insertBefore(basketCanvas,canvas.nextSibling);
const basketCtx=basketCanvas.getContext('2d');
function drawBasket(state,w,h){
 const dpr=Math.min(devicePixelRatio||1,2);
 const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
 if(basketCanvas.width!==cw||basketCanvas.height!==ch){basketCanvas.width=cw;basketCanvas.height=ch;}
 basketCtx.setTransform(dpr,0,0,dpr,0,0);
 basketCtx.clearRect(0,0,w,h);
 if(seatReady||state.rag||!window.characterOverlayReady)return;
 const x=state.tip.x-state.camera,y=state.tip.y;
 basketCtx.save();basketCtx.translate(x,y);basketCtx.rotate(-state.theta);
 basketCtx.fillStyle='#344a59';basketCtx.strokeStyle='#172b38';basketCtx.lineWidth=4;
 // Front/lower basket wall hides the lower body, leaving upper torso visible.
 basketCtx.beginPath();basketCtx.moveTo(-30,9);basketCtx.lineTo(21,9);basketCtx.lineTo(12,30);basketCtx.lineTo(-30,30);basketCtx.closePath();
 basketCtx.fill();basketCtx.stroke();
 basketCtx.restore();
}
if(renderer){loadChair();load('cowboy');animate();}
