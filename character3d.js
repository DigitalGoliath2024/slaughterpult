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
  seatReady=true;window.seatOverlayReady=true;window.seatLoading=false;
  status.textContent='3D chair loaded · '+(activeId==='cowboy'?'Cowboy':activeId==='human'?'Philip':'Crash Character');
 }catch(e){
  console.warn('3D chair unavailable, original basket retained',e);
  status.textContent='Chair could not load: '+(e?.message||'unknown error');
  window.seatOverlayReady=false;window.seatLoading=false;
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

const parts=['LeftShoulder','RightShoulder','LeftHand','RightHand','Hips','Spine','Spine1','Spine2','Head','Neck','LeftArm','LeftForeArm','RightArm','RightForeArm','LeftUpLeg','LeftLeg','RightUpLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'];
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
 const mine=++ticket;window.characterOverlayReady=false;window.characterLoading=true;
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
  document.getElementById('characterSelect').value=id;
  window.characterOverlayReady=true;window.characterLoading=false;
  status.textContent=({cowboy:'Cowboy',human:'Philip',meshy:'Crash Character'}[id]||id)+' ready';
 } catch(e){
  console.warn('3D model not loaded; retaining 2D ragdoll',e);
  status.textContent='Could not load '+id+' · '+(e?.message||'model error');
  window.characterOverlayReady=false;window.characterLoading=false;
 }
}
document.getElementById('characterSelect').addEventListener('change',e=>load(e.target.value));
const direction=(a,b)=>Math.atan2(-(b.y-a.y),b.x-a.x);
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
function rotate(part,angle){
 if(!bones[part])return;
 // The avatar is turned 90 degrees around Y for the side view. Its local X
 // is the actual forward/back flex axis; Z twists into/out of the screen.
 bones[part].quaternion.copy(base[part]).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle));
}
// Aim the actual imported bone in the camera plane. Bind axes differ by model.
function aimRagdollBone(part,child,from,to){
 const b=bones[part],end=bones[child];if(!b||!end||!from||!to)return;
 model.updateMatrixWorld(true);
 const a=b.getWorldPosition(new THREE.Vector3()),q=end.getWorldPosition(new THREE.Vector3());
 const dx=q.x-a.x,dy=q.y-a.y,tx=to.x-from.x,ty=from.y-to.y;
 if(Math.hypot(dx,dy)<1e-5||Math.hypot(tx,ty)<1e-5)return;
 const turn=norm(Math.atan2(ty,tx)-Math.atan2(dy,dx));
 const world=b.getWorldQuaternion(new THREE.Quaternion());
 world.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),turn));
 const parent=b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
 b.quaternion.copy(parent.multiply(world));
}
function poseRagdoll(rag){
 for(const [part,b] of Object.entries(bones))b.quaternion.copy(base[part]);
 const segments=[['Hips','Spine','hip','waist'],['Spine','Spine1','waist','chest'],['Spine1','Spine2','chest','neck'],['Spine2','Neck','chest','neck'],['Neck','Head','neck','head'],
 ['LeftShoulder','LeftArm','chest','ls'],['RightShoulder','RightArm','chest','rs'],['LeftArm','LeftForeArm','ls','le'],['RightArm','RightForeArm','rs','re'],['LeftForeArm','LeftHand','le','lh'],['RightForeArm','RightHand','re','rh'],
 ['LeftUpLeg','LeftLeg','hip','lk'],['RightUpLeg','RightLeg','hip','rk'],['LeftLeg','LeftFoot','lk','lf'],['RightLeg','RightFoot','rk','rf']];
 for(const [part,child,a,b] of segments)aimRagdollBone(part,child,rag[a],rag[b]);
 for(const [side,joint,knee] of [['Left','lf','lk'],['Right','rf','rk']]){
  const foot=rag[joint],floor=window.launcherSupportYAt?.(foot.x);
  if(Number.isFinite(floor)&&foot.y>=floor-9){
   const facing=Math.sign(foot.x-rag[knee].x)||1;
   aimRagdollBone(side+'Foot',side+'ToeBase',foot,{x:foot.x+facing*18,y:foot.y});
  }
 }
 model.updateMatrixWorld(true);
 // Pin the visible pelvis to the physical pelvis, including the rotated bind offset.
 const pelvis=bones.Hips?.getWorldPosition(new THREE.Vector3());
 if(pelvis){model.position.x+=model.userData.ragHipX-pelvis.x;model.position.y+=model.userData.ragHipY-pelvis.y;}
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

let jetpackModel=null;
window.jetpackOverlayReady=false;
function buildJetpackTemplate(source){
 source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),root=new THREE.Group();
 source.traverse(o=>{if(!o.isMesh)return;const geometry=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geometry.applyMatrix4(o.matrixWorld);const pos=geometry.attributes.position,colors=[];
  for(let i=0;i<pos.count;i+=3){let x=0,y=0;for(let k=0;k<3;k++){x+=(pos.getX(i+k)-center.x)/3;y+=(pos.getY(i+k)-bounds.min.y)/3;}const height=y/size.y;
   const outer=Math.abs(x)>size.x*.24,color=new THREE.Color(height<.1?0x27323b:height>.85?0xcfb785:outer?(x<0?0xc74435:0xe99c32):0x236d78);
   for(let k=0;k<3;k++)colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.translate(-center.x,-center.y,-center.z);geometry.scale(1/size.y,1/size.y,1/size.y);
  root.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,metalness:.65,roughness:.42,side:THREE.DoubleSide})));
 });
 const flames=[];for(const side of [-1,1]){
  for(const y of [-.2,.27]){const band=new THREE.Mesh(new THREE.TorusGeometry(.095,.012,6,20),new THREE.MeshStandardMaterial({color:0xd6ad55,metalness:.8,roughness:.3}));band.rotation.x=Math.PI/2;band.position.set(side*.27,y,0);root.add(band);}
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.07,.48,8),new THREE.MeshBasicMaterial({color:0xff8b27,transparent:true,opacity:.9}));flame.rotation.z=Math.PI;flame.position.set(side*.27,-.72,0);root.add(flame);flames.push(flame);
  const core=new THREE.Mesh(new THREE.ConeGeometry(.035,.3,8),new THREE.MeshBasicMaterial({color:0x79cfff,transparent:true,opacity:.95}));core.rotation.z=Math.PI;core.position.set(side*.27,-.63,.008);root.add(core);flames.push(core);
 }
 root.userData.flames=flames;return root;
}
async function loadJetpack(){try{const g=await new GLTFLoader().loadAsync('./jet_pack.glb');jetpackModel=buildJetpackTemplate(g.scene);jetpackModel.scale.setScalar(35);jetpackModel.visible=false;scene.add(jetpackModel);window.jetpackOverlayReady=true;}catch(e){console.warn('Supplied jet pack unavailable',e);}}
function positionJetpack(state,w,h){
 if(!jetpackModel)return;jetpackModel.visible=!!state.jetpackMounted;if(!jetpackModel.visible)return;
 let center,up;
 if(state.rag){const hip=state.rag.waist||state.rag.hip,chest=state.rag.chest;center=new THREE.Vector3((hip.x+chest.x)/2-state.camera-w/2,h/2-(hip.y+chest.y)/2+(state.cameraY||0),-5);up=new THREE.Vector3(chest.x-hip.x,hip.y-chest.y,0).normalize();
  if(state.shredded){const torso=goreParts.find(p=>p.userData.joint==='chest');if(torso){center.set(torso.userData.worldX-state.camera-w/2,h/2-torso.userData.worldY+(state.cameraY||0),-5);}}
 }else if(model&&bones.Hips&&bones.Neck){model.updateMatrixWorld(true);const a=bones.Hips.getWorldPosition(new THREE.Vector3()),b=bones.Neck.getWorldPosition(new THREE.Vector3());center=a.clone().add(b).multiplyScalar(.5);up=b.sub(a).normalize();}
 else{jetpackModel.visible=false;return;}
 jetpackModel.position.copy(center).add(new THREE.Vector3(-up.y,up.x,0).multiplyScalar(13));
 jetpackModel.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan2(up.y,up.x)-Math.PI/2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),1));
 for(const flame of jetpackModel.userData.flames){flame.visible=state.jetActive;flame.scale.y=.8+.2*Math.sin((state.levelClock||0)*55);}
}
// Spinning grinder, permanently mounted to a braced steel support.
let grinderDrum=null;let goreParts=[],goreAsset=null,goreWasShredded=false;
const machineryTemplates=new Map(),machineryInstances=new Map();
window.grinderOverlayReady=false;window.rollerOverlayReady=false;
function buildMachineTemplate(source,kind){
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const template=new THREE.Group();
 source.traverse(o=>{
  if(!o.isMesh)return;
  const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(1/size.x,1/size.x,1/size.x);
  const material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  const moving=kind==='twin'?/^pCylinder[12]_/.test(o.name):kind==='hopper'?/^Object_(10|13)$/.test(o.name):true;
  if(moving){
   geometry.computeBoundingBox();const pivotCenter=geometry.boundingBox.getCenter(new THREE.Vector3());
   geometry.translate(-pivotCenter.x,-pivotCenter.y,-pivotCenter.z);
   const rotor=new THREE.Group();rotor.position.copy(pivotCenter);rotor.add(mesh);
   rotor.userData.motorAxis=kind==='hopper'?'z':'x';rotor.userData.motorSign=/Object_13|pCylinder2_/.test(o.name)?1:-1;
   template.add(rotor);
  }else template.add(mesh);
 });
 // The hopper's uppermost point is a cutter, not the surface that holds blood.
 // Locate the seam using the supplied stationary purple panel and striped trim.
 if(kind==='hopper'){
  let trim=null,panel=null;
  source.traverse(o=>{if(!o.isMesh)return;const name=o.material?.name||'';
   if(name.includes('Stripes'))trim=new THREE.Box3().setFromObject(o);
   if(o.name==='Object_7')panel=new THREE.Box3().setFromObject(o);
  });
  if(trim&&panel)template.userData.bloodHeightRatio=((trim.max.y+panel.max.y)*.5-bounds.min.y)/size.x;
 }
 template.userData.kind=kind;template.userData.heightRatio=size.y/size.x;return template;
}
async function loadLevelMachinery(){
 const assets=[['spiked','trash_grinder.glb'],['twin','twist_the_knife.glb'],['hopper','toy__grinder_ugc_a_000_1x1.glb']];
 const results=await Promise.allSettled(assets.map(async([kind,file])=>{const gltf=await new GLTFLoader().loadAsync('./'+file);machineryTemplates.set(kind,buildMachineTemplate(gltf.scene,kind));}));
 for(const result of results)if(result.status==='rejected')console.warn('Uploaded machinery could not load',result.reason);
 window.grinderOverlayReady=machineryTemplates.has('hopper')&&machineryTemplates.has('spiked');
 window.rollerOverlayReady=machineryTemplates.has('twin')&&machineryTemplates.has('spiked');
}
// Surface stains are in the same 3D scene as the hopper, in front of its lip.
const lipBloodShape=new THREE.Shape();
for(let i=0;i<14;i++){const a=i*Math.PI*2/13,r=.78+.15*Math.sin(i*4.2);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)lipBloodShape.moveTo(x,y);else lipBloodShape.lineTo(x,y);}
const lipBloodGeometry=new THREE.ShapeGeometry(lipBloodShape);
const lipBloodMaterial=new THREE.MeshBasicMaterial({color:0x870b16,transparent:true,opacity:.9,depthWrite:false});
function positionMachineLipBlood(root,template,hazard,state,width,centerY){
 if(!root.userData.lipBlood){root.userData.lipBlood=new Map();root.userData.lipFront=new THREE.Box3().setFromObject(template).max.z+.006;}
 const marks=root.userData.lipBlood;
 if(root.userData.bloodReset!==state.goreResetId){for(const mesh of marks.values())root.remove(mesh);marks.clear();root.userData.bloodReset=state.goreResetId;}
 const active=new Set(),scale=root.scale.x;
 for(const stain of state.machineLipBlood||[]){
  if(stain.machineId!==hazard.id)continue;active.add(stain.id);let mesh=marks.get(stain.id);
  if(!mesh){mesh=new THREE.Mesh(lipBloodGeometry,lipBloodMaterial);root.add(mesh);marks.set(stain.id,mesh);}
  const x=Math.max(-width*.44,Math.min(width*.44,stain.x-hazard.x));
  const bloodY=state.machineLipBlood&&Number.isFinite(stain.y)?stain.y:centerY;
  mesh.position.set(x/scale,(centerY-bloodY)/scale,root.userData.lipFront);
  mesh.scale.set(stain.size*1.65/scale,Math.max(1,stain.size*.32)/scale,1);mesh.visible=true;
 }
 for(const [id,mesh] of marks)if(!active.has(id)){root.remove(mesh);marks.delete(id);}
}
function positionLevelMachinery(state,w,h){
 const active=new Set();window.machineBloodSurfaces={};window.apparatusVents=[];
 for(const hazard of state.hazards||[]){
  if(!['grinder','roller'].includes(hazard.kind))continue;
  const kind=hazard.kind==='grinder'?'hopper':/(?:roller[135]|roller2)$/.test(hazard.id)?'twin':'spiked';
  const template=machineryTemplates.get(kind);if(!template)continue;
  const key=state.level+':'+hazard.id;
  if(Math.abs(hazard.x-state.camera-w/2)>w/2+hazard.width+250)continue;
  active.add(key);let root=machineryInstances.get(key);
  const width=hazard.kind==='grinder'?hazard.width*1.25:hazard.width;
  const floor=h*.88+(hazard.groundOffset||0);
  if(!root){
   root=template.clone(true);
   if(kind==='twin')root.rotation.y=Math.PI/3;
   const facingBounds=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
   root.userData.facingWidth=facingBounds.x;root.scale.setScalar(width/facingBounds.x);
   const support=new THREE.Group();
   root.userData.support=support;scene.add(support);scene.add(root);machineryInstances.set(key,root);
  }
  root.visible=Math.abs(hazard.x-state.camera-w/2)<w/2+width;
  const height=template.userData.heightRatio*width/root.userData.facingWidth;
  const centerY=kind==='spiked'?floor-106:floor-height/2;
  root.position.set(hazard.x-state.camera-w/2,h/2-centerY+(state.cameraY||0),35);
  window.machineBloodSurfaces[hazard.id]={top:centerY-height/2,bloodTop:kind==='hopper'&&template.userData.bloodHeightRatio?floor-template.userData.bloodHeightRatio*width/root.userData.facingWidth:undefined,centerY,height,width,kind,feedBelt:hazard.feedBelt};
  if(kind==='hopper')positionMachineLipBlood(root,template,hazard,state,width,centerY);
  if(!root.userData.cutters&&window.weaponOverlayReady){
   const cutter=['axe','machete','knife'][Math.floor(hazard.x/100)%3];
   for(const motor of root.children.filter(p=>p.userData.motorAxis)){
    const box=new THREE.Box3().setFromObject(motor.children[0]),radius=Math.min(.14,template.userData.heightRatio*.32);
    for(let row=-1;row<=1;row++)for(let i=0;i<6;i++){
     const a=i*Math.PI/3;
     const blade=mountedWeapon(motor,cutter,.065,row*.12,Math.cos(a)*radius,0,Math.sin(a)*radius);
     if(blade){if(motor.userData.motorAxis==='x')blade.rotation.set(a,Math.PI/2,0);else {blade.position.set(Math.cos(a)*.065,Math.sin(a)*.065,row*.035);blade.rotation.z=a-Math.PI/2;}}
    }
   }
   root.userData.cutters=true;
  }
  const clock=state.machineryClock||0;
  for(const part of root.children)if(part.userData.motorAxis)part.rotation[part.userData.motorAxis]=clock*2.6*part.userData.motorSign;
  const support=root.userData.support;support.visible=root.visible;
  if(kind==='spiked'&&!support.children.length&&apparatusTemplates.length){
   for(const side of [-1,1]){const post=apparatusTemplates[(Math.abs(hazard.x)+ (side>0?1:0))%apparatusTemplates.length].clone(true);post.userData.side=side;post.rotation.y=side<0?Math.PI:0;post.scale.setScalar(106);support.add(post);}
  }
  for(const post of support.children){
   post.position.set(root.position.x+post.userData.side*width*.48,root.position.y,35);
   post.updateMatrixWorld(true);const mouth=post.localToWorld(new THREE.Vector3(post.userData.outlet.x,post.userData.outlet.y,post.userData.outlet.z));
   window.apparatusVents.push({id:key+':'+post.userData.side,x:mouth.x+state.camera+w/2,y:h/2-mouth.y+(state.cameraY||0),dir:post.userData.side,type:post.userData.side<0?'fire':'steam'});
  }
 }
 for(const [key,root] of machineryInstances)if(!active.has(key)){root.visible=false;root.userData.support.visible=false;}
}
const trampolineTemplates=[],trampolineInstances=new Map();
window.trampolineOverlayReady=false;
async function loadTrampolines(){
 try{
  const gltf=await new GLTFLoader().loadAsync('./trampoline.glb');
  gltf.scene.updateMatrixWorld(true);
  // The supplied file contains three individual trampolines, not one object.
  for(const name of ['Cube.000','Cube.002','Cylinder.002']){
   let source;
   const normalized=name.replace(/[^a-z0-9]/gi,'').toLowerCase();
   gltf.scene.traverse(node=>{if(node.name.replace(/[^a-z0-9]/gi,'').toLowerCase()===normalized)source=node;});
   if(!source)continue;
   const template=new THREE.Group(),matBounds=new THREE.Box3();
   source.traverse(o=>{
    if(!o.isMesh)return;
    const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);
    geometry.rotateX(.14);geometry.computeBoundingBox();
    const mesh=new THREE.Mesh(geometry,o.material.clone());mesh.frustumCulled=false;
    mesh.userData.jumpingMat=o.name.endsWith('_0');
    if(mesh.userData.jumpingMat)matBounds.union(geometry.boundingBox);
    template.add(mesh);
   });
   if(matBounds.isEmpty())continue;
   const center=matBounds.getCenter(new THREE.Vector3()),span=matBounds.getSize(new THREE.Vector3());
   // Mat's upper projected edge is exactly local Y=0. Its X span defines
   // the same width used by the collision logic, so visuals cannot miss it.
   for(const mesh of template.children){
    mesh.geometry.translate(-center.x,-matBounds.max.y,-center.z);
    mesh.geometry.scale(1/span.x,1/span.x,1/span.x);
   }
   trampolineTemplates.push(template);
  }
  if(trampolineTemplates.length!==3)throw Error('Expected three supplied trampoline variants; found '+trampolineTemplates.length);
  window.trampolineOverlayReady=true;
 }catch(e){console.warn('Trampoline asset failed; physical fallback pads remain',e);}
}
function positionTrampolines(state,w,h){
 if(!window.trampolineOverlayReady)return;
 const active=new Set();
 for(const pad of state.hazards||[]){
  if(pad.kind!=='trampoline')continue;
  active.add(pad.id);let root=trampolineInstances.get(pad.id);
  if(!root){
   const variant=pad.stage===2?1:pad.stage===3?2:0;
   root=trampolineTemplates[variant%trampolineTemplates.length].clone(true);
   root.scale.setScalar(pad.width);root.rotation.z=Math.atan(pad.slope);
   const support=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x657079,metalness:.65,roughness:.65});
   for(const side of [-1,1]){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(3,4,1,6),steel);post.userData.side=side;support.add(post);
   }
   root.userData.support=support;scene.add(support);
   const bounds=new THREE.Box3().setFromObject(root);root.userData.legDepth=-bounds.min.y;
   scene.add(root);trampolineInstances.set(pad.id,root);
  }
  root.visible=state.level==='trampoline'&&Math.abs(pad.x-state.camera-w/2)<w/2+pad.width;
  root.position.set(pad.x-state.camera-w/2,h/2-(h*.88+pad.offset)+(state.cameraY||0),40);
  const ground=window.launcherGroundYAt?window.launcherGroundYAt(pad.x):h*.88;
  const groundScreen=h/2-ground+(state.cameraY||0),support=root.userData.support;
  support.visible=root.visible;
  for(const post of support.children){
   const shift=post.userData.side*pad.width*.42;
   const footY=root.position.y+shift*pad.slope-root.userData.legDepth;
   const length=Math.max(0,footY-groundScreen);
   post.visible=length>1;post.scale.y=length;
   post.position.set(root.position.x+shift,(footY+groundScreen)/2,25);
  }
  const age=(state.levelClock||0)-(pad.flexAt??-100),sag=age>=0&&age<.35?Math.sin(age/.35*Math.PI)*Math.min(12,pad.width*.03)/pad.width:0;
  for(const mesh of root.children)if(mesh.userData.jumpingMat)mesh.position.y=-sag;
 }
 for(const [id,root] of trampolineInstances)if(!active.has(id)){root.visible=false;root.userData.support.visible=false;}
}
const cushionTemplates=[],cushionInstances=new Map();let cushionResetSeen=-1;
window.cushionOverlayReady=false;
async function loadCushions(){
 const files=['dirty_cushion.glb','cushion.glb','cushion_olddirty.glb','cushion-1.glb'];
 const results=await Promise.allSettled(files.map(async (file,index)=>{
  const gltf=await new GLTFLoader().loadAsync('./'+file);
  const flat=new THREE.Group();flat.add(gltf.scene);
  let bounds=new THREE.Box3().setFromObject(flat),size=bounds.getSize(new THREE.Vector3());
  const thin=[size.x,size.y,size.z].indexOf(Math.min(size.x,size.y,size.z));
  if(thin===2)flat.rotation.x=-Math.PI/2;else if(thin===0)flat.rotation.z=Math.PI/2;
  bounds.setFromObject(flat);size=bounds.getSize(new THREE.Vector3());
  if(size.z>size.x)flat.rotateOnWorldAxis(new THREE.Vector3(0,1,0),Math.PI/2);
  bounds.setFromObject(flat);size=bounds.getSize(new THREE.Vector3());
  flat.position.sub(bounds.getCenter(new THREE.Vector3()));
  const normalized=new THREE.Group();normalized.add(flat);normalized.scale.setScalar(1/(size.x||1));
  const template=new THREE.Group();template.add(normalized);template.userData.aspectHeight=size.y/(size.x||1);
  template.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});cushionTemplates[index]=template;
 }));
 for(const result of results)if(result.status==='rejected')console.warn('Cushion asset failed',result.reason);
 window.cushionOverlayReady=cushionTemplates.some(Boolean);
}
function positionCushions(state,w,h){
 if(!window.cushionOverlayReady)return;
 const active=new Set();
 if(cushionResetSeen!==state.goreResetId){
  for(const root of cushionInstances.values())root.traverse(mesh=>{if(mesh.isMesh)for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(mat.userData.pillowPaint){mat.map.dispose();mat.map=mat.userData.pillowOriginalMap;mat.color.copy(mat.userData.pillowOriginalColor);delete mat.userData.pillowPaint;mat.needsUpdate=true;}}});
  cushionResetSeen=state.goreResetId;
 }
 for(const pillow of state.cushions||[]){
  active.add(pillow.id);
  if(Math.abs(pillow.x-state.camera-w/2)>w/2+160){const old=cushionInstances.get(pillow.id);if(old)old.visible=false;continue;}
  let root=cushionInstances.get(pillow.id);
  if(!root){
   const template=cushionTemplates[pillow.variant]||cushionTemplates.find(Boolean);
   root=template.clone(true);root.scale.set(pillow.width,pillow.height/template.userData.aspectHeight,pillow.width);
   root.rotation.set(0,pillow.yaw,pillow.roll);
   root.traverse(mesh=>{if(mesh.isMesh){const materials=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(original=>{const mat=original.clone();mat.userData.pillowOriginalMap=original.map;mat.userData.pillowOriginalColor=original.color.clone();return mat;});mesh.material=Array.isArray(mesh.material)?materials:materials[0];}});
   const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
   root.userData.baseYScale=root.scale.y;root.userData.halfHeight=size.y/2;
   pillow.contactHeight=size.y;pillow.contactWidth=size.x;
   scene.add(root);cushionInstances.set(pillow.id,root);
  }
  root.visible=Math.abs(pillow.x-state.camera-w/2)<w/2+100;
  const squash=window.launcherCushionSquash?window.launcherCushionSquash(pillow):1;
  root.scale.y=root.userData.baseYScale*squash;root.rotation.z=pillow.roll+Math.max(-.035,Math.min(.035,(pillow.slideV||0)*.003));
  const ground=window.launcherGroundYAt?window.launcherGroundYAt(pillow.x):h*.88;
  root.position.set(pillow.x+(pillow.dx||0)-state.camera-w/2,h/2-ground-pillow.depth+(pillow.stack||0)+(state.cameraY||0)+root.userData.halfHeight*squash,pillow.depth?90:36);
 }
 for(const [id,root] of cushionInstances)if(!active.has(id))root.visible=false;
 for(const impact of window.pillowBloodImpacts||[]){
  const root=cushionInstances.get(impact.id);if(!root)continue;
  root.updateMatrixWorld(true);
  const pillow=state.cushions.find(p=>p.id===impact.id);if(!pillow)continue;
  const ray=new THREE.Raycaster(new THREE.Vector3(impact.x-state.camera-w/2,root.position.y+100,root.position.z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(root,true).find(h=>h.uv);if(!hit)continue;
  const mat=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;
  paintPillowSkin(mat,hit.uv,impact.power);
 }
 window.pillowBloodImpacts=[];
}
function paintPillowSkin(material,uv,power){
 let paint=material.userData.pillowPaint;
 if(!paint){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
  const source=material.userData.pillowOriginalMap;
  if(source?.image)ctx.drawImage(source.image,0,0,512,512);else{ctx.fillStyle='#'+material.color.getHexString();ctx.fillRect(0,0,512,512);}
  const texture=new THREE.CanvasTexture(canvas);texture.flipY=source?.flipY??false;texture.colorSpace=THREE.SRGBColorSpace;
  material.map=texture;material.color.set(0xffffff);material.needsUpdate=true;
  paint={canvas,ctx};material.userData.pillowPaint=paint;
 }
 const x=uv.x*512,y=uv.y*512,r=5+power*8,ctx=paint.ctx;
 ctx.fillStyle='rgba(101,5,14,.87)';ctx.beginPath();
 for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=r*(.6+Math.random()*.5);const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.65;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.fill();
 for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(x+(Math.random()-.5)*r*4,y+(Math.random()-.5)*r*3,1+Math.random()*2,0,Math.PI*2);ctx.fill();}
 material.map.needsUpdate=true;
}
const backdropMachines=[],apparatusTemplates=[];
async function loadBackdropMachines(){
 try{
  const gltf=await new GLTFLoader().loadAsync('./free_pack_-_steampunk_machinery._low_poly.glb');gltf.scene.updateMatrixWorld(true);
  for(const name of ['stationbullet001','stationdrug001','stationhealth001']){
   let source;gltf.scene.traverse(o=>{if(o.name.replace(/[^a-z0-9]/gi,'').toLowerCase()===name)source=o;});if(!source)continue;
   const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),points=[];
   source.traverse(o=>{if(o.isMesh){const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld));}});
   const top=points.filter(v=>v.y>bounds.max.y-size.y*.15),left=Math.min(...top.map(v=>v.x));
   const rim=top.filter(v=>v.x<left+size.x*.045),port=rim.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/rim.length);
   const scale=1/(port.y-bounds.min.y),root=new THREE.Group();
   source.traverse(o=>{if(o.isMesh){const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.translate(-port.x,-port.y,-port.z);geometry.scale(scale,scale,scale);root.add(new THREE.Mesh(geometry,o.material));}});
   const lower=points.filter(v=>v.y<bounds.min.y+size.y*.35),outX=Math.min(...lower.map(v=>v.x)),outlet=lower.filter(v=>v.x<outX+size.x*.04).reduce((v,p)=>v.add(p),new THREE.Vector3());
   outlet.multiplyScalar(1/lower.filter(v=>v.x<outX+size.x*.04).length).sub(port).multiplyScalar(scale);
   root.userData.outlet=outlet;apparatusTemplates.push(root);
  }
 }catch(e){console.warn('Steampunk backdrop pack unavailable',e);}
}
function positionBackdropMachines(state,w,h){
 for(const root of backdropMachines){
  const x=root.userData.worldX,ground=window.launcherGroundYAt?window.launcherGroundYAt(x):h*.88;
  root.visible=['factory','trampoline'].includes(state.level)&&Math.abs(x-state.camera-w/2)<w/2+200;
  root.position.set(x-state.camera-w/2,h/2-ground+(state.cameraY||0),-70);
 }
}
let sceneryBed=null;
async function loadSceneryBed(){
 try{
  const gltf=await new GLTFLoader().loadAsync('./horror_bed.glb');
  const source=gltf.scene,remove=[];source.traverse(o=>{if(/^Floor(?:_|$)/i.test(o.name))remove.push(o);});for(const node of remove)node.parent?.remove(node);
  const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  source.position.set(-center.x,-bounds.min.y,-center.z);
  const normalized=new THREE.Group();normalized.add(source);normalized.scale.setScalar(185/(size.x||1));
  sceneryBed=new THREE.Group();sceneryBed.add(normalized);sceneryBed.rotation.y=-.12;scene.add(sceneryBed);
 }catch(e){console.warn('Horror bed scenery unavailable',e);}
}
function positionSceneryBed(state,w,h){
 if(!sceneryBed)return;
 const x=state.level==='trampoline'?1390:1100,ground=window.launcherGroundYAt?window.launcherGroundYAt(x):h*.88;
 sceneryBed.visible=['factory','trampoline'].includes(state.level)&&Math.abs(x-state.camera-w/2)<w/2+200;
 sceneryBed.position.set(x-state.camera-w/2,h/2-ground+(state.cameraY||0),-55);
}
const wallDolls=[];
let dollLastTime=0;
async function loadWallDolls(){
 try{
  const gltf=await new GLTFLoader().loadAsync('./hanging_voodoo_doll.glb');
  const source=gltf.scene;
  const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3());
  const center=bounds.getCenter(new THREE.Vector3());
  const scale=78/(size.y||1);
  for(const [i,x] of [620,1160,2120,3030,3970,5050,6100,7310,8270].entries()){
   const pivot=new THREE.Group(),doll=source.clone(true);
   doll.scale.multiplyScalar(scale);
   // Pivot at the supplied hanging attachment, rather than the body center.
   doll.position.set(-center.x*scale,-bounds.max.y*scale,-center.z*scale);
   doll.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
   pivot.add(doll);pivot.userData={worldX:x,anchor:.55+(i%3)*.055,angle:0,velocity:0,wind:0,gustTimer:0};
   scene.add(pivot);wallDolls.push(pivot);
  }
 }catch(e){console.warn('Wall doll asset unavailable',e);}
}
function positionWallDolls(state,w,h){
 const now=performance.now(),dt=dollLastTime?Math.min(.04,(now-dollLastTime)/1000):1/60;dollLastTime=now;
 for(const pivot of wallDolls){
  const u=pivot.userData;
  pivot.visible=['factory','trampoline'].includes(state.level)&&Math.abs(u.worldX-state.camera-w/2)<w/2+100;
  // Damped pendulum driven by irregular small gusts. No repeating sine loop.
  u.gustTimer-=dt;
  if(u.gustTimer<=0){u.wind=(Math.random()-.5)*.20;u.gustTimer=.55+Math.random()*1.9;}
  u.velocity+=(u.wind-u.angle*3.4-u.velocity*1.5)*dt;
  u.angle=THREE.MathUtils.clamp(u.angle+u.velocity*dt,-.10,.10);
  pivot.rotation.z=u.angle;
  pivot.position.set(u.worldX-state.camera-w/2,h/2-h*.88+h*u.anchor+(state.cameraY||0),-35);
 }
}
// Templates use the pack's original mesh/UVs, without the display-layout
// transforms. +Y points handle-to-tip; +X is the leading cutting edge.
const weaponTemplates={},weaponStations=new Map();
window.weaponOverlayReady=false;
async function loadWeapons(){
 try{
  const gltf=await new GLTFLoader().loadAsync('./retro__psx-like_horror_melee_weapons_pack.glb?v=pbr2');
  const names={knife:'kitchenKnife_Bloody_',axe:'axe_bloody_',machete:'machete_Bloody_',cleaver:'cleaver_Bloody_'};
  for(const [kind,prefix] of Object.entries(names)){
   let source;gltf.scene.traverse(o=>{if(o.isMesh&&o.name.startsWith(prefix))source=o;});
   if(!source)continue;
   const geometry=source.geometry.clone();
   geometry.rotateX(-Math.PI/2); // local Z is length; local Y is thickness
   if(kind==='cleaver')geometry.rotateZ(-Math.PI/2);
   if(kind==='axe'||kind==='cleaver'){
    // Rotate around length rather than reflect winding/normals.
    geometry.rotateY(Math.PI);
   }
   geometry.computeBoundingBox();
   const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3());
   geometry.translate(-center.x,-box.min.y,-center.z);
   const length=box.max.y-box.min.y;
   geometry.scale(1/length,1/length,1/length);
   const material=source.material.clone();material.side=THREE.DoubleSide;
   weaponTemplates[kind]=new THREE.Mesh(geometry,material);
  }
  window.weaponOverlayReady=!!weaponTemplates.knife;
 }catch(e){console.warn('Weapon pack unavailable; original hazard visuals remain',e);}
}
function mountedWeapon(parent,kind,length,x,y,angle,z=52){
 const template=weaponTemplates[kind]||weaponTemplates.knife;if(!template)return;
 const mesh=template.clone();mesh.scale.setScalar(length*(parent.userData.rotatingBlade?1.05:1));
 mesh.position.set(x,y,z);mesh.rotation.z=angle;mesh.frustumCulled=false;
 parent.add(mesh);return mesh;
}
function makeWeaponStation(hazard){
 const root=new THREE.Group(),rotors=[];
 if(hazard.kind==='roller'){
  for(const shift of [-41,41]){
   const rotor=new THREE.Group();rotor.position.set(shift,106,0);
   // Each roller's leading edge follows its own counter-rotation.
   const clockwise=shift<0;
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    const mount=new THREE.Group();mount.userData.rotatingBlade=true;mount.position.set(Math.cos(angle)*32,Math.sin(angle)*32,0);
    mount.rotation.z=angle-Math.PI/2;
    if(!clockwise)mount.rotation.y=Math.PI;
    mountedWeapon(mount,i%2?'axe':'machete',30,0,0,0);rotor.add(mount);
   }
   root.add(rotor);rotors.push({rotor,shift});
  }
 }else if(hazard.kind==='press'){
  for(let x=-42,i=0;x<=42;x+=21,i++)mountedWeapon(root,i%2?'cleaver':'knife',30,x,0,i%2?-Math.PI/2:Math.PI);
 }else if(hazard.kind==='ramp'){
  for(let x=-hazard.width/2+16,i=0;x<hazard.width/2;x+=28,i++){
   const y=hazard.y-(x+hazard.width/2)*hazard.slope;
   mountedWeapon(root,i%3?'knife':'axe',26,x,y,Math.atan(-hazard.slope));
  }
 }
 root.userData.rotors=rotors;scene.add(root);return root;
}
function positionWeapons(state,w,h){
 if(!window.weaponOverlayReady)return;
 const active=new Set();
 for(const hazard of state.hazards||[]){
  if(Math.abs(hazard.x-state.camera-w/2)>w/2+hazard.width+250)continue;
  if(!['press','ramp'].includes(hazard.kind))continue;
  active.add(hazard.id);
  let root=weaponStations.get(hazard.id);
  if(!root){root=makeWeaponStation(hazard);weaponStations.set(hazard.id,root);}
  root.visible=Math.abs(hazard.x-state.camera-w/2)<w/2+hazard.width;
  const floor=h/2-h*.88+(state.cameraY||0);
  root.position.set(hazard.x-state.camera-w/2,floor,0);
  if(hazard.kind==='press')root.position.y=h/2-(state.pressBottom+8)+(state.cameraY||0);
  for(const {rotor,shift} of root.userData.rotors)rotor.rotation.z=(state.machineryClock||0)*(shift<0?-2.6:2.6);
 }
 for(const [id,root] of weaponStations)if(!active.has(id))root.visible=false;
 // Main grinder weapons are parented directly to the powered drum.
 if(grinderDrum&&!grinderDrum.userData.weaponsMounted){
  grinderDrum.userData.rotatingBlade=true;
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   mountedWeapon(grinderDrum,i%3?'knife':'axe',25,Math.cos(a)*32,Math.sin(a)*32,a-Math.PI/2,64);
  }
  grinderDrum.userData.weaponsMounted=true;
 }
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
// Match named meshes from the supplied skeleton GLB to their actual anatomy.
const GORE_MAP={
 head:['skull','L_eye','R_eye','brain'],
 chest:['torso1up','brestmuscles','backmuscles','neckmuscles'],
 hip:['torso1low','buttocks'],
 le:['Leftarm','LarmBone'],lh:['LeftForearm','LforearmBone','lefthand'],
 re:['Rightarm','RarmBone'],rh:['RightForearm','RforearmBone','Righthand'],
 lk:['L_leg','L_legbone'],lf:['L_lowerleg','L_leglowerBone','L_foot'],
 rk:['Rleg','Rlegbone'],rf:['Rlowerleg','RlowerlegBone','R_foot']
};
// Extract a clothed region from the actual posed character's skin mesh.
// Faces are selected by their dominant skeletal influence, so pants and boots
// come from the loaded avatar rather than procedurally invented parts.
function buildClothedPart(joint){
 if(!model)return null;
 const choices={
  le:/leftarm|leftupperarm/i,lh:/leftforearm|lefthand/i,
  re:/rightarm|rightupperarm/i,rh:/rightforearm|righthand/i,
  lk:/leftupleg|leftthigh/i,lf:/leftleg|leftfoot|leftcalf/i,
  rk:/rightupleg|rightthigh/i,rf:/rightleg|rightfoot|rightcalf/i
 };
 const target=choices[joint];if(!target)return null;
 model.updateMatrixWorld(true);
 const group=new THREE.Group(),box=new THREE.Box3();
 const v=new THREE.Vector3();
 model.traverse(src=>{
  if(!src.isSkinnedMesh)return;
  const geo=src.geometry,idx=geo.index,pos=geo.getAttribute('position');
  const skinI=geo.getAttribute('skinIndex'),skinW=geo.getAttribute('skinWeight');
  if(!pos||!skinI||!skinW)return;
  const verts=[],uvs=[],uv=geo.getAttribute('uv'),norms=[];
  const faceCount=(idx?idx.count:pos.count)/3;
  for(let face=0;face<faceCount;face++){
   const ids=[0,1,2].map(k=>idx?idx.getX(face*3+k):face*3+k);
   const affinity=ids.map(id=>{
    let value=0;
    for(let j=0;j<4;j++){
     const bone=src.skeleton.bones[skinI.getComponent(id,j)];
     if(bone&&target.test(bone.name.replace(/^mixamorig[:_]?/i,'')))value+=skinW.getComponent(id,j);
    }
    return value;
   });
   if((affinity[0]+affinity[1]+affinity[2])/3<.42)continue;
   for(const id of ids){
    src.applyBoneTransform(id,v);
    v.applyMatrix4(src.matrixWorld);
    verts.push(v.x,v.y,v.z);
    if(uv)uvs.push(uv.getX(id),uv.getY(id));
   }
  }
  if(!verts.length)return;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  if(uvs.length)g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.computeVertexNormals();
  g.computeBoundingBox();box.union(g.boundingBox);
  const original=Array.isArray(src.material)?src.material[0]:src.material;
  const mat=original.clone();mat.side=THREE.DoubleSide;
  const mesh=new THREE.Mesh(g,mat);mesh.frustumCulled=false;group.add(mesh);
 });
 if(!group.children.length||box.isEmpty())return null;
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 if(Math.max(size.x,size.y,size.z)<.01)return null;
 for(const mesh of group.children)mesh.geometry.translate(-center.x,-center.y,-center.z);
 const scale=33/Math.max(size.x,size.y,size.z);
 group.scale.setScalar(scale);
 group.userData.joint=joint;group.userData.halfHeight=size.y*scale/2;
 group.userData.halfWidth=size.x*scale/2;
 group.userData.radius=Math.max(size.x,size.y,size.z)*scale*.5;
 group.userData.lieAngle=null;group.userData.resting=false;group.userData.bounces=0;
 group.userData.spin=(Math.random()<.5?-1:1)*(.014+Math.random()*.03);
 group.rotation.z=(Math.random()-.5)*.7;
 return group;
}
// Hide complete skin triangles by skeletal region without shrinking parent bones
// (shrinking a parent also collapses attached descendants and distorts the torso).
function maskSeveredSkin(regions){
 const key=[...regions].map(String).join('|');
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const geo=mesh.geometry;
  if(mesh.userData.severMask===key)return;
  if(!mesh.userData.originalFaces){
   const pos=geo.getAttribute('position');
   mesh.userData.originalFaces=geo.index?Array.from(geo.index.array):Array.from({length:pos.count},(_,i)=>i);
  }
  const weights=geo.getAttribute('skinWeight'),indices=geo.getAttribute('skinIndex');
  if(!weights||!indices)return;
  const faces=mesh.userData.originalFaces,keep=[];
  for(let f=0;f<faces.length;f+=3){
   let removed=0;
   for(let k=0;k<3;k++)for(let j=0;j<4;j++){
    const name=mesh.skeleton.bones[indices.getComponent(faces[f+k],j)]?.name||'';
    if([...regions].some(re=>re.test(name)))removed+=weights.getComponent(faces[f+k],j);
   }
   if(removed<1.05)keep.push(faces[f],faces[f+1],faces[f+2]);
  }
  geo.setIndex(keep);mesh.userData.severMask=key;
 });
}
function buildGorePart(joint){
 if(!goreAsset)return null;
 goreAsset.updateMatrixWorld(true);
 const entries=[];goreAsset.traverse(o=>{
  if(!o.isMesh)return;
  if(GORE_MAP[joint]?.some(name=>o.name.startsWith(name+'_')||o.name===name))entries.push(o);
 });
 if(!entries.length)return null;
 // The crawler must be the original forearm bone WITH its attached hand.
 // Never normalize a hand-only mesh to the size of an entire arm.
 if(joint==='rh'&&!entries.some(mesh=>mesh.name==='RforearmBone'||mesh.name.startsWith('RforearmBone_')))return null;
 const group=new THREE.Group(),bounds=new THREE.Box3();
 for(const src of entries){
  const geometry=src.geometry.clone();
  geometry.applyMatrix4(src.matrixWorld);
  geometry.computeBoundingBox();
  bounds.union(geometry.boundingBox);
  // Override gray imported materials explicitly. Preserve surface detail from
  // maps but do not allow a grayscale base-color texture to wash the gore gray.
  const name=src.name.toLowerCase();
  const isBone=/bone|skull|torso|foot|hand|rib|eye/.test(name)&&!/muscle/.test(name);
  const isMuscle=/muscle|brest|back|buttock|forearm|leftarm|rightarm|l_leg|rleg|lowerleg|brain/.test(name)&&!isBone;
  const mat=new THREE.MeshStandardMaterial({
   color:isBone?0xf2e9d8:isMuscle?0xbb2935:0x8e242b,
   roughness:.87,metalness:0,side:THREE.DoubleSide,
   vertexColors:false
  });
  // Thin translucent red surface patches give bone and meat fragments blood marks.
  // Use deterministic mesh attributes rather than random billboard squares.
  const pos=geometry.getAttribute('position');
  if(pos){
   const tintColors=[];
   for(let j=0;j<pos.count;j++){
    const x=pos.getX(j),y=pos.getY(j),z=pos.getZ(j);
    const stain=Math.sin(x*9.7+y*13.1+z*7.3)*Math.cos(x*15.7-z*11.9);
    const bloody=stain>.46;
    const base=new THREE.Color(isBone?0xf2e9d8:isMuscle?0xbb2935:0x8e242b);
    if(bloody)base.lerp(new THREE.Color(0x71050d),isBone?.88:.45);
    tintColors.push(base.r,base.g,base.b);
   }
   geometry.setAttribute('color',new THREE.Float32BufferAttribute(tintColors,3));
   mat.color.set(0xffffff);
   mat.vertexColors=true;
  }
  const mesh=new THREE.Mesh(geometry,mat);
  mesh.frustumCulled=false;group.add(mesh);
 }
 const center=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 for(const mesh of group.children)mesh.geometry.translate(-center.x,-center.y,-center.z);
 const scale=joint==='head'?29/(Math.max(size.x,size.y,size.z)||1):33/(Math.max(size.x,size.y,size.z)||1);
 // Two expressive eyeballs sit inside the skull sockets; pupils animate only
 // after the detached head has stopped rolling.
 if(joint==='head'){
  const white=new THREE.MeshStandardMaterial({color:0xfff4e1,roughness:.28});
  const iris=new THREE.MeshStandardMaterial({color:0x386d75,roughness:.34});
  const pupilMat=new THREE.MeshStandardMaterial({color:0x101018,roughness:.18});
  const eyeRadius=Math.max(size.x,size.y)*.115;
  const eyes=[];
  for(const side of [-1,1]){
   const eye=new THREE.Group();
   eye.position.set(side*size.x*.17,size.y*.09,size.z*.40);
   const ball=new THREE.Mesh(new THREE.SphereGeometry(eyeRadius,16,12),white);
   const colored=new THREE.Mesh(new THREE.SphereGeometry(eyeRadius*.50,12,10),iris);
   colored.position.z=eyeRadius*.77;
   const pupil=new THREE.Mesh(new THREE.SphereGeometry(eyeRadius*.29,12,10),pupilMat);
   pupil.position.z=eyeRadius*.99;
   eye.add(ball,colored,pupil);group.add(eye);
   eyes.push({ball,colored,pupil,radius:eyeRadius});
  }
  group.userData.eyes=eyes;
  group.userData.eyeTime=0;
 }
 if(joint==='rh'){
  // Animate the actual imported hand only; never add substitute fingers.
  group.userData.crawlClock=0;
  group.userData.crawlStartX=null;
  group.userData.crawlDirection=Math.random()<.5?-1:1;
 }
 group.scale.setScalar(scale);
 group.userData.joint=joint;
 group.userData.sourceMeshes=entries.map(mesh=>mesh.name);
 group.userData.halfHeight=size.y*scale/2;
 group.userData.halfWidth=size.x*scale/2;
 group.userData.radius=Math.max(size.x,size.y,size.z)*scale*.5;
 // Long limb geometry should lie along the floor, not stand vertically.
 group.userData.lieAngle=null; // capture actual orientation at first floor contact
 group.userData.resting=false;group.userData.bounces=0;
 group.userData.spin=(Math.random()<.5?-1:1)*(.014+Math.random()*.03);
 group.rotation.z=(Math.random()-.5)*.5;
 return group;
}
function clearGoreParts(){
 for(const p of goreParts){
  scene.remove(p);
  p.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
 }
 goreParts=[];goreWasShredded=false;window.bodyCameraParts=[];
}
// Detached gore is a separate ballistic simulation; physics nodes may be pinned
// to equipment or finish at rest above the floor and must not suspend visuals.
let goreLastTime=0;
function positionGore(state,w,h){
 const fullShred=!!state.shredded,headOnly=!!state.headDetached;
 const detached=new Set(state.injuries||[]);
 if((!fullShred&&!headOnly&&!detached.size)||!state.rag){window.bodyCameraParts=[];if(goreParts.length)clearGoreParts();goreLastTime=0;return;}
 const now=performance.now();
 const dt=goreLastTime?Math.min(.035,(now-goreLastTime)/1000):1/60;
 goreLastTime=now;
 const severedParts={'neck:head':'head','le:lh':'lh','re:rh':'rh','lk:lf':'lf','rk:rf':'rf','ls:le':'le','rs:re':'re','hip:lk':'lk','hip:rk':'rk','hip:waist':'chest'};
 const removed=new Set([...detached].map(x=>severedParts[x]).filter(Boolean));
 // A proximal tear releases the entire distal chain, including its real bones.
 for(const [parent,children] of [['chest',['head','le','lh','re','rh']],['le',['lh']],['re',['rh']],['lk',['lf']],['rk',['rf']]]){
  if(removed.has(parent))for(const child of children)removed.add(child);
 }
 const joints=fullShred?Object.keys(GORE_MAP):[...removed];
 for(const joint of joints){
  if(goreParts.some(p=>p.userData.joint===joint)||!goreAsset)continue;
  // Exposed anatomy replaces the removed skin region, never duplicates it.
  const part=buildGorePart(joint);if(!part)continue;
  const node=state.rag[joint]||state.rag.chest;
  // Nearby but varied scatter: inherit the ragdoll's impact momentum,
  // then add limited independent kicks, not long-range explosions.
  const outlet=fullShred?state.shredOutlet:null;
  part.userData.worldX=outlet?outlet.x+(Math.random()-.5)*12:node.x;
  part.userData.worldY=outlet?outlet.y+(Math.random()-.5)*12:node.y;
  part.userData.vx=outlet?120+Math.random()*180:THREE.MathUtils.clamp((node.vx||0)*.28,-90,90)+(Math.random()-.5)*155;
  part.userData.vy=outlet?-35-Math.random()*100:THREE.MathUtils.clamp((node.vy||0)*.23,-90,100)-45-Math.random()*105;
  part.userData.originX=node.x;
  // Stable floor depth for this fragment, rather than a fresh random offset
  // each frame. Collision, resting pose and crawl share the same surface.
  part.userData.floorDepth=state.level==='factory'?.12+Math.random()*.76:0;
  part.userData.resting=false;
  scene.add(part);goreParts.push(part);
 }
 for(const p of goreParts){
  const floor=window.launcherSupportYAt?window.launcherSupportYAt(p.userData.worldX):h*.88;
  const u=p.userData;
  if(u.joint==='rh'){
   // Keep the existing forearm/hand fragment; fingertips lead its creeping
   // direction and its lower surface rests against the floor.
   p.rotation.set(Math.PI/2,0,u.crawlDirection>0?Math.PI/2:-Math.PI/2);
  }
  // Contact uses the rendered mesh bounds, including its actual orientation.
  // An approximate limb radius left some rotated pieces hovering above ground.
  const bounds=new THREE.Box3().setFromObject(p);
  const contactExtent=Math.max(1,p.position.y-bounds.min.y);
  let groundY=floor-contactExtent+(u.joint==='rh'?2:0);
  const floorDepth=(u.floorDepth||0)*Math.max(0,h-floor-contactExtent-8);
  groundY+=floorDepth;
  u.floorY=floor+floorDepth;u.contactExtent=contactExtent;
  if(!u.resting){
   u.vy+=780*dt;
   u.vx*=Math.exp(-.34*dt);
   u.worldX+=u.vx*dt;
   // Keep debris within a plausible vicinity of the impact site.
   u.worldX=THREE.MathUtils.clamp(u.worldX,u.originX-165,u.originX+165);
   u.worldY+=u.vy*dt;
   if(u.joint!=='rh')p.rotation.z+=u.joint==='head'?(u.vx/Math.max(7,u.radius||15))*dt:u.spin*dt*60;
   if(u.joint!=='rh')p.rotation.x+=u.spin*dt*15;
   if(u.worldY>=groundY){
    if(!u.pillowImpact&&window.launcherCushionContact?.(u.worldX)){window.launcherCushionImpact?.(u.worldX,u.vy,Math.sign(u.vx));u.pillowImpact=true;}
    u.worldY=groundY;
    // Keep the orientation earned during the tumble, not a prescribed side pose.
    // Record the eventual resting angle after the final bounce, below.
    if(u.vy>60&&u.bounces<(u.joint==='head'?4:2)){
     u.vy=-u.vy*(u.joint==='head'?.34:.19);u.vx*=u.joint==='head'?.79:.58;u.bounces++;
    }else{
     u.vy=0;
     if(u.joint==='head'&&Math.abs(u.vx)>9){u.vx*=.88;u.worldY=groundY;}
     else{u.vx=0;u.resting=true;u.lieAngle=p.rotation.z;}
    }
   }
  }else{
   u.worldY=groundY;
   if(u.joint==='rh'&&u.crawlClock!==undefined){
    if(u.crawlStartX===null)u.crawlStartX=u.worldX;
    u.crawlClock+=dt;
    const t=u.crawlClock;
    // Let the arm/hand lie flat, then inch away in short, slow movements.
    // Original hand extends along its local down-axis. Turn fingertips
    // toward the travel direction (right = +X, left = -X).
    const targetAngle=u.crawlDirection>0?Math.PI/2:-Math.PI/2;
    p.rotation.z+=Math.atan2(Math.sin(targetAngle-p.rotation.z),Math.cos(targetAngle-p.rotation.z))*Math.min(1,dt*5);
    const stepping=t>.5&&Math.sin(t*2.5)>-.35;
    if(stepping)u.worldX+=u.crawlDirection*11*dt;

    p.rotation.x=Math.PI/2;
    u.worldY=groundY;
   }else{
    // Other pieces keep their own landing orientation.
    p.rotation.z=u.lieAngle===null?p.rotation.z:u.lieAngle;
    p.rotation.x*=Math.exp(-9*dt);
   }
  }
  if(u.joint==='head'&&u.eyes){
   u.eyeTime+=dt;
   // Natural eyes: irregular pauses, small tracking motions, occasional
   // rapid saccades. No fixed repeating gaze sequence.
   if(u.resting){
    if(u.nextLook===undefined)u.nextLook=0;
    if(u.eyeTime>=u.nextLook){
     const glance=Math.random();
     u.targetGazeX=(Math.random()*2-1)*(glance<.3?.25:.7);
     u.targetGazeY=(Math.random()*2-1)*(glance<.3?.19:.48);
     u.lookSpeed=glance<.43?22:glance<.8?6:2.2;
     u.nextLook=u.eyeTime+.35+Math.random()*2.1;
    }
    if(u.nextBlink===undefined)u.nextBlink=u.eyeTime+1+Math.random()*3;
    if(u.eyeTime>=u.nextBlink){
     u.blinkStart=u.eyeTime;
     u.doubleBlink=Math.random()<.18;
     u.nextBlink=u.eyeTime+2+Math.random()*4;
    }
   }
   const awake=u.resting?1:0;
   const ease=1-Math.exp(-(u.lookSpeed||7)*dt);
   u.gazeX=(u.gazeX||0)+((u.targetGazeX||0)*awake-(u.gazeX||0))*ease;
   u.gazeY=(u.gazeY||0)+((u.targetGazeY||0)*awake-(u.gazeY||0))*ease;
   const sinceBlink=u.eyeTime-(u.blinkStart??-100);
   const blink=awake&&(sinceBlink<.15||(u.doubleBlink&&sinceBlink>.25&&sinceBlink<.37));
   for(const eye of u.eyes){
    const x=u.gazeX*eye.radius,y=u.gazeY*eye.radius;
    eye.colored.position.set(x,y,eye.radius*.77);
    eye.pupil.position.set(x*1.15,y*1.15,eye.radius*.99);
    const openness=blink?.08:1;
    eye.ball.scale.y+=(openness-eye.ball.scale.y)*Math.min(1,dt*37);
    eye.colored.scale.y=eye.ball.scale.y;
    eye.pupil.scale.y=eye.ball.scale.y;
   }
  }

  p.position.set(u.worldX-state.camera-w/2,h/2-u.worldY+(state.cameraY||0),65);
 }
 window.bodyCameraParts=goreParts.map(p=>({joint:p.userData.joint,x:p.userData.worldX,y:p.userData.worldY,floorY:p.userData.floorY,extent:p.userData.contactExtent,radius:p.userData.radius}));
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
 positionWeapons(state,w,h);
 positionWallDolls(state,w,h);
 positionSceneryBed(state,w,h);
 positionBackdropMachines(state,w,h);
 positionCushions(state,w,h);
 positionTrampolines(state,w,h);
 positionGore(state,w,h);
 if(model&&window.characterOverlayReady&&!window.seatLoading){
  model.visible=true;
  const {rag,tip,phase,theta}=state;
  if(rag && !state.shredded){
   // Root follows pelvis-to-waist, while the spine flexes independently
   // with waist-to-chest. This is what allows head toward knees.
   const tilt=direction(rag.hip,rag.waist||rag.chest)-Math.PI/2;
   model.position.x=rag.hip.x-state.camera-w/2;
   model.position.y=h/2-rag.hip.y+(state.cameraY||0)-21;
   // Rotate the facing side-view model around the CAMERA'S Z axis.
   // The old YXZ Euler ordering turned local Z into world X, causing propeller spin.
   model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),tilt)
     .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));
   model.userData.ragHipX=rag.hip.x-state.camera-w/2;
   model.userData.ragHipY=h/2-rag.hip.y+(state.cameraY||0);
   poseRagdoll(rag);
   const a=(p,q)=>direction(rag[p],rag[q]);
   // Remove visibly severed distal pieces from the intact skinned avatar.
   // Spawn the corresponding fragment in positionGore instead of leaving
   // an intact arm or leg mysteriously connected to its detached counterpart.
   const injuries=new Set(state.injuries||[]);
   const hidden=new Set();
   const regions={
    'neck:head':/head/i,'le:lh':/leftforearm|lefthand/i,'re:rh':/rightforearm|righthand/i,
    'ls:le':/leftarm|leftforearm|lefthand/i,'rs:re':/rightarm|rightforearm|righthand/i,
    'hip:lk':/leftupleg|leftleg|leftfoot|lefttoe/i,'hip:rk':/rightupleg|rightleg|rightfoot|righttoe/i,
    'lk:lf':/leftleg|leftfoot|lefttoe/i,'rk:rf':/rightleg|rightfoot|righttoe/i,
    'hip:waist':/spine|neck|head|shoulder|arm|hand/i
   };
   for(const edge of injuries)if(regions[edge])hidden.add(regions[edge]);
   maskSeveredSkin(hidden);
   if(!state.headDetached&&bones.Head)bones.Head.quaternion.copy(base.Head);
   // The physics floor is solid; keep the *visible skinned mesh* above it too.
   // Previously its fixed pelvis offset could sink the actual torso through ground.
   if(state.groundTime>0){
    model.updateMatrixWorld(true);
    const visibleBounds=new THREE.Box3().setFromObject(model,true);
    const floorScreen=h/2-(state.groundY??h*.88)+(state.cameraY||0);
    if(visibleBounds.min.y<floorScreen){
     model.position.y+=floorScreen-visibleBounds.min.y;
    }
   }
  } else if(state.shredded){
   if(bones.Head)bones.Head.scale.setScalar(1);
   model.visible=false;
  } else {
   if(bones.Head)bones.Head.scale.setScalar(1);
   maskSeveredSkin(new Set());
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
 positionJetpack(state,w,h);
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
if(renderer){loadChair();load('cowboy');loadLevelMachinery();loadJetpack();loadWeapons();loadWallDolls();loadSceneryBed();loadBackdropMachines();loadCushions();loadTrampolines();loadGoreAsset();animate();}
