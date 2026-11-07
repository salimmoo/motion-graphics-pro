// mgp preview: local server + scrubber page. The preview uses the same runtime as the render.
import { spawn } from "node:child_process";
import { resolveComp, parseVars } from "./session.mjs";
import { startServer } from "./server.mjs";
import { L, lang } from "./i18n.mjs";

const UI = (entryUrl, name) => {
const T = { play: L`Play`, pause: L`Pause`, driver: L`driver`, noDuration: L`Cannot read the duration: set window.__duration or data-duration on the root.` };
return `<!doctype html><html lang="${lang()}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>mgp · ${name}</title>
<style>
:root{--bg:#121214;--panel:#1c1c20;--line:#2c2c33;--tx:#e8e8ea;--mut:#9a9aa3;--acc:#ffcc33}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--tx);font:13px/1.3 system-ui,"Segoe UI",Arial,sans-serif}
#app{display:grid;grid-template-rows:1fr auto;height:100%}
#stage{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
#wrap{position:relative;box-shadow:0 0 0 1px var(--line),0 10px 40px #0008;background:#000}
iframe{border:0;position:absolute;left:0;top:0;transform-origin:0 0;background:#fff}
#bar{background:var(--panel);border-top:1px solid var(--line);padding:10px 16px;display:grid;gap:8px}
#row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
button{background:#2a2a31;color:var(--tx);border:1px solid var(--line);border-radius:6px;padding:6px 11px;font:inherit;cursor:pointer}
button:hover{border-color:#555}button.on{background:var(--acc);color:#000;border-color:var(--acc)}
input[type=range]{width:100%;accent-color:var(--acc)}
#t{font-variant-numeric:tabular-nums;min-width:210px}.mut{color:var(--mut)}
#err{color:#ff7b7b;white-space:pre-wrap;display:none}
</style></head><body><div id="app">
<div id="stage"><div id="wrap"><iframe id="fr" src="${entryUrl}"></iframe></div></div>
<div id="bar"><input id="sc" type="range" min="0" max="1" step="1" value="0">
<div id="row"><button id="pl" title="${L`Space`}">${T.play}</button><button id="pv" title="${L`Left arrow`}">-1 f</button><button id="nx" title="${L`Right arrow`}">+1 f</button>
<button id="lp" class="on">${L`Loop`}</button><button id="sn">${L`Sound`}</button><span id="t">${L`loading...`}</span><span class="mut" id="inf"></span>
<span class="mut" style="margin-left:auto">${name} · ${L`Space play · arrows per frame · Shift+arrows per second`}</span></div><div id="err"></div></div></div>
<script>
const T=${JSON.stringify(T).replace(/</g, "\\u003c")};
const RT=(w)=>w.__mgpRuntime||w.__rekam;
const fr=document.getElementById('fr'),wrap=document.getElementById('wrap'),stage=document.getElementById('stage');
const sc=document.getElementById('sc'),tEl=document.getElementById('t'),pl=document.getElementById('pl'),errEl=document.getElementById('err');
let info=null,fps=30,dur=1,frame=0,playing=false,busy=false,loop=true,sound=false,t0=0,f0=0,audios=[];
function fit(){if(!info)return;const W=info.width,H=info.height,s=Math.min((stage.clientWidth-32)/W,(stage.clientHeight-32)/H);
wrap.style.width=W*s+'px';wrap.style.height=H*s+'px';fr.style.width=W+'px';fr.style.height=H+'px';fr.style.transform='scale('+s+')';}
addEventListener('resize',fit);
const N=()=>Math.max(1,Math.round(dur*fps));
function label(){const t=frame/fps;tEl.textContent=t.toFixed(3)+' s  /  '+dur.toFixed(2)+' s   ·   frame '+frame+' / '+(N()-1);}
async function go(f){frame=Math.max(0,Math.min(N()-1,f));sc.value=frame;label();if(busy)return;busy=true;
try{let done=-1;while(done!==frame){done=frame;await RT(fr.contentWindow).seek(done/fps);}}catch(e){showErr(e);}busy=false;}
function showErr(e){errEl.style.display='block';errEl.textContent=String(e&&e.message||e);}
function stopAudio(){audios.forEach(a=>{a.el.pause();});}
function syncAudio(t){if(!sound)return;audios.forEach(a=>{const lt=a.ms+(t-a.start)*a.rate;const end=a.dur!=null?a.start+a.dur:Infinity;
if(t>=a.start&&t<end&&(!a.el.duration||lt<a.el.duration)){a.el.playbackRate=a.rate;a.el.volume=Math.min(1,a.vol);if(Math.abs(a.el.currentTime-lt)>0.12)a.el.currentTime=lt;if(a.el.paused)a.el.play().catch(()=>{});}else if(!a.el.paused)a.el.pause();});}
function loopFn(now){if(!playing)return;let f=f0+Math.floor((now-t0)/1000*fps);
if(f>=N()){if(loop){t0=now;f0=0;f=0;stopAudio();}else{toggle(false);f=N()-1;}}
if(f!==frame&&!busy){go(f);syncAudio(f/fps);}requestAnimationFrame(loopFn);}
function toggle(v){playing=v??!playing;pl.textContent=playing?T.pause:T.play;pl.classList.toggle('on',playing);
if(playing){if(frame>=N()-1)frame=0;t0=performance.now();f0=frame;requestAnimationFrame(loopFn);}else stopAudio();}
pl.onclick=()=>toggle();document.getElementById('pv').onclick=()=>{toggle(false);go(frame-1);};document.getElementById('nx').onclick=()=>{toggle(false);go(frame+1);};
document.getElementById('lp').onclick=e=>{loop=!loop;e.target.classList.toggle('on',loop);};
document.getElementById('sn').onclick=e=>{sound=!sound;e.target.classList.toggle('on',sound);if(!sound)stopAudio();};
sc.oninput=()=>{toggle(false);go(+sc.value);};
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();toggle();}
else if(e.code==='ArrowLeft'){toggle(false);go(frame-(e.shiftKey?fps:1));}else if(e.code==='ArrowRight'){toggle(false);go(frame+(e.shiftKey?fps:1));}
else if(e.code==='Home'){go(0);}else if(e.code==='End'){go(N()-1);}});
fr.addEventListener('load',async()=>{try{const w=fr.contentWindow;await new Promise(r=>{const c=()=>RT(w)?r():setTimeout(c,20);c();});
info=await RT(w).ready();fps=info.fps||30;dur=info.duration||1;sc.max=N()-1;
document.getElementById('inf').textContent=info.width+'x'+info.height+' · '+fps+' fps · '+T.driver+' '+info.driver;
audios=(info.media||[]).map(m=>({el:Object.assign(new Audio(m.src),{preload:'auto'}),start:m.start,ms:m.mediaStart||0,dur:m.duration,vol:m.volume??1,rate:m.rate||1}));
if(!info.duration)showErr(T.noDuration);
fit();go(0);}catch(e){showErr(e);}});
</script></body></html>`;
};

export async function preview(comp, o) {
  const c = resolveComp(comp, o.root);
  const name = c.entry.split(/[\\/]/).pop();
  const vars = parseVars(o);
  const entryUrl = "/" + c.entry.split(/[\\/]/).join("/");
  const extra = { "/": (req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(UI(entryUrl, name)); } };
  const srv = await startServer({ root: c.root, entry: c.entry, port: +(o.port || 4600), extra, vars }).catch((e) => {
    if (e.code !== "EADDRINUSE") throw e;
    return startServer({ root: c.root, entry: c.entry, port: 0, extra, vars });
  });
  const url = srv.base + "/";
  process.stderr.write(L`mgp preview: ${url}` + "\n  " + L`composition: ${c.file}` + "\n  " + L`Ctrl+C to stop.` + "\n");
  if (o.open) {
    const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).unref();
  }
  return srv;
}

/** Old name (v2.3 / v2.4-dev). */
export { preview as pratinjau };
