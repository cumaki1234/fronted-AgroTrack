import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

const API_URL = "http://localhost:5000";

// ─── Traducciones: respuestas simples → valores técnicos ──
const TRADUCCIONES = {
  tierra: {
    "Muy seca — se agrieta o se ve polvorienta":       { humedadSuelo: 15 },
    "Seca — la tierra suelta se deshace fácil":         { humedadSuelo: 28 },
    "Normal — tierra suelta pero compacta":             { humedadSuelo: 50 },
    "Húmeda — se siente fresca al tocar":               { humedadSuelo: 68 },
    "Muy húmeda — se pega a los dedos o hay charcos":   { humedadSuelo: 85 },
  },
  sol: {
    "☁️ Nublado todo el día":        { radiacion: 180, temperatura: 16 },
    "⛅ Parcialmente nublado":        { radiacion: 380, temperatura: 20 },
    "🌤 Mayormente soleado":          { radiacion: 560, temperatura: 24 },
    "☀️ Soleado y caluroso":          { radiacion: 750, temperatura: 29 },
    "🔆 Muy soleado y muy caluroso":  { radiacion: 880, temperatura: 34 },
  },
  lluvia: {
    "No ha llovido nada esta semana":              { precipitacion: 0  },
    "Llovió un poco (una o dos lloviznas)":        { precipitacion: 2  },
    "Llovió normal (algunos días con lluvia)":     { precipitacion: 5  },
    "Llovió bastante (casi todos los días)":       { precipitacion: 10 },
    "Llovió muchísimo (lluvias fuertes)":          { precipitacion: 18 },
  },
  horasSol: {
    "Menos de 2 horas (casi siempre a la sombra)": { horasSol: 1 },
    "Unas 2–4 horas de sol directo":               { horasSol: 3 },
    "Unas 4–6 horas de sol directo":               { horasSol: 5 },
    "Más de 6 horas al sol todo el día":           { horasSol: 8 },
  },
  techo: {
    "🌳 Bajo un techo, adentro o con sombra total": { techo: "techo"    },
    "⛅ Con algo de techo pero recibe algo de sol":  { techo: "semitecho"},
    "☀️ A cielo abierto, sin techo ni sombra":       { techo: "abierto"  },
  },
  contenedor: {
    "🪴 Maceta pequeña o vasito de plástico":       { contenedor: "maceta_chica" },
    "🪣 Maceta mediana o balde con tierra":         { contenedor: "maceta_grande"},
    "🌱 Directo en la tierra o jardín":             { contenedor: "tierra"       },
  },
  riegoHabitual: {
    "Casi no la riego, se me olvida seguido":   { riegoHabitual: "poco"     },
    "La riego de vez en cuando, lo normal":     { riegoHabitual: "normal"   },
    "La riego bastante, casi todos los días":   { riegoHabitual: "abundante"},
  },
};

const CULTIVOS = [
  { value:"lechuga",   emoji:"🥬", label:"Lechuga",   desc:"Hoja verde, crece rápido"   },
  { value:"tomate",    emoji:"🍅", label:"Tomate",    desc:"Fruto rojo, necesita sol"    },
  { value:"zanahoria", emoji:"🥕", label:"Zanahoria", desc:"Raíz naranja, bajo tierra"   },
  { value:"espinaca",  emoji:"🌿", label:"Espinaca",  desc:"Hoja oscura, tolera frío"    },
  { value:"rabano",    emoji:"🔴", label:"Rábano",    desc:"Raíz pequeña, muy rápido"    },
];
const ETAPAS = [
  { value:"inicial",    emoji:"🌱", label:"Recién sembré",            desc:"Semillas o plántulas pequeñas" },
  { value:"desarrollo", emoji:"🌿", label:"Está creciendo",           desc:"Ya tiene hojas, crece bien"    },
  { value:"maduracion", emoji:"🌾", label:"Casi lista para cosechar", desc:"Ya se ve el fruto o la raíz"  },
];

// ─── Componentes base ─────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const h = payload[0]?.value;
  const color = h < 30 ? "#ef4444" : h < 55 ? "#f59e0b" : "#10b981";
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold" style={{ color }}>{h}% humedad</p>
    </div>
  );
}

function Slider({ label, value, min, max, step=1, unit, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{value}{unit}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-gray-100">
        <div className="absolute h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width:`${pct}%` }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"/>
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 shadow-md pointer-events-none"
          style={{ left:`calc(${pct}% - 8px)` }}/>
      </div>
    </div>
  );
}

function SelectBasico({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none cursor-pointer">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function OpcionVisual({ opciones, valor, onChange }) {
  return (
    <div className="space-y-2">
      {opciones.map(op => (
        <button key={op} onClick={() => onChange(op)}
          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
            valor === op
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
              : "border-gray-100 bg-gray-50 text-gray-600 hover:border-emerald-200"
          }`}>
          {op}
        </button>
      ))}
    </div>
  );
}

function SelectorCultivo({ valor, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {CULTIVOS.map(c => (
        <button key={c.value} onClick={() => onChange(c.value)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
            valor === c.value ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-gray-50 hover:border-emerald-200"
          }`}>
          <span className="text-2xl">{c.emoji}</span>
          <div>
            <p className={`text-sm font-bold ${valor === c.value ? "text-emerald-800" : "text-gray-700"}`}>{c.label}</p>
            <p className="text-xs text-gray-400">{c.desc}</p>
          </div>
          {valor === c.value && <span className="ml-auto text-emerald-500">✓</span>}
        </button>
      ))}
    </div>
  );
}

function SelectorEtapa({ valor, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ETAPAS.map(e => (
        <button key={e.value} onClick={() => onChange(e.value)}
          className={`flex flex-col items-center text-center px-3 py-4 rounded-xl border transition-all ${
            valor === e.value ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-gray-50 hover:border-emerald-200"
          }`}>
          <span className="text-2xl mb-1">{e.emoji}</span>
          <p className={`text-xs font-bold leading-tight ${valor === e.value ? "text-emerald-800" : "text-gray-700"}`}>{e.label}</p>
          <p className="text-xs text-gray-400 mt-1 leading-tight">{e.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Guía de riego práctica ───────────────────────────────
function GuiaRiego({ humedadFinal }) {
  const [herramienta, setHerramienta] = useState(null);
  const [tamanio, setTamanio]         = useState(null);
  const [abierto, setAbierto]         = useState(false);

  const urgencia         = humedadFinal < 30 ? "alta" : "media";
  const litrosNecesarios = humedadFinal < 30 ? 2.5 : 1.5;

  const herramientas = [
    { id:"regadera", emoji:"🪣", label:"Regadera",          desc:"Lata o balde con pico para regar" },
    { id:"vaso",     emoji:"🥤", label:"Vaso o taza",       desc:"Un vaso normal de cocina"         },
    { id:"tacho",    emoji:"🪣", label:"Tacho / balde",     desc:"Un balde grande con agua"         },
    { id:"rociador", emoji:"🌸", label:"Botella rociadora", desc:"Spray o botella con boquilla"     },
    { id:"manguera", emoji:"🌀", label:"Manguera",          desc:"Manguera conectada a la llave"    },
  ];

  const tamanios = {
    regadera: [
      { id:"chica",  label:"Chica (1–2 litros)",   litros: 1.5 },
      { id:"mediana",label:"Mediana (5–8 litros)", litros: 6   },
      { id:"grande", label:"Grande (10+ litros)",  litros: 12  },
    ],
    vaso: [
      { id:"chico",  label:"Vaso chico (200 ml)",  litros: 0.2  },
      { id:"normal", label:"Vaso normal (350 ml)", litros: 0.35 },
      { id:"grande", label:"Vaso grande (500 ml)", litros: 0.5  },
    ],
    tacho: [
      { id:"chico",  label:"Balde chico (5 L)",   litros: 5  },
      { id:"normal", label:"Balde normal (10 L)", litros: 10 },
      { id:"grande", label:"Balde grande (20 L)", litros: 20 },
    ],
    rociador: [
      { id:"chico",  label:"Botella chica (500 ml)", litros: 0.5 },
      { id:"mediana",label:"Botella mediana (1 L)",  litros: 1   },
      { id:"grande", label:"Botella grande (2 L)",   litros: 2   },
    ],
    manguera: [
      { id:"suave",  label:"Chorro suave (hilo)",  litrosXmin: 5  },
      { id:"normal", label:"Chorro normal",         litrosXmin: 10 },
      { id:"fuerte", label:"Chorro fuerte",         litrosXmin: 20 },
    ],
  };

  const calcularInstruccion = () => {
    if (!herramienta || !tamanio) return null;
    const sel = tamanios[herramienta.id].find(o => o.id === tamanio);
    if (!sel) return null;

    if (herramienta.id === "manguera") {
      const segs = Math.round((litrosNecesarios / sel.litrosXmin) * 60);
      const min  = Math.floor(segs / 60);
      const seg  = segs % 60;
      const tiempo = min > 0 ? `${min} minuto${min > 1 ? "s" : ""}${seg > 0 ? ` y ${seg} segundos` : ""}` : `${seg} segundos`;
      return {
        texto: `Riega durante ${tiempo} sin mover la manguera. Apunta a la base de la planta, no a las hojas.`,
        extra: urgencia === "alta" ? "Como la tierra está muy seca, ve despacio para que el agua se absorba bien." : "Con calma, no necesitas apurarte.",
      };
    }
    if (herramienta.id === "rociador") {
      const rociadas = Math.round((litrosNecesarios / sel.litros) * 50);
      return {
        texto: `Dale aproximadamente ${rociadas} rociadas alrededor de la base de la planta. Ve despacio y cubre bien la tierra.`,
        extra: urgencia === "alta" ? "La planta tiene mucha sed, no te quedes corto. Si puedes, repite mañana también." : "Con eso alcanza por ahora.",
      };
    }
    const cantidad = Math.ceil(litrosNecesarios / sel.litros);
    const parcial  = cantidad === 1 && (litrosNecesarios / sel.litros) < 0.7;
    const lleno    = parcial ? (litrosNecesarios / sel.litros < 0.5 ? "hasta la mitad" : "hasta tres cuartos") : "lleno";
    const nombreEnvase = herramienta.id === "vaso" ? `vaso${cantidad > 1 ? "s" : ""}` : herramienta.label.toLowerCase() + (cantidad > 1 ? "s" : "");
    const texto = parcial
      ? `Llena el ${herramienta.id} ${lleno} y tíraselo a la tierra.`
      : `Usa ${cantidad} ${nombreEnvase} ${cantidad > 1 ? "llenos" : "lleno"} de agua. Tírala despacio en la tierra.`;
    return {
      texto,
      extra: urgencia === "alta"
        ? "Como la tierra está muy seca, espera un par de minutos entre un envase y otro."
        : "Con eso debería ser suficiente por hoy.",
    };
  };

  const instruccion = calcularInstruccion();

  return (
    <div className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setAbierto(v => !v)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition">
        <div className="flex items-center gap-3">
          <span className="text-xl">💧</span>
          <div className="text-left">
            <p className="text-sm font-black text-gray-700">¿Vas a regar ahora? Te digo cuánto</p>
            <p className="text-xs text-gray-400">Dime qué tienes en casa y te explico cómo</p>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{abierto ? "▲ Ocultar" : "▼ Abrir"}</span>
      </button>
      {abierto && (
        <div className="px-6 pb-6 border-t border-blue-50 pt-5 space-y-5">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">¿Con qué vas a regar?</p>
            <div className="grid grid-cols-1 gap-2">
              {herramientas.map(h => (
                <button key={h.id} onClick={() => { setHerramienta(h); setTamanio(null); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    herramienta?.id === h.id ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-blue-200"
                  }`}>
                  <span className="text-2xl">{h.emoji}</span>
                  <div>
                    <p className={`text-sm font-bold ${herramienta?.id === h.id ? "text-blue-800" : "text-gray-700"}`}>{h.label}</p>
                    <p className="text-xs text-gray-400">{h.desc}</p>
                  </div>
                  {herramienta?.id === h.id && <span className="ml-auto text-blue-500">✓</span>}
                </button>
              ))}
            </div>
          </div>
          {herramienta && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                {herramienta.id === "manguera" ? "¿Cómo abres la llave?" : `¿De qué tamaño?`}
              </p>
              <div className="space-y-2">
                {tamanios[herramienta.id].map(t => (
                  <button key={t.id} onClick={() => setTamanio(t.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      tamanio === t.id ? "border-blue-400 bg-blue-50 text-blue-800 font-semibold" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-blue-200"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {instruccion && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="font-black text-emerald-800 text-sm mb-2">Aquí va cómo hacerlo:</p>
                  <p className="text-sm text-emerald-900 leading-relaxed mb-3">{instruccion.texto}</p>
                  <div className="bg-white border border-emerald-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-emerald-700 leading-relaxed">💡 {instruccion.extra}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Calendario de riego ──────────────────────────────────
function CalendarioRiego({ calendario, dias }) {
  const [vista, setVista] = useState("calendario"); // "calendario" | "lista"

  const colorDia = (estado) =>
    estado === "critico" ? "bg-red-400 text-white"
    : estado === "alerta" ? "bg-amber-300 text-amber-900"
    : "bg-emerald-400 text-white";

  const bgDia = (estado) =>
    estado === "critico" ? "bg-red-50 border-red-200"
    : estado === "alerta" ? "bg-amber-50 border-amber-200"
    : "bg-emerald-50 border-emerald-200";

  const iconoDia = (estado) =>
    estado === "critico" ? "💧" : estado === "alerta" ? "⚠️" : "✅";

  const textoDia = (item) =>
    estado === "critico" ? "Riega hoy" : item.estado === "alerta" ? "Considera regar" : "Sin riego";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header con toggle de vista */}
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <p className="text-sm font-black text-gray-700">Calendario de riego</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id:"calendario", label:"🗓 Calendario" },
            { id:"lista",      label:"📋 Lista"      },
          ].map(v => (
            <button key={v.id} onClick={() => setVista(v.id)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                vista === v.id ? "bg-white text-emerald-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Leyenda */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {[
            { color:"bg-red-400",     label:"Riega hoy"         },
            { color:"bg-amber-300",   label:"Considera regar"   },
            { color:"bg-emerald-400", label:"Sin riego"         },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-3 h-3 rounded-full ${l.color}`}/>
              {l.label}
            </span>
          ))}
        </div>

        {/* Vista calendario (grilla) */}
        {vista === "calendario" && (
          <div className="grid gap-2" style={{ gridTemplateColumns:`repeat(${Math.min(dias+1, 7)}, 1fr)` }}>
            {calendario.map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1 ${colorDia(item.estado)}`}>
                  <span className="text-lg leading-none">{iconoDia(item.estado)}</span>
                  <span className="text-xs font-black mt-1 leading-tight">
                    {item.etiqueta.replace("Dia ", "D")}
                  </span>
                  <span className="text-xs opacity-75 leading-none">{item.humedad}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vista lista */}
        {vista === "lista" && (
          <div className="space-y-2">
            {calendario.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${bgDia(item.estado)}`}>
                <span className="text-xl shrink-0">{iconoDia(item.estado)}</span>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-700">{item.etiqueta}</p>
                  <p className="text-xs text-gray-500">Humedad estimada: {item.humedad}%</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    item.estado === "critico" ? "bg-red-100 text-red-700"
                    : item.estado === "alerta" ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {item.estado === "critico" ? "💧 Riega" : item.estado === "alerta" ? "⚠️ Vigilar" : "✅ OK"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumen rápido */}
        <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
          {[
            { label:"Días que necesita agua", count: calendario.filter(c => c.regar).length,   color:"text-red-600 bg-red-50 border-red-100"     },
            { label:"Días a vigilar",          count: calendario.filter(c => c.vigilar).length, color:"text-amber-600 bg-amber-50 border-amber-100"},
            { label:"Días sin preocupación",   count: calendario.filter(c => !c.regar && !c.vigilar).length, color:"text-emerald-700 bg-emerald-50 border-emerald-100"},
          ].map(r => (
            <div key={r.label} className={`rounded-xl border p-3 text-center ${r.color}`}>
              <p className="text-2xl font-black">{r.count}</p>
              <p className="text-xs font-semibold mt-1 leading-tight">{r.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel de resultados ──────────────────────────────────
function Resultados({ sim, st }) {
  const [verGrafica, setVerGrafica] = useState(false);
  const iconoEstado = sim.estado === "critico" ? "🚨" : sim.estado === "alerta" ? "⚠️" : "✅";
  const nivelAgua   = sim.humedadFinal < 30 ? "Muy seca"
    : sim.humedadFinal < 55 ? "Poco húmeda"
    : sim.humedadFinal < 75 ? "Bien húmeda" : "Muy húmeda";

  return (
    <>
      {/* Estado principal */}
      <div className={`rounded-2xl border-2 p-6 ${st.bg} ${st.border}`}>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{iconoEstado}</span>
          <div className="flex-1">
            <p className={`text-2xl font-black ${st.text} leading-tight`}>{sim.titulo}</p>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">{sim.mensaje}</p>
          </div>
        </div>
      </div>

      {/* Barra de humedad visual */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
          ¿Cómo estará la tierra al final de los {sim.dias} día{sim.dias > 1 ? "s" : ""}?
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Tierra seca</span><span>Tierra mojada</span>
            </div>
            <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-red-100 rounded-l-full" style={{width:"30%"}}/>
              <div className="absolute top-0 h-full bg-amber-100" style={{left:"30%", width:"25%"}}/>
              <div className="absolute top-0 h-full bg-emerald-100" style={{left:"55%", width:"25%"}}/>
              <div className="absolute top-0 h-full bg-blue-100 rounded-r-full" style={{left:"80%", width:"20%"}}/>
              <div className="absolute top-0 h-full w-1.5 rounded-full bg-gray-800 shadow-lg"
                style={{left:`calc(${Math.min(sim.humedadFinal, 98)}% - 3px)`}}/>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-red-400 font-semibold">Peligro</span>
              <span className="text-amber-400 font-semibold">Alerta</span>
              <span className="text-emerald-500 font-semibold">Ideal</span>
              <span className="text-blue-400 font-semibold">Exceso</span>
            </div>
          </div>
          <div className={`text-center px-4 py-3 rounded-xl border ${st.bg} ${st.border} shrink-0`}>
            <p className={`text-lg font-black ${st.text}`}>{nivelAgua}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sim.humedadFinal.toFixed(0)}% humedad</p>
          </div>
        </div>
      </div>

      {/* Pasos */}
      {sim.pasos && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">¿Qué hacer ahora?</p>
          <div className="space-y-3">
            {sim.pasos.map((paso, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <span className="text-base shrink-0">{paso.split(" ")[0]}</span>
                <p className="text-sm text-gray-700 leading-relaxed">{paso.split(" ").slice(1).join(" ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consejo */}
      {sim.recomendacion && (
        <div className={`rounded-2xl border p-5 ${st.bg} ${st.border}`}>
          <div className="flex gap-3">
            <span className="text-2xl shrink-0">💬</span>
            <div>
              <p className={`text-sm font-black ${st.text} mb-2`}>Consejo para tu cultivo</p>
              <p className="text-sm text-gray-600 leading-relaxed">{sim.recomendacion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Guía de riego */}
      {(sim.estado === "critico" || sim.estado === "alerta") && (
        <GuiaRiego humedadFinal={sim.humedadFinal} />
      )}

      {/* Calendario de riego */}
      {sim.calendario && (
        <CalendarioRiego calendario={sim.calendario} dias={sim.dias} />
      )}

      {/* Gráfica colapsable */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setVerGrafica(v => !v)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
          <div className="flex items-center gap-2">
            <span className="text-base">📈</span>
            <div className="text-left">
              <p className="text-sm font-black text-gray-700">Ver gráfica de humedad día a día</p>
              <p className="text-xs text-gray-400">Proyección de los {sim.dias} días simulados</p>
            </div>
          </div>
          <span className="text-gray-400 text-sm">{verGrafica ? "▲ Ocultar" : "▼ Ver gráfica"}</span>
        </button>
        {verGrafica && (
          <div className="px-6 pb-6 border-t border-gray-50 pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sim.datos} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={st.bar} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={st.bar} stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                <XAxis dataKey="dia" tick={{ fontSize:10, fill:"#9ca3af", fontWeight:600 }} axisLine={false} tickLine={false}
                  interval={sim.dias > 14 ? Math.floor(sim.dias / 7) : 0}/>
                <YAxis domain={[0,100]} tick={{ fontSize:10, fill:"#9ca3af", fontWeight:600 }} axisLine={false} tickLine={false} unit="%"/>
                <Tooltip content={<CustomTooltip/>}/>
                <ReferenceLine y={30} stroke="#f87171" strokeDasharray="4 3" strokeWidth={1.5}/>
                <ReferenceLine y={60} stroke="#34d399" strokeDasharray="4 3" strokeWidth={1.5}/>
                <Area type="monotoneX" dataKey="humedad" stroke={st.bar} strokeWidth={2.5} fill="url(#humGrad)"
                  dot={sim.dias <= 14 ? { r:3, fill:st.bar, strokeWidth:2, stroke:"white" } : false}
                  activeDot={{ r:5, fill:st.bar, stroke:"white", strokeWidth:2 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Modo Simple con Tabs ─────────────────────────────────
function ModoSimpleTabs({ simple, setS, diasSlider, setDiasSlider, labelDias, simpleCompleto, loading, ejecutar }) {
  const [tab, setTab] = useState("cultivo");

  // Completitud por pestaña para mostrar el check
  const okCultivo  = simple.tierra; // cultivo y etapa siempre tienen valor
  const okEntorno  = simple.sol && simple.lluvia && simple.horasSol && simple.techo && simple.contenedor;
  const okPlan     = simple.riegoHabitual;

  const tabs = [
    { id:"cultivo", label:"🌱 Cultivo",  ok: !!okCultivo  },
    { id:"entorno", label:"🌤 Entorno",  ok: !!okEntorno  },
    { id:"plan",    label:"📅 Plan",     ok: !!okPlan     },
  ];

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
        <p className="text-sm font-bold text-emerald-800 mb-0.5">¡Bienvenido!</p>
        <p className="text-xs text-emerald-700 leading-relaxed">
          Responde las 3 secciones y te decimos si tu planta necesita agua.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-1 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
              tab === t.id ? "bg-white text-emerald-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}>
            <span>{t.label}</span>
            {t.ok && <span className="text-emerald-500 text-xs">✓</span>}
          </button>
        ))}
      </div>

      {/* ── Tab: Cultivo ── */}
      {tab === "cultivo" && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-4">¿Qué estás cultivando?</p>
            <SelectorCultivo valor={simple.cultivo} onChange={v=>setS("cultivo",v)}/>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-4">¿En qué momento está tu cultivo?</p>
            <SelectorEtapa valor={simple.etapa} onChange={v=>setS("etapa",v)}/>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Cómo se ve y siente la tierra?</p>
            <p className="text-xs text-gray-400 mb-4">Toca la tierra cerca de la raíz de tu planta</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.tierra)} valor={simple.tierra} onChange={v=>setS("tierra",v)}/>
          </div>
          <button onClick={() => setTab("entorno")}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl transition-all">
            Siguiente: Entorno →
          </button>
        </div>
      )}

      {/* ── Tab: Entorno ── */}
      {tab === "entorno" && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Cómo está el clima hoy?</p>
            <p className="text-xs text-gray-400 mb-4">Mira hacia afuera en este momento</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.sol)} valor={simple.sol} onChange={v=>setS("sol",v)}/>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Ha llovido esta semana?</p>
            <p className="text-xs text-gray-400 mb-4">Piensa en los últimos 7 días</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.lluvia)} valor={simple.lluvia} onChange={v=>setS("lluvia",v)}/>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Cuánto tiempo recibe sol tu planta?</p>
            <p className="text-xs text-gray-400 mb-4">Piensa en un día normal</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.horasSol)} valor={simple.horasSol} onChange={v=>setS("horasSol",v)}/>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Tiene techo o está al aire libre?</p>
            <p className="text-xs text-gray-400 mb-4">Afecta cuánta lluvia recibe y cuánto se seca</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.techo)} valor={simple.techo} onChange={v=>setS("techo",v)}/>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Dónde está tu planta?</p>
            <p className="text-xs text-gray-400 mb-4">Las macetas se secan más rápido que la tierra</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.contenedor)} valor={simple.contenedor} onChange={v=>setS("contenedor",v)}/>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab("cultivo")}
              className="px-4 py-3 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">
              ← Atrás
            </button>
            <button onClick={() => setTab("plan")}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl transition-all">
              Siguiente: Plan →
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Plan ── */}
      {tab === "plan" && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-1">¿Cuánto la sueles regar normalmente?</p>
            <p className="text-xs text-gray-400 mb-4">¡No hay respuesta incorrecta!</p>
            <OpcionVisual opciones={Object.keys(TRADUCCIONES.riegoHabitual)} valor={simple.riegoHabitual} onChange={v=>setS("riegoHabitual",v)}/>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-base font-black text-gray-700 mb-4">¿Para cuántos días quieres el plan?</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">1 día</span>
                <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">{labelDias}</span>
                <span className="text-sm text-gray-400">1 mes</span>
              </div>
              <Slider label="" value={diasSlider} min={1} max={30} unit="" onChange={setDiasSlider}/>
              <div className="flex gap-2 flex-wrap">
                {[1,3,7,14,30].map(d => (
                  <button key={d} onClick={() => setDiasSlider(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      diasSlider===d ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-emerald-300"
                    }`}>
                    {d===1?"Hoy":d===7?"1 sem":d===14?"2 sem":d===30?"1 mes":`${d}d`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen de lo que falta si no está completo */}
          {!simpleCompleto && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-amber-700 mb-1">⚠️ Aún faltan respuestas en:</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  !simple.tierra         && { tab:"cultivo", label:"Estado de la tierra" },
                  !simple.sol            && { tab:"entorno", label:"Clima de hoy"         },
                  !simple.lluvia         && { tab:"entorno", label:"Si llovió"            },
                  !simple.horasSol       && { tab:"entorno", label:"Horas de sol"         },
                  !simple.techo          && { tab:"entorno", label:"Si tiene techo"       },
                  !simple.contenedor     && { tab:"entorno", label:"Dónde está la planta" },
                  !simple.riegoHabitual  && { tab:"plan",    label:"Cuánto riegas"        },
                ].filter(Boolean).map((item, i) => (
                  <button key={i} onClick={() => setTab(item.tab)}
                    className="text-xs bg-white border border-amber-300 text-amber-700 px-2 py-1 rounded-lg font-semibold hover:bg-amber-100 transition">
                    {item.label} →
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setTab("entorno")}
              className="px-4 py-3 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">
              ← Atrás
            </button>
            <button onClick={() => ejecutar()} disabled={loading || !simpleCompleto}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-emerald-100">
              {loading ? "Analizando..." : !simpleCompleto ? "Completa los pasos faltantes" : `🔍 Analizar — ${labelDias}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export default function SimuladorRiego() {
  const [modo, setModo] = useState("simple");
  const [diasSlider, setDiasSlider] = useState(7);

  const [simple, setSimple] = useState({
    cultivo:"lechuga", etapa:"desarrollo",
    tierra:"", sol:"", lluvia:"",
    horasSol:"", techo:"", contenedor:"", riegoHabitual:"",
  });
  const [tecnico, setTecnico] = useState({
    radiacion:500, humedadSuelo:55, precipitacion:3,
    temperatura:22, cultivo:"lechuga", etapa:"desarrollo",
    riegoAplicado:0, horasSol:6, techo:"abierto",
    contenedor:"tierra", riegoHabitual:"normal",
  });

  const [sim, setSim]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const setS = (k, v) => setSimple(p => ({ ...p, [k]: v }));
  const setT = (k, v) => setTecnico(p => ({ ...p, [k]: v }));

  const traducirSimple = () => ({
    cultivo:       simple.cultivo,
    etapa:         simple.etapa,
    humedadSuelo:  (TRADUCCIONES.tierra[simple.tierra]        || {humedadSuelo:50}).humedadSuelo,
    radiacion:     (TRADUCCIONES.sol[simple.sol]              || {radiacion:500}).radiacion,
    temperatura:   (TRADUCCIONES.sol[simple.sol]              || {temperatura:22}).temperatura,
    precipitacion: (TRADUCCIONES.lluvia[simple.lluvia]        || {precipitacion:3}).precipitacion,
    horasSol:      (TRADUCCIONES.horasSol[simple.horasSol]    || {horasSol:6}).horasSol,
    techo:         (TRADUCCIONES.techo[simple.techo]          || {techo:"abierto"}).techo,
    contenedor:    (TRADUCCIONES.contenedor[simple.contenedor]|| {contenedor:"tierra"}).contenedor,
    riegoHabitual: (TRADUCCIONES.riegoHabitual[simple.riegoHabitual] || {riegoHabitual:"normal"}).riegoHabitual,
    riegoAplicado: 0,
    dias: diasSlider,
  });

  const ejecutar = async (overrides = {}) => {
    setLoading(true);
    setError(null);
    const payload = modo === "simple"
      ? { ...traducirSimple(), ...overrides }
      : { ...tecnico, ...overrides, dias: diasSlider };
    try {
      const res  = await fetch(`${API_URL}/simular`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en la API");
      setSim(data);
    } catch (e) {
      setError(e.message.includes("fetch") || e.message.includes("Failed")
        ? "No se pudo conectar con la API Flask. Asegúrate de que esté corriendo en localhost:5000"
        : e.message);
    } finally { setLoading(false); }
  };

  const escenario = (tipo) => {
    const ov = tipo==="riego"?{riegoAplicado:10}:tipo==="sequia"?{precipitacion:0,riegoAplicado:0}:{radiacion:820};
    if (modo==="tecnico") setTecnico(p=>({...p,...ov}));
    ejecutar(ov);
  };

  const simpleCompleto = simple.tierra && simple.sol && simple.lluvia &&
    simple.horasSol && simple.techo && simple.contenedor && simple.riegoHabitual;

  const ST = {
    critico:{ bg:"bg-red-50",     border:"border-red-200",     pill:"bg-red-100 text-red-700",         dot:"bg-red-500",     text:"text-red-700",     bar:"#ef4444", metricColor:"rose"    },
    alerta: { bg:"bg-amber-50",   border:"border-amber-200",   pill:"bg-amber-100 text-amber-700",     dot:"bg-amber-500",   text:"text-amber-700",   bar:"#f59e0b", metricColor:"amber"   },
    optimo: { bg:"bg-emerald-50", border:"border-emerald-200", pill:"bg-emerald-100 text-emerald-700", dot:"bg-emerald-500", text:"text-emerald-700", bar:"#10b981", metricColor:"emerald" },
  };
  const st = sim ? ST[sim.estado] : null;

  // Label amigable para el slider de días
  const labelDias = diasSlider === 1 ? "Solo hoy" : diasSlider <= 3 ? `${diasSlider} días` :
    diasSlider === 7 ? "1 semana" : diasSlider === 14 ? "2 semanas" :
    diasSlider === 30 ? "1 mes" : `${diasSlider} días`;

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">🌿</div>
            <div>
              <h1 className="text-sm font-black text-gray-800 tracking-tight">Simulador de Riego</h1>
              <p className="text-xs text-gray-400">Balance hídrico · Evapotranspiración</p>
            </div>
          </div>
          {/* Toggle modo */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id:"simple",  label:"🌱 Modo Simple",  sub:"Para cualquier persona" },
              { id:"tecnico", label:"🔬 Modo Técnico", sub:"Con datos precisos"      },
            ].map(m => (
              <button key={m.id} onClick={() => { setModo(m.id); setSim(null); setError(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex flex-col items-center ${
                  modo===m.id ? "bg-white text-emerald-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}>
                <span>{m.label}</span>
                <span className="font-normal opacity-60 text-xs">{m.sub}</span>
              </button>
            ))}
          </div>
          {modo==="tecnico" && (
            <div className="flex gap-2">
              {[
                {id:"riego",     label:"＋ Riego 10mm",    cls:"bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"   },
                {id:"sequia",    label:"☀ Sin lluvia",      cls:"bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"},
                {id:"radiacion", label:"🔆 Alta radiación", cls:"bg-red-50 text-red-700 hover:bg-red-100 border-red-200"       },
              ].map(e => (
                <button key={e.id} onClick={() => escenario(e.id)} disabled={loading}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${e.cls}`}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── MODO SIMPLE — TABS ── */}
        {modo==="simple" && (
          <ModoSimpleTabs
            simple={simple} setS={setS}
            diasSlider={diasSlider} setDiasSlider={setDiasSlider}
            labelDias={labelDias} simpleCompleto={simpleCompleto}
            loading={loading} ejecutar={ejecutar}
          />
        )}

        {/* ── MODO TÉCNICO ── */}
        {modo==="tecnico" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Cultivo</p>
              <div className="space-y-4">
                <SelectBasico label="Tipo de cultivo" value={tecnico.cultivo} onChange={v=>setT("cultivo",v)}
                  options={CULTIVOS.map(c=>({value:c.value,label:`${c.emoji} ${c.label}`}))}/>
                <SelectBasico label="Etapa" value={tecnico.etapa} onChange={v=>setT("etapa",v)}
                  options={ETAPAS.map(e=>({value:e.value,label:`${e.emoji} ${e.label}`}))}/>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Clima</p>
              <div className="space-y-5">
                <Slider label="Temperatura" value={tecnico.temperatura} min={15} max={38} unit="°C" onChange={v=>setT("temperatura",v)}/>
                <Slider label="Radiación solar" value={tecnico.radiacion} min={100} max={900} step={10} unit=" W/m²" onChange={v=>setT("radiacion",v)}/>
                <Slider label="Horas de sol" value={tecnico.horasSol} min={1} max={12} unit="h" onChange={v=>setT("horasSol",v)}/>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Precipitación diaria</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{tecnico.precipitacion} mm</span>
                  </div>
                  <input type="number" min={0} max={50} value={tecnico.precipitacion}
                    onChange={e=>setT("precipitacion",Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Suelo y entorno</p>
              <div className="space-y-5">
                <Slider label="Humedad inicial" value={tecnico.humedadSuelo} min={10} max={90} unit="%" onChange={v=>setT("humedadSuelo",v)}/>
                <Slider label="Riego adicional" value={tecnico.riegoAplicado} min={0} max={30} unit=" mm" onChange={v=>setT("riegoAplicado",v)}/>
                <SelectBasico label="Techo / exposición" value={tecnico.techo} onChange={v=>setT("techo",v)}
                  options={[{value:"abierto",label:"☀️ A cielo abierto"},{value:"semitecho",label:"⛅ Semitecho"},{value:"techo",label:"🏠 Bajo techo"}]}/>
                <SelectBasico label="Tipo de contenedor" value={tecnico.contenedor} onChange={v=>setT("contenedor",v)}
                  options={[{value:"tierra",label:"🌱 Tierra directa"},{value:"maceta_grande",label:"🪣 Maceta grande"},{value:"maceta_chica",label:"🪴 Maceta chica"}]}/>
                <SelectBasico label="Hábito de riego" value={tecnico.riegoHabitual} onChange={v=>setT("riegoHabitual",v)}
                  options={[{value:"poco",label:"💧 Poco"},{value:"normal",label:"💧💧 Normal"},{value:"abundante",label:"💧💧💧 Abundante"}]}/>
              </div>
            </div>

            {/* Días */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Días a simular</p>
              <Slider label="" value={diasSlider} min={1} max={30} unit=" días" onChange={setDiasSlider}/>
              <div className="flex gap-2 flex-wrap mt-3">
                {[1,3,7,14,30].map(d => (
                  <button key={d} onClick={() => setDiasSlider(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      diasSlider===d ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-emerald-300"
                    }`}>
                    {d===1?"Hoy":d===7?"1 sem":d===14?"2 sem":d===30?"1 mes":`${d}d`}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => ejecutar()} disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-emerald-100">
              {loading ? "Consultando API..." : `▶ Simular — ${labelDias}`}
            </button>
          </div>
        )}

        {/* Panel derecho — resultados */}
        <div className="lg:col-span-2 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-bold mb-0.5">Error al conectar con la API</p>
                <p className="text-red-500">{error}</p>
                <p className="text-xs text-red-400 mt-1 font-mono">python app.py → http://localhost:5000</p>
              </div>
            </div>
          )}

          {!sim && !error && (
            <div className="h-full min-h-96 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl mb-4">
                {modo==="simple" ? "🌱" : "💧"}
              </div>
              <h3 className="text-base font-black text-gray-300 mb-2">
                {modo==="simple" ? "Responde los pasos del panel izquierdo" : "Configura y ejecuta"}
              </h3>
              <p className="text-sm text-gray-300 max-w-xs leading-relaxed">
                {modo==="simple"
                  ? "No necesitas saber de agricultura. Solo observa tu cultivo y responde lo que ves."
                  : "Ajusta las variables técnicas y presiona el botón para simular."}
              </p>
            </div>
          )}

          {sim && st && <Resultados sim={sim} st={st} />}
        </div>
      </div>
    </div>
  );
}