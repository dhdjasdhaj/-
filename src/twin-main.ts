import './style.css';
import {DrivingWorld} from './city-world.ts';
import {Warehouse,SHENZHEN_WAREHOUSE} from './warehouse/warehouse.ts';
import {GreenRouteFleet} from './drone/greenroute-drone.ts';
import {createTwinShell,type TwinViewMode} from './ui/twin-shell.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const ui=document.querySelector<HTMLDivElement>('#ui')!;

let world:DrivingWorld|undefined;
let warehouse:Warehouse|undefined;
let fleet:GreenRouteFleet|undefined;
let telemetryTick=0;
let resourceStep=0;

function reportResource(stage:string){resourceStep++;shell.setLoadingProgress(stage,Math.min(88,5+resourceStep*4));shell.setSystemState('初始化',false,stage);}

const warehouseLandmark=()=>({
 id:SHENZHEN_WAREHOUSE.id,name:SHENZHEN_WAREHOUSE.name,area:'深圳 · 南山',x:SHENZHEN_WAREHOUSE.x,z:SHENZHEN_WAREHOUSE.z,height:8,excludeRadius:0,
 arrival:[SHENZHEN_WAREHOUSE.x,SHENZHEN_WAREHOUSE.z] as [number,number],yaw:SHENZHEN_WAREHOUSE.heading,photoDistance:155,photoElevation:.38,photoAngle:.72,photoTargetHeight:(warehouse?.y??0)+3.2,
});

const droneLandmark=(index:number)=>{
 const focus=fleet!.focus(index);return {
  id:`greenroute-drone-${index+1}`,name:`GreenRoute G1 · ${String(index+1).padStart(2,'0')}`,area:`GR-UAV-${String(index+1).padStart(2,'0')} · 南山起降坪`,x:focus.x,z:focus.z,height:2.5,excludeRadius:0,
  arrival:[focus.x,focus.z] as [number,number],yaw:SHENZHEN_WAREHOUSE.heading,photoDistance:8,photoElevation:.52,photoAngle:2.53,photoTargetHeight:focus.y,
 };
};

function setView(mode:TwinViewMode){
 if(!world?.ready||!warehouse){shell.notify('地图仍在后台初始化，请稍候');return;}
 if(mode==='home'){
  world.setObserverDragMode('rotate');world.enterPhoto(warehouseLandmark());shell.setMode('home');shell.notify('已返回五机位仓库总览 · 视角保持静止');
 }else{
  if(!world.observer.active)world.enterPhoto(warehouseLandmark());world.setObserverDragMode(mode);shell.setMode(mode);
  shell.notify(mode==='rotate'?'手动旋转已启用 · 拖动环绕，不会自动旋转':'手动平移已启用 · 拖动画面移动视点');
 }
 canvas.focus();
}

function cameraCoordinates(){
 const focus=world!.observer.focus;return {longitude:114.025+focus.x/(102850*.6),latitude:22.536+focus.z/(111320*.6)};
}

const shell=createTwinShell(ui,{
 onViewChange:setView,
 onExpandChange:()=>requestAnimationFrame(()=>world?.engine.resize()),
 onFocusDrone:index=>{
  if(!world?.ready||!fleet){shell.notify('无人机编队仍在载入，请稍候');return;}
  world.setObserverDragMode('rotate');world.enterPhoto(droneLandmark(index));shell.setMode('rotate');shell.notify(`正在查看 GR-UAV-${String(index+1).padStart(2,'0')} · 拖动可手动环绕`);canvas.focus();
 },
 onLayerChange:(layer,enabled)=>{
  if(layer==='warehouse')warehouse?.root.setEnabled(enabled);
  if(layer==='drone')fleet?.root.setEnabled(enabled);
  shell.notify((layer==='warehouse'?'仓库设施':'无人机编队')+(enabled?'已显示':'已隐藏'));
 },
});

async function boot(){
 try{
  shell.setLoadingProgress('正在创建三维场景',3);shell.setSystemState('初始化',false,'正在后台展开深圳三维地图');
  world=new DrivingWorld(canvas);world.twinMode=true;world.scene.clearColor.set(.025,.07,.09,1);world.onMessage=message=>shell.notify(message);
  await world.init(reportResource);
  shell.setLoadingProgress('正在建设五机位低空物流中心',92);shell.setSystemState('初始化',false,'正在建设五机位低空物流中心');warehouse=new Warehouse(world.scene,world.groundHeight);world.scene.onDisposeObservable.addOnce(()=>warehouse?.dispose());
  const shadowMap=world.shadows.getShadowMap();if(shadowMap?.renderList)shadowMap.renderList.push(...warehouse.shadowCasters);
  shell.setLoadingProgress('正在装载五架 GreenRoute G1 无人机',96);shell.setSystemState('初始化',false,'正在装载五架 GreenRoute G1 无人机');const positions=Array.from({length:5},(_,index)=>{const position=warehouse!.landingPadWorld(index);position.y+=index===0?1.2:.04;return position;});
  fleet=new GreenRouteFleet(world.scene,positions,SHENZHEN_WAREHOUSE.heading);await fleet.load();world.scene.onDisposeObservable.addOnce(()=>fleet?.dispose());
  if(shadowMap?.renderList)shadowMap.renderList.push(...fleet.shadowCasters);
  world.setTwinMode(true);world.setLightMode('day');setView('home');
  world.onTick=dt=>{
   fleet?.update(dt);telemetryTick+=dt;if(telemetryTick<.25)return;telemetryTick=0;const coordinates=cameraCoordinates(),position=world!.observer.pose();
   shell.update({fps:world!.engine.getFps(),longitude:coordinates.longitude,latitude:coordinates.latitude,altitude:position.y-world!.groundHeight(position.x,position.z),meshes:world!.scene.meshes.filter(mesh=>mesh.isEnabled()).length});
  };
  const coordinates=cameraCoordinates(),position=world.observer.pose();shell.update({fps:world.engine.getFps(),longitude:coordinates.longitude,latitude:coordinates.latitude,altitude:position.y-world.groundHeight(position.x,position.z),meshes:world.scene.meshes.filter(mesh=>mesh.isEnabled()).length});
  Object.defineProperty(window,'__SHENZHEN_TWIN__',{configurable:true,value:{
   get ready(){return !!world?.ready&&!!world.observer.active&&!!fleet?.stats.loaded;},get mode(){return shell.mode;},get expanded(){return shell.expanded;},get warehouse(){return warehouse?.stats;},get fleet(){return fleet?.stats;},get drone(){return fleet?.stats;},get observer(){return world?{...world.observer.status,dragMode:world.observerDragMode}:null;},
   get gameSystems(){return {twinMode:world?.twinMode??false,carVisible:world?.car.isEnabled()??false,traffic:false,pedestrians:false,ebikes:false,trafficMeshes:world?.traffic?.meshes.flat().length??0,pedestrianLayer:!!world?.pedestrians};},
   get diagnostics(){return world?.diagnostics();},setView,focusDrone(index=0){if(world?.ready&&fleet)world.enterPhoto(droneLandmark(index));},
  }});
  shell.setLoadingProgress('资源初始化完成',100);shell.setSystemState('在线',true,'深圳地图、五机位物流中心与五架无人机已就绪');shell.notify('数字孪生场景已就绪 · 5 架无人机停放于 P01–P05');canvas.focus();
 }catch(error){console.error(error);const message=error instanceof Error?error.message:String(error);shell.setLoadingError('初始化失败：'+message);shell.setSystemState('异常',false,message);shell.notify('场景初始化失败，请查看控制台');}
}

void boot();
