import './twin-shell.css';

export type TwinViewMode='home'|'rotate'|'pan';
export type TwinTelemetry={fps:number;longitude:number;latitude:number;altitude:number;meshes:number};
export type TwinLayer='warehouse'|'drone';

type TwinShellOptions={
 onViewChange:(mode:TwinViewMode)=>void;
 onExpandChange?:(expanded:boolean)=>void;
 onLayerChange?:(layer:TwinLayer,enabled:boolean)=>void;
 onFocusDrone?:(index:number)=>void;
};

const FLEET=Array.from({length:5},(_,index)=>({id:'GR-UAV-'+String(index+1).padStart(2,'0'),active:index===0,pad:'P0'+(index+1)}));

const ICONS:Record<TwinViewMode,string>={
 home:'<path d="M4 11.2 12 4l8 7.2"/><path d="M6.5 10.4V20h11v-9.6M9.5 20v-5.5h5V20"/>',
 rotate:'<path d="M19.5 8.5A8 8 0 1 0 20 15"/><path d="m16 5 3.5 3.5L23 5"/><path d="M8 12h8M12 8v8"/>',
 pan:'<path d="M12 2v20M2 12h20"/><path d="m8 6 4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/>',
};

export function createTwinShell(host:HTMLElement,options:TwinShellOptions){
 const root=document.createElement('section');root.className='twin-shell';root.setAttribute('aria-label','深圳低空物流数字孪生控制台');
 root.innerHTML=`
  <div class="twin-init-overlay" role="progressbar" aria-label="地图资源初始化进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="3">
   <div class="twin-init-card">
    <span class="twin-init-mark" aria-hidden="true"><i></i></span>
    <small>SHENZHEN UAV DIGITAL TWIN</small>
    <h2>深圳低空物流数字孪生平台</h2>
    <p id="twin-init-stage">正在创建三维场景</p>
    <div class="twin-init-progress"><i id="twin-init-progress"></i></div>
    <div class="twin-init-meta"><span>资源初始化</span><b id="twin-init-percent">3%</b></div>
   </div>
  </div>
  <header class="twin-topbar">
   <div class="twin-brand"><span class="twin-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><div><small>SZ UAV DIGITAL TWIN</small><h1>深圳极端天气无人机智能配送数字孪生仿真平台</h1></div></div>
   <div class="twin-top-metrics"><div><span>天气</span><b>待接入</b></div><div><span>无人机</span><b>5 架</b></div><div><span>任务</span><b>0 单</b></div><div><span>系统</span><b id="twin-system-state" class="loading">初始化</b></div></div>
   <button class="twin-expand-button" type="button" aria-pressed="false" aria-label="放大中心深圳地图"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg><span>放大地图</span></button>
  </header>

  <aside class="twin-side-panel twin-left-panel" aria-label="低空业务工作台">
   <div class="twin-side-brand"><strong>低空护航 <em>· 深圳数字孪生</em></strong><small>城市气象感知 · 航线规划 · 无人机执行</small></div>
   <section class="twin-card"><h2><i></i>图层控制</h2><div class="twin-layer-grid">
    <label><input type="checkbox" checked disabled> 城市建筑</label><label><input type="checkbox" checked disabled> 深圳路网</label>
    <label><input type="checkbox" data-layer="warehouse" checked> 仓库设施</label><label><input type="checkbox" data-layer="drone" checked> 无人机编队</label>
    <label class="pending"><input type="checkbox" disabled> 气象风险场</label>
    <label class="pending"><input type="checkbox" disabled> 低空航线</label>
   </div></section>
   <section class="twin-card"><h2><i></i>实时决策态势</h2><div class="twin-stat-row"><div><small>当前时刻</small><b id="twin-clock">--:--</b></div><div><small>适飞指数</small><b class="muted">--</b></div><div><small>在册无人机</small><b>5</b></div></div><p class="twin-source"><span></span>5 架 GreenRoute G1 已接入 P01–P05</p><div class="twin-legend"><span class="safe">≥75 可飞</span><span class="warn">55–75 条件飞行</span><span class="danger">&lt;55 禁飞</span></div></section>
   <section class="twin-card"><div class="twin-card-head"><h2><i></i>极端天气场景</h2><span>NEXT</span></div><div class="twin-weather-buttons"><button disabled>正常天气</button><button disabled>强风</button><button disabled>暴雨</button><button disabled>台风雷暴</button></div><p class="twin-card-note">下一阶段接入真实天气参数、风险场和重规划。</p></section>
   <section class="twin-card twin-order-card"><div class="twin-card-head"><h2><i></i>配送订单编排</h2><span>待接入</span></div><label>取餐地点<input value="深圳大学附近餐厅" disabled></label><label>配送地点<input value="深圳大学宿舍" disabled></label><button type="button" disabled>＋ 生成订单并智能规划</button></section>
  </aside>

  <nav class="twin-view-toolbar" aria-label="地图视角">
   ${(['home','rotate','pan'] as TwinViewMode[]).map(mode=>`<button type="button" data-twin-view="${mode}" aria-pressed="${mode==='home'}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[mode]}</svg><span>${{home:'主页',rotate:'旋转视角',pan:'平移视角'}[mode]}</span></button>`).join('')}
   <small id="twin-view-hint">仓库总览</small>
  </nav>

  <aside class="twin-side-panel twin-right-panel" aria-label="任务控制">
   <div class="twin-panel-heading"><div><small>MISSION CONTROL</small><h2>等待生成配送任务</h2><p>创建订单后显示路线、天气与无人机执行状态。</p></div><span class="twin-idle">IDLE</span></div>
   <div class="twin-mission-grid"><div><span>航线里程</span><b>--</b></div><div><span>气象风险</span><b>--/100</b></div><div><span>飞行高度</span><b>-- m</b></div><div><span>任务进度</span><b>0%</b></div></div><div class="twin-progress"><i></i></div>
   <section class="twin-panel-section"><div class="twin-section-head"><h3>任务状态机</h3><span>实时驱动</span></div><div class="twin-phase-track"><span class="active">空闲</span><span>起飞</span><span>取货</span><span>配送</span><span>返航</span></div></section>
   <section class="twin-panel-section"><div class="twin-section-head"><h3>候选航线</h3><span>A / B / C</span></div><div class="twin-route-placeholder"><b>A · 最快直飞</b><small>订单与天气生成后计算</small></div><div class="twin-route-placeholder"><b>B · 最低风险</b><small>风险场接入后计算</small></div><div class="twin-route-placeholder"><b>C · 综合备选</b><small>SFW-Route 接口待接入</small></div></section>
   <section class="twin-panel-section"><div class="twin-section-head"><h3>无人机编队</h3><span>5 AIRCRAFT</span></div><div class="twin-aircraft-list">${FLEET.map((aircraft,index)=>`<div class="twin-aircraft-card${aircraft.active?' active':''}"><div class="twin-aircraft-icon" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div><div><strong>${aircraft.id}</strong><span>${aircraft.pad} · GreenRoute G1</span><small><i></i> ${aircraft.active?'值守悬停 · 桨叶启动':'静止停放 · 电量 100%'}</small></div><button type="button" data-focus-drone="${index}">查看</button></div>`).join('')}</div></section>
   <section class="twin-panel-section"><div class="twin-section-head"><h3>实时风险分析</h3><span>MONITOR</span></div><div class="twin-risk-row"><span>深圳边界</span><b class="safe">范围内</b></div><div class="twin-risk-row"><span>建筑净空</span><b>待计算</b></div><div class="twin-risk-row"><span>风场扰动</span><b>待接入</b></div></section>
   <section class="twin-panel-section"><div class="twin-section-head"><h3>系统日志</h3><span class="live">LIVE</span></div><ol class="twin-log"><li><time>系统</time><span>GTA_SZ 三维城市底座已就绪</span></li><li><time>仓库</time><span>SZ-L01 南山低空物流中心在线</span></li></ol></section>
  </aside>

  <section class="twin-telemetry-dock" aria-label="仿真遥测"><div class="twin-telemetry-card"><span>当前风速</span><b>--</b><small>m/s</small></div><div class="twin-telemetry-card"><span>飞行风险</span><b>--</b><small>/100</small></div><div class="twin-telemetry-card"><span>执行机电量</span><b>100</b><small>%</small></div><div class="twin-telemetry-card"><span>场景帧率</span><b id="twin-fps">--</b><small>FPS</small></div><div class="twin-sparkline" aria-hidden="true"><svg viewBox="0 0 360 70" preserveAspectRatio="none"><path class="grid" d="M0 12h360M0 35h360M0 58h360"/><path class="line" d="M0 47 C45 44,55 46,92 40 S155 38,190 39 250 34,280 37 330 30,360 33"/><path class="limit" d="M0 25h360"/></svg></div></section>
  <div class="twin-location-card"><span>ACTIVE SITE</span><strong>南山区低空物流中心</strong><small>22.5244° N&nbsp;&nbsp;113.9829° E</small></div>
  <div class="twin-map-caption"><span id="twin-coordinate">114.0250° E · 22.5360° N</span><b>SHENZHEN 3D CITY BASE</b></div>
  <div class="twin-notice" role="status" aria-live="polite"></div>`;
 host.replaceChildren(root);
 const query=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const buttons=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-twin-view]'));
 let active:TwinViewMode='home',expanded=false,noticeTimer=0,initTimer=0;
 const hints:Record<TwinViewMode,string>={home:'仓库总览',rotate:'手动拖动环绕 · 不自动旋转',pan:'手动拖动平移 · 滚轮缩放'};
 function setMode(mode:TwinViewMode){active=mode;for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.twinView===mode));query('#twin-view-hint').textContent=hints[mode];}
 for(const button of buttons)button.addEventListener('click',()=>{const mode=button.dataset.twinView as TwinViewMode;setMode(mode);options.onViewChange(mode);});
 const expandButton=query<HTMLButtonElement>('.twin-expand-button');
 function setExpanded(next:boolean){expanded=next;root.classList.toggle('map-expanded',expanded);expandButton.setAttribute('aria-pressed',String(expanded));expandButton.setAttribute('aria-label',expanded?'恢复两侧业务面板':'放大中心深圳地图');expandButton.querySelector('span')!.textContent=expanded?'恢复面板':'放大地图';options.onExpandChange?.(expanded);notify(expanded?'沉浸地图已开启 · 两侧浮窗已收起':'两侧业务浮窗已恢复');}
 expandButton.addEventListener('click',()=>setExpanded(!expanded));
 root.querySelectorAll<HTMLButtonElement>('[data-focus-drone]').forEach(button=>button.addEventListener('click',()=>options.onFocusDrone?.(Number(button.dataset.focusDrone))));
 root.querySelectorAll<HTMLInputElement>('[data-layer]').forEach(input=>input.addEventListener('change',()=>options.onLayerChange?.(input.dataset.layer as TwinLayer,input.checked)));
 function notify(message:string){const notice=query('.twin-notice');notice.textContent=message;notice.classList.add('visible');window.clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>notice.classList.remove('visible'),3200);}
 function setLoadingProgress(stage:string,percent:number){const value=Math.max(0,Math.min(100,Math.round(percent))),overlay=query('.twin-init-overlay');query('#twin-init-stage').textContent=stage;query('#twin-init-percent').textContent=value+'%';query<HTMLElement>('#twin-init-progress').style.width=value+'%';overlay.setAttribute('aria-valuenow',String(value));if(value>=100){overlay.classList.add('complete');window.clearTimeout(initTimer);initTimer=window.setTimeout(()=>overlay.remove(),650);}}
 function setLoadingError(message:string){const overlay=query('.twin-init-overlay');overlay.classList.add('error');query('#twin-init-stage').textContent=message;query('#twin-init-percent').textContent='ERROR';}
 function setSystemState(label:string,online:boolean,detail=label){const state=query('#twin-system-state');state.textContent=label;state.classList.toggle('online',online);state.classList.toggle('loading',!online);state.title=detail;root.classList.toggle('is-initializing',!online);}
 function update(telemetry:TwinTelemetry){
  query('#twin-fps').textContent=String(Math.round(telemetry.fps));query('#twin-coordinate').textContent=`${telemetry.longitude.toFixed(4)}° E · ${telemetry.latitude.toFixed(4)}° N · CAM ${Math.max(0,telemetry.altitude).toFixed(0)} m · ${telemetry.meshes.toLocaleString('zh-CN')} MESHES`;
  query<HTMLTimeElement>('#twin-clock').dateTime=new Date().toISOString();query('#twin-clock').textContent=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
 }
 return {root,setMode,setExpanded,setLoadingProgress,setLoadingError,setSystemState,notify,update,get mode(){return active;},get expanded(){return expanded;},dispose(){window.clearTimeout(noticeTimer);window.clearTimeout(initTimer);root.remove();}};
}
