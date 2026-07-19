// Cloudflare Worker — 直接返回采集页
export default {
  async fetch(request) {
    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>路灯采集</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#000}
#map{height:100%;background:#111}
#loading{position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px}
#loading.hide{display:none}
#bar{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(0,0,0,0.9);color:#fff;padding:14px 16px;padding-bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between}
#bar .info{display:flex;flex-direction:column}
#bar .count{font-size:22px;font-weight:bold;color:#fbbf24}
#bar .hint{font-size:14px;color:#aaa;margin-top:2px}
#bar button{padding:14px 28px;border:none;border-radius:12px;font-size:18px;font-weight:bold;cursor:pointer;min-width:120px;-webkit-tap-highlight-color:transparent}
.btn-place{background:#ef4444;color:#fff;box-shadow:0 0 20px rgba(239,68,68,0.5)}
.btn-pan{background:#fbbf24;color:#000}
#toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:#22c55e;color:#fff;padding:14px 28px;border-radius:16px;font-size:20px;font-weight:bold;display:none;box-shadow:0 8px 32px rgba(34,197,94,0.5)}
#toast.show{display:block;animation:pop 0.3s}
@keyframes pop{from{opacity:0;transform:translate(-50%,-50%) scale(0.8)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
#tiles{position:fixed;top:12px;right:12px;z-index:9999;display:flex;gap:6px}
#tiles button{padding:8px 14px;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;background:rgba(255,255,255,0.9);color:#333}
#tiles button.active{background:#fbbf24;color:#000}
</style>
</head>
<body>
<div id="loading">地图加载中...</div>
<div id="map"></div>
<div id="toast"></div>
<div id="tiles">
  <button class="active" onclick="switchTile('amap')">高德卫星</button>
  <button onclick="switchTile('google')">Google</button>
</div>
<div id="bar">
  <div class="info">
    <div class="count" id="cnt">0 盏</div>
    <div class="hint" id="hint">拖动地图找位置，点按钮开始标注</div>
  </div>
  <button id="modeBtn" class="btn-pan" onclick="toggleMode()">标注</button>
</div>
<script>
var db = supabase.createClient(
  'https://ogsmzdkmbwlpqwtansxr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nc216ZGttYndscHF3dGFuc3hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI3MDg2MiwiZXhwIjoyMDk5ODQ2ODYyfQ.O93B85dzFGYEicBb9kt3DTpywB-gKtCtnbwEq9_eklg'
);
var TILES={amap:{url:'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',sub:['1','2','3','4']},google:{url:'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',sub:['0','1','2','3']}};
var currentTile='amap',tileLayer=null,placeMode=false,count=0;
var map=L.map('map',{center:[35.2135,106.2217],zoom:17,zoomControl:false,attributionControl:false});
L.control.zoom({position:'bottomleft'}).addTo(map);
switchTile('amap');
setTimeout(function(){document.getElementById('loading').classList.add('hide')},1500);
function switchTile(t){currentTile=t;if(tileLayer)map.removeLayer(tileLayer);var c=TILES[t];tileLayer=L.tileLayer(c.url,{maxNativeZoom:20,maxZoom:22,subdomains:c.sub}).addTo(map);document.querySelectorAll('#tiles button').forEach(function(b){b.className=''});event.target.className='active'}
function toggleMode(){placeMode=!placeMode;var b=document.getElementById('modeBtn'),h=document.getElementById('hint');if(placeMode){b.className='btn-place';b.textContent='标注中';h.textContent='点击地图放置路灯';map.getContainer().style.cursor='crosshair';map.dragging.disable()}else{b.className='btn-pan';b.textContent='标注';h.textContent='拖动地图找位置，点按钮开始标注';map.getContainer().style.cursor='';map.dragging.enable()}}
function updateBar(){document.getElementById('cnt').textContent=count+' 盏'}
map.on('click',async function(e){if(!placeMode)return;var name=prompt('输入路灯编号（如 001）：');if(!name)return;var light={name:name.trim(),lat:parseFloat(e.latlng.lat.toFixed(6)),lng:parseFloat(e.latlng.lng.toFixed(6)),is_tenure_added:true,status:'正常'};try{var r=await db.from('streetlights').insert(light);if(r.error)throw r.error}catch(err){alert('保存失败: '+(err.message||err));return}
L.marker([light.lat,light.lng],{icon:L.divIcon({className:'',html:'<div style=\\'width:14px;height:14px;background:#fbbf24;border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(251,191,36,0.8)\\'>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map).bindPopup('<div style=\\'text-align:center;padding:8px;font-size:16px\\'><b>'+light.name+'</b></div>');count++;updateBar();var t=document.getElementById('toast');t.textContent=light.name+' 已保存';t.className='show';setTimeout(function(){t.className=''},1500)});
async function loadExisting(){try{var r=await db.from('streetlights').select('*');if(r.data){r.data.forEach(function(l){L.marker([l.lat,l.lng],{icon:L.divIcon({className:'',html:'<div style=\\'width:14px;height:14px;background:#fbbf24;border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(251,191,36,0.8)\\'>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map).bindPopup('<div style=\\'text-align:center;padding:8px;font-size:16px\\'><b>'+(l.name||l.id)+'</b></div>')});count=r.data.length;updateBar()}}catch(e){}}
loadExisting();
<\/script>
</body>
</html>`
