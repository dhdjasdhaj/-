import {
 Color3,ImportMeshAsync,Material,MeshBuilder,PBRMaterial,TransformNode,Vector3,
 type AbstractMesh,type Scene,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const ASSET_URL='/drone/greenroute-drone.glb';
const DISPLAY_SCALE=2.35;
const ROTOR_LAYOUT=[
 {code:'FL',position:new Vector3(-.52,.51,-.52),direction:1},
 {code:'FR',position:new Vector3(.52,.51,-.52),direction:-1},
 {code:'RL',position:new Vector3(-.52,.51,.52),direction:-1},
 {code:'RR',position:new Vector3(.52,.51,.52),direction:1},
] as const;

type FleetUnit={
 id:string;root:TransformNode;rotors:{pivot:TransformNode;direction:number}[];
 baseY:number;active:boolean;meshes:AbstractMesh[];
};

export class GreenRouteFleet{
 readonly root:TransformNode;
 readonly meshes:AbstractMesh[]=[];
 readonly shadowCasters:AbstractMesh[]=[];
 readonly units:FleetUnit[]=[];
 private readonly bladeMaterial:PBRMaterial;
 private readonly blurMaterial:PBRMaterial;
 private elapsed=0;
 private rotorRadians=0;
 private loaded=false;
 private hiddenSourceBlades=0;

 constructor(private scene:Scene,private positions:Vector3[],private heading=0){
  this.root=new TransformNode('greenroute-fleet-root',scene);
  this.bladeMaterial=new PBRMaterial('greenroute-corrected-propeller',scene);
  this.bladeMaterial.albedoColor=new Color3(.025,.032,.038);this.bladeMaterial.metallic=.72;this.bladeMaterial.roughness=.28;
  this.blurMaterial=new PBRMaterial('greenroute-rotor-motion-blur',scene);
  this.blurMaterial.albedoColor=new Color3(.23,.42,.43);this.blurMaterial.emissiveColor=new Color3(.025,.09,.085);this.blurMaterial.metallic=.18;this.blurMaterial.roughness=.32;this.blurMaterial.alpha=.14;this.blurMaterial.transparencyMode=Material.MATERIAL_ALPHABLEND;this.blurMaterial.backFaceCulling=false;
 }

 async load(){
  if(this.positions.length!==5)throw new Error('GreenRoute fleet requires exactly five landing-pad positions');
  const asset=await ImportMeshAsync(ASSET_URL,this.scene);
  const importedNodes=new Set([...asset.meshes,...asset.transformNodes]);
  const sourceRoots=[...importedNodes].filter(node=>!node.parent||!importedNodes.has(node.parent as TransformNode));
  for(let index=0;index<this.positions.length;index++){
   const active=index===0,unitRoot=new TransformNode('greenroute-unit-'+(index+1),this.scene);
   unitRoot.parent=this.root;unitRoot.position.copyFrom(this.positions[index]);unitRoot.rotation.y=this.heading;unitRoot.scaling.setAll(DISPLAY_SCALE);
   for(const source of sourceRoots){
    if(index===0)source.parent=unitRoot;
    else source.clone(source.name+'-uav-'+(index+1),unitRoot,false);
   }
   const unit:FleetUnit={id:'GR-UAV-'+String(index+1).padStart(2,'0'),root:unitRoot,rotors:[],baseY:unitRoot.position.y,active,meshes:[]};
   for(const mesh of unitRoot.getChildMeshes(false)){
    if(/Prop_(?:FL|FR|RL|RR)_[AB]/.test(mesh.name)){mesh.setEnabled(false);this.hiddenSourceBlades++;continue;}
    if(!mesh.getTotalVertices())continue;
    mesh.isPickable=false;mesh.receiveShadows=true;unit.meshes.push(mesh);this.meshes.push(mesh);this.shadowCasters.push(mesh);
    if(mesh.material instanceof PBRMaterial){mesh.material.environmentIntensity=1.18;mesh.material.forceIrradianceInFragment=true;mesh.material.maxSimultaneousLights=8;}
   }
   this.buildCorrectedRotors(unit,index);
   this.units.push(unit);
  }
  this.loaded=true;
  return this;
 }

 private buildCorrectedRotors(unit:FleetUnit,unitIndex:number){
  for(let index=0;index<ROTOR_LAYOUT.length;index++){
   const rotor=ROTOR_LAYOUT[index],pivot=new TransformNode(unit.id+'-rotor-'+rotor.code,this.scene);
   pivot.parent=unit.root;pivot.position.copyFrom(rotor.position);pivot.rotation.y=(unitIndex*.19+index*.71)%Math.PI;
   const blade=MeshBuilder.CreateBox(unit.id+'-propeller-'+rotor.code,{width:.56,height:.012,depth:.048},this.scene);
   blade.parent=pivot;blade.material=this.bladeMaterial;blade.isPickable=false;blade.receiveShadows=true;
   unit.meshes.push(blade);this.meshes.push(blade);this.shadowCasters.push(blade);
   if(unit.active){
    const blur=MeshBuilder.CreateCylinder(unit.id+'-rotor-blur-'+rotor.code,{diameter:.61,height:.006,tessellation:48},this.scene);
    blur.parent=pivot;blur.position.y=-.006;blur.material=this.blurMaterial;blur.isPickable=false;blur.receiveShadows=false;
    unit.meshes.push(blur);this.meshes.push(blur);
   }
   unit.rotors.push({pivot,direction:rotor.direction});
  }
 }

 update(dt:number){
  if(!this.loaded||!this.root.isEnabled())return;
  this.elapsed+=dt;this.rotorRadians+=dt*30;
  for(const unit of this.units){
   if(!unit.active)continue;
   unit.root.position.y=unit.baseY+Math.sin(this.elapsed*1.7)*.045;
   for(const rotor of unit.rotors)rotor.pivot.rotation.y+=dt*30*rotor.direction;
  }
 }

 focus(index=0){const unit=this.units[Math.max(0,Math.min(this.units.length-1,index))];return {x:unit.root.position.x,y:unit.baseY+.55*DISPLAY_SCALE,z:unit.root.position.z};}
 get stats(){return {asset:ASSET_URL,loaded:this.loaded,count:this.units.length,meshes:this.meshes.length,rotors:this.units.reduce((sum,unit)=>sum+unit.rotors.length,0),activeRotors:this.units[0]?.rotors.length??0,rotorRadians:this.rotorRadians,hiddenSourceBlades:this.hiddenSourceBlades,scale:DISPLAY_SCALE,enabled:this.root.isEnabled(),units:this.units.map(unit=>({id:unit.id,active:unit.active,position:unit.root.position.asArray(),rotors:unit.rotors.length}))};}
 dispose(){this.root.dispose(false,true);this.bladeMaterial.dispose(true,true);this.blurMaterial.dispose(true,true);}
}
