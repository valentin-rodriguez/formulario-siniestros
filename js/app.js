(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));

/* ---------- modo prueba: el botón de datos de ejemplo solo aparece en localhost o con ?demo ---------- */
const MODO_PRUEBA=/^(localhost|127\.0\.0\.1|)$/.test(location.hostname)||new URLSearchParams(location.search).has("demo");

/* ---------- estado ---------- */
const state={fields:{},radios:{},lesionados:[],att:{carnet:[],tarjeta:[],otras:[]},firma:null,
  sketch:{bg:"cruce",bgImage:null,calleH:"",calleV:"",items:[],strokes:[]}};

/* ---------- logo (opcional: logo.jpg junto a la página) ---------- */
let LOGO=null;
(function(){const im=new Image();im.onload=()=>{try{const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0);LOGO=c.toDataURL("image/jpeg",.92);const t=$("#logoTop");t.src=LOGO;t.hidden=false;}catch(e){}};im.src="assets/logo.jpg";})();

/* ---------- pasos ---------- */
const steps=$$("section.step");let cur=0;
const stepsNav=$("#steps");
steps.forEach((s,i)=>{const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",(i+1)+". "+s.dataset.title);b.onclick=()=>go(i);stepsNav.appendChild(b);});
function go(i){
  cur=Math.max(0,Math.min(steps.length-1,i));
  steps.forEach((s,j)=>s.hidden=j!==cur);
  $$("#steps button").forEach((b,j)=>{b.className=j===cur?"on":(j<cur?"done":"");});
  $("#stepName").textContent=steps[cur].dataset.title;
  $("#stepCount").textContent="Paso "+(cur+1)+" de "+steps.length;
  $("#prev").disabled=cur===0;
  $("#next").hidden=cur===steps.length-1;
  if(steps[cur].dataset.title==="Croquis") requestAnimationFrame(drawSketch);
  if(cur===steps.length-1) renderReview();
  window.scrollTo({top:0});
  save();
}
$("#prev").onclick=()=>go(cur-1);
$("#next").onclick=()=>go(cur+1);

/* ---------- campos ---------- */
function readFields(){
  $$("[data-f]").forEach(el=>{state.fields[el.id]=el.type==="checkbox"?el.checked:el.value;});
  ["s_acomp","s_semaforo","s_senales","les_hay"].forEach(n=>{const r=document.querySelector('input[name="'+n+'"]:checked');state.radios[n]=r?r.value:"";});
}
function writeFields(){
  $$("[data-f]").forEach(el=>{const v=state.fields[el.id];if(v===undefined)return;if(el.type==="checkbox")el.checked=!!v;else el.value=v;});
  Object.entries(state.radios).forEach(([n,v])=>{$$('input[name="'+n+'"]').forEach(r=>r.checked=r.value===v);});
  $("#sk_calle_h").value=state.sketch.calleH||"";$("#sk_calle_v").value=state.sketch.calleV||"";
  $$('input[name="sk_bg"]').forEach(r=>r.checked=r.value===state.sketch.bg);
  syncConditional();renderLes();renderThumbs();syncBgUI();
}
function syncConditional(){
  $$("[data-show]").forEach(el=>{const r=document.querySelector('input[name="'+el.dataset.show+'"]:checked');el.hidden=!(r&&r.value==="SI");});
  const mismo=$("#t_mismo").checked;
  ["pr_nombre","pr_dni","pr_telefono","pr_domicilio"].forEach(id=>{$("#"+id).closest("label").hidden=mismo;});
  const hay=($('input[name="les_hay"]:checked')||{}).value==="SI";
  $("#lesList").hidden=!hay;$("#lesAddRow").hidden=!hay;
  if(hay&&state.lesionados.length===0){state.lesionados.push(blankLes());renderLes();}
  const d=$("#descripcion").value.trim();$("#descCount").textContent=d?d.length+" caracteres":"";
}
/* solo números en teléfonos, DNI/CUIT y legajo (también en los campos de lesionados, que se crean dinámicamente) */
document.addEventListener("input",e=>{const t=e.target;if(t.hasAttribute&&t.hasAttribute("data-digits")){const v=t.value.replace(/\D/g,"").slice(0,t.maxLength>0?t.maxLength:10);if(v!==t.value)t.value=v;}},true);
$("#f").addEventListener("input",e=>{
  if(e.target.id==="c_nombre"&&!$("#aclaracion").dataset.touched){$("#aclaracion").value=e.target.value;}
  if(e.target.id==="aclaracion")e.target.dataset.touched="1";
  readFields();syncConditional();saveSoon();
});
$("#f").addEventListener("change",()=>{readFields();syncConditional();saveSoon();});
$("#f").addEventListener("submit",e=>e.preventDefault());

/* ---------- lesionados ---------- */
function blankLes(){return{nombre:"",dni:"",telefono:"",domicilio:"",tipo:"",emergencia:"",centro:"",policia:"",sumario:"",detalle:""};}
function renderLes(){
  const box=$("#lesList");box.innerHTML="";
  state.lesionados.forEach((p,i)=>{
    const d=document.createElement("div");d.className="les";
    d.innerHTML=`<div class="les-head"><b>Persona ${i+1}</b>${state.lesionados.length>1?`<button type="button" class="btn small danger" data-del="${i}">Quitar</button>`:""}</div>
    <div class="fields">
      <label class="f full">Nombre y apellido<input type="text" data-l="nombre"></label>
      <label class="f">DNI<input type="tel" data-l="dni" data-digits maxlength="10" inputmode="numeric" pattern="[0-9]*"></label>
      <label class="f">Teléfono<input type="tel" data-l="telefono" data-digits maxlength="10" inputmode="numeric" pattern="[0-9]*"></label>
      <label class="f full">Domicilio<input type="text" data-l="domicilio"></label>
      <div class="yn full"><span class="q">Tipo de lesiones</span><div class="seg">
        <input type="radio" name="les${i}_tipo" id="les${i}_lev" value="Leves" data-lr="tipo"><label for="les${i}_lev">Leves</label>
        <input type="radio" name="les${i}_tipo" id="les${i}_gra" value="Graves" data-lr="tipo"><label for="les${i}_gra">Graves</label></div></div>
      <label class="f">Servicio de emergencia<input type="text" data-l="emergencia" placeholder="SAME, 107, ambulancia privada…"></label>
      <label class="f">Centro asistencial<input type="text" data-l="centro"></label>
      <div class="yn"><span class="q">Intervención policial</span><div class="seg">
        <input type="radio" name="les${i}_pol" id="les${i}_psi" value="Si" data-lr="policia"><label for="les${i}_psi">Sí</label>
        <input type="radio" name="les${i}_pol" id="les${i}_pno" value="No" data-lr="policia"><label for="les${i}_pno">No</label></div></div>
      <label class="f">Nº de sumario<input type="text" data-l="sumario"></label>
      <label class="f full">Detalle de lesiones<textarea data-l="detalle" style="min-height:96px"></textarea></label>
    </div>`;
    d.querySelectorAll("[data-l]").forEach(el=>{el.value=p[el.dataset.l]||"";el.addEventListener("input",()=>{p[el.dataset.l]=el.value;saveSoon();});});
    d.querySelectorAll("[data-lr]").forEach(el=>{el.checked=p[el.dataset.lr]===el.value;el.addEventListener("change",()=>{p[el.dataset.lr]=el.value;saveSoon();});});
    const del=d.querySelector("[data-del]");if(del)del.onclick=()=>{state.lesionados.splice(i,1);renderLes();saveSoon();};
    d.querySelectorAll("input[type=text],input[type=tel]").forEach(i=>{if(!i.hasAttribute("maxlength"))i.maxLength=120;});d.querySelector("textarea").maxLength=1500;
    box.appendChild(d);
  });
}
function alertMsg(m){const n=document.createElement("div");n.className="toast";n.setAttribute("role","alert");n.textContent=m;document.body.appendChild(n);setTimeout(()=>n.remove(),5000);}
$("#lesAdd").onclick=()=>{if(state.lesionados.length>=10)return alertMsg("Máximo 10 personas.");state.lesionados.push(blankLes());renderLes();saveSoon();};

/* ---------- imágenes ---------- */
const MAX_MB=20;
function fileToJpeg(file,max=1600,q=.82){
  return new Promise((res,rej)=>{
    if(!file||!/^image\//.test(file.type))return rej(new Error("El archivo no es una imagen."));
    if(file.size>MAX_MB*1024*1024)return rej(new Error("La imagen supera los "+MAX_MB+" MB."));const url=URL.createObjectURL(file);const im=new Image();
    im.onload=()=>{let w=im.naturalWidth,h=im.naturalHeight;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);
      const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
      URL.revokeObjectURL(url);res({src:c.toDataURL("image/jpeg",q),w,h});};
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("No se pudo leer la imagen"));};im.src=url;});
}
$$("[data-att]").forEach(inp=>inp.addEventListener("change",async()=>{
  const errs=[];
  for(const f of Array.from(inp.files).slice(0,6)){if(state.att[inp.dataset.att].length>=6){errs.push("Máximo 6 fotos por tipo.");break;}
    try{state.att[inp.dataset.att].push(await fileToJpeg(f));}catch(e){errs.push(f.name+": "+e.message);}}
  if(errs.length)alertMsg(errs.join(" "));
  inp.value="";renderThumbs();saveSoon();
}));
function renderThumbs(){
  Object.keys(state.att).forEach(k=>{const box=$("#th_"+k);box.innerHTML="";
    state.att[k].forEach((a,i)=>{const t=document.createElement("div");t.className="thumb";t.innerHTML='<img alt=""><button type="button" aria-label="Quitar">×</button>';
      t.querySelector("img").src=a.src;t.querySelector("button").onclick=()=>{state.att[k].splice(i,1);renderThumbs();saveSoon();};box.appendChild(t);});});
}

/* ---------- firma ---------- */
const sig=$("#sig"),sx=sig.getContext("2d");let sigDrawing=false,sigDirty=false;
function sigPos(e){const r=sig.getBoundingClientRect();return[(e.clientX-r.left)*sig.width/r.width,(e.clientY-r.top)*sig.height/r.height];}
function sigLoad(){sx.clearRect(0,0,sig.width,sig.height);if(state.firma){const im=new Image();im.onload=()=>sx.drawImage(im,0,0,sig.width,sig.height);im.src=state.firma;}}
sig.addEventListener("pointerdown",e=>{sig.setPointerCapture(e.pointerId);sigDrawing=true;const[p,q]=sigPos(e);sx.beginPath();sx.moveTo(p,q);sx.lineWidth=5;sx.lineCap="round";sx.lineJoin="round";sx.strokeStyle="#0d1f4a";});
sig.addEventListener("pointermove",e=>{if(!sigDrawing)return;const[p,q]=sigPos(e);sx.lineTo(p,q);sx.stroke();sigDirty=true;});
const sigEnd=()=>{if(!sigDrawing)return;sigDrawing=false;if(sigDirty){state.firma=sig.toDataURL("image/png");saveSoon();}};
sig.addEventListener("pointerup",sigEnd);sig.addEventListener("pointercancel",sigEnd);
$("#sigClear").onclick=()=>{state.firma=null;sigDirty=false;sx.clearRect(0,0,sig.width,sig.height);saveSoon();};

/* =========================================================
   CROQUIS
   ========================================================= */
const sk=$("#sk"),ctx=sk.getContext("2d");const S=900;
let tool="move",penColor="#c62828",sel=null,drag=null,bgImgEl=null;
const TYPES={
  propio:{name:"Vehículo propio",w:46,h:88,color:"#1f5fbf",prefix:"A"},
  tercero:{name:"Vehículo del tercero",w:46,h:88,color:"#c62828",prefix:"B"},
  auto:{name:"Otro vehículo",w:46,h:88,color:"#6b6f68",prefix:"V"},
  moto:{name:"Moto",w:24,h:62,color:"#e07a00",prefix:"M"},
  bici:{name:"Bicicleta",w:20,h:56,color:"#00897b",prefix:"Bi"},
  peaton:{name:"Peatón",w:40,h:40,color:"#7b1fa2",prefix:"P"},
  semaforo:{name:"Semáforo",w:26,h:66,color:"#222",prefix:"S"},
  flecha:{name:"Dirección",w:30,h:100,color:"#111",prefix:""},
  impacto:{name:"Punto de impacto",w:60,h:60,color:"#d32f2f",prefix:""},
  texto:{name:"Referencia",w:0,h:0,color:"#111",prefix:""}
};
const PALETTE=["propio","tercero","auto","moto","bici","peaton","semaforo","flecha","impacto"];

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function drawShape(c,it,showLabel=true){
  const T=TYPES[it.type],w=T.w,h=T.h;
  c.save();c.lineJoin="round";
  if(it.type==="propio"||it.type==="tercero"||it.type==="auto"){
    c.fillStyle=T.color;c.strokeStyle="#111";c.lineWidth=2.5;rr(c,-w/2,-h/2,w,h,11);c.fill();c.stroke();
    c.fillStyle="rgba(210,235,255,.95)";rr(c,-w/2+6,-h/2+15,w-12,17,4);c.fill();c.stroke();   // parabrisas (adelante = arriba)
    rr(c,-w/2+7,h/2-22,w-14,11,3);c.fill();c.stroke();
    c.fillStyle="#ffe082";c.fillRect(-w/2+4,-h/2+2,9,5);c.fillRect(w/2-13,-h/2+2,9,5);
  }else if(it.type==="moto"||it.type==="bici"){
    c.strokeStyle="#111";c.lineWidth=2.5;c.fillStyle="#222";
    rr(c,-4,-h/2,8,15,3);c.fill();rr(c,-4,h/2-15,8,15,3);c.fill();
    c.fillStyle=T.color;rr(c,-w/2+3,-h/2+12,w-6,h-24,6);c.fill();c.stroke();
    c.beginPath();c.moveTo(-w/2-6,-h/2+16);c.lineTo(w/2+6,-h/2+16);c.lineWidth=4;c.stroke();
  }else if(it.type==="peaton"){
    c.fillStyle=T.color;c.strokeStyle="#111";c.lineWidth=2.5;
    c.beginPath();c.ellipse(0,4,w/2,h/2-8,0,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle="#f1c9a5";c.beginPath();c.arc(0,-2,9,0,Math.PI*2);c.fill();c.stroke();
    c.beginPath();c.moveTo(0,-h/2-2);c.lineTo(-6,-h/2+6);c.lineTo(6,-h/2+6);c.closePath();c.fillStyle="#111";c.fill();
  }else if(it.type==="semaforo"){
    c.fillStyle="#1d1d1d";c.strokeStyle="#000";c.lineWidth=2;rr(c,-w/2,-h/2,w,h,6);c.fill();c.stroke();
    const cols=["#e53935","#fdd835","#43a047"];
    cols.forEach((col,k)=>{c.beginPath();c.arc(0,-h/2+12+k*21,7.5,0,Math.PI*2);c.fillStyle=(it.light===undefined||it.light===k)?col:"#4a4a4a";c.fill();});
  }else if(it.type==="flecha"){
    c.fillStyle=T.color;c.beginPath();c.moveTo(0,-h/2);c.lineTo(w/2+6,-h/2+30);c.lineTo(6,-h/2+30);c.lineTo(6,h/2);c.lineTo(-6,h/2);c.lineTo(-6,-h/2+30);c.lineTo(-w/2-6,-h/2+30);c.closePath();c.fill();
  }else if(it.type==="impacto"){
    c.fillStyle="#ffeb3b";c.strokeStyle=T.color;c.lineWidth=3;c.beginPath();
    for(let k=0;k<16;k++){const r=k%2?13:30,a=k*Math.PI/8;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();
  }else if(it.type==="texto"){
    c.font="600 26px Arial,sans-serif";const tw=c.measureText(it.text).width;it._w=tw+16;it._h=36;
    c.fillStyle="rgba(255,255,255,.88)";c.strokeStyle="#111";c.lineWidth=1.5;rr(c,-tw/2-8,-18,tw+16,36,6);c.fill();c.stroke();
    c.fillStyle="#111";c.textAlign="center";c.textBaseline="middle";c.fillText(it.text,0,1);
  }
  c.restore();
  if(showLabel&&it.label){
    c.save();c.rotate(-(it.rot||0)*Math.PI/180);c.font="800 22px Arial,sans-serif";c.textAlign="center";c.textBaseline="middle";
    c.lineWidth=4;c.strokeStyle="#fff";c.strokeText(it.label,0,0);c.fillStyle="#111";c.fillText(it.label,0,0);c.restore();
  }
}
function itemSize(it){if(it.type==="texto")return[(it._w||120),(it._h||36)];const T=TYPES[it.type];return[T.w+12,T.h+4];}

function drawCross(c){
  c.fillStyle="#f3f3f1";c.fillRect(0,0,S,S);
  const a=330,b=570; // calles entre a y b
  const blocks=[[0,0,a,a],[b,0,S-b,a],[0,b,a,S-b],[b,b,S-b,S-b]];
  blocks.forEach(([x,y,w,h])=>{c.fillStyle="#dcdcd6";c.fillRect(x,y,w,h);c.fillStyle="#eaf1dd";c.strokeStyle="#333";c.lineWidth=2.5;
    const px=x===0?-4:x+16,py=y===0?-4:y+16,pw=w-20+(x===0?0:0),ph=h-20;c.fillRect(px,py,pw,ph);c.strokeRect(px,py,pw,ph);});
  // líneas centrales
  c.strokeStyle="#bdbdb6";c.lineWidth=3;c.setLineDash([22,18]);
  c.beginPath();c.moveTo(0,S/2);c.lineTo(a-40,S/2);c.moveTo(b+40,S/2);c.lineTo(S,S/2);c.moveTo(S/2,0);c.lineTo(S/2,a-40);c.moveTo(S/2,b+40);c.lineTo(S/2,S);c.stroke();c.setLineDash([]);
  // sendas peatonales
  c.fillStyle="#ffffff";
  for(let k=a+14;k<b-14;k+=26){c.fillRect(k,a-34,14,26);c.fillRect(k,b+8,14,26);c.fillRect(a-34,k,26,14);c.fillRect(b+8,k,26,14);}
  // puntos cardinales
  c.font="800 34px Arial,sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillStyle="#111";
  c.fillText("N",S/2,24);c.fillText("S",S/2,S-24);c.fillText("O",24,S/2);c.fillText("E",S-24,S/2);
  // nombres de calles
  c.font="700 26px Arial,sans-serif";c.fillStyle="#333";
  const H=state.sketch.calleH,V=state.sketch.calleV;
  if(H){c.fillText(H,a/2,S/2-46);c.fillText(H,b+(S-b)/2,S/2+46);}
  if(V){c.save();c.translate(S/2-46,a/2+20);c.rotate(-Math.PI/2);c.fillText(V,0,0);c.restore();c.save();c.translate(S/2+46,b+(S-b)/2-20);c.rotate(Math.PI/2);c.fillText(V,0,0);c.restore();}
}
function drawBg(c){
  const bg=state.sketch.bg;
  if(bg==="cruce")drawCross(c);
  else{c.fillStyle="#fff";c.fillRect(0,0,S,S);
    if(bg==="imagen"&&bgImgEl&&bgImgEl.complete&&bgImgEl.naturalWidth){const k=Math.min(S/bgImgEl.naturalWidth,S/bgImgEl.naturalHeight),w=bgImgEl.naturalWidth*k,h=bgImgEl.naturalHeight*k;c.drawImage(bgImgEl,(S-w)/2,(S-h)/2,w,h);}
    else if(bg==="imagen"){c.fillStyle="#888";c.font="600 28px Arial";c.textAlign="center";c.fillText("Tocá “Subir imagen” para elegir una foto o plano",S/2,S/2);}
    c.font="800 30px Arial";c.fillStyle="#111";c.textAlign="center";c.textBaseline="middle";c.fillText("N ↑",S-50,34);}
}
function renderSketch(c,withSel){
  drawBg(c);
  state.sketch.strokes.forEach(st=>{if(st.pts.length<2)return;c.strokeStyle=st.color;c.lineWidth=st.w;c.lineCap="round";c.lineJoin="round";c.beginPath();c.moveTo(st.pts[0][0],st.pts[0][1]);st.pts.forEach(p=>c.lineTo(p[0],p[1]));c.stroke();});
  state.sketch.items.forEach(it=>{c.save();c.translate(it.x,it.y);c.rotate((it.rot||0)*Math.PI/180);c.scale(it.scale||1,it.scale||1);drawShape(c,it);
    if(withSel&&it===sel){const[w,h]=itemSize(it);c.strokeStyle="#2f6b3a";c.lineWidth=2/(it.scale||1);c.setLineDash([8,6]);c.strokeRect(-w/2-6,-h/2-6,w+12,h+12);c.setLineDash([]);
      c.beginPath();c.moveTo(0,-h/2-6);c.lineTo(0,-h/2-38/(it.scale||1));c.stroke();
      c.beginPath();c.arc(0,-h/2-50/(it.scale||1),14/(it.scale||1),0,Math.PI*2);c.fillStyle="#2f6b3a";c.fill();
      c.strokeStyle="#fff";c.lineWidth=3/(it.scale||1);c.beginPath();c.arc(0,-h/2-50/(it.scale||1),7/(it.scale||1),-.3,Math.PI*1.4);c.stroke();}
    c.restore();});
}
function drawSketch(){renderSketch(ctx,true);renderSelbar();}
function skPos(e){const r=sk.getBoundingClientRect();return[(e.clientX-r.left)*S/r.width,(e.clientY-r.top)*S/r.height];}
function toLocal(it,x,y){const a=-(it.rot||0)*Math.PI/180,dx=x-it.x,dy=y-it.y,s=it.scale||1;return[(dx*Math.cos(a)-dy*Math.sin(a))/s,(dx*Math.sin(a)+dy*Math.cos(a))/s];}
function hit(x,y){
  if(sel){const[lx,ly]=toLocal(sel,x,y);const[,h]=itemSize(sel);const s=sel.scale||1;if(Math.hypot(lx,ly-(-h/2-50/s))<30/s)return{it:sel,rotate:true};}
  for(let i=state.sketch.items.length-1;i>=0;i--){const it=state.sketch.items[i];const[lx,ly]=toLocal(it,x,y);const[w,h]=itemSize(it);const pad=14/(it.scale||1);
    if(Math.abs(lx)<w/2+pad&&Math.abs(ly)<h/2+pad)return{it};}
  return null;
}
sk.addEventListener("pointerdown",e=>{
  e.preventDefault();sk.setPointerCapture(e.pointerId);const[x,y]=skPos(e);
  if(tool==="pen"){const st={color:penColor,w:6,pts:[[x,y]]};state.sketch.strokes.push(st);drag={pen:st};return;}
  const h=hit(x,y);
  if(h){sel=h.it;if(h.rotate)drag={rotate:true};else{drag={dx:x-sel.x,dy:y-sel.y};
      const i=state.sketch.items.indexOf(sel);state.sketch.items.splice(i,1);state.sketch.items.push(sel);}}
  else{sel=null;drag=null;}
  drawSketch();
});
sk.addEventListener("pointermove",e=>{
  if(!drag)return;const[x,y]=skPos(e);
  if(drag.pen){drag.pen.pts.push([x,y]);drawSketch();return;}
  if(!sel)return;
  if(drag.rotate){let a=Math.atan2(x-sel.x,-(y-sel.y))*180/Math.PI;a=Math.round(a/5)*5;sel.rot=(a+360)%360;}
  else{sel.x=Math.max(0,Math.min(S,x-drag.dx));sel.y=Math.max(0,Math.min(S,y-drag.dy));}
  drawSketch();
});
const skEnd=()=>{if(drag){drag=null;saveSoon();}};
sk.addEventListener("pointerup",skEnd);sk.addEventListener("pointercancel",skEnd);

function nextLabel(type){const p=TYPES[type].prefix;if(!p)return"";
  if(type==="propio")return"A";if(type==="tercero")return"B";
  const n=state.sketch.items.filter(i=>i.type===type).length+1;return p+n;}
function addItem(type,extra){
  const off=(state.sketch.items.length%5)*24;
  const it=Object.assign({type,x:S/2+off-48,y:S/2+off-48,rot:0,scale:1,label:nextLabel(type)},extra||{});
  if(type==="semaforo")it.light=0;
  state.sketch.items.push(it);sel=it;setTool("move");drawSketch();saveSoon();
}
// paleta
const pal=$("#palette");
PALETTE.forEach(t=>{const b=document.createElement("button");b.type="button";
  const c=document.createElement("canvas");c.width=80;c.height=80;const x=c.getContext("2d");x.translate(40,40);const T=TYPES[t];const k=Math.min(64/T.h,64/T.w,1);x.scale(k,k);drawShape(x,{type:t,light:undefined},false);
  b.appendChild(c);b.appendChild(document.createTextNode(T.name));b.onclick=()=>addItem(t);pal.appendChild(b);});
$("#sk_addtext").onclick=()=>{const v=clean($("#sk_text").value).slice(0,60);if(!v)return;addItem("texto",{text:v,label:""});$("#sk_text").value="";};

function renderSelbar(){
  const bar=$("#selbar");bar.innerHTML="";
  if(!sel){bar.innerHTML='<span class="lbl" style="font-weight:500">Tocá un elemento del croquis para moverlo, girarlo o borrarlo.</span>';return;}
  const T=TYPES[sel.type];const name=document.createElement("span");name.className="lbl";name.textContent=(sel.label?sel.label+" · ":"")+(sel.type==="texto"?"“"+sel.text+"”":T.name);bar.appendChild(name);
  const mk=(txt,fn,cls,aria)=>{const b=document.createElement("button");b.type="button";b.className="btn small "+(cls||"");b.textContent=txt;if(aria)b.setAttribute("aria-label",aria);b.onclick=()=>{fn();drawSketch();saveSoon();};bar.appendChild(b);};
  mk("⟲",()=>sel.rot=((sel.rot||0)+315)%360,"","Girar a la izquierda");
  mk("⟳",()=>sel.rot=((sel.rot||0)+45)%360,"","Girar a la derecha");
  mk("−",()=>sel.scale=Math.max(.5,(sel.scale||1)-.15),"","Achicar");
  mk("+",()=>sel.scale=Math.min(2.5,(sel.scale||1)+.15),"","Agrandar");
  if(sel.type==="semaforo")mk("Luz",()=>sel.light=((sel.light??-1)+1)%3,"","Cambiar luz encendida");
  mk("Eliminar",()=>{state.sketch.items.splice(state.sketch.items.indexOf(sel),1);sel=null;},"danger");
}
// herramientas
function setTool(t){tool=t;$("#tool_move").classList.toggle("on",t==="move");$("#tool_pen").classList.toggle("on",t==="pen");if(t==="pen"){sel=null;drawSketch();}}
$("#tool_move").onclick=()=>setTool("move");$("#tool_pen").onclick=()=>setTool("pen");
["#111111","#c62828","#1f5fbf","#2e7d32"].forEach(col=>{const b=document.createElement("button");b.type="button";b.className="swatch"+(col===penColor?" on":"");b.style.background=col;b.setAttribute("aria-label","Color de lápiz");
  b.onclick=()=>{penColor=col;$$(".swatch").forEach(s=>s.classList.remove("on"));b.classList.add("on");setTool("pen");};$("#penColors").appendChild(b);});
$("#sk_undo").onclick=()=>{state.sketch.strokes.pop();drawSketch();saveSoon();};
let clearArm=false;
$("#sk_clear").onclick=e=>{const b=e.currentTarget;if(!clearArm){clearArm=true;b.textContent="¿Seguro? Tocá de nuevo";setTimeout(()=>{clearArm=false;b.textContent="Borrar todo";},3000);return;}
  clearArm=false;b.textContent="Borrar todo";state.sketch.items=[];state.sketch.strokes=[];sel=null;drawSketch();saveSoon();};
$("#sk_calle_h").addEventListener("input",e=>{state.sketch.calleH=e.target.value;drawSketch();saveSoon();});
$("#sk_calle_v").addEventListener("input",e=>{state.sketch.calleV=e.target.value;drawSketch();saveSoon();});
function syncBgUI(){const bg=state.sketch.bg;$("#streetFields").hidden=bg!=="cruce";$("#imgRow").hidden=bg!=="imagen"||!state.sketch.bgImage;
  if(state.sketch.bgImage&&(!bgImgEl||bgImgEl.src!==state.sketch.bgImage)){bgImgEl=new Image();bgImgEl.onload=drawSketch;bgImgEl.src=state.sketch.bgImage;}}
$$('input[name="sk_bg"]').forEach(r=>r.addEventListener("change",()=>{state.sketch.bg=r.value;if(r.value==="imagen"&&!state.sketch.bgImage)$("#sk_file").click();syncBgUI();drawSketch();saveSoon();}));
$("#bg_img").nextElementSibling.addEventListener("click",()=>{if($("#bg_img").checked)$("#sk_file").click();});
$("#sk_pick").onclick=()=>$("#sk_file").click();
$("#sk_file").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const r=await fileToJpeg(f,1400,.85);state.sketch.bgImage=r.src;state.sketch.bg="imagen";$("#bg_img").checked=true;syncBgUI();drawSketch();saveSoon();}catch(err){alertMsg(err.message);}e.target.value="";});

/* =========================================================
   PDF (misma estética que el Word AN1-IN14-PN-ECON)
   ========================================================= */
const V="#1f2f5c"; // color de lo completado
const L=25,R=190,W=R-L;
const FOOT=[["Identificación","AN1-IN14-PN-ECON"],["Tipo de uso","Interno"],["Responsable de la aprobación","Jefe de Gestión económica financiera"],["Autor de la última actualización","Rodriguez  - Jefatura de Gestión económica financiera"],["Fecha de actualización","15 de marzo de 2016"]];
function clean(s,multi){s=String(s).replace(multi?/[\u0000-\u0009\u000B-\u001F\u007F]/g:/[\u0000-\u001F\u007F]/g," ");return s.trim();}
function F(id){const v=state.fields[id];return v==null?"":clean(v,id==="descripcion");}
function fmtDate(s){if(!s)return"";const[y,m,d]=s.split("-");return d&&m&&y?`${d}/${m}/${y}`:s;}

function buildPDF(){
  readFields();
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4",compress:true});
  doc.setProperties({title:"Anexo Gestión de Daños - Formulario Accidentes",subject:"Formulario de accidente",creator:"Formulario web de siniestros"});
  const sketchPNG=(()=>{const c=document.createElement("canvas");c.width=S;c.height=S;renderSketch(c.getContext("2d"),false);return c.toDataURL("image/png");})();

  function header(){
    doc.setFont("helvetica","bold");doc.setFontSize(12.5);doc.setTextColor("#000");doc.text("Anexo Gestión de Daños - Formulario Accidentes",L,22);
    if(LOGO)doc.addImage(LOGO,"JPEG",R-27,6,25,25);
    doc.setDrawColor("#a6a6a6");doc.setLineWidth(.6);doc.line(L,31.5,R,31.5);doc.setLineWidth(.25);doc.setDrawColor("#000");
  }
  function bar(y,t,h=5){doc.setFillColor("#000");doc.rect(L,y,W,h,"F");doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor("#fff");doc.text(t,L+W/2,y+h/2+1.1,{align:"center"});doc.setTextColor("#000");return y+h;}
  function sub(y,t){doc.setFillColor("#eaf1dd");doc.setDrawColor("#000");doc.setLineWidth(.25);doc.rect(L,y,W,4.6,"FD");doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor("#000");doc.text(t,L+W/2,y+3.3,{align:"center"});return y+4.6;}
  function val(text,x,y,maxW){if(!text)return;doc.setFont("helvetica","normal");doc.setTextColor(V);let fs=9;doc.setFontSize(fs);
    while(doc.getTextWidth(text)>maxW&&fs>6.5){fs-=.5;doc.setFontSize(fs);}
    let t=text;while(doc.getTextWidth(t)>maxW&&t.length>3)t=t.slice(0,-2);if(t!==text)t=t.slice(0,-1)+"...";doc.text(t,x,y);doc.setTextColor("#000");}
  function lv(label,v,x,y,end){doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor("#000");doc.text(label+" :",x,y);const lw=doc.getTextWidth(label+" : ");val(v,x+lw,y,end-(x+lw)-1);}
  function rows(y,list){ // list: [[ [label,value,xRel,endRel], ...], ...]
    const RH=6.4;list.forEach(r=>{r.forEach(([lab,v,xr,er])=>lv(lab,v,L+W*xr+1.5,y+4.3,L+W*er));y+=RH;});return y;}
  function boxAround(y0,y1){doc.setDrawColor("#000");doc.setLineWidth(.3);doc.rect(L,y0,W,y1-y0,"S");}
  function yesno(x,y,v,a="SI",b="NO",gap=12){doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor("#000");doc.text(a,x,y);doc.text("/",x+gap/2+.6,y);doc.text(b,x+gap,y);
    const pick=v===a||(v&&v.toUpperCase()===a.toUpperCase())?[x,a]:(v===b||(v&&v.toUpperCase()===b.toUpperCase())?[x+gap,b]:null);
    if(pick){const tw=doc.getTextWidth(pick[1]);doc.setDrawColor(V);doc.setLineWidth(.4);doc.ellipse(pick[0]+tw/2,y-1.1,tw/2+1.8,2.6,"S");doc.setDrawColor("#000");doc.setLineWidth(.25);}}
  function firma(y,h=17){doc.setDrawColor("#000");doc.setLineWidth(.3);doc.rect(L-1.5,y,W+3,h,"S");
    if(state.firma)doc.addImage(state.firma,"PNG",L+W/2-24,y+.8,48,16*(h-3)/16);
    const acl=F("aclaracion")||F("c_nombre");if(acl){doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(V);doc.text(acl,L+W/2,y+h-1.3,{align:"center"});doc.setTextColor("#000");}
    doc.setFillColor("#d9d9d9");doc.rect(L-1.5,y+h,W+3,4.4,"FD");doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text("Firma y aclaración",L+W/2,y+h+3.2,{align:"center"});return y+h+4.4;}
  function dotted(x1,x2,y){doc.setLineDashPattern([.25,.75],0);doc.setLineWidth(.3);doc.setDrawColor("#333");doc.line(x1,y,x2,y);doc.setLineDashPattern([],0);doc.setDrawColor("#000");}

  /* ---- Página 1 ---- */
  header();let y=37;
  let y0=y;y=bar(y,"DATOS PROPIOS");
  y=rows(y,[[["Patente",F("p_patente"),0,.4],["Modelo",F("p_modelo"),.4,1]]]);
  y=sub(y,"CONDUCTOR");
  y=rows(y,[[["Nombre y Apellido",F("c_nombre"),0,.72],["DNI",F("c_dni"),.72,1]],[["Domicilio",F("c_domicilio"),0,.72],["Legajo",F("c_legajo"),.72,1]]]);
  boxAround(y0,y);y+=5;

  const mismo=state.fields.t_mismo;
  y0=y;y=bar(y,"DATOS DEL TERCERO");y=sub(y,"CONDUCTOR");
  y=rows(y,[[["Nombre y Apellido",F("t_nombre"),0,.72],["DNI",F("t_dni"),.72,1]],[["Domicilio",F("t_domicilio"),0,.72],["Teléfono",F("t_telefono"),.72,1]],[["Cía. de Seguro",F("t_cia"),0,.72],["Nº Póliza",F("t_poliza"),.72,1]]]);
  y=sub(y,"PROPIETARIO");
  y=rows(y,[[["Nombre y Apellido",mismo?F("t_nombre"):F("pr_nombre"),0,.72],["DNI / CUIT",mismo?F("t_dni"):F("pr_dni"),.72,1]],[["Domicilio",mismo?F("t_domicilio"):F("pr_domicilio"),0,.72],["Teléfono",mismo?F("t_telefono"):F("pr_telefono"),.72,1]]]);
  y=sub(y,"VEHÍCULO");
  y=rows(y,[[["Patente",F("tv_patente"),0,1]],[["Modelo",F("tv_modelo"),0,1]]]);
  boxAround(y0,y);y+=5;

  y0=y;y=bar(y,"DATOS DEL SINIESTRO");
  const RH=6.4,xr=L+W*.415,xc=L+W*.585;
  lv("Fecha",fmtDate(F("s_fecha")),L+1.5,y+4.3,L+W*.45);lv("Hora",F("s_hora"),L+W*.45,y+4.3,R);y+=RH;
  lv("Dirección del Siniestro",F("s_direccion"),L+1.5,y+4.3,R);y+=RH;
  const R3=[["Iba Acompañado","s_acomp","Nombre y Apellido",F("s_acomp_nombre")],["Semáforo","s_semaforo","Color",F("s_semaforo_color")],["Señales Viales","s_senales","Indique cual",F("s_senales_cual")]];
  R3.forEach(([lab,rad,lab2,v2])=>{doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.text(lab+" :",L+1.5,y+4.3);yesno(xr,y+4.3,state.radios[rad]);lv(lab2,state.radios[rad]==="SI"?v2:"",xc,y+4.3,R);y+=RH;});
  lv("Estado del Tiempo",F("s_tiempo"),L+1.5,y+4.3,xc-2);lv("Tipo de Calzada",F("s_calzada"),xc,y+4.3,R);y+=RH;
  lv("Km/h al momento del Accidente",F("s_kmh"),L+1.5,y+4.3,R);y+=RH;
  y=sub(y,"TESTIGOS");
  y=rows(y,[[["Nombre y Apellido",F("w1_nombre"),0,.585],["Teléfono",F("w1_tel"),.585,1]],[["Nombre y Apellido",F("w2_nombre"),0,.585],["Teléfono",F("w2_tel"),.585,1]]]);
  boxAround(y0,y);y+=3.4;
  doc.setFontSize(7.6);doc.setFont("helvetica","bold");doc.text("Importante:",L,y);
  doc.setFont("helvetica","normal");doc.setFont("helvetica","bold");const iw=doc.getTextWidth("Importante:")+1.2;doc.setFont("helvetica","normal");
  doc.text("El presente formulario deberá ser completado por el conductor del vehículo siniestrado (*) y",L+iw,y);
  doc.text("presentado al Sector de Seguros el primer día hábil posterior al hecho.",L,y+3.3);
  const l2w=doc.getTextWidth("presentado al Sector de Seguros el primer día hábil posterior al hecho.  ");
  doc.setFont("helvetica","italic");doc.setFontSize(6.8);doc.text("(*) En caso de imposibilidad física, deberá",L+l2w,y+3.3);
  doc.text("ser realizado por el superior",L,y+6.4);y+=8.2;
  doc.setLineWidth(.3);doc.rect(L,y,W,4.8,"S");doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("Deberá adjuntar:",L+1.5,y+3.4);
  doc.setFont("helvetica","normal");doc.setFont("helvetica","bold");const aw=doc.getTextWidth("Deberá adjuntar:")+2;doc.setFont("helvetica","normal");doc.text("Fotocopia del Carnet de Conducir - Fotocopia de la Tarjeta Verde del Vehículo",L+1.5+aw,y+3.4);y+=9;
  firma(Math.min(y,239));

  /* ---- Página 2: gráfico + descripción ---- */
  doc.addPage();header();y=37;
  y=bar(y,"GRÁFICO DEL SINIESTRO",8)+6;
  const bs=78;doc.setLineWidth(.3);doc.rect(L,y,bs,bs,"S");doc.addImage(sketchPNG,"PNG",L+.6,y+.6,bs-1.2,bs-1.2);
  const rx=L+bs+5,rw=R-rx;doc.rect(rx,y,rw,bs,"S");
  // rosa de los vientos
  (function(cx,cy){doc.setDrawColor("#000");doc.setFillColor("#000");doc.setLineWidth(.2);
    doc.triangle(cx,cy-9,cx-1.6,cy,cx+1.6,cy,"F");doc.triangle(cx,cy+9,cx-1.6,cy,cx+1.6,cy,"S");doc.triangle(cx-9,cy,cx,cy-1.6,cx,cy+1.6,"S");doc.triangle(cx+9,cy,cx,cy-1.6,cx,cy+1.6,"S");
    doc.circle(cx,cy,4.5,"S");doc.setFont("times","normal");doc.setFontSize(7);doc.setTextColor("#000");doc.text("N",cx,cy-10,{align:"center"});doc.text("S",cx,cy+12.3,{align:"center"});doc.text("O",cx-11.6,cy+1,{align:"center"});doc.text("E",cx+11.4,cy+1,{align:"center"});})(R-15,y+16);
  doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text("Referencias del gráfico:",rx+2,y+5);
  let ly=y+11;const legend=[];
  if(state.sketch.bg==="cruce"){if(state.sketch.calleH)legend.push(["Calle E-O:",state.sketch.calleH]);if(state.sketch.calleV)legend.push(["Calle N-S:",state.sketch.calleV]);}
  if(state.sketch.bg==="imagen")legend.push(["Fondo:","Imagen/plano aportado"]);
  state.sketch.items.forEach(it=>{if(it.type==="texto"||it.type==="flecha")return;const T=TYPES[it.type];
    let n=T.name;if(it.type==="propio"&&F("p_patente"))n+=" ("+F("p_patente")+")";if(it.type==="tercero"&&F("tv_patente"))n+=" ("+F("tv_patente")+")";
    legend.push([it.label?it.label+":":"-",n]);});
  if(state.sketch.items.some(i=>i.type==="flecha"))legend.push(["->","Sentido de circulación"]);
  state.sketch.items.filter(i=>i.type==="texto").forEach(it=>legend.push(["-",it.text]));
  doc.setFontSize(7.5);doc.setFont("helvetica","bold");
  const lx=rx+2+Math.max(4,...legend.map(([a])=>doc.getTextWidth(a)))+2;
  legend.forEach(([a,b])=>{if(ly>y+bs-3)return;doc.setFont("helvetica","bold");doc.setTextColor("#000");doc.text(a,rx+2,ly);doc.setFont("helvetica","normal");doc.setTextColor(V);
    const lines=doc.splitTextToSize(b,R-lx-(ly<y+30?28:2));doc.text(lines[0],lx,ly);ly+=4.2;for(let k=1;k<lines.length&&ly<=y+bs-3;k++){doc.text(lines[k],lx,ly);ly+=4.2;}doc.setTextColor("#000");});
  y+=bs+6;
  y=bar(y,"DESCRIPCION DEL SINIESTRO",8)+6;
  doc.setFont("helvetica","normal");doc.setFontSize(9);
  const desc=doc.splitTextToSize(F("descripcion"),W-2);
  const LS=6.3,firstN=14;
  for(let k=0;k<firstN;k++){const yy=y+k*LS+3;dotted(L,R,yy);if(desc[k]){doc.setTextColor(V);doc.text(desc[k],L+1,yy-1);doc.setTextColor("#000");}}
  if(desc.length>firstN){doc.setFont("helvetica","italic");doc.setFontSize(7);doc.text("(continúa en hoja anexa)",R,y+firstN*LS+2.5,{align:"right"});}
  firma(239);
  let rest=desc.slice(firstN);
  while(rest.length){doc.addPage();header();y=bar(37,"DESCRIPCION DEL SINIESTRO (continuación)",8)+6;doc.setFont("helvetica","normal");doc.setFontSize(9);
    const n=Math.min(rest.length,30);for(let k=0;k<30;k++){const yy=y+k*LS+3;dotted(L,R,yy);if(rest[k]&&k<n){doc.setTextColor(V);doc.text(rest[k],L+1,yy-1);doc.setTextColor("#000");}}rest=rest.slice(n);}

  /* ---- Lesiones a terceros ---- */
  const lesReal=state.radios.les_hay==="SI"?state.lesionados.filter(p=>Object.values(p).some(v=>v)):[];
  const les=lesReal.length?lesReal:[blankLes()]; // la sección aparece siempre, aunque no haya lesionados
  for(let i=0;i<les.length;i+=2){
    doc.addPage();header();y=bar(37,"LESIONES A TERCEROS",7)+2;
    if(les.length<2){doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor("#000");doc.text("¿Hubo lesionados? :",L+1.5,y+4);yesno(L+W*.32,y+4,state.radios.les_hay);y+=7;}
    [les[i],les[i+1]].forEach(p=>{const b0=y;const x0=L+1.5;doc.setFontSize(8.5);
      const line=(fn)=>{fn();y+=7;};
      if(!p){return;}
      y+=1;
      line(()=>lv("Nombre y Apellido",p.nombre,x0,y+5,R-2));
      line(()=>{lv("DNI",p.dni,x0,y+5,L+W*.6);lv("Teléfono",p.telefono,L+W*.6,y+5,R-2);});
      line(()=>lv("Domicilio",p.domicilio,x0,y+5,R-2));
      line(()=>{doc.setFont("helvetica","normal");doc.text("Tipo de lesiones :",x0,y+5);yesnoPair(L+W*.32,y+5,p.tipo,"Leves","Graves",15);});
      line(()=>lv("Servicio de Emergencia",p.emergencia,x0,y+5,R-2));
      line(()=>lv("Centro Asistencial",p.centro,x0,y+5,R-2));
      line(()=>{doc.setFont("helvetica","normal");doc.text("Intervención Policial :",x0,y+5);yesnoPair(L+W*.34,y+5,p.policia,"Si","No",15);lv("Nº de Sumario",p.sumario,L+W*.6,y+5,R-2);});
      doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.text("Detalle de Lesiones:",x0,y+6);doc.setLineWidth(.2);doc.line(x0,y+6.6,x0+doc.getTextWidth("Detalle de Lesiones:"),y+6.6);y+=8;
      doc.setFontSize(8.8);const dl=doc.splitTextToSize(p.detalle||"",W-5);for(let k=0;k<4;k++){const yy=y+k*5.6+4.5;dotted(x0,R-2,yy);if(dl[k]){doc.setTextColor(V);doc.text(dl[k]+(k===3&&dl.length>4?" ...":""),x0+.5,yy-1);doc.setTextColor("#000");}}
      y+=4*5.6+3;doc.setLineWidth(.3);doc.rect(L,b0,W,y-b0,"S");});
    firma(Math.max(y+4,236));
  }

  /* ---- Adjuntos ---- */
  const atts=[...(state.att.carnet.length?state.att.carnet:[null]).map(a=>["Carnet de conducir",a]),...(state.att.tarjeta.length?state.att.tarjeta:[null]).map(a=>["Tarjeta verde del vehículo",a]),...state.att.otras.map(a=>["Foto del siniestro",a])];
  for(let i=0;i<atts.length;i+=2){
    doc.addPage();header();y=bar(37,"DOCUMENTACIÓN ADJUNTA",7)+4;
    atts.slice(i,i+2).forEach(([cap,a])=>{const bw=W,bh=100;
      if(!a){doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor("#000");doc.text(cap,L,y+3);doc.setLineWidth(.2);doc.rect(L,y+5,bw,bh-6,"S");
        doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor("#777");doc.text("(sin adjuntar)",L+bw/2,y+5+(bh-6)/2,{align:"center"});doc.setTextColor("#000");y+=bh+8;return;}
      const k=Math.min(bw/a.w,(bh-6)/a.h);const w=a.w*k,h=a.h*k;
      doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text(cap,L,y+3);doc.addImage(a.src,"JPEG",L+(bw-w)/2,y+5,w,h);doc.setLineWidth(.2);doc.rect(L+(bw-w)/2,y+5,w,h,"S");y+=bh+8;});
  }

  /* ---- Pie de página con control de documento ---- */
  const N=doc.getNumberOfPages();
  for(let p=1;p<=N;p++){doc.setPage(p);const fy=264,rh=3.7,c1=L+3,c2=L+62,c3=L+137,c4=L+156;
    doc.setLineWidth(.2);doc.setDrawColor("#000");doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor("#000");
    FOOT.forEach(([a,b],k)=>{const yy=fy+k*rh;doc.setFillColor("#d9d9d9");doc.rect(c1,yy,c2-c1,rh,"FD");doc.rect(c2,yy,c3-c2,rh,"S");doc.text(a,c1+1,yy+2.7);doc.text(b,c2+1,yy+2.7);});
    doc.setFillColor("#d9d9d9");doc.rect(c3,fy,c4-c3,rh,"FD");doc.text("Páginas",(c3+c4)/2,fy+2.7,{align:"center"});
    doc.rect(c3,fy+rh,c4-c3,rh*4,"S");doc.text(p+" de "+N,(c3+c4)/2,fy+rh*3+1,{align:"center"});}
  return doc;

  function yesnoPair(x,y,v,a,b,gap){doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.text(a,x,y);doc.text(b,x+gap,y);
    const pick=v===a?[x,a]:v===b?[x+gap,b]:null;if(pick){const tw=doc.getTextWidth(pick[1]);doc.setDrawColor(V);doc.setLineWidth(.4);doc.ellipse(pick[0]+tw/2,y-1.1,tw/2+2,2.7,"S");doc.setDrawColor("#000");doc.setLineWidth(.25);}}
}

function pdfName(){const d=F("s_fecha")||new Date().toISOString().slice(0,10);const p=(F("p_patente")||"").replace(/[^A-Za-z0-9]/g,"");return"Siniestro_"+d+(p?"_"+p:"")+".pdf";}
const status=(msg,err)=>{const s=$("#status");s.textContent=msg;s.className="status"+(err?" err":"");};
async function downloadsCap(){try{return window.claude&&window.claude.use?await window.claude.use("downloads"):null;}catch(e){return null;}}
$("#btnDownload").onclick=async()=>{
  try{status("Generando PDF…");const blob=buildPDF().output("blob");const name=pdfName();
    const dl=await downloadsCap();
    if(dl){try{await dl.save({filename:name,data:blob});status("PDF guardado: "+name);}catch(e){status(e&&e.code==="declined"?"Descarga cancelada.":"No se pudo descargar el PDF en esta vista.",e&&e.code!=="declined");}return;}
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    status("PDF descargado: "+name);
  }catch(e){status("No se pudo generar el PDF: "+(e.message||e),true);}
};
$("#btnShare").onclick=async()=>{
  try{const blob=buildPDF().output("blob");const file=new File([blob],pdfName(),{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Formulario de accidente",text:"Formulario de accidente – "+(F("c_nombre")||"")});status("Listo, PDF compartido.");}
    else status("Este navegador no permite compartir archivos. Descargá el PDF y envialo como adjunto.",true);
  }catch(e){if(e&&e.name==="AbortError")status("");else status("No se pudo compartir: "+(e.message||e),true);}
};
$("#btnMail").onclick=()=>{readFields();
  const body=["Formulario de accidente","","Conductor: "+F("c_nombre")+" (DNI "+F("c_dni")+", legajo "+F("c_legajo")+")","Vehículo propio: "+F("p_patente")+" "+F("p_modelo"),
    "Tercero: "+F("t_nombre")+" – "+F("tv_patente")+" "+F("tv_modelo")+" – Seguro: "+F("t_cia")+" póliza "+F("t_poliza"),
    "Fecha y hora: "+fmtDate(F("s_fecha"))+" "+F("s_hora"),"Lugar: "+F("s_direccion"),"","Descripción:",F("descripcion"),"","Adjunto el PDF del formulario completo."].join("\n");
  const to=F("mailTo");if(to&&!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(to)){status("Revisá la dirección de email.",true);return;}
  const href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("Denuncia de siniestro "+fmtDate(F("s_fecha"))+" "+F("p_patente"))+"&body="+encodeURIComponent(body);
  const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
  status("Si no se abrió tu correo, descargá el PDF y envialo manualmente"+(F("mailTo")?" a "+F("mailTo"):"")+".");
};
let resetArm=false;
$("#btnReset").onclick=e=>{const b=e.currentTarget;if(!resetArm){resetArm=true;b.textContent="¿Seguro? Tocá de nuevo para borrar";setTimeout(()=>{resetArm=false;b.textContent="Borrar todos los datos cargados";},3500);return;}
  dirty=false;location.reload();};

/* ---------- revisión ---------- */
function renderReview(){readFields();
  const req=[["c_nombre","Nombre del conductor"],["s_fecha","Fecha del siniestro"],["s_hora","Hora del siniestro"],["s_direccion","Dirección del siniestro"],["p_patente","Patente propia"],["p_modelo","Modelo del vehículo propio"],["t_nombre","Nombre del tercero"],["tv_patente","Patente del tercero"],["tv_modelo","Modelo del vehículo del tercero"],["descripcion","Descripción del hecho"]];
  const miss=req.filter(([id])=>!F(id)).map(([,n])=>n);
  if(!state.sketch.items.length&&!state.sketch.strokes.length&&state.sketch.bg!=="imagen")miss.push("Croquis del accidente");
  if(!state.firma)miss.push("Firma");
  if(!state.att.carnet.length)miss.push("Foto del carnet de conducir");
  if(!state.att.tarjeta.length)miss.push("Foto de la tarjeta verde");
  const r=$("#review");
  r.innerHTML=miss.length?'<p style="margin:0 0 6px;font-weight:600">Te falta completar:</p><ul class="miss"></ul><p class="hint" style="margin-top:8px">Igual podés generar el PDF; los campos vacíos quedan en blanco para completar a mano.</p>':'<p class="ok" style="margin:0">Está todo completo. Ya podés descargar o enviar el PDF.</p>';
  const ul=r.querySelector("ul");if(ul)miss.forEach(m=>{const li=document.createElement("li");li.textContent=m;ul.appendChild(li);});
}

/* ---------- sin almacenamiento ----------
   Por diseño no se guarda nada (ni localStorage, ni cookies, ni servidor).
   Los datos viven solo en la memoria de la pestaña y se borran al cerrarla. */
let dirty=false;
function saveSoon(){dirty=true;}
function save(){}
function load(){return 0;}
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});

/* ---------- ejemplo ---------- */
$("#loadSample").onclick=()=>{
  Object.assign(state.fields,{p_patente:"AE 482 KT",p_modelo:"Toyota Hilux 2021",c_nombre:"Ejemplo: Juan Pérez",c_dni:"30111222",c_domicilio:"Mitre 1450, Mendoza",c_legajo:"4471",
    t_nombre:"Ejemplo: María Gómez",t_dni:"28999555",t_domicilio:"Rivadavia 220, Mendoza",t_telefono:"2615550101",t_cia:"Seguros Ejemplo S.A.",t_poliza:"00-123456",t_mismo:true,
    tv_patente:"AC 115 PL",tv_modelo:"Fiat Cronos 2019",s_fecha:new Date().toISOString().slice(0,10),s_hora:"08:40",s_direccion:"Av. San Martín y Belgrano, Mendoza",
    s_semaforo_color:"Verde",s_tiempo:"Bueno",s_calzada:"Asfalto",s_kmh:"30",w1_nombre:"Ejemplo: Carlos Ruiz",w1_tel:"2615550199",
    descripcion:"Circulaba por Av. San Martín en dirección norte con el semáforo en verde. Al cruzar Belgrano, el vehículo B que venía por Belgrano hacia el este no respetó el semáforo en rojo y me impactó en el lateral derecho. Ambos vehículos quedaron detenidos sobre la senda peatonal. No hubo lesionados.",
    aclaracion:"Juan Pérez"});
  Object.assign(state.radios,{s_acomp:"NO",s_semaforo:"SI",s_senales:"NO",les_hay:"NO"});
  state.sketch=Object.assign(state.sketch,{bg:"cruce",calleH:"Belgrano",calleV:"Av. San Martín",strokes:[],items:[
    {type:"propio",x:490,y:520,rot:0,scale:1,label:"A"},{type:"tercero",x:420,y:455,rot:90,scale:1,label:"B"},{type:"impacto",x:470,y:470,rot:0,scale:.8,label:""},
    {type:"semaforo",x:600,y:600,rot:0,scale:1,label:"S1",light:2},{type:"semaforo",x:300,y:300,rot:0,scale:1,label:"S2",light:0},
    {type:"flecha",x:520,y:720,rot:0,scale:1,label:""},{type:"flecha",x:200,y:455,rot:90,scale:1,label:""},{type:"texto",x:735,y:160,rot:0,scale:1,label:"",text:"Kiosco"}]});
  sel=null;writeFields();dirty=true;status("");
};
if(MODO_PRUEBA)$("#loadSample").hidden=false;

/* ---------- inicio ---------- */
const startStep=load();
if(!state.fields.s_fecha){const n=new Date();state.fields.s_fecha=new Date(n-n.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
writeFields();sigLoad();go(startStep);drawSketch();
})();
