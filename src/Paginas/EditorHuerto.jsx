import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Save, X, RotateCcw, ZoomIn, ZoomOut,
  MousePointer, Square, Leaf, Droplets, Sprout,
  History, Clock, Bell, AlertTriangle, Ruler
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL;
const CELL     = 48;        // px por celda (cada celda = ~40cm real)
const CM_CELDA = 40;        // centímetros reales por celda
const HEADER_H = 28;
const MIN_CELL = 2;
const FREQ_RIEGO_DEFAULT = 2;

// ─── Tamaños de maceta ────────────────────────────────────
const TAMANOS_MACETA = [
  { id:"chica",   label:"Chica",   cols:1, filas:1, desc:"1×1" },
  { id:"mediana", label:"Mediana", cols:2, filas:2, desc:"2×2" },
  { id:"grande",  label:"Grande",  cols:3, filas:3, desc:"3×3" },
  { id:"enorme",  label:"Enorme",  cols:4, filas:4, desc:"4×4+" },
];
const CULTIVOS_POR_TAMANO = {
  chica:   ["hierbas","rabano","ajo"],
  mediana: ["hierbas","rabano","ajo","lechuga","espinaca","flores"],
  grande:  ["hierbas","rabano","ajo","lechuga","espinaca","flores","zanahoria","cebolla","fresa"],
  enorme:  null,
};

// ─── Tipos de zona ────────────────────────────────────────
const TIPOS_ZONA = [
  { id:"maceta",      label:"Maceta",      emoji:"🪴", color:"#92400e", fill:"#fef3c7", border:"#f59e0b" },
  { id:"cantero",     label:"Cantero",     emoji:"🟫", color:"#78350f", fill:"#fde68a", border:"#b45309" },
  { id:"jardin",      label:"Jardín",      emoji:"🌳", color:"#14532d", fill:"#dcfce7", border:"#16a34a" },
  { id:"invernadero", label:"Invernadero", emoji:"🏠", color:"#1e3a5f", fill:"#e0f2fe", border:"#0284c7" },
];

// ─── Conversión metros ↔ celdas ───────────────────────────
const mToCeldas = (m) => Math.max(MIN_CELL, Math.round((m * 100) / CM_CELDA));
const celdasToM = (n) => ((n * CM_CELDA) / 100).toFixed(1);

// ─── Estados ──────────────────────────────────────────────
const ESTADOS_ORDEN = ["sembrado","germinacion","crecimiento","maduracion","listo"];
const ESTADO_EMOJI  = { sembrado:"🌱",germinacion:"🌿",crecimiento:"🍃",maduracion:"🌸",listo:"✅",cosechado:"🎉",muerta_sequia:"💀",muerta_ahogo:"💀",pasada:"🍂" };
const ESTADO_COLOR  = { sembrado:"#bbf7d0",germinacion:"#86efac",crecimiento:"#4ade80",maduracion:"#f9a8d4",listo:"#fef08a",cosechado:"#e5e7eb",muerta_sequia:"#fca5a5",muerta_ahogo:"#fca5a5",pasada:"#d1d5db" };
const ESTADO_LABEL  = { sembrado:"Sembrado",germinacion:"Germinación",crecimiento:"Crecimiento",maduracion:"Maduración",listo:"Listo p/ cosechar",cosechado:"Cosechado",muerta_sequia:"Muerta por sequía",muerta_ahogo:"Muerta por ahogo",pasada:"Pasada — calidad reducida" };

const esMuerta = s => ["muerta_sequia","muerta_ahogo"].includes(s);
const esMala   = s => esMuerta(s) || s === "pasada";

function calcularEstadoVisual(pl, offsetDias=0, duracionDias=60) {
  if (!pl) return null;
  if (esMuerta(pl.estado) || pl.estado==="pasada" || pl.estado==="cosechado") return pl.estado;
  const hoy     = new Date(Date.now() + offsetDias*86400000);
  const siembra = new Date(pl.fecha_siembra);
  const diasP   = Math.max(0, Math.floor((hoy-siembra)/86400000));
  const diasSR  = pl.ultimo_riego ? Math.max(0,Math.floor((hoy-new Date(pl.ultimo_riego))/86400000)) : diasP;
  if (diasSR > FREQ_RIEGO_DEFAULT*3) return "muerta_sequia";
  if (diasP-duracionDias > duracionDias*0.5) return "pasada";
  const pct = diasP/duracionDias;
  if (pct<0.1) return "sembrado";
  if (pct<0.3) return "germinacion";
  if (pct<0.6) return "crecimiento";
  if (pct<0.9) return "maduracion";
  return "listo";
}
function calcularSaludVisual(pl, offsetDias=0) {
  if (!pl || esMuerta(pl.estado)) return pl?0:100;
  const hoy    = new Date(Date.now()+offsetDias*86400000);
  const siemb  = new Date(pl.fecha_siembra);
  const diasSR = pl.ultimo_riego ? Math.max(0,Math.floor((hoy-new Date(pl.ultimo_riego))/86400000)) : Math.max(0,Math.floor((hoy-siemb)/86400000));
  return Math.max(0, 100 - Math.max(0,diasSR-FREQ_RIEGO_DEFAULT)*15);
}
function estadoRiegoVisual(ultimoRiego, offsetDias=0) {
  if (!ultimoRiego) return {emoji:"🔴",label:"Sin riego",color:"#fca5a5",nivel:"seca"};
  const hoy  = new Date(Date.now()+offsetDias*86400000);
  const dias = Math.max(0,Math.floor((hoy-new Date(ultimoRiego))/86400000));
  if (dias===0)                     return {emoji:"💦",label:"Regada hoy", color:"#bfdbfe",nivel:"bien"};
  if (dias<=FREQ_RIEGO_DEFAULT)     return {emoji:"✅",label:"Bien",       color:"#bbf7d0",nivel:"bien"};
  if (dias<=FREQ_RIEGO_DEFAULT*1.5) return {emoji:"⚠️",label:"Pronto",    color:"#fef08a",nivel:"alerta"};
  return                                   {emoji:"🔴",label:"Seca",       color:"#fca5a5",nivel:"seca"};
}

// ─── Helpers canvas ───────────────────────────────────────
let _uid = Date.now();
const uid = () => `z_${_uid++}`;
function ptCanvas(e,ref,pan,zoom) { const r=ref.current.getBoundingClientRect(); return {x:(e.clientX-r.left-pan.x)/zoom,y:(e.clientY-r.top-pan.y)/zoom}; }
function crearCeldas(f,c) { return Array.from({length:f},()=>Array(c).fill(null)); }
function resizeCeldas(celdas,nC,nF) { const oF=celdas.length,oC=celdas[0]?.length||0; return Array.from({length:nF},(_,fi)=>Array.from({length:nC},(_,ci)=>fi<oF&&ci<oC?celdas[fi][ci]:null)); }
function coordGlobal(zi,fi,ci) { return {fila:zi*100+fi,columna:ci}; }
function cultivoPermitido(nombre,zona) { if(zona.tipo!=="maceta") return true; const p=CULTIVOS_POR_TAMANO[zona.tamanoMaceta]; return !p||p.some(x=>nombre?.toLowerCase().includes(x)); }

function crearZona(tipo, x, y, config) {
  // config: { tamanoMaceta } | { cols, filas } | { largoM, anchoM } | { largoM, anchoCantero }
  const esMaceta = tipo.id==="maceta";
  const esCantero = tipo.id==="cantero";
  let cols, filas, metadatos={};

  if (esMaceta) {
    const t=TAMANOS_MACETA.find(t=>t.id===config.tamanoMaceta)||TAMANOS_MACETA[1];
    cols=t.cols; filas=t.filas;
    metadatos={tamanoMaceta:config.tamanoMaceta};
  } else if (esCantero) {
    // Ancho fijo 1.2m (3 celdas), largo configurable
    const anchoFijoM = config.anchoCantero || 1.2;
    cols = Math.max(MIN_CELL, mToCeldas(config.largoM || 2));
    filas = Math.max(1, mToCeldas(anchoFijoM));
    metadatos={largoM:config.largoM||2, anchoCanteroM:anchoFijoM};
  } else {
    // Jardín e invernadero: largo × ancho libres
    cols  = Math.max(MIN_CELL, mToCeldas(config.largoM || 3));
    filas = Math.max(MIN_CELL, mToCeldas(config.anchoM || 2));
    metadatos={largoM:config.largoM||3, anchoM:config.anchoM||2};
  }

  const nombre = esMaceta ? `Maceta ${config.tamanoMaceta}`
    : esCantero ? `Cantero ${metadatos.largoM}m`
    : tipo.id==="jardin" ? `Jardín ${metadatos.largoM}×${metadatos.anchoM}m`
    : `Invernadero ${metadatos.largoM}×${metadatos.anchoM}m`;

  return {
    id:uid(), tipo:tipo.id,
    nombre,
    fija:esMaceta, x, y,
    w:cols*CELL, h:filas*CELL+HEADER_H,
    celdas:crearCeldas(filas,cols),
    ...metadatos,
  };
}

// ─── Toast ────────────────────────────────────────────────
function useToast() {
  const [msgs,setMsgs]=useState([]);
  const show=useCallback((m,tipo="ok")=>{ const id=Date.now()+Math.random(); setMsgs(p=>[...p,{id,m,tipo}]); setTimeout(()=>setMsgs(p=>p.filter(x=>x.id!==id)),4000); },[]);
  const Toast=(
    <div className="fixed top-16 right-4 z-[20000] flex flex-col gap-2 pointer-events-none">
      {msgs.map(({id,m,tipo})=>(<div key={id} className={`text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl ${tipo==="error"?"bg-red-600":tipo==="warn"?"bg-amber-500":"bg-gray-900"}`}>{m}</div>))}
    </div>
  );
  return {show,Toast};
}

// ─── Barra de salud ───────────────────────────────────────
function BarraSalud({salud}) {
  const color=salud>60?"#22c55e":salud>30?"#f59e0b":"#ef4444";
  return <div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full transition-all duration-500" style={{width:`${salud}%`,backgroundColor:color}}/></div>;
}

// ─── Modal Maceta ─────────────────────────────────────────
function ModalMaceta({onConfirmar,onCancelar}) {
  const [t,setT]=useState("mediana");
  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <p className="font-black text-gray-800 mb-1">¿Qué tamaño de maceta?</p>
        <p className="text-xs text-gray-400 mb-4">El tamaño define qué plantas puedes cultivar</p>
        <div className="space-y-2 mb-5">
          {TAMANOS_MACETA.map(tm=>{
            const p=CULTIVOS_POR_TAMANO[tm.id];
            return (
              <button key={tm.id} onClick={()=>setT(tm.id)} className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${t===tm.id?"border-amber-500 bg-amber-50":"border-gray-200 bg-gray-50 hover:border-amber-200"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">🪴 {tm.label} <span className="text-gray-400 font-normal text-xs ml-1">{tm.desc}</span></span>
                  {t===tm.id&&<span className="text-amber-500 font-black">✓</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p?`Solo: ${p.join(", ")}`:"Todos los cultivos"}</p>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={()=>onConfirmar(t)} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm">Agregar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Cantero (ancho FIJO 1.2m, solo pide el largo) ──
const ANCHO_CANTERO_FIJO = 1.2; // metros — estándar de huerta
function ModalCantero({onConfirmar,onCancelar}) {
  const [largo,setLargo]=useState(2);
  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🟫</span><p className="font-black text-gray-800">Nuevo cantero</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2">
          <span className="text-lg shrink-0">📏</span>
          <p className="text-xs text-amber-700"><span className="font-black">Ancho fijo: 1.2m</span> — el estándar de huerta para alcanzar el centro sin pisar la tierra. Solo necesitas definir el largo.</p>
        </div>

        <div className="mb-5">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">¿Cuánto mide de largo?</p>
          <div className="flex items-center gap-3">
            <input type="range" min={0.5} max={10} step={0.5} value={largo} onChange={e=>setLargo(Number(e.target.value))} className="flex-1 accent-amber-500"/>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center min-w-[72px]">
              <p className="font-black text-amber-700 text-xl">{largo}m</p>
              <p className="text-xs text-amber-400">{mToCeldas(largo)} celdas</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          {[1,2,3,4,5,6].map(v=>(
            <button key={v} onClick={()=>setLargo(v)} className={`py-2 rounded-xl border-2 text-sm font-bold transition ${largo===v?"border-amber-500 bg-amber-50 text-amber-700":"border-gray-200 text-gray-400 hover:border-amber-200"}`}>
              {v}m
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs text-gray-500">
          Cantero resultante: <span className="font-bold text-gray-700">{largo}m largo × {ANCHO_CANTERO_FIJO}m ancho</span>
          <span className="ml-1 text-gray-400">· {(largo*ANCHO_CANTERO_FIJO).toFixed(1)} m² · {mToCeldas(largo)}×{mToCeldas(ANCHO_CANTERO_FIJO)} celdas</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={()=>onConfirmar({largoM:largo,anchoCantero:ANCHO_CANTERO_FIJO})} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm">Agregar cantero</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Jardín/Invernadero (largo × ancho libres) ──────
function ModalDimension({tipo,onConfirmar,onCancelar}) {
  const [largo,setLargo]=useState(tipo.id==="invernadero"?4:3);
  const [ancho,setAncho]=useState(tipo.id==="invernadero"?3:2);
  const maxL=tipo.id==="invernadero"?20:30, maxA=tipo.id==="invernadero"?15:20;
  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{tipo.emoji}</span><p className="font-black text-gray-800">Configurar {tipo.label}</p></div>
        <p className="text-xs text-gray-400 mb-5">Define las dimensiones reales en metros</p>

        {[{label:"Largo",val:largo,set:setLargo,max:maxL},{label:"Ancho",val:ancho,set:setAncho,max:maxA}].map(({label,val,set,max})=>(
          <div key={label} className="mb-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{label}</p>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={max} step={0.5} value={val} onChange={e=>set(Number(e.target.value))} className="flex-1"/>
              <div className="rounded-xl px-3 py-2 text-center min-w-[64px]" style={{backgroundColor:tipo.fill,borderColor:tipo.border,border:"1px solid"}}>
                <p className="font-black text-lg" style={{color:tipo.color}}>{val}m</p>
                <p className="text-xs opacity-60" style={{color:tipo.color}}>{mToCeldas(val)} celdas</p>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-xl p-3 mb-5 text-xs" style={{backgroundColor:tipo.fill+"88"}}>
          <span style={{color:tipo.color}}>Resultado: <span className="font-bold">{largo}m × {ancho}m</span> · {mToCeldas(largo)} × {mToCeldas(ancho)} celdas · superficie {(largo*ancho).toFixed(1)} m²</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={()=>onConfirmar({largoM:largo,anchoM:ancho})} className="flex-1 py-2.5 text-white rounded-xl font-black text-sm" style={{backgroundColor:tipo.border}}>Agregar {tipo.label}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de advertencia al salir ────────────────────────
function ModalSalirSinGuardar({onGuardarYSalir,onSalirSinGuardar,onCancelar,guardando}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[10002] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl shrink-0"><AlertTriangle className="w-5 h-5 text-amber-500"/></div>
          <div>
            <p className="font-black text-gray-800 mb-1">¿Salir sin guardar?</p>
            <p className="text-sm text-gray-500">Tienes cambios en el layout que no se han guardado. Las plantas y riegos ya están guardados, pero las posiciones de zonas se perderán.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onGuardarYSalir} disabled={guardando} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm disabled:opacity-50">
            {guardando?"Guardando...":"💾 Guardar y salir"}
          </button>
          <button onClick={onSalirSinGuardar} className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm">
            Salir sin guardar
          </button>
          <button onClick={onCancelar} className="w-full py-2.5 border-2 border-gray-200 text-gray-500 rounded-xl font-bold text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal plantación ─────────────────────────────────────
function ModalPlantacion({plantacion,actividades,cargando,duracionDias,offsetDias,onRegar,onCosechar,onLimpiar,onCerrar}) {
  if (!plantacion) return null;
  const estadoSim = calcularEstadoVisual(plantacion,offsetDias,duracionDias);
  const saludSim  = calcularSaludVisual(plantacion,offsetDias);
  const riegoEst  = estadoRiegoVisual(plantacion.ultimo_riego,offsetDias);
  const hoy       = new Date(Date.now()+offsetDias*86400000);
  const siembra   = new Date(plantacion.fecha_siembra);
  const diasP     = Math.max(0,Math.floor((hoy-siembra)/86400000));
  const diasSR    = plantacion.ultimo_riego ? Math.max(0,Math.floor((hoy-new Date(plantacion.ultimo_riego))/86400000)) : diasP;
  const fechaCosecha = duracionDias ? (()=>{ const d=new Date(siembra); d.setDate(d.getDate()+duracionDias); return d.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"}); })() : null;
  const pct       = Math.min(100,Math.round((diasP/duracionDias)*100));
  const muerta    = esMuerta(estadoSim)||esMuerta(plantacion.estado);
  const pasada    = estadoSim==="pasada"||plantacion.estado==="pasada";
  const listo     = estadoSim==="listo"||plantacion.estado==="listo";
  const cosechada = plantacion.estado==="cosechado";

  const proximosRiegos = useMemo(()=>{
    if(muerta) return [];
    const arr=[]; for(let d=1;d<=7;d++){ if((diasSR+d)%FREQ_RIEGO_DEFAULT===0) arr.push(d); } return arr.slice(0,3);
  },[diasSR,muerta]);

  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col my-4">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {plantacion.cultivo_imagen ? <img src={plantacion.cultivo_imagen} className="w-12 h-12 rounded-xl object-cover" alt=""/> : <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🌱</div>}
              <div>
                <p className="font-black text-gray-800 text-base">{plantacion.cultivo_nombre}</p>
                <p className="text-xs text-gray-400">Fila {plantacion.fila} · Col {plantacion.columna}</p>
              </div>
            </div>
            <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black" style={{backgroundColor:(ESTADO_COLOR[estadoSim]||"#e5e7eb")+"99",color:"#374151"}}>
              {ESTADO_EMOJI[estadoSim]} {ESTADO_LABEL[estadoSim]||estadoSim}
            </span>
            {offsetDias>0&&<span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full font-semibold">🕐 +{offsetDias}d simulados</span>}
          </div>
          {(muerta||pasada)&&(
            <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${muerta?"bg-red-50 border border-red-200":"bg-amber-50 border border-amber-200"}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${muerta?"text-red-500":"text-amber-500"}`}/>
              <p className={`text-xs font-semibold ${muerta?"text-red-700":"text-amber-700"}`}>
                {muerta ? (estadoSim==="muerta_sequia"||plantacion.estado==="muerta_sequia" ? `Sin riego por ${diasSR} días — muerta por sequía` : "Regada en exceso — raíces ahogadas") : `${diasP-duracionDias} días sin cosechar — calidad reducida`}
              </p>
            </div>
          )}
        </div>

        {/* Métricas */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">🌱 Plantado hace</p><p className="font-black text-gray-800">{diasP} día{diasP!==1?"s":""}</p></div>
            <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">🗓 Cosecha estimada</p><p className="font-black text-green-700 text-sm">{fechaCosecha||"—"}</p></div>
            <div className="rounded-xl p-3" style={{backgroundColor:riegoEst.color+"55"}}><p className="text-xs text-gray-400 mb-0.5">💧 Riego</p><p className="font-black text-sm">{riegoEst.emoji} {riegoEst.label}</p><p className="text-xs text-gray-400">{diasSR>0?`hace ${diasSR}d`:"regada hoy"}</p></div>
            <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">📅 Próx. riego</p><p className="font-black text-sm">{plantacion.proximo_riego||"—"}</p></div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1.5"><span className="font-bold text-gray-600">❤️ Salud</span><span className={`font-black ${saludSim>60?"text-green-600":saludSim>30?"text-amber-500":"text-red-500"}`}>{saludSim}%</span></div>
            <BarraSalud salud={saludSim}/>
          </div>
          {!muerta&&(
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Progreso</span><span className="font-bold text-gray-700">{pct}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{width:`${pct}%`,background:pct>=100?"#22c55e":"linear-gradient(90deg,#86efac,#22c55e)"}}/></div>
              <div className="flex justify-between text-xs text-gray-300 mt-1">{ESTADOS_ORDEN.map(s=><span key={s} className={estadoSim===s?"text-emerald-600 font-bold":""}>{ESTADO_EMOJI[s]}</span>)}</div>
            </div>
          )}
          {proximosRiegos.length>0&&(
            <div><p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">💧 Riegos planificados</p>
              <div className="flex gap-2">{proximosRiegos.map((d,i)=><div key={i} className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-2 text-center"><p className="text-xs text-blue-400">en {d}d</p><p className="text-xs font-black text-blue-700">💧</p></div>)}</div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 border-b border-gray-100 flex gap-2 flex-wrap">
          {!muerta&&!cosechada&&<button onClick={onRegar} disabled={cargando} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"><Droplets className="w-4 h-4"/>Regar ahora</button>}
          {(listo||pasada)&&!muerta&&!cosechada&&<button onClick={onCosechar} disabled={cargando} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">✂️ {pasada?"Cosechar (↓calidad)":"Cosechar"}</button>}
          {(muerta||pasada||cosechada)&&<button onClick={onLimpiar} disabled={cargando} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">🧹 Limpiar celda</button>}
        </div>

        {/* Historial */}
        <div className="p-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><History className="w-3.5 h-3.5"/>Historial de actividad</p>
          {cargando ? <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>
          : actividades.length===0 ? <div className="text-center py-4"><p className="text-2xl mb-1">📋</p><p className="text-xs text-gray-400">Sin actividades aún</p></div>
          : <div className="space-y-2 max-h-48 overflow-y-auto">
              {actividades.map((a,i)=>{
                const iconos={riego:"💧",cosecha:"✂️",siembra:"🌱",muerte:"💀",limpieza:"🧹"};
                const colores={riego:"#bfdbfe",cosecha:"#fef08a",siembra:"#dcfce7",muerte:"#fca5a5",limpieza:"#e5e7eb"};
                return <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100" style={{backgroundColor:(colores[a.tipo_actividad]||"#f9fafb")+"aa"}}>
                  <span className="text-xl leading-none mt-0.5">{iconos[a.tipo_actividad]||"📌"}</span>
                  <div className="flex-1"><p className="text-xs font-bold text-gray-700 capitalize">{a.tipo_actividad}</p>{a.descripcion&&<p className="text-xs text-gray-500">{a.descripcion}</p>}<p className="text-xs text-gray-400 mt-0.5">{new Date(a.fecha).toLocaleString("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p></div>
                </div>;
              })}
            </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Panel actividades ────────────────────────────────────
function PanelActividades({actividades,plantacionesBD,cultivosBD,offsetDias,onCerrar}) {
  const [tab,setTab]=useState("actividad");
  const riegoPend=useMemo(()=>Object.values(plantacionesBD).filter(p=>!esMuerta(p.estado)&&p.estado!=="cosechado"&&estadoRiegoVisual(p.ultimo_riego,offsetDias).nivel!=="bien"),[plantacionesBD,offsetDias]);
  const alertas=useMemo(()=>Object.values(plantacionesBD).filter(p=>{ const dur=cultivosBD.find(c=>c.id===p.cultivo_tipo)?.duracion_dias||60; return esMala(calcularEstadoVisual(p,offsetDias,dur))||esMuerta(p.estado)||p.estado==="pasada"; }),[plantacionesBD,offsetDias,cultivosBD]);
  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-[9000] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <p className="font-black text-gray-800 flex items-center gap-2"><History className="w-4 h-4"/>Actividad</p>
        <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex border-b border-gray-100 shrink-0">
        {[{id:"actividad",label:"📋 Historial",n:actividades.length},{id:"riego",label:"💧 Riego",n:riegoPend.length},{id:"alertas",label:"⚠️ Alertas",n:alertas.length}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 py-2.5 text-xs font-black border-b-2 transition ${tab===t.id?"border-emerald-500 text-emerald-600":"border-transparent text-gray-400"}`}>
            {t.label}{t.n>0&&<span className={`ml-1 rounded-full px-1.5 text-xs ${tab===t.id?"bg-emerald-100 text-emerald-600":"bg-red-100 text-red-600"}`}>{t.n}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab==="actividad"&&(actividades.length===0?<div className="text-center py-10"><p className="text-3xl mb-2">📋</p><p className="text-sm text-gray-400">Sin actividades aún</p></div>:<div className="space-y-2">{[...actividades].reverse().map((a,i)=>{const iconos={riego:"💧",cosecha:"✂️",siembra:"🌱",muerte:"💀",limpieza:"🧹"};const colores={riego:"#bfdbfe",cosecha:"#fef08a",siembra:"#dcfce7",muerte:"#fca5a5",limpieza:"#e5e7eb"};return <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100" style={{backgroundColor:(colores[a.tipo_actividad]||"#f9fafb")+"99"}}><span className="text-xl">{iconos[a.tipo_actividad]||"📌"}</span><div className="flex-1 min-w-0">{a.cultivo_nombre&&<p className="text-xs font-semibold text-gray-600">{a.cultivo_nombre}</p>}<p className="text-xs font-bold text-gray-700 capitalize">{a.tipo_actividad}</p>{a.descripcion&&<p className="text-xs text-gray-500 truncate">{a.descripcion}</p>}<p className="text-xs text-gray-400">{a.fecha}</p></div></div>;})}  </div>)}
        {tab==="riego"&&(riegoPend.length===0?<div className="text-center py-10"><p className="text-3xl mb-2">💦</p><p className="text-sm text-gray-400">Todo al día</p></div>:<div className="space-y-2">{riegoPend.map((p,i)=>{ const r=estadoRiegoVisual(p.ultimo_riego,offsetDias); return <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{backgroundColor:r.color+"55",borderColor:r.color}}><span className="text-xl">{r.emoji}</span><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800">{p.cultivo_nombre}</p><p className="text-xs text-gray-500">{r.label} · {p.ultimo_riego||"nunca"}</p></div></div>; })}</div>)}
        {tab==="alertas"&&(alertas.length===0?<div className="text-center py-10"><p className="text-3xl mb-2">✅</p><p className="text-sm text-gray-400">Sin alertas</p></div>:<div className="space-y-2">{alertas.map((p,i)=>{ const dur=cultivosBD.find(c=>c.id===p.cultivo_tipo)?.duracion_dias||60; const est=calcularEstadoVisual(p,offsetDias,dur); return <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50"><span className="text-xl">{ESTADO_EMOJI[est]||"⚠️"}</span><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800">{p.cultivo_nombre}</p><p className="text-xs text-red-600 font-semibold">{ESTADO_LABEL[est]||est}</p></div></div>; })}</div>)}
      </div>
    </div>
  );
}

// ─── Simulador de tiempo ──────────────────────────────────
function SimuladorTiempo({offsetDias,onChange}) {
  return (
    <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5">
      <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0"/>
      <span className="text-xs text-violet-700 font-black whitespace-nowrap">{offsetDias===0?"Hoy":`+${offsetDias}d`}</span>
      <div className="flex gap-0.5">
        {[1,3,7,15,30].map(p=><button key={p} onClick={()=>onChange(offsetDias+p)} className="px-1.5 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-xs font-black transition">+{p}</button>)}
        {offsetDias>0&&<button onClick={()=>onChange(0)} className="px-1.5 py-0.5 bg-violet-500 hover:bg-violet-600 text-white rounded text-xs font-black transition ml-0.5">↩</button>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// EDITOR PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function EditorHuerto({ huerto, onGuardar, onCerrar, guardando }) {
  const svgRef = useRef(null);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:120,y:80});
  const [zonas,setZonas]=useState(()=>huerto.layout?.zonas||[]);
  const [undoHist,setUndoHist]=useState([]);
  const [cultivosBD,setCultivosBD]=useState([]);
  const [plantacionesBD,setPlantacionesBD]=useState({});
  // offsetDias se restaura del layout guardado
  const [offsetDias,setOffsetDias]=useState(()=>huerto.layout?.offsetDias||0);
  const [actividadesGlobal,setActividadesGlobal]=useState([]);
  const [herramienta,setHerramienta]=useState("seleccionar");
  const [tipoZona,setTipoZona]=useState(TIPOS_ZONA[0]);
  const [cultivoSel,setCultivoSel]=useState(null);
  const [zonaActiva,setZonaActiva]=useState(null);
  const [editNombre,setEditNombre]=useState(null);
  const [modalMaceta,setModalMaceta]=useState(null);
  const [modalCantero,setModalCantero]=useState(null);
  const [modalDim,setModalDim]=useState(null);    // { tipo, x, y }
  const [modalPl,setModalPl]=useState(null);
  const [actModal,setActModal]=useState([]);
  const [cargModal,setCargModal]=useState(false);
  const [panelAbierto,setPanelAbierto]=useState(false);
  const [cambiosPend,setCambiosPend]=useState(false);
  const [modalSalir,setModalSalir]=useState(false);
  const {show:showToast,Toast}=useToast();

  const draggingBg=useRef(false), dragOrigin=useRef({mx:0,my:0,px:0,py:0});
  const draggingZona=useRef(null), resizingZona=useRef(null);
  const dibujando=useRef(false), dibujoOrig=useRef({x:0,y:0});
  const [dibujoRect,setDibujoRect]=useState(null);

  const tkn=huerto._token||null;
  const authH=tkn?{"Authorization":`Bearer ${tkn}`}:{};

  // Badge
  const badgeCount=useMemo(()=>{
    const rP=Object.values(plantacionesBD).filter(p=>!esMuerta(p.estado)&&p.estado!=="cosechado"&&estadoRiegoVisual(p.ultimo_riego,offsetDias).nivel!=="bien").length;
    const aN=Object.values(plantacionesBD).filter(p=>{ const dur=cultivosBD.find(c=>c.id===p.cultivo_tipo)?.duracion_dias||60; return esMala(calcularEstadoVisual(p,offsetDias,dur))||esMuerta(p.estado)||p.estado==="pasada"; }).length;
    return actividadesGlobal.length+rP+aN;
  },[actividadesGlobal,plantacionesBD,offsetDias,cultivosBD]);

  function registrarAct(tipo,desc,nombre="") {
    const fecha=new Date().toLocaleString("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    setActividadesGlobal(p=>[...p,{tipo_actividad:tipo,descripcion:desc,cultivo_nombre:nombre,fecha}]);
  }

  useEffect(()=>{ fetch(`${API}/cultivos/`).then(r=>r.json()).then(d=>{setCultivosBD(Array.isArray(d)?d:[]); if(d.length)setCultivoSel(d[0]);}).catch(console.error); },[]);

  const recargar=useCallback(async()=>{
    try { const r=await fetch(`${API}/plantacion/plantaciones/huerto/${huerto.id}/`); const d=await r.json(); const m={}; (d||[]).forEach(p=>{m[`${p.fila}-${p.columna}`]=p;}); setPlantacionesBD(m); } catch(e){console.error(e);}
  },[huerto.id]);

  useEffect(()=>{
    const init=async()=>{
      try{ await fetch(`${API}/actividad/sincronizar/${huerto.id}/`,{method:"POST",headers:authH}); }catch(_){}
      await recargar();
    }; init();
  },[recargar]);

  // Sincronizar celdas canvas ← backend (sin sobrescribir celdas ya pintadas)
  useEffect(()=>{
    if(!Object.keys(plantacionesBD).length) return;
    setZonas(prev=>prev.map((zona,zi)=>({
      ...zona,
      celdas:zona.celdas.map((row,fi)=>row.map((cel,ci)=>{
        const {fila,columna}=coordGlobal(zi,fi,ci);
        const p=plantacionesBD[`${fila}-${columna}`];
        if(p&&!cel) return {cultivoId:p.cultivo_tipo,nombre:p.cultivo_nombre,imagen:p.cultivo_imagen,plantacionId:p.id};
        return cel;
      }))
    })));
  },[plantacionesBD]);

  const zonaConSecas=useMemo(()=>{
    const m={};
    zonas.forEach((zona,zi)=>{ let s=0; zona.celdas.forEach((row,fi)=>row.forEach((_,ci)=>{ if(!zona.celdas[fi][ci])return; const {fila,columna}=coordGlobal(zi,fi,ci); const p=plantacionesBD[`${fila}-${columna}`]; if(p&&!esMuerta(p.estado)&&estadoRiegoVisual(p.ultimo_riego,offsetDias).nivel!=="bien")s++; })); if(s>0)m[zona.id]=s; });
    return m;
  },[zonas,plantacionesBD,offsetDias]);

  const snap=useCallback(()=>{ setUndoHist(h=>[...h.slice(-29),JSON.parse(JSON.stringify(zonas))]); },[zonas]);
  const deshacer=useCallback(()=>{ setUndoHist(h=>{ if(!h.length)return h; setZonas(h[h.length-1]); return h.slice(0,-1); }); },[]);

  useEffect(()=>{ const el=svgRef.current; if(!el)return; const fn=e=>{e.preventDefault();setZoom(z=>Math.min(3,Math.max(0.25,z*(e.deltaY<0?1.1:0.9))));};el.addEventListener("wheel",fn,{passive:false}); return()=>el.removeEventListener("wheel",fn); },[]);

  // ── GUARDAR: solo layout + offsetDias. El riego ya está en el backend. ──
  const handleGuardar=useCallback(async(yLuegoCerrar=false)=>{
    // NO llamamos recargar() después de guardar para no sobreescribir el estado local
    await onGuardar({zonas, offsetDias, version:2});
    setCambiosPend(false);
    if(yLuegoCerrar) onCerrar();
  },[zonas,offsetDias,onGuardar,onCerrar]);

  // ── Interceptar salida ────────────────────────────────
  const handleCerrar=useCallback(()=>{
    if(cambiosPend) setModalSalir(true);
    else onCerrar();
  },[cambiosPend,onCerrar]);

  // ── REGAR: actualiza solo ultimo_riego en el estado local con la respuesta del backend ──
  async function regarPlantacion(pl) {
    const clave=`${pl.fila}-${pl.columna}`;
    try {
      const r=await fetch(`${API}/actividad/${pl.id}/regar/`,{method:"POST",headers:{...authH,"Content-Type":"application/json"},body:JSON.stringify({offset_dias:offsetDias})});
      const data=await r.json();
      if(!r.ok){showToast(data.error||"Error al regar","error");return null;}
      // Actualizar SOLO la entrada de esta planta, sin tocar el resto
      setPlantacionesBD(prev=>({...prev,[clave]:data}));
      return data;
    } catch(e){console.error(e);return null;}
  }

  async function sembrarBackend(zi,fi,ci,cultivo) {
  const {fila,columna}=coordGlobal(zi,fi,ci); 
  const clave=`${fila}-${columna}`;

  if(plantacionesBD[clave]) return plantacionesBD[clave];

  try {

    const fechaSimulada = new Date(Date.now() + offsetDias * 86400000);
    const fechaSolo = fechaSimulada.toISOString().split("T")[0];

    const r = await fetch(`${API}/plantacion/plantaciones/`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        ...authH
      },
      body: JSON.stringify({
        huerto: huerto.id,
        cultivo_tipo: cultivo.id,
        estado: "sembrado",
        fila,
        columna,
        fecha_siembra: fechaSolo 
      })
    });

    if(!r.ok){
      showToast("Error al sembrar","error");
      return null;
    }

    const d = await r.json();
    setPlantacionesBD(p=>({...p,[clave]:d}));
    return d;

  } catch(e){
    console.error(e);
    return null;
  }
}

  async function eliminarBackend(zi,fi,ci) {
    const {fila,columna}=coordGlobal(zi,fi,ci); const clave=`${fila}-${columna}`;
    if(!plantacionesBD[clave])return;
    await fetch(`${API}/plantacion/plantaciones/eliminar/`,{method:"POST",headers:{"Content-Type":"application/json",...authH},body:JSON.stringify({huerto_id:huerto.id,fila,columna})}).catch(console.error);
    setPlantacionesBD(p=>{const n={...p};delete n[clave];return n;});
  }

  async function regarZona(zona,zi) {
    let regadas=0;
    for(let fi=0;fi<zona.celdas.length;fi++) for(let ci=0;ci<(zona.celdas[0]?.length||0);ci++){
      if(!zona.celdas[fi]?.[ci])continue;
      const {fila,columna}=coordGlobal(zi,fi,ci); const pl=plantacionesBD[`${fila}-${columna}`];
      if(!pl||esMuerta(pl.estado)||estadoRiegoVisual(pl.ultimo_riego,offsetDias).nivel==="bien")continue;
      const result=await regarPlantacion(pl); if(result)regadas++;
    }
    if(regadas>0){registrarAct("riego",`${zona.nombre}: ${regadas} plantas regadas`,zona.nombre);showToast(`💧 ${zona.nombre}: ${regadas} plantas regadas`);}
  }

  async function accionCelda(e,zona,zi,fi,ci) {
    e.stopPropagation();
    const cel=zona.celdas[fi]?.[ci]; const {fila,columna}=coordGlobal(zi,fi,ci); const pl=plantacionesBD[`${fila}-${columna}`];

    if(herramienta==="sembrar"){
      if(!cultivoSel||!cultivoPermitido(cultivoSel.nombre,zona))return;
      snap();
      if(cel){
        await eliminarBackend(zi,fi,ci);
        setZonas(p=>p.map((z,zii)=>{ if(zii!==zi)return z; const c=z.celdas.map(r=>[...r]);c[fi][ci]=null;return{...z,celdas:c}; }));
        registrarAct("limpieza",`Eliminado de ${zona.nombre}`); showToast("🗑️ Eliminado");
      } else {
        const plantacion=await sembrarBackend(zi,fi,ci,cultivoSel); if(!plantacion)return;
        setZonas(p=>p.map((z,zii)=>{ if(zii!==zi)return z; const c=z.celdas.map(r=>[...r]);c[fi][ci]={cultivoId:cultivoSel.id,nombre:cultivoSel.nombre,imagen:cultivoSel.imagen,plantacionId:plantacion.id};return{...z,celdas:c}; }));
        setCambiosPend(true); registrarAct("siembra",`${cultivoSel.nombre} en ${zona.nombre}`,cultivoSel.nombre); showToast(`🌱 ${cultivoSel.nombre} sembrado`);
      }
    }
    if(herramienta==="regar"){
      if(!cel||!pl){showToast("⚠️ No hay planta aquí","warn");return;}
      if(esMuerta(pl.estado)){showToast("💀 Esta planta ya está muerta","error");return;}
      const result=await regarPlantacion(pl);
      if(result){registrarAct("riego",`${pl.cultivo_nombre} regado en ${zona.nombre}`,pl.cultivo_nombre); showToast(result.estado==="muerta_ahogo"?"💀 ¡Planta ahogada!":"💧 Regado","error"[result.estado==="muerta_ahogo"?0:1]);}
    }
    if(herramienta==="info"){
      if(!cel)return;
      if(!pl){showToast("⚠️ Guarda el layout primero","warn");return;}
      abrirModal(pl);
    }
  }

  const onCeldaDrop=useCallback(async(e,zona,zi,fi,ci)=>{
    e.preventDefault();e.stopPropagation();
    const raw=e.dataTransfer.getData("cultivo");if(!raw)return;
    const cultivo=JSON.parse(raw);
    if(zona.celdas[fi]?.[ci]){showToast("⚠️ Celda ocupada","warn");return;}
    if(!cultivoPermitido(cultivo.nombre,zona)){showToast(`🚫 ${cultivo.nombre} no cabe aquí`,"warn");return;}
    snap();
    const pl=await sembrarBackend(zi,fi,ci,cultivo);if(!pl)return;
    setZonas(p=>p.map((z,zii)=>{ if(zii!==zi)return z; const c=z.celdas.map(r=>[...r]);c[fi][ci]={cultivoId:cultivo.id,nombre:cultivo.nombre,imagen:cultivo.imagen,plantacionId:pl.id};return{...z,celdas:c}; }));
    setCambiosPend(true);registrarAct("siembra",`${cultivo.nombre} en ${zona.nombre}`,cultivo.nombre);showToast(`🌱 ${cultivo.nombre} sembrado`);
  },[snap,plantacionesBD,zonas]);

  async function abrirModal(pl) {
    setModalPl(pl);setActModal([]);setCargModal(true);
    try {
      let acts=pl.actividades||[];
      try{const r=await fetch(`${API}/actividad/${pl.id}/historial/`);if(r.ok)acts=await r.json();}catch(_){}
      setActModal(acts);
      // Refrescar solo esta plantación sin recargar todo
      const r2=await fetch(`${API}/plantacion/plantaciones/huerto/${huerto.id}/`);
      const data=await r2.json(); const upd=data.find(x=>x.id===pl.id);
      if(upd){setModalPl(upd);setPlantacionesBD(prev=>({...prev,[`${upd.fila}-${upd.columna}`]:upd}));}
    }catch(e){console.error(e);}finally{setCargModal(false);}
  }

  async function regarModal() {
    if(!modalPl)return; setCargModal(true);
    try {
      const result=await regarPlantacion(modalPl);
      if(result){
        setModalPl(result);
        try{const rH=await fetch(`${API}/actividad/${modalPl.id}/historial/`);if(rH.ok)setActModal(await rH.json());}catch(_){}
        registrarAct("riego",`${modalPl.cultivo_nombre} regado`,modalPl.cultivo_nombre);
        showToast(result.estado==="muerta_ahogo"?"💀 ¡Planta ahogada!":"💧 Regado correctamente",result.estado==="muerta_ahogo"?"error":"ok");
      }
    }finally{setCargModal(false);}
  }

  async function cosecharModal() {
    if(!modalPl)return; setCargModal(true);
    try {
      const r=await fetch(`${API}/actividad/${modalPl.id}/cosechar/`,{method:"POST",headers:authH});
      const data=await r.json(); if(!r.ok){showToast(data.error||"Error","error");return;}
      const clave=`${modalPl.fila}-${modalPl.columna}`;
      setPlantacionesBD(prev=>({...prev,[clave]:data}));
      registrarAct("cosecha",`${modalPl.cultivo_nombre} cosechado`,modalPl.cultivo_nombre);
      showToast("✂️ Cosechado — limpia la celda cuando quieras"); setModalPl(null);
    }catch(e){console.error(e);}finally{setCargModal(false);}
  }

  async function limpiarModal() {
  if(!modalPl) return;
  setCargModal(true);

  try {
    const r = await fetch(
      `${API}/actividad/${modalPl.id}/limpiar/`,
      {
        method:"POST",
        headers:{
          ...authH,
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          offset_dias: offsetDias   // 👈 ESTA ES LA CLAVE
        })
      }
    );

    if(!r.ok){
      const text = await r.text();
      console.log("ERROR LIMPIAR:", text);
      showToast("❌ No se puede limpiar aún","error");
      return;
    }

    const clave=`${modalPl.fila}-${modalPl.columna}`;

    setZonas(p=>p.map(z=>({
      ...z,
      celdas:z.celdas.map(r=>
        r.map(cel=>cel?.plantacionId===modalPl.id?null:cel)
      )
    })));

    setPlantacionesBD(p=>{
      const n={...p};
      delete n[clave];
      return n;
    });

    setModalPl(null);
    showToast("🧹 Celda limpiada");
    setCambiosPend(true);

  } catch(e){
    console.error(e);
  } finally{
    setCargModal(false);
  }
}

  // ── Crear zonas con configuración ─────────────────────
  function confirmarZonaConfig(tipo,x,y,config) {
    snap(); const z=crearZona(tipo,x,y,config);
    setZonas(p=>[...p,z]); setZonaActiva(z.id); setHerramienta("seleccionar"); setCambiosPend(true);
  }

  function agregarZonaPredefinida(tipo) {
    const x=(-pan.x/zoom)+60+Math.random()*30, y=(-pan.y/zoom)+60+Math.random()*30;
    if(tipo.id==="maceta")       setModalMaceta({x,y});
    else if(tipo.id==="cantero") setModalCantero({x,y});
    else                         setModalDim({tipo,x,y});
  }

  const eliminarZona=useCallback(async(zonaId)=>{
    const zi=zonas.findIndex(z=>z.id===zonaId); const zona=zonas[zi]; if(!zona)return; snap();
    for(let fi=0;fi<zona.celdas.length;fi++) for(let ci=0;ci<(zona.celdas[0]?.length||0);ci++) if(zona.celdas[fi]?.[ci]) await eliminarBackend(zi,fi,ci);
    setZonas(p=>p.filter(z=>z.id!==zonaId)); setZonaActiva(null); setCambiosPend(true);
  },[snap,zonas]);

  // ── Mouse canvas ──────────────────────────────────────
  const onSvgMouseDown=useCallback((e)=>{
    const isBg=e.target===svgRef.current||e.target.dataset.role==="bg"; if(!isBg)return;
    if(["seleccionar","regar","info"].includes(herramienta)){draggingBg.current=true;dragOrigin.current={mx:e.clientX,my:e.clientY,px:pan.x,py:pan.y};setZonaActiva(null);}
    if(herramienta==="dibujar"){dibujando.current=true;const pt=ptCanvas(e,svgRef,pan,zoom);dibujoOrig.current=pt;setDibujoRect({x:pt.x,y:pt.y,w:0,h:0});}
  },[herramienta,pan,zoom]);

  const onZonaMouseDown=useCallback((e,zona)=>{ if(herramienta!=="seleccionar")return;e.stopPropagation();setZonaActiva(zona.id);const pt=ptCanvas(e,svgRef,pan,zoom);draggingZona.current={id:zona.id,ox:pt.x-zona.x,oy:pt.y-zona.y}; },[herramienta,pan,zoom]);
  const onResizeMouseDown=useCallback((e,zona)=>{ e.stopPropagation();const pt=ptCanvas(e,svgRef,pan,zoom);resizingZona.current={id:zona.id,ox:pt.x,oy:pt.y,initW:zona.w,initH:zona.h-HEADER_H}; },[pan,zoom]);

  const onMouseMove=useCallback((e)=>{
    if(draggingBg.current) setPan({x:dragOrigin.current.px+(e.clientX-dragOrigin.current.mx),y:dragOrigin.current.py+(e.clientY-dragOrigin.current.my)});
    if(dibujando.current){const pt=ptCanvas(e,svgRef,pan,zoom),ox=dibujoOrig.current.x,oy=dibujoOrig.current.y;setDibujoRect({x:Math.min(pt.x,ox),y:Math.min(pt.y,oy),w:Math.abs(pt.x-ox),h:Math.abs(pt.y-oy)});}
    if(draggingZona.current){const {id,ox,oy}=draggingZona.current,pt=ptCanvas(e,svgRef,pan,zoom);setZonas(p=>p.map(z=>z.id===id?{...z,x:pt.x-ox,y:pt.y-oy}:z));}
    if(resizingZona.current){const {id,ox,oy,initW,initH}=resizingZona.current,pt=ptCanvas(e,svgRef,pan,zoom);const nC=Math.max(MIN_CELL,Math.round(Math.max(MIN_CELL*CELL,initW+(pt.x-ox))/CELL));const nF=Math.max(MIN_CELL,Math.round(Math.max(MIN_CELL*CELL,initH+(pt.y-oy))/CELL));setZonas(p=>p.map(z=>z.id!==id?z:{...z,w:nC*CELL,h:nF*CELL+HEADER_H,celdas:resizeCeldas(z.celdas,nC,nF)}));}
  },[pan,zoom]);

  const onMouseUp=useCallback(()=>{
    draggingBg.current=false;draggingZona.current=null;resizingZona.current=null;
    if(dibujando.current){dibujando.current=false;const r=dibujoRect;if(r&&r.w>MIN_CELL*CELL*0.5&&r.h>MIN_CELL*CELL*0.5){const x=r.x,y=r.y; if(tipoZona.id==="maceta")setModalMaceta({x,y});else if(tipoZona.id==="cantero")setModalCantero({x,y});else setModalDim({tipo:tipoZona,x,y});}setDibujoRect(null);}
  },[dibujoRect,tipoZona]);

  const cursorMap={seleccionar:"grab",dibujar:"crosshair",sembrar:"cell",regar:"crosshair",info:"pointer"};
  const svgW=typeof window!=="undefined"?window.innerWidth-256:1000;
  const svgH=typeof window!=="undefined"?window.innerHeight-56:700;
  const HERRAMIENTAS=[{id:"seleccionar",icon:<MousePointer className="w-4 h-4"/>,label:"Mover"},{id:"dibujar",icon:<Square className="w-4 h-4"/>,label:"Dibujar"},{id:"sembrar",icon:<Sprout className="w-4 h-4"/>,label:"Sembrar"},{id:"regar",icon:<Droplets className="w-4 h-4"/>,label:"Regar"},{id:"info",icon:<span className="text-sm">🔍</span>,label:"Info"}];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100" style={{userSelect:"none",zIndex:9999}}>
      {Toast}

      {/* Barra superior */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-3 gap-1.5 shadow-sm shrink-0 z-30">
        <div className="flex items-center gap-2 mr-1">
          <div className="p-1.5 bg-green-100 rounded-lg"><Leaf className="w-4 h-4 text-green-600"/></div>
          <span className="font-black text-gray-800 text-sm">{huerto.nombre}</span>
          {cambiosPend&&<span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">Sin guardar</span>}
        </div>
        <div className="w-px h-6 bg-gray-200"/>
        {HERRAMIENTAS.map(h=>(
          <button key={h.id} onClick={()=>setHerramienta(h.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${herramienta===h.id?h.id==="regar"?"bg-blue-500 text-white border-blue-500":h.id==="sembrar"?"bg-emerald-600 text-white border-emerald-600":h.id==="info"?"bg-violet-500 text-white border-violet-500":"bg-gray-700 text-white border-gray-700":"bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
            {h.icon} {h.label}
          </button>
        ))}
        {herramienta==="dibujar"&&TIPOS_ZONA.map(t=>(
          <button key={t.id} onClick={()=>setTipoZona(t)} className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition ${tipoZona.id===t.id?"border-2":"border-gray-200 bg-gray-50 text-gray-500"}`} style={tipoZona.id===t.id?{borderColor:t.border,backgroundColor:t.fill,color:t.color}:{}}>{t.emoji} {t.label}</button>
        ))}
        {herramienta==="sembrar"&&cultivoSel&&(
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs">
            {cultivoSel.imagen&&<img src={`${API}${cultivoSel.imagen}`} className="w-5 h-5 rounded object-cover"/>}
            <span className="font-bold text-emerald-800">{cultivoSel.nombre}</span>
            <span className="text-gray-400">{cultivoSel.duracion_dias}d</span>
          </div>
        )}
        <div className="w-px h-6 bg-gray-200 mx-0.5"/>
        <SimuladorTiempo offsetDias={offsetDias} onChange={v=>{setOffsetDias(v);setCambiosPend(true);}}/>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={()=>setPanelAbierto(p=>!p)} className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${panelAbierto?"bg-emerald-600 text-white border-emerald-600":"bg-white text-gray-500 border-gray-200 hover:border-emerald-300"}`}>
            <Bell className="w-3.5 h-3.5"/>Actividad
            {badgeCount>0&&<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">{badgeCount>9?"9+":badgeCount}</span>}
          </button>
          <div className="w-px h-6 bg-gray-200"/>
          <button onClick={()=>setZoom(z=>Math.min(3,z*1.2))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomIn className="w-4 h-4"/></button>
          <span className="text-xs font-mono text-gray-400 w-10 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.max(0.25,z*0.83))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomOut className="w-4 h-4"/></button>
          <button onClick={()=>{setZoom(1);setPan({x:120,y:80});}} className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 font-mono">Reset</button>
          <div className="w-px h-6 bg-gray-200"/>
          <button onClick={deshacer} disabled={!undoHist.length} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-30"><RotateCcw className="w-4 h-4"/></button>
          <button onClick={handleCerrar} className="px-3 py-1.5 border-2 border-gray-200 text-gray-600 rounded-lg font-bold text-sm flex items-center gap-1"><X className="w-3.5 h-3.5"/>Volver</button>
          <button onClick={()=>handleGuardar(false)} disabled={guardando} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-sm shadow-md flex items-center gap-1.5 disabled:opacity-50"><Save className="w-3.5 h-3.5"/>{guardando?"Guardando...":"Guardar"}</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Agregar zona</p>
            <div className="space-y-1.5">
              {TIPOS_ZONA.map(t=>(
                <button key={t.id} onClick={()=>agregarZonaPredefinida(t)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition hover:scale-[1.02]" style={{borderColor:t.border,backgroundColor:t.fill,color:t.color}}>
                  <span>{t.emoji}</span><span className="flex-1 text-left">{t.label}</span>
                  <span className="text-xs opacity-50 flex items-center gap-0.5"><Ruler className="w-3 h-3"/>config</span>
                </button>
              ))}
            </div>
          </div>
          {Object.keys(zonaConSecas).length>0&&(
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Droplets className="w-3 h-3"/>Riego pendiente</p>
              <div className="space-y-1.5">
                {zonas.map((zona,zi)=>{ const s=zonaConSecas[zona.id];if(!s)return null;
                  return <button key={zona.id} onClick={()=>regarZona(zona,zi)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition text-xs font-semibold"><Droplets className="w-3.5 h-3.5 shrink-0"/><span className="flex-1 text-left truncate">{zona.nombre}</span><span className="bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-black">{s}🔴</span></button>;
                })}
              </div>
            </div>
          )}
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cultivos</p>
            {cultivosBD.length===0?<p className="text-xs text-gray-400 text-center py-4">Cargando...</p>:<div className="space-y-2">
              {cultivosBD.map(c=>(
                <div key={c.id} draggable onDragStart={e=>e.dataTransfer.setData("cultivo",JSON.stringify(c))} onClick={()=>{setCultivoSel(c);setHerramienta("sembrar");}}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-grab transition hover:shadow-md ${cultivoSel?.id===c.id&&herramienta==="sembrar"?"border-emerald-500 bg-emerald-50":"border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                  {c.imagen?<img src={`${API}${c.imagen}`} className="w-10 h-10 rounded-lg object-cover shrink-0" onError={e=>{e.target.style.display="none";}}/>:<div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl shrink-0">🌱</div>}
                  <div className="min-w-0"><p className="text-sm font-bold text-gray-800 truncate">{c.nombre}</p><p className="text-xs text-gray-400">{c.duracion_dias}d · {c.requerimiento_agua_litros}L</p></div>
                </div>
              ))}
            </div>}
          </div>
          <div className="p-3 border-t border-gray-100 text-xs text-gray-400 space-y-0.5 shrink-0">
            <p>🖱 Arrastra cultivo a celda</p>
            <p>🕐 Simula días → se guarda</p>
            <p>💀 Muerta → limpiar celda</p>
          </div>
        </div>

        {/* Canvas */}
        <svg ref={svgRef} width={panelAbierto?svgW-384:svgW} height={svgH}
          style={{cursor:cursorMap[herramienta]||"default",flex:1,background:"#f3f4f6"}}
          onMouseDown={onSvgMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <defs>
            <pattern id="dots" x="0" y="0" width={20*zoom} height={20*zoom} patternUnits="userSpaceOnUse" patternTransform={`translate(${((pan.x%(20*zoom))+(20*zoom))%(20*zoom)},${((pan.y%(20*zoom))+(20*zoom))%(20*zoom)})`}>
              <circle cx={10*zoom} cy={10*zoom} r={1.2} fill="#cbd5e1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" data-role="bg"/>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {zonas.map((zona,zi)=>{
              const tipo=TIPOS_ZONA.find(t=>t.id===zona.tipo)||TIPOS_ZONA[0];
              const activa=zonaActiva===zona.id;
              const cols=zona.celdas[0]?.length||0, filas=zona.celdas.length;
              const esMaceta=zona.tipo==="maceta";
              // Mostrar dimensiones reales en el header
              const dimLabel = esMaceta ? (zona.tamanoMaceta||"")
                : zona.largoM ? (zona.anchoCanteroM ? `${zona.largoM}×${zona.anchoCanteroM}m` : `${zona.largoM}×${zona.anchoM||"?"}m`) : "";
              return (
                <g key={zona.id}>
                  <rect x={zona.x+5} y={zona.y+5} width={zona.w} height={zona.h} rx={12} fill="rgba(0,0,0,0.07)"/>
                  <rect x={zona.x} y={zona.y} width={zona.w} height={zona.h} rx={12} fill={tipo.fill} stroke={activa?tipo.color:tipo.border} strokeWidth={activa?3:1.5} style={{cursor:herramienta==="seleccionar"?"move":"default"}} onMouseDown={e=>onZonaMouseDown(e,zona)}/>
                  <rect x={zona.x} y={zona.y} width={zona.w} height={HEADER_H} rx={12} fill={tipo.border} opacity={0.2} style={{pointerEvents:"none"}}/>
                  <text x={zona.x+10} y={zona.y+18} fontSize={11} fontWeight="800" fill={tipo.color} style={{pointerEvents:"none"}}>{tipo.emoji} {zona.nombre}</text>
                  {dimLabel&&<text x={zona.x+zona.w-8} y={zona.y+18} fontSize={9} fill={tipo.color} opacity={0.7} textAnchor="end" style={{pointerEvents:"none"}}>{dimLabel}</text>}

                  {Array.from({length:filas}).map((_,fi)=>Array.from({length:cols}).map((_,ci)=>{
                    const cx=zona.x+ci*CELL, cy=zona.y+fi*CELL+HEADER_H;
                    const cel=zona.celdas[fi]?.[ci];
                    const {fila,columna}=coordGlobal(zi,fi,ci);
                    const pl=plantacionesBD[`${fila}-${columna}`];
                    const bloq=herramienta==="sembrar"&&!cultivoPermitido(cultivoSel?.nombre||"",zona);
                    const duracion=cultivosBD.find(c=>c.id===pl?.cultivo_tipo)?.duracion_dias||60;
                    const estadoSim=pl?calcularEstadoVisual(pl,offsetDias,duracion):null;
                    const riegoEst=pl?estadoRiegoVisual(pl.ultimo_riego,offsetDias):null;
                    const regadaHoy=pl&&pl.ultimo_riego===new Date().toISOString().split("T")[0];
                    const muerta=esMuerta(estadoSim)||esMuerta(pl?.estado);
                    let bg="rgba(255,255,255,0.6)";
                    if(bloq)bg="rgba(239,68,68,0.06)";
                    else if(muerta)bg="#fee2e2";
                    else if(pl)bg=(riegoEst?.color||"#bbf7d0")+"99";
                    else if(cel)bg="#fef9c3";
                    return (
                      <g key={`${fi}-${ci}`}>
                        <rect x={cx+1} y={cy+1} width={CELL-2} height={CELL-2} rx={5} fill={bg}
                          stroke={regadaHoy?"#3b82f6":muerta?"#ef4444":cel?tipo.border:"rgba(0,0,0,0.05)"}
                          strokeWidth={regadaHoy?3:muerta?2:0.8} strokeDasharray={bloq?"3 2":"none"}
                          style={{cursor:["sembrar","regar","info"].includes(herramienta)?"pointer":"default"}}
                          onClick={e=>accionCelda(e,zona,zi,fi,ci)} onDragOver={e=>e.preventDefault()} onDrop={e=>onCeldaDrop(e,zona,zi,fi,ci)}/>
                        {cel?.imagen&&<image href={`${API}${cel.imagen}`} x={cx+4} y={cy+4} width={CELL-8} height={CELL-8} style={{pointerEvents:"none",opacity:muerta?0.25:1}}/>}
                        {cel&&!cel.imagen&&<text x={cx+CELL/2} y={cy+CELL/2+7} textAnchor="middle" fontSize={20} style={{pointerEvents:"none",opacity:muerta?0.25:1}}>🌱</text>}
                        {estadoSim&&<text x={cx+7} y={cy+13} textAnchor="middle" fontSize={11} style={{pointerEvents:"none"}}>{ESTADO_EMOJI[estadoSim]}</text>}
                        {regadaHoy&&<text x={cx+CELL/2} y={cy+CELL-5} textAnchor="middle" fontSize={9} fill="#3b82f6" style={{pointerEvents:"none"}}>💦</text>}
                        {pl&&!muerta&&riegoEst?.nivel==="seca"&&<rect x={cx+3} y={cy+3} width={CELL-6} height={CELL-6} rx={4} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" style={{pointerEvents:"none"}}/>}
                        {bloq&&!cel&&<text x={cx+CELL/2} y={cy+CELL/2+6} textAnchor="middle" fontSize={12} opacity={0.3} style={{pointerEvents:"none"}}>🚫</text>}
                      </g>
                    );
                  }))}

                  {activa&&(<>
                    <g style={{cursor:"pointer"}} onClick={()=>eliminarZona(zona.id)}><circle cx={zona.x+zona.w-12} cy={zona.y+14} r={11} fill="#ef4444" stroke="white" strokeWidth={2}/><text x={zona.x+zona.w-12} y={zona.y+19} textAnchor="middle" fontSize={14} fill="white" style={{pointerEvents:"none"}}>✕</text></g>
                    <g style={{cursor:"pointer"}} onClick={()=>setEditNombre({id:zona.id,nombre:zona.nombre})}><circle cx={zona.x+zona.w-38} cy={zona.y+14} r={11} fill={tipo.color} stroke="white" strokeWidth={2}/><text x={zona.x+zona.w-38} y={zona.y+18} textAnchor="middle" fontSize={11} fill="white" style={{pointerEvents:"none"}}>✎</text></g>
                    <rect x={zona.x} y={zona.y} width={zona.w} height={zona.h} rx={12} fill="none" stroke={tipo.color} strokeWidth={2} strokeDasharray="6 3" opacity={0.4} style={{pointerEvents:"none"}}/>
                  </>)}
                </g>
              );
            })}
            {dibujoRect&&dibujoRect.w>4&&dibujoRect.h>4&&<rect x={dibujoRect.x} y={dibujoRect.y} width={dibujoRect.w} height={dibujoRect.h} rx={12} fill={tipoZona.fill} stroke={tipoZona.border} strokeWidth={2} strokeDasharray="6 3" opacity={0.85}/>}
          </g>
        </svg>

        {panelAbierto&&<PanelActividades actividades={actividadesGlobal} plantacionesBD={plantacionesBD} cultivosBD={cultivosBD} offsetDias={offsetDias} onCerrar={()=>setPanelAbierto(false)}/>}
      </div>

      {/* Modales */}
      {modalMaceta&&<ModalMaceta onConfirmar={t=>{confirmarZonaConfig(TIPOS_ZONA[0],modalMaceta.x,modalMaceta.y,{tamanoMaceta:t});setModalMaceta(null);}} onCancelar={()=>setModalMaceta(null)}/>}
      {modalCantero&&<ModalCantero onConfirmar={cfg=>{confirmarZonaConfig(TIPOS_ZONA[1],modalCantero.x,modalCantero.y,cfg);setModalCantero(null);}} onCancelar={()=>setModalCantero(null)}/>}
      {modalDim&&<ModalDimension tipo={modalDim.tipo} onConfirmar={cfg=>{confirmarZonaConfig(modalDim.tipo,modalDim.x,modalDim.y,cfg);setModalDim(null);}} onCancelar={()=>setModalDim(null)}/>}
      {modalPl&&<ModalPlantacion plantacion={modalPl} actividades={actModal} cargando={cargModal} offsetDias={offsetDias} duracionDias={cultivosBD.find(c=>c.id===modalPl.cultivo_tipo)?.duracion_dias||60} onRegar={regarModal} onCosechar={cosecharModal} onLimpiar={limpiarModal} onCerrar={()=>setModalPl(null)}/>}
      {modalSalir&&<ModalSalirSinGuardar onGuardarYSalir={()=>handleGuardar(true)} onSalirSinGuardar={()=>{setModalSalir(false);onCerrar();}} onCancelar={()=>setModalSalir(false)} guardando={guardando}/>}
      {editNombre&&(
        <div className="fixed inset-0 bg-black/30 z-[10001] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <p className="text-sm font-black text-gray-700 mb-3">Nombre de la zona</p>
            <input autoFocus value={editNombre.nombre} onChange={e=>setEditNombre(n=>({...n,nombre:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"){setZonas(p=>p.map(z=>z.id===editNombre.id?{...z,nombre:editNombre.nombre}:z));setEditNombre(null);}if(e.key==="Escape")setEditNombre(null);}} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none font-semibold text-gray-800 mb-4"/>
            <div className="flex gap-2">
              <button onClick={()=>setEditNombre(null)} className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
              <button onClick={()=>{setZonas(p=>p.map(z=>z.id===editNombre.id?{...z,nombre:editNombre.nombre}:z));setEditNombre(null);}} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}