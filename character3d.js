// Experimental 2.5D bridge: rigged GLB models follow the 2D physics.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.getElementById('character3d'),status=document.getElementById('characterStatus');
let renderer,scene,camera,model,bones={},base={},ticket=0,activeId='cowboy',seatBends={},armPose={},seatRoot=null,seatReady=false;
// Chair-space reference: pelvis is placed behind the chair foreground geometry (depth occlusion).
const chairHipAnchor=new THREE.Vector3(-15,54,2); // lower pelvis 8px into seat without changing torso pose
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
  // Center *after* applying the profile rotation; otherwise the object's
  // offset is computed in an unrelated axis and the seat drifts from its mount.
  chair.updateMatrixWorld(true);
  const facingBox=new THREE.Box3().setFromObject(chair);
  const facingMid=facingBox.getCenter(new THREE.Vector3());
  chair.position.sub(facingMid);
  chair.traverse(n=>{if(n.isMesh){n.frustumCulled=false;n.material?.side!==undefined&&(n.material.side=THREE.DoubleSide);}});
  console.info('Slaughterpult chair loaded',span);
  // Local origin is the centerline of the catapult girder at its tip.
  // The imported Meshy chair is 104 units tall, so its lowest foot is ~52
  // units below its centered origin. Lift it until its foot rests on a bracket.
  chair.position.y+=56;
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
 seatRoot.position.set(state.tip.x-state.camera-w/2+25,h/2-state.tip.y+(state.cameraY||0),12);
 // Rigidly welded to the girder: arm rotation only, no independent seat tilt.
 seatRoot.rotation.z=state.theta-Math.PI;
}


function seatCharacterOnChair(){
 // Seat and character share the SAME transform every frame. Model origins and
 // individual skeleton proportions don't matter: match the actual hip bone to
 // the chair-space pelvis anchor, not an arbitrary pixel offset from arm tip.
 if(!seatReady||!seatRoot||!model||!bones.Hips)return false;
 seatRoot.updateMatrixWorld(true);
 const target=seatRoot.localToWorld(chairHipAnchor.clone());
 model.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);
 model.position.set(0,0,0);
 model.updateMatrixWorld(true);
 // The loaded rigs have different torso/rest orientations. Match the actual
 // hip-to-chest vector to the chair back, rather than guessing an angle.
 const torso=bones.Spine2||bones.Spine1||bones.Spine||bones.Neck;
 if(torso){
  const hipPos=bones.Hips.getWorldPosition(new THREE.Vector3());
  const chestPos=torso.getWorldPosition(new THREE.Vector3());
  const v=chestPos.sub(hipPos);
  const currentAngle=Math.atan2(v.y,v.x);
  // Chair back stays close to vertical; it follows the arm tilt slightly.
  // Align shoulder/head axis with the actual reclined backrest. Using the arm
  // angle directly avoids adding an unrelated rightward lean.
  const desiredAngle=Math.PI/2+seatRoot.rotation.z;
  const tilt=THREE.MathUtils.clamp(desiredAngle-currentAngle,-.35,.35);
  model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),tilt)
   .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));
  model.updateMatrixWorld(true);
 }
 // Re-anchor after correcting torso tilt; otherwise the hips drift.
 const actual=bones.Hips.getWorldPosition(new THREE.Vector3());
 model.position.add(target.sub(actual));
 model.updateMatrixWorld(true);
 return true;
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
  model.scale.multiplyScalar(143/size.y); // 10% larger than prior 121px heightmodel.updateMatrixWorld(true);
  const mid=new THREE.Vector3();new THREE.Box3().setFromObject(model).getCenter(mid);
  model.position.x-=mid.x;model.position.y-=mid.y;
  bones={};base={};
  for(const part of parts){const b=bone(part);if(b){bones[part]=b;base[part]=b.quaternion.clone()}}
  if(!bones.Hips){console.warn('Hip bone unmatched; bones found:',Object.keys(bones));}
  if(Object.keys(bones).length<5)throw Error('Unable to map character joints');
  activeId=id;
  calibrateSeatBends();
  calibrateArms();
  calibrateLeftHand();
  calibrateRightHandRest();
  applySittingPose();
  document.querySelectorAll('[data-character]').forEach(b=>b.classList.toggle('selected',b.dataset.character===id));
  window.characterOverlayReady=true;
  status.textContent=({cowboy:'Cowboy',human:'Human',meshy:'Crash Character'}[id]||id)+' · 3D active · pose v35';
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
  let selectedAngle=0;
  for(const sign of [-1,1])for(const amount of [1.1,1.4,1.7,1.9]){
   const testAngle=sign*amount;
   pose(upper,testAngle,0,0);
   const kp=jointScreen(knee),hp=jointScreen(upper);
   // Aim thighs horizontally forward along the chair cushion, not down
   // through the supporting girder.
   const dx=kp.x-hp.x,dy=kp.y-hp.y;
   const score=dx*2.3-Math.abs(dy)*1.3;
   if(score>best){best=score;selectedAngle=testAngle;}
  }
  seatBends[upper]=selectedAngle;
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
  }else seatBends[knee]=-Math.sign(selectedAngle)*1.22;
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
// Calibrate the *left wrist*, not merely the elbow. The prior elbow-only
// scoring left the wrist dangling below the chair, appearing as a loose hand.
function calibrateLeftHand(){
 if(!bones.LeftArm||!bones.LeftForeArm||!bones.LeftHand||!bones.Hips)return;
 const hip=jointScreen('Hips');
 // Relaxed hand at the OUTSIDE of the pelvis, above the seat base.
 const target={x:hip.x+9,y:hip.y+12}; // hand on seat armrest, not below seat
 let best=Infinity,choice=null;
 for(const x of [-1.35,-.8,-.3,.25,.8,1.35])
 for(const z of [-1.4,-.7,0,.7,1.4]){
  pose('LeftArm',x,0,z);
  for(const elbowX of [-1.5,-.8,0,.8,1.5])
  for(const elbowZ of [-.9,0,.9]){
   pose('LeftForeArm',elbowX,0,elbowZ);
   const wrist=jointScreen('LeftHand');
   const elbow=jointScreen('LeftForeArm');
   const err=(wrist.x-target.x)**2+(wrist.y-target.y)**2 + Math.max(0,hip.y-4-elbow.y)**2 * 3;
   if(err<best){best=err;choice={upper:{x,z},lower:{x:elbowX,z:elbowZ}};}
  }
 }
 if(choice){armPose.LeftArm=choice.upper;armPose.LeftForeArm=choice.lower;}
 pose('LeftArm');pose('LeftForeArm');
}
// Find a natural right-arm rest against the seated right thigh by measuring
// wrist and thigh in the model, rather than guessing joint rotation signs.
function calibrateRightHandRest(){
 const upper='RightArm',lower='RightForeArm';
 if(!bones[upper]||!bones[lower]||!bones.RightHand||!bones.RightUpLeg||!bones.RightLeg)return;
 for(const [part,angle] of Object.entries(seatBends))pose(part,angle,0,0);
 const hip=jointScreen('RightUpLeg'),knee=jointScreen('RightLeg');
 const target={x:hip.x+(knee.x-hip.x)*.52,y:hip.y+(knee.y-hip.y)*.52+5};
 let best=Infinity,choice=null;
 for(const x of [-1.35,-.8,-.3,.25,.8,1.35]){
  for(const z of [-1.4,-.7,0,.7,1.4]){
   pose(upper,x,0,z);
   for(const elbowX of [-1.5,-.8,0,.8,1.5]){
    for(const elbowZ of [-.9,0,.9]){
     pose(lower,elbowX,0,elbowZ);
     const wrist=jointScreen('RightHand');
     const error=(wrist.x-target.x)**2+(wrist.y-target.y)**2;
     if(error<best){best=error;choice={upper:{x,z},lower:{x:elbowX,z:elbowZ}};}
    }
   }
  }
 }
 if(choice){armPose.RightArm=choice.upper;armPose.RightForeArm=choice.lower;}
 for(const part of [upper,lower,...Object.keys(seatBends)])pose(part,0,0,0);
}
function applySittingPose(){
 for(const part of parts)if(bones[part])bones[part].quaternion.copy(base[part]);
 for(const [part,angle] of Object.entries(seatBends))pose(part,angle,0,0);
 pose('Spine',0,0,0);
 // Keep the left arm hanging behind the character in the seat view.
 // The full limb returns to ordinary ragdoll posing immediately on release.
 for(const [part,v] of Object.entries(armPose))pose(part,v.x,0,v.z);
 pose('LeftShoulder',0,-.85,-.35);
 pose('LeftArm',.15,-1.35,-.8);
 pose('LeftForeArm',-.22,0,0);
}

// Spinning grinder, permanently mounted to a braced steel support.
let grinderVisual=null,grinderDrum=null,grinderStains=[],previousShred=false;let goreParts=[],goreAsset=null,goreWasShredded=false;
window.grinderOverlayReady=false;
async function loadLevelMachinery(){
 try{
  const g=await new GLTFLoader().loadAsync('./trash_grinder.glb');
  grinderVisual=new THREE.Group();
  const original=g.scene;
  const box=new THREE.Box3().setFromObject(original);
  const span=box.getSize(new THREE.Vector3());
  original.scale.multiplyScalar(195/(Math.max(span.x,span.y,span.z)||1));
  original.rotation.y=-Math.PI/2;
  original.position.y=35;
  original.traverse(n=>{if(n.isMesh)n.frustumCulled=false;});
  // Do not render the imported static grinder on top of the powered drum.
  // Its geometry is replaced by the single rotating assembly below.
  const metal=new THREE.MeshStandardMaterial({color:0x626d76,metalness:.78,roughness:.42});
  const iron=new THREE.MeshStandardMaterial({color:0x252d33,metalness:.65,roughness:.48});
  const blood=new THREE.MeshStandardMaterial({color:0x790811,roughness:.8,metalness:0,side:THREE.DoubleSide});
  function beam(w,h,d,x,y,z,material){
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
   m.position.set(x,y,z);grinderVisual.add(m);return m;
  }
  // Frame ends at ground, steel uprights support both ends of the drum axle.
  beam(200,12,42,0,-99,0,metal);
  for(const x of [-72,72]){
   beam(12,106,20,x,-47,0,metal);
   beam(22,19,28,x,5,0,iron);
   const brace=beam(9,122,13,x*.60,-49,-12,metal);
   brace.rotation.z=(x<0?-.38:.38);
  }
  // Rotating roller axis runs across the machine, facing the side camera.
  grinderDrum=new THREE.Group();grinderDrum.position.set(0,10,27);
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(39,39,120,18),iron);
  drum.rotation.x=Math.PI/2;grinderDrum.add(drum);
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   const tooth=new THREE.Mesh(new THREE.BoxGeometry(10,9,121),metal);
   tooth.position.set(Math.cos(a)*40,Math.sin(a)*40,0);
   tooth.rotation.z=a;
   grinderDrum.add(tooth);
  }
  grinderDrum.userData.bloodMaterial=blood;
  grinderVisual.add(grinderDrum);
  scene.add(grinderVisual);
  window.grinderOverlayReady=true;
 }catch(e){console.warn('Grinder asset failed; fallback remains visible',e);}
}
function positionLevelMachinery(state,w,h){
 if(!grinderVisual)return;
 const hazard=state.hazards?.find(item=>item.id==='grinder');
 if(!hazard){grinderVisual.visible=false;return;}
 grinderVisual.visible=Math.abs(hazard.x-state.camera-w/2)<w*.85;
 grinderVisual.position.set(hazard.x-state.camera-w/2,h/2-h*.88+(state.cameraY||0)+104,0);
 // Always spin, including while the character is still in the launcher.
 if(grinderDrum)grinderDrum.rotation.z-=.085;
 if(state.shredded&&!previousShred&&grinderDrum){
  // Each stain is a separate irregular flat patch parented to the roller:
  // the blood rotates *with* the drum and persists until reset.
  const mat=grinderDrum.userData.bloodMaterial;
  for(let i=0;i<23;i++){
   const stain=new THREE.Mesh(new THREE.PlaneGeometry(5+Math.random()*15,3+Math.random()*9),mat);
   const a=Math.random()*Math.PI*2;
   stain.position.set(Math.cos(a)*41,Math.sin(a)*41,(Math.random()-.5)*110);
   stain.rotation.z=a;stain.rotation.z=Math.random()*Math.PI;
   grinderDrum.add(stain);grinderStains.push(stain);
  }
 }
 if(!state.shredded&&previousShred&&grinderDrum){
  for(const stain of grinderStains){grinderDrum.remove(stain);stain.geometry.dispose();}
  grinderStains=[];
 }
 previousShred=!!state.shredded;
}
// Separate geometry from the supplied skeletal-gore GLB, mapped to simulated
// detached limbs. Use original mesh geometry, not a stretched copy of the body.
async function loadGoreAsset(){
 try{
  const g=await new GLTFLoader().loadAsync('./skeleton_gore_model.glb');
  goreAsset=g.scene;
  goreAsset.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 }catch(e){console.warn('Gore asset could not load',e);}
}
function positionGore(state,w,h){
 if(!state.shredded||!state.rag){
  for(const p of goreParts)scene.remove(p);
  goreParts=[];goreWasShredded=false;return;
 }
 if(!goreWasShredded&&goreAsset){
  const meshes=[];goreAsset.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const ids=['head','lh','rh','lf','rf','le','re','lk','rk','chest'];
  for(let i=0;i<Math.min(meshes.length,ids.length);i++){
   const src=meshes[i];
   const part=new THREE.Mesh(src.geometry,src.material);
   const bounds=new THREE.Box3().setFromObject(src);
   const size=bounds.getSize(new THREE.Vector3());
   part.scale.setScalar(27/(Math.max(size.x,size.y,size.z)||1));
   part.userData.joint=ids[i];part.userData.resting=false;part.userData.lastX=null;part.userData.lastY=null;
   part.rotation.z=Math.random()*Math.PI*2;
   scene.add(part);goreParts.push(part);
  }
 }
 goreWasShredded=true;
 for(const p of goreParts){
  const n=state.rag[p.userData.joint];
  if(!n)continue;
  const ground=h*.88;
  // After the limb reaches the floor, freeze its orientation and floor height.
  const landed=n.y>=ground-24;
  if(landed&&!p.userData.resting){p.userData.resting=true;p.userData.restY=ground-13;p.userData.restAngle=p.rotation.z;}
  if(!p.userData.resting){p.userData.restAngle=p.rotation.z+=.018;}
  p.position.set(n.x-state.camera-w/2,h/2-(p.userData.resting?p.userData.restY:n.y)+(state.cameraY||0),55);
  if(p.userData.resting)p.rotation.z=p.userData.restAngle;
 }
}
function animate(){
 requestAnimationFrame(animate);
 if(!renderer||!camera)return;
 const state=window.launcherVisualState;if(!state)return;
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
 positionChair(state,w,h);
 positionLevelMachinery(state,w,h);
 positionGore(state,w,h);
 if(model&&window.characterOverlayReady){
  model.visible=true;
  const {rag,tip,phase,theta}=state;
  if(rag && !state.shredded){
   const tilt=direction(rag.hip,rag.chest)-Math.PI/2;
   model.position.x=rag.hip.x-state.camera-w/2;
   model.position.y=h/2-rag.hip.y+(state.cameraY||0)-21;
   // Rotate the facing side-view model around the CAMERA'S Z axis.
   // The old YXZ Euler ordering turned local Z into world X, causing propeller spin.
   model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),tilt)
     .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));
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
  } else if(state.shredded){
   model.visible=false;
  } else {
   applySittingPose();
   if(!seatCharacterOnChair()){
    // Fallback positioning when the GLB chair fails to load.
    model.position.x=tip.x-state.camera-w/2-7;
    model.position.y=h/2-tip.y+(state.cameraY||0)-34;
    model.rotation.order='YXZ';
    model.rotation.y=Math.PI/2;
    model.rotation.z=phase==='launching'?-theta*.25:0;
   }
  }
 }else if(model){model.visible=false;}
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
 const x=state.tip.x-state.camera,y=state.tip.y-(state.cameraY||0);
 basketCtx.save();basketCtx.translate(x,y);basketCtx.rotate(-state.theta);
 basketCtx.fillStyle='#344a59';basketCtx.strokeStyle='#172b38';basketCtx.lineWidth=4;
 // Front/lower basket wall hides the lower body, leaving upper torso visible.
 basketCtx.beginPath();basketCtx.moveTo(-30,9);basketCtx.lineTo(21,9);basketCtx.lineTo(12,30);basketCtx.lineTo(-30,30);basketCtx.closePath();
 basketCtx.fill();basketCtx.stroke();
 basketCtx.restore();
}
if(renderer){loadChair();load('cowboy');loadLevelMachinery();loadGoreAsset();animate();}
