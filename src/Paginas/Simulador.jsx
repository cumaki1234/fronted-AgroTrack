import { useState, useCallback, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis
} from "recharts";

const API_URL = "https://backend-modelo-gmfn.onrender.com";

// ─── Paleta y tema ────────────────────────────────────────
const THEME = {
  maceta:  { accent: "#d97706", light: "#fef3c7", mid: "#f59e0b", dark: "#92400e", emoji: "🪴", glow: "shadow-amber-200"  },
  jardin:  { accent: "#059669", light: "#d1fae5", mid: "#10b981", dark: "#065f46", emoji: "🌳", glow: "shadow-emerald-200" },
};

// ─── Rangos por escenario ─────────────────────────────────
// Maceta: condiciones más controladas, menor altitud, sin lluvia real
// Jardín: condiciones abiertas, mayor variabilidad
const DEFAULTS = {
  maceta: {
    Temperatura: 22, Humedad: 65, pH_Suelo: 6.5,
    Luz_Solar: 8,   Precipitacion: 20, Altitud: 500,
    Tipo_Suelo: "Mixto", Tipo_Irrigacion: "Goteo",
    Uso_Fertilizantes: "Organicos", Presencia_Plagas_Enfermedades: "No",
    Tipo_Producto: "Lechuga", tamano_maceta: "mediana",
  },
  jardin: {
    Temperatura: 20, Humedad: 60, pH_Suelo: 6.8,
    Luz_Solar: 10,  Precipitacion: 55, Altitud: 1200,
    Tipo_Suelo: "Mixto", Tipo_Irrigacion: "Aspersion",
    Uso_Fertilizantes: "Organicos", Presencia_Plagas_Enfermedades: "No",
    Tipo_Producto: "Tomate", tamano_maceta: "jardin",
  },
};

// Metadatos de tamaños de maceta (para UI y validaciones)
const TAMANOS_MACETA = [
  { id:"chica",   label:"Chica",   vol:"≤ 3L",   desc:"Hierbas, lechuga, espinaca",               factor:1.7  },
  { id:"mediana", label:"Mediana", vol:"5–15L",  desc:"Tomate cherry, pimientos, cebolla",         factor:1.35 },
  { id:"grande",  label:"Grande",  vol:"20–30L", desc:"Tomate, zanahoria, papa, frijol",           factor:1.15 },
];

// Cultivos no viables por tamaño (mostrar advertencia)
const NO_VIABLE = {
  chica:   ["Maiz","Trigo","Papa","Zanahoria"],
  mediana: ["Maiz","Trigo"],
  grande:  ["Maiz","Trigo"],
};

const RANGOS = {
  maceta: {
    Temperatura:   { min: 10, max: 40, step: 1,   unit: "°C",    label: "Temperatura" },
    Humedad:       { min: 30, max: 90, step: 1,   unit: "%",     label: "Humedad amb." },
    pH_Suelo:      { min: 4,  max: 9,  step: 0.1, unit: "",      label: "pH del suelo" },
    Luz_Solar:     { min: 1,  max: 16, step: 0.5, unit: "h/día", label: "Luz solar"    },
    Precipitacion: { min: 0,  max: 50, step: 1,   unit: "mm",    label: "Riego aplicado" },
    Altitud:       { min: 0,  max: 3000, step: 50, unit: "m",    label: "Altitud"      },
  },
  jardin: {
    Temperatura:   { min: 5,  max: 45, step: 1,   unit: "°C",    label: "Temperatura" },
    Humedad:       { min: 30, max: 100,step: 1,   unit: "%",     label: "Humedad amb." },
    pH_Suelo:      { min: 4,  max: 9,  step: 0.1, unit: "",      label: "pH del suelo" },
    Luz_Solar:     { min: 1,  max: 18, step: 0.5, unit: "h/día", label: "Luz solar"    },
    Precipitacion: { min: 0,  max: 100,step: 1,   unit: "mm",    label: "Precipitación" },
    Altitud:       { min: 0,  max: 4500, step: 100,"unit": "m",  label: "Altitud"      },
  },
};

const CULTIVOS = [
  { v:"Lechuga",   e:"🥬" }, { v:"Tomate",    e:"🍅" }, { v:"Zanahoria", e:"🥕" },
  { v:"Espinaca",  e:"🌿" }, { v:"Frijol",    e:"🫘" }, { v:"Cebolla",   e:"🧅" },
  { v:"Papa",      e:"🥔" }, { v:"Remolacha", e:"🟣" }, { v:"Trigo",     e:"🌾" },
  { v:"Maiz",      e:"🌽" },
];
const SUELOS     = ["Mixto","Arcilloso","Arenoso"];
const IRRIGACION = ["Goteo","Aspersion","Gravedad"];
const FERTILIZ   = ["Organicos","Quimicos"];

// ─── Resultado → estilo ───────────────────────────────────
const ESTADO_STYLE = {
  Bueno:   { bg:"#d1fae5", border:"#6ee7b7", text:"#065f46", badge:"bg-emerald-100 text-emerald-800", icon:"✅", label:"Condiciones óptimas" },
  Regular: { bg:"#fef3c7", border:"#fde68a", text:"#92400e", badge:"bg-amber-100 text-amber-800",     icon:"⚠️", label:"Condiciones aceptables" },
  Malo:    { bg:"#fee2e2", border:"#fca5a5", text:"#991b1b", badge:"bg-red-100 text-red-800",         icon:"🚨", label:"Condiciones críticas" },
};

// ─── Hook: llamada al modelo ──────────────────────────────
function useModelo() {
  const [resultado, setResultado] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const predecir = useCallback(async (vars) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_URL}/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error API");
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  return { resultado, loading, error, predecir };
}

// ─── Slider personalizado ─────────────────────────────────
function SliderVar({ campo, config, valor, onChange, accentColor }) {
  const pct = ((valor - config.min) / (config.max - config.min)) * 100;
  return (
    <div className="group">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{config.label}</span>
        <span className="text-sm font-black tabular-nums" style={{ color: accentColor }}>
          {typeof valor === "number" && campo === "pH_Suelo" ? valor.toFixed(1) : valor}{config.unit}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100">
        <div className="absolute h-full rounded-full transition-all duration-150"
          style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${accentColor}66, ${accentColor})` }}/>
        <input type="range" min={config.min} max={config.max} step={config.step} value={valor}
          onChange={e => onChange(campo, Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"/>
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md pointer-events-none transition-all duration-150"
          style={{ left:`calc(${pct}% - 8px)`, borderColor: accentColor }}/>
      </div>
    </div>
  );
}

// ─── Selector de opciones tipo chip ──────────────────────
function ChipSelector({ opciones, valor, onChange, accentColor, emojiMap }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map(op => (
        <button key={op} onClick={() => onChange(op)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150"
          style={valor === op
            ? { backgroundColor: accentColor + "22", borderColor: accentColor, color: accentColor }
            : { backgroundColor: "#f9fafb", borderColor: "#e5e7eb", color: "#6b7280" }}>
          {emojiMap?.[op] && <span className="mr-1">{emojiMap[op]}</span>}{op}
        </button>
      ))}
    </div>
  );
}

// ─── Gauge ISP ────────────────────────────────────────────
function GaugeISP({ isp, estado }) {
  const style  = ESTADO_STYLE[estado] || ESTADO_STYLE.Regular;
  const pct    = Math.max(0, Math.min(1, isp));
  const angle  = pct * 180 - 90; // -90 a +90
  const r = 70, cx = 90, cy = 90;
  const arcStart = { x: cx - r, y: cy };
  const arcEnd   = { x: cx + r, y: cy };
  // Needle
  const rad  = (angle * Math.PI) / 180;
  const nx   = cx + (r - 12) * Math.cos(rad);
  const ny   = cy + (r - 12) * Math.sin(rad);

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Arco fondo */}
        <path d={`M ${arcStart.x} ${cy} A ${r} ${r} 0 0 1 ${arcEnd.x} ${cy}`}
          fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round"/>
        {/* Arco rojo */}
        <path d={`M ${arcStart.x} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((0.3*180-90)*Math.PI/180)} ${cy + r * Math.sin((0.3*180-90)*Math.PI/180)}`}
          fill="none" stroke="#fca5a5" strokeWidth="12" strokeLinecap="round"/>
        {/* Arco amarillo */}
        <path d={`M ${cx + r * Math.cos((0.3*180-90)*Math.PI/180)} ${cy + r * Math.sin((0.3*180-90)*Math.PI/180)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((0.55*180-90)*Math.PI/180)} ${cy + r * Math.sin((0.55*180-90)*Math.PI/180)}`}
          fill="none" stroke="#fde68a" strokeWidth="12" strokeLinecap="round"/>
        {/* Arco verde */}
        <path d={`M ${cx + r * Math.cos((0.55*180-90)*Math.PI/180)} ${cy + r * Math.sin((0.55*180-90)*Math.PI/180)} A ${r} ${r} 0 0 1 ${arcEnd.x} ${cy}`}
          fill="none" stroke="#6ee7b7" strokeWidth="12" strokeLinecap="round"/>
        {/* Aguja */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1f2937" strokeWidth="3" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="5" fill="#1f2937"/>
        {/* Valor */}
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="22" fontWeight="900" fill={style.text}>{(pct*100).toFixed(0)}</text>
        <text x={cx} y={cy - 6}  textAnchor="middle" fontSize="9"  fill="#9ca3af">ISP</text>
      </svg>
      <span className={`text-xs font-black px-3 py-1 rounded-full ${style.badge}`}>{style.icon} {estado}</span>
    </div>
  );
}

// ─── Radar de variables ───────────────────────────────────
function RadarVariables({ vars, escenario }) {
  const theme = THEME[escenario];
  // Normalizar cada variable a 0-100 para el radar
  const rangos = RANGOS[escenario];
  const data = Object.entries(rangos).map(([k, r]) => ({
    var: r.label.split(" ")[0],
    valor: Math.round(((vars[k] - r.min) / (r.max - r.min)) * 100),
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top:10, right:20, bottom:10, left:20 }}>
        <PolarGrid stroke="#e5e7eb"/>
        <PolarAngleAxis dataKey="var" tick={{ fontSize:10, fill:"#9ca3af", fontWeight:700 }}/>
        <Radar dataKey="valor" stroke={theme.accent} fill={theme.accent} fillOpacity={0.15} strokeWidth={2}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Panel de un escenario ────────────────────────────────
function PanelEscenario({ escenario }) {
  const theme  = THEME[escenario];
  const [vars, setVars]   = useState({ ...DEFAULTS[escenario] });
  const [dirty, setDirty] = useState(false);
  const { resultado, loading, error, predecir } = useModelo();

  const setVar = useCallback((campo, valor) => {
    setVars(p => ({ ...p, [campo]: valor }));
    setDirty(true);
  }, []);

  const ejecutar = useCallback(() => {
    predecir({ ...vars, escenario, tamano_maceta: vars.tamano_maceta || (escenario === "maceta" ? "mediana" : "jardin"), dias: 1 });
    setDirty(false);
  }, [vars, predecir, escenario]);

  const resetear = () => { setVars({ ...DEFAULTS[escenario] }); setDirty(true); };

  const estilo = resultado ? ESTADO_STYLE[resultado.estado] : null;

  // Mapa emoji para cultivos
  const cultivoEmoji = Object.fromEntries(CULTIVOS.map(c => [c.v, c.e]));

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border"
      style={{ borderColor: theme.mid + "66", boxShadow:`0 4px 32px 0 ${theme.accent}18` }}>

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ background:`linear-gradient(135deg, ${theme.light}, white)`, borderBottom:`1px solid ${theme.mid}33` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: theme.accent + "22" }}>{theme.emoji}</div>
          <div>
            <h2 className="font-black text-gray-800 capitalize text-base">Escenario {escenario}</h2>
            <p className="text-xs text-gray-400">
              {escenario === "maceta" ? "Ambiente controlado · Riego manual" : "Ambiente abierto · Condiciones naturales"}
            </p>
          </div>
        </div>
        <button onClick={resetear} className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-bold transition">
          ↺ Reset
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Columna izquierda: controles ── */}
        <div className="w-72 shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: theme.mid + "33" }}>

          {/* Variables numéricas */}
          <div className="p-5 space-y-5 border-b" style={{ borderColor: theme.mid + "22" }}>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: theme.dark }}>
              Variables ambientales
            </p>
            {Object.entries(RANGOS[escenario]).map(([campo, cfg]) => (
              <SliderVar key={campo} campo={campo} config={cfg}
                valor={vars[campo]} onChange={setVar} accentColor={theme.accent}/>
            ))}
          </div>

          {/* Cultivo */}
          <div className="p-5 space-y-3 border-b" style={{ borderColor: theme.mid + "22" }}>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: theme.dark }}>
              Cultivo
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {CULTIVOS.map(c => {
                const noViable = escenario === "maceta" && vars.tamano_maceta &&
                  (NO_VIABLE[vars.tamano_maceta] || []).includes(c.v);
                return (
                  <button key={c.v} onClick={() => setVar("Tipo_Producto", c.v)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold border transition-all relative"
                    style={vars.Tipo_Producto === c.v
                      ? { backgroundColor: theme.accent+"22", borderColor: theme.accent, color: theme.dark }
                      : noViable
                        ? { backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#ef4444" }
                        : { backgroundColor: "#f9fafb", borderColor: "#e5e7eb", color: "#6b7280" }}>
                    <span>{c.e}</span><span>{c.v}</span>
                    {noViable && <span className="ml-auto text-xs">⚠️</span>}
                  </button>
                );
              })}
            </div>
            {escenario === "maceta" && vars.tamano_maceta && (NO_VIABLE[vars.tamano_maceta] || []).includes(vars.Tipo_Producto) && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                ⚠️ <strong>{vars.Tipo_Producto}</strong> no es viable en maceta {vars.tamano_maceta}. Tiene raíces muy profundas o crece demasiado alto.
              </div>
            )}
          </div>

          {/* Tamaño de maceta — solo en escenario maceta */}
          {escenario === "maceta" && (
            <div className="p-5 space-y-3 border-b" style={{ borderColor: theme.mid + "22" }}>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: theme.dark }}>
                Tamaño de maceta
              </p>
              <div className="space-y-1.5">
                {TAMANOS_MACETA.map(t => (
                  <button key={t.id} onClick={() => setVar("tamano_maceta", t.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                    style={vars.tamano_maceta === t.id
                      ? { backgroundColor: theme.accent+"18", borderColor: theme.accent }
                      : { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
                    <span className="text-lg">🪴</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black" style={{ color: vars.tamano_maceta === t.id ? theme.dark : "#374151" }}>
                        {t.label} <span className="font-normal text-gray-400">({t.vol})</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate">{t.desc}</p>
                    </div>
                    {vars.tamano_maceta === t.id && (
                      <span className="text-xs font-black shrink-0" style={{ color: theme.accent }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 leading-relaxed">
                💧 Las macetas se secan {
                  vars.tamano_maceta === "chica" ? "~70%" :
                  vars.tamano_maceta === "mediana" ? "~35%" : "~15%"
                } más rápido que la tierra. Revisa la humedad del sustrato a diario.
              </div>
            </div>
          )}

          {/* Variables categóricas */}
          <div className="p-5 space-y-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: theme.dark }}>
              Condiciones del suelo
            </p>

            <div>
              <p className="text-xs font-bold text-gray-400 mb-2">Tipo de suelo</p>
              <ChipSelector opciones={SUELOS} valor={vars.Tipo_Suelo}
                onChange={v => setVar("Tipo_Suelo", v)} accentColor={theme.accent}/>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 mb-2">Tipo de irrigación</p>
              <ChipSelector opciones={IRRIGACION} valor={vars.Tipo_Irrigacion}
                onChange={v => setVar("Tipo_Irrigacion", v)} accentColor={theme.accent}/>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 mb-2">Fertilizantes</p>
              <ChipSelector opciones={FERTILIZ} valor={vars.Uso_Fertilizantes}
                onChange={v => setVar("Uso_Fertilizantes", v)} accentColor={theme.accent}/>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 mb-2">Plagas / Enfermedades</p>
              <ChipSelector opciones={["No","Si"]} valor={vars.Presencia_Plagas_Enfermedades}
                onChange={v => setVar("Presencia_Plagas_Enfermedades", v)} accentColor={theme.accent}
                emojiMap={{ No:"✅", Si:"🐛" }}/>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: resultado ── */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* Botón predecir */}
          <div className="p-5 shrink-0">
            <button onClick={ejecutar} disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg"
              style={{ background:`linear-gradient(135deg, ${theme.accent}, ${theme.dark})`,
                       boxShadow: dirty ? `0 4px 20px ${theme.accent}55` : "none" }}>
              {loading ? "⏳ Prediciendo..." : dirty ? `▶ Predecir estado — ${vars.Tipo_Producto}` : "▶ Predecir de nuevo"}
            </button>
            {dirty && !loading && (
              <p className="text-xs text-center mt-2" style={{ color: theme.accent }}>
                ⬆ Hay cambios sin predecir
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <p className="font-bold mb-1">⚠️ Error al conectar con la API</p>
              <p className="font-mono opacity-75">{error}</p>
            </div>
          )}

          {/* Resultado */}
          {resultado && estilo && (
            <div className="px-5 pb-5 space-y-4">

              {/* Gauge + estado */}
              <div className="rounded-2xl p-5 flex flex-col items-center gap-2"
                style={{ backgroundColor: estilo.bg, border:`1px solid ${estilo.border}` }}>
                <GaugeISP isp={resultado.isp_final ?? (resultado.humedadFinal / 100)} estado={resultado.estado}/>
                <p className="text-sm font-black mt-1" style={{ color: estilo.text }}>{resultado.titulo || estilo.label}</p>
                {resultado.mensaje && (
                  <p className="text-xs text-center leading-relaxed text-gray-600 max-w-xs">{resultado.mensaje}</p>
                )}
              </div>

              {/* Alertas de maceta (si aplica) */}
              {resultado.diagnostico?.alertas_maceta?.length > 0 && (
                <div className="space-y-2">
                  {resultado.diagnostico.alertas_maceta.map((alerta, i) => (
                    <div key={i} className={`rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                      alerta.nivel === "critico"     ? "bg-red-50 border-red-200 text-red-800" :
                      alerta.nivel === "advertencia" ? "bg-amber-50 border-amber-200 text-amber-800" :
                      alerta.nivel === "info"        ? "bg-blue-50 border-blue-200 text-blue-800" :
                                                       "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}>
                      {alerta.texto}
                    </div>
                  ))}
                </div>
              )}

              {/* Radar de variables normalizadas */}
              <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: theme.mid + "44" }}>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: theme.dark }}>
                  Perfil de variables
                </p>
                <RadarVariables vars={vars} escenario={escenario}/>
              </div>

              {/* Diagnóstico variable por variable */}
              {resultado.diagnostico && (
                <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: theme.mid + "44" }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: theme.mid + "33", backgroundColor: theme.light + "88" }}>
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: theme.dark }}>
                      🔬 Diagnóstico por variable
                    </p>
                    {resultado.diagnostico.n_problemas > 0 && (
                      <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {resultado.diagnostico.n_problemas} {resultado.diagnostico.n_problemas === 1 ? "problema" : "problemas"}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    {/* Problemas detectados */}
                    {resultado.diagnostico.problemas?.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100">
                        <span className="shrink-0 mt-0.5 text-base">{p.split(" ")[0]}</span>
                        <p className="text-xs text-red-800 leading-relaxed">{p.split(" ").slice(1).join(" ")}</p>
                      </div>
                    ))}
                    {/* Cosas que están bien */}
                    {resultado.diagnostico.positivos?.length > 0 && (
                      <details className="group">
                        <summary className="text-xs text-gray-400 cursor-pointer select-none py-1 hover:text-gray-600 list-none flex items-center gap-1">
                          <span className="group-open:hidden">▶</span>
                          <span className="hidden group-open:inline">▼</span>
                          Ver {resultado.diagnostico.positivos.length} variables en rango óptimo
                        </summary>
                        <div className="mt-2 space-y-1.5">
                          {resultado.diagnostico.positivos.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                              <p className="text-xs text-emerald-800 leading-relaxed">{p}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    {resultado.diagnostico.n_problemas === 0 && resultado.diagnostico.problemas?.length === 0 && (
                      <p className="text-xs text-emerald-700 text-center py-2">
                        ✅ Todas las variables están dentro del rango óptimo para este cultivo.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pasos de acción */}
              {resultado.pasos?.length > 0 && (
                <div className="rounded-2xl p-4 border bg-white" style={{ borderColor: theme.mid + "44" }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: theme.dark }}>Acciones sugeridas</p>
                  <div className="space-y-2">
                    {resultado.pasos.map((paso, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 text-sm text-gray-700">
                        <span className="shrink-0">{paso.split(" ")[0]}</span>
                        <span className="leading-relaxed text-xs">{paso.split(" ").slice(1).join(" ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado vacío */}
          {!resultado && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ backgroundColor: theme.light }}>
                {theme.emoji}
              </div>
              <p className="text-sm font-black text-gray-300 mb-1">Configura las variables</p>
              <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                Ajusta los sliders y las opciones del panel izquierdo, luego presiona <strong>Predecir</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comparador lateral ───────────────────────────────────
function TablaComparacion({ resultados }) {
  if (!resultados.maceta && !resultados.jardin) return null;
  const filas = [
    { k:"estado",      label:"Estado"       },
    { k:"titulo",      label:"Diagnóstico"  },
  ];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span>⚖️</span>
        <p className="text-sm font-black text-gray-600">Comparación de escenarios</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="p-4 space-y-3">
          {filas.map(f => <p key={f.k} className="text-xs font-bold text-gray-400 uppercase tracking-wider py-2">{f.label}</p>)}
        </div>
        {["maceta","jardin"].map(esc => (
          <div key={esc} className="p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: THEME[esc].accent }}>
              {THEME[esc].emoji} {esc}
            </p>
            {resultados[esc]
              ? filas.map(f => {
                  const val = resultados[esc][f.k];
                  const style = f.k === "estado" ? ESTADO_STYLE[val] : null;
                  return (
                    <div key={f.k} className="py-1">
                      {style
                        ? <span className={`text-xs font-black px-2 py-1 rounded-full ${style.badge}`}>{style.icon} {val}</span>
                        : <p className="text-xs text-gray-600 leading-relaxed">{val || "—"}</p>}
                    </div>
                  );
                })
              : <p className="text-xs text-gray-300 col-span-2 py-2">Sin predicción aún</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────
export default function SimuladorEscenarios() {
  const [activeTab, setActiveTab] = useState("ambos"); // "ambos" | "maceta" | "jardin"
  const [resultados, setResultados] = useState({ maceta: null, jardin: null });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-lg shadow-sm">🌿</div>
            <div>
              <h1 className="text-sm font-black text-gray-800 tracking-tight">Simulador por Escenarios</h1>
              <p className="text-xs text-gray-400">Modelo MLP · Variables del dataset · ISP</p>
            </div>
          </div>

          {/* Tabs de vista */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id:"ambos",  label:"🪴🌳 Ambos"   },
              { id:"maceta", label:"🪴 Maceta"    },
              { id:"jardin", label:"🌳 Jardín"    },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all
                  ${activeTab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
            {API_URL.replace("https://","").split(".")[0]}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* Grid de escenarios */}
        <div className={`grid gap-5 ${activeTab === "ambos" ? "grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"}`}
          style={{ height: activeTab === "ambos" ? "calc(100vh - 180px)" : "auto", minHeight: 600 }}>
          {(activeTab === "ambos" || activeTab === "maceta") && (
            <PanelEscenario escenario="maceta"/>
          )}
          {(activeTab === "ambos" || activeTab === "jardin") && (
            <PanelEscenario escenario="jardin"/>
          )}
        </div>

        {/* Comparación (solo en vista ambos) */}
        {activeTab === "ambos" && <TablaComparacion resultados={resultados}/>}

        {/* Info del modelo */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-xs text-gray-400 flex items-start gap-4">
          <span className="text-2xl shrink-0">ℹ️</span>
          <div className="space-y-1">
            <p className="font-black text-gray-600">Sobre el modelo</p>
            <p>Las predicciones se generan con un <strong className="text-gray-600">MLPRegressor</strong> entrenado sobre el dataset de hortalizas de ciclo corto (10.000 registros). El modelo predice el <strong className="text-gray-600">ISP (Índice de Salud de la Planta)</strong> como valor continuo 0–1, que se clasifica según los umbrales: ISP ≥ 0.55 → Bueno · ISP ≥ 0.30 → Regular · ISP &lt; 0.30 → Malo.</p>
            <p className="mt-1">Variables de entrada: Temperatura · Humedad · pH del suelo · Luz solar · Precipitación · Altitud · Tipo de suelo · Tipo de irrigación · Fertilizantes · Presencia de plagas · Tipo de cultivo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}