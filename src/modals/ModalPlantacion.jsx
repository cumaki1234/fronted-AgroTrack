import { useMemo } from "react";
import { X, Droplets, History } from "lucide-react";
import { API, FREQ_RIEGO_DEFAULT, ESTADO_EMOJI, ESTADO_COLOR, ESTADO_LABEL, ESTADOS_ORDEN } from "../constants/editor";
import { calcularEstadoVisual, calcularSaludVisual, estadoRiegoVisual,
         calcularProximosRiegos, esMuerta } from "../utils/plant";

function BarraSalud({ salud }) {
  const color = salud > 60 ? "#22c55e" : salud > 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className="h-2 rounded-full transition-all duration-500" style={{ width:`${salud}%`, backgroundColor:color }}/>
    </div>
  );
}

export default function ModalPlantacion({
  plantacion, actividades, cargando,
  duracionDias, offsetDias,
  onRegar, onCosechar, onLimpiar, onCerrar,
}) {
  if (!plantacion) return null;

  const estadoSim = calcularEstadoVisual(plantacion, offsetDias, duracionDias);
  const saludSim  = calcularSaludVisual(plantacion, offsetDias);
  const riegoEst  = estadoRiegoVisual(plantacion.ultimo_riego, offsetDias);

  const hoy    = new Date(Date.now() + offsetDias * 86400000);
  const siembra = new Date(plantacion.fecha_siembra);
  const diasP  = Math.max(0, Math.floor((hoy - siembra) / 86400000));
  const diasSR = plantacion.ultimo_riego
    ? Math.max(0, Math.floor((hoy - new Date(plantacion.ultimo_riego)) / 86400000))
    : diasP;

  const fechaCosecha = duracionDias ? (() => {
    const d = new Date(siembra); d.setDate(d.getDate() + duracionDias);
    return d.toLocaleDateString("es-ES", { day:"numeric", month:"short", year:"numeric" });
  })() : null;

  const pct      = Math.min(100, Math.round((diasP / duracionDias) * 100));
  const muerta   = esMuerta(estadoSim) || esMuerta(plantacion.estado);
  const pasada   = estadoSim === "pasada" || plantacion.estado === "pasada";
  const listo    = estadoSim === "listo"  || plantacion.estado === "listo";
  const cosechada = plantacion.estado === "cosechado";

  const proximosRiegos = useMemo(
    () => calcularProximosRiegos(diasSR, muerta),
    [diasSR, muerta]
  );

  const ICONOS_ACT  = { riego:"💧", cosecha:"✂️", siembra:"🌱", muerte:"💀", limpieza:"🧹" };
  const COLORES_ACT = { riego:"#bfdbfe", cosecha:"#fef08a", siembra:"#dcfce7", muerte:"#fca5a5", limpieza:"#e5e7eb" };

  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col my-4">

        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {plantacion.cultivo_imagen
                ? <img src={plantacion.cultivo_imagen} className="w-12 h-12 rounded-xl object-cover" alt=""/>
                : <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🌱</div>}
              <div>
                <p className="font-black text-gray-800 text-base">{plantacion.cultivo_nombre}</p>
                <p className="text-xs text-gray-400">Fila {plantacion.fila} · Col {plantacion.columna}</p>
              </div>
            </div>
            <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black"
              style={{ backgroundColor:(ESTADO_COLOR[estadoSim] || "#e5e7eb") + "99", color:"#374151" }}>
              {ESTADO_EMOJI[estadoSim]} {ESTADO_LABEL[estadoSim] || estadoSim}
            </span>
            {offsetDias > 0 && (
              <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full font-semibold">
                🕐 +{offsetDias}d simulados
              </span>
            )}
          </div>

          {(muerta || pasada) && (
            <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${muerta ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p className={`text-xs font-semibold ${muerta ? "text-red-700" : "text-amber-700"}`}>
                {muerta
                  ? (estadoSim === "muerta_sequia" || plantacion.estado === "muerta_sequia"
                      ? `Sin riego por ${diasSR} días — muerta por sequía`
                      : "Regada en exceso — raíces ahogadas")
                  : `${diasP - duracionDias} días sin cosechar — calidad reducida`}
              </p>
            </div>
          )}
        </div>

        {/* Métricas */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">🌱 Plantado hace</p>
              <p className="font-black text-gray-800">{diasP} día{diasP !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">🗓 Cosecha estimada</p>
              <p className="font-black text-green-700 text-sm">{fechaCosecha || "—"}</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: riegoEst.color + "55" }}>
              <p className="text-xs text-gray-400 mb-0.5">💧 Riego</p>
              <p className="font-black text-sm">{riegoEst.emoji} {riegoEst.label}</p>
              <p className="text-xs text-gray-400">{diasSR > 0 ? `hace ${diasSR}d` : "regada hoy"}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">📅 Próx. riego</p>
              <p className="font-black text-sm">{plantacion.proximo_riego || "—"}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-bold text-gray-600">❤️ Salud</span>
              <span className={`font-black ${saludSim > 60 ? "text-green-600" : saludSim > 30 ? "text-amber-500" : "text-red-500"}`}>{saludSim}%</span>
            </div>
            <BarraSalud salud={saludSim}/>
          </div>

          {!muerta && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Progreso</span><span className="font-bold text-gray-700">{pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{
                  width:`${pct}%`,
                  background: pct >= 100 ? "#22c55e" : "linear-gradient(90deg,#86efac,#22c55e)",
                }}/>
              </div>
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                {ESTADOS_ORDEN.map(s => (
                  <span key={s} className={estadoSim === s ? "text-emerald-600 font-bold" : ""}>{ESTADO_EMOJI[s]}</span>
                ))}
              </div>
            </div>
          )}

          {proximosRiegos.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">💧 Riegos planificados</p>
              <div className="flex gap-2">
                {proximosRiegos.map((d, i) => (
                  <div key={i} className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-2 text-center">
                    <p className="text-xs text-blue-400">en {d}d</p>
                    <p className="text-xs font-black text-blue-700">💧</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 border-b border-gray-100 flex gap-2 flex-wrap">
          {!muerta && !cosechada && (
            <button onClick={onRegar} disabled={cargando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              <Droplets className="w-4 h-4"/>Regar ahora
            </button>
          )}
          {(listo || pasada) && !muerta && !cosechada && (
            <button onClick={onCosechar} disabled={cargando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              ✂️ {pasada ? "Cosechar (↓calidad)" : "Cosechar"}
            </button>
          )}
          {(muerta || pasada || cosechada) && (
            <button onClick={onLimpiar} disabled={cargando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              🧹 Limpiar celda
            </button>
          )}
        </div>

        {/* Historial */}
        <div className="p-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5"/>Historial de actividad
          </p>
          {cargando
            ? <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>
            : actividades.length === 0
              ? <div className="text-center py-4"><p className="text-2xl mb-1">📋</p><p className="text-xs text-gray-400">Sin actividades aún</p></div>
              : <div className="space-y-2 max-h-48 overflow-y-auto">
                  {actividades.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100"
                      style={{ backgroundColor: (COLORES_ACT[a.tipo_actividad] || "#f9fafb") + "aa" }}>
                      <span className="text-xl leading-none mt-0.5">{ICONOS_ACT[a.tipo_actividad] || "📌"}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-700 capitalize">{a.tipo_actividad}</p>
                        {a.descripcion && <p className="text-xs text-gray-500">{a.descripcion}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(a.fecha).toLocaleString("es-ES", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>}
        </div>
      </div>
    </div>
  );
}
