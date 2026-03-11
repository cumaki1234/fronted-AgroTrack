import { useState, useMemo, memo } from "react";
import { X, History, Clock } from "lucide-react";
import { ESTADO_EMOJI, ESTADO_LABEL } from "../constants/editor";
import { calcularEstadoVisual, estadoRiegoVisual, esMuerta, esMala } from "../utils/plant";

// ─── Simulador de tiempo ──────────────────────────────────
export const SimuladorTiempo = memo(function SimuladorTiempo({ offsetDias, onChange }) {
  return (
    <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5">
      <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0"/>
      <span className="text-xs text-violet-700 font-black whitespace-nowrap">
        {offsetDias === 0 ? "Hoy" : `+${offsetDias}d`}
      </span>
      <div className="flex gap-0.5">
        {[1,3,7,15,30].map(p => (
          <button key={p} onClick={() => onChange(offsetDias + p)}
            className="px-1.5 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-xs font-black transition">
            +{p}
          </button>
        ))}
        {offsetDias > 0 && (
          <button onClick={() => onChange(0)}
            className="px-1.5 py-0.5 bg-violet-500 hover:bg-violet-600 text-white rounded text-xs font-black transition ml-0.5">
            ↩
          </button>
        )}
      </div>
    </div>
  );
});

// ─── Panel actividades ────────────────────────────────────
const ICONOS_ACT  = { riego:"💧", cosecha:"✂️", siembra:"🌱", muerte:"💀", limpieza:"🧹" };
const COLORES_ACT = { riego:"#bfdbfe", cosecha:"#fef08a", siembra:"#dcfce7", muerte:"#fca5a5", limpieza:"#e5e7eb" };

export const PanelActividades = memo(function PanelActividades({
  actividades, plantacionesBD, cultivosBD, offsetDias, onCerrar
}) {
  const [tab, setTab] = useState("actividad");

  const riegoPend = useMemo(() =>
    Object.values(plantacionesBD).filter(p =>
      !esMuerta(p.estado) && p.estado !== "cosechado" &&
      estadoRiegoVisual(p.ultimo_riego, offsetDias).nivel !== "bien"
    ), [plantacionesBD, offsetDias]);

  const alertas = useMemo(() =>
    Object.values(plantacionesBD).filter(p => {
      const dur = cultivosBD.find(c => c.id === p.cultivo_tipo)?.duracion_dias || 60;
      return esMala(calcularEstadoVisual(p, offsetDias, dur)) || esMuerta(p.estado) || p.estado === "pasada";
    }), [plantacionesBD, offsetDias, cultivosBD]);

  const TABS = [
    { id:"actividad", label:"📋 Historial", n: actividades.length },
    { id:"riego",     label:"💧 Riego",     n: riegoPend.length   },
    { id:"alertas",   label:"⚠️ Alertas",  n: alertas.length     },
  ];

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-[9000] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <p className="font-black text-gray-800 flex items-center gap-2"><History className="w-4 h-4"/>Actividad</p>
        <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex border-b border-gray-100 shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-black border-b-2 transition
              ${tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-400"}`}>
            {t.label}
            {t.n > 0 && (
              <span className={`ml-1 rounded-full px-1.5 text-xs
                ${tab === t.id ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>{t.n}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "actividad" && (
          actividades.length === 0
            ? <div className="text-center py-10"><p className="text-3xl mb-2">📋</p><p className="text-sm text-gray-400">Sin actividades aún</p></div>
            : <div className="space-y-2">
                {[...actividades].reverse().map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100"
                    style={{ backgroundColor: (COLORES_ACT[a.tipo_actividad] || "#f9fafb") + "99" }}>
                    <span className="text-xl">{ICONOS_ACT[a.tipo_actividad] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      {a.cultivo_nombre && <p className="text-xs font-semibold text-gray-600">{a.cultivo_nombre}</p>}
                      <p className="text-xs font-bold text-gray-700 capitalize">{a.tipo_actividad}</p>
                      {a.descripcion && <p className="text-xs text-gray-500 truncate">{a.descripcion}</p>}
                      <p className="text-xs text-gray-400">{a.fecha}</p>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {tab === "riego" && (
          riegoPend.length === 0
            ? <div className="text-center py-10"><p className="text-3xl mb-2">💦</p><p className="text-sm text-gray-400">Todo al día</p></div>
            : <div className="space-y-2">
                {riegoPend.map((p, i) => {
                  const r = estadoRiegoVisual(p.ultimo_riego, offsetDias);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ backgroundColor: r.color + "55", borderColor: r.color }}>
                      <span className="text-xl">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{p.cultivo_nombre}</p>
                        <p className="text-xs text-gray-500">{r.label} · {p.ultimo_riego || "nunca"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {tab === "alertas" && (
          alertas.length === 0
            ? <div className="text-center py-10"><p className="text-3xl mb-2">✅</p><p className="text-sm text-gray-400">Sin alertas</p></div>
            : <div className="space-y-2">
                {alertas.map((p, i) => {
                  const dur = cultivosBD.find(c => c.id === p.cultivo_tipo)?.duracion_dias || 60;
                  const est = calcularEstadoVisual(p, offsetDias, dur);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
                      <span className="text-xl">{ESTADO_EMOJI[est] || "⚠️"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{p.cultivo_nombre}</p>
                        <p className="text-xs text-red-600 font-semibold">{ESTADO_LABEL[est] || est}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}
      </div>
    </div>
  );
});
