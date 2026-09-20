import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const candidates=[process.env.PLAYWRIGHT_BROWSER_PATH,'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
let executablePath;
for(const candidate of candidates){try{await fs.access(candidate);executablePath=candidate;break;}catch{}}
if(!executablePath)throw new Error('Chrome or Edge executable not found');

const out=path.resolve('artifacts/twin');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.setDefaultTimeout(240000);
const errors=[],failed=[],requests=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('request',request=>requests.push(new URL(request.url()).pathname));
page.on('requestfailed',request=>failed.push({url:request.url(),error:request.failure()?.errorText}));

const telemetryLayout=()=>page.evaluate(()=>{const dock=document.querySelector('.twin-telemetry-dock'),cards=[...document.querySelectorAll('.twin-telemetry-card')];const rect=dock?.getBoundingClientRect();return {clientWidth:dock?.clientWidth??0,scrollWidth:dock?.scrollWidth??0,withinViewport:!!rect&&rect.left>=0&&rect.right<=innerWidth,cards:cards.map(card=>{const box=card.getBoundingClientRect();return {width:box.width,inside:!!rect&&box.left>=rect.left-1&&box.right<=rect.right+1};})};});

try{
 await page.goto(process.env.TWIN_URL??'http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('.twin-shell',{state:'visible',timeout:30000});
 const startup=await page.evaluate(()=>({shellVisible:!!document.querySelector('.twin-shell'),fullscreenLoader:!!document.querySelector('.city-loader'),initOverlay:!!document.querySelector('.twin-init-overlay'),initStage:document.querySelector('#twin-init-stage')?.textContent,initPercent:document.querySelector('#twin-init-percent')?.textContent,system:document.querySelector('#twin-system-state')?.textContent,aircraftCards:document.querySelectorAll('.twin-aircraft-card').length}));
 await page.screenshot({path:path.join(out,'startup-direct-map.png'),timeout:120000});
 try{await page.waitForFunction(()=>window.__SHENZHEN_TWIN__?.ready===true,null,{timeout:240000});}
 catch(error){const diagnostic=await page.evaluate(()=>({title:document.title,bodyText:document.body.innerText.slice(0,1800),twin:window.__SHENZHEN_TWIN__??null}));if(!diagnostic.twin?.ready){await page.screenshot({path:path.join(out,'greenroute-drone-timeout.png')});console.error(JSON.stringify({diagnostic,errors,failed},null,2));throw error;}}

 await page.waitForTimeout(1200);
 const home=await page.evaluate(()=>({fleet:window.__SHENZHEN_TWIN__.fleet,warehouse:window.__SHENZHEN_TWIN__.warehouse,systems:window.__SHENZHEN_TWIN__.gameSystems,mode:window.__SHENZHEN_TWIN__.mode,aircraftCards:document.querySelectorAll('.twin-aircraft-card').length,initOverlay:!!document.querySelector('.twin-init-overlay'),system:document.querySelector('#twin-system-state')?.textContent}));
 const rotorBefore=home.fleet.rotorRadians,parkedBefore=home.fleet.units.slice(1).map(unit=>unit.position[1]);await page.waitForTimeout(800);
 const motion=await page.evaluate(()=>({rotorRadians:window.__SHENZHEN_TWIN__.fleet.rotorRadians,parkedY:window.__SHENZHEN_TWIN__.fleet.units.slice(1).map(unit=>unit.position[1])}));
 await page.setViewportSize({width:1600,height:900});await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'warehouse-five-pads.png'),timeout:120000});

 await page.click('[data-focus-drone="0"]');await page.waitForTimeout(1300);
 const near=await page.evaluate(()=>({observer:window.__SHENZHEN_TWIN__.observer,mode:window.__SHENZHEN_TWIN__.mode}));
 await page.screenshot({path:path.join(out,'greenroute-drone-closeup.png'),timeout:120000});

 await page.click('.twin-expand-button');await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(400);
 const layouts={expanded1920:await telemetryLayout()};await page.screenshot({path:path.join(out,'expanded-map-1920.png'),timeout:120000});
 for(const [name,width,height] of [['desktop1280',1280,720],['tablet820',820,900],['mobile430',430,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(180);layouts[name]=await telemetryLayout();}

 const requestedVehicles=requests.filter(url=>/(traffic-car|\/car\.glb|pedestrian|ebike)/i.test(url));
 const layoutStable=Object.values(layouts).every(layout=>layout.scrollWidth<=layout.clientWidth+1&&layout.withinViewport&&layout.cards.every(card=>card.inside&&card.width>30));
 const report={startup,home,near,motion,layouts,requestedVehicles,errors,failed,checks:{simpleInitPage:startup.shellVisible&&!startup.fullscreenLoader&&startup.initOverlay&&/^\d+%$/.test(startup.initPercent??''),initPageDismissed:!home.initOverlay,fiveAircraft:home.fleet.count===5&&home.aircraftCards===5,fivePads:home.warehouse.pads===5,rotorsCorrected:home.fleet.rotors===20&&home.fleet.activeRotors===4&&home.fleet.hiddenSourceBlades===40,activeRotorMoves:motion.rotorRadians>rotorBefore,parkedDronesStill:parkedBefore.every((value,index)=>value===motion.parkedY[index]),manualRotate:near.mode==='rotate'&&near.observer.dragMode==='rotate',vehiclesRemoved:!home.systems.carVisible&&!home.systems.pedestrians&&!home.systems.ebikes&&home.systems.trafficMeshes===0&&requestedVehicles.length===0,layoutStable,systemOnline:home.system==='在线'}};
 await fs.writeFile(path.join(out,'greenroute-drone-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(errors.length||failed.length||Object.values(report.checks).some(value=>!value))process.exitCode=1;
}finally{await browser.close();}
