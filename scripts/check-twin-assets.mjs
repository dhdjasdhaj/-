import {access, readFile} from 'node:fs/promises';

const requiredFiles = [
  'public/city/city.json',
  'public/city/terrain.glb',
  'public/city/roads.glb',
  'public/city/buildings.glb',
  'public/city/landmarks.glb',
  'public/city/landmark-detail.glb',
  'public/city/facade-tiles.json',
  'public/city/grassland-v2/meadow.json',
  'public/drone/greenroute-drone.glb',
];

await Promise.all(requiredFiles.map(file => access(file)));

const city = JSON.parse(await readFile('public/city/city.json', 'utf8'));
if (!Array.isArray(city.roads) || !city.roads.length) {
  throw new Error('public/city/city.json does not contain road data');
}

const facadeTiles = JSON.parse(await readFile('public/city/facade-tiles.json', 'utf8'));
if (!Array.isArray(facadeTiles.tiles) || !facadeTiles.tiles.length) {
  throw new Error('public/city/facade-tiles.json does not contain facade tiles');
}

console.log(`Twin assets ready: ${requiredFiles.length} critical files, ${facadeTiles.tiles.length} facade tiles.`);
