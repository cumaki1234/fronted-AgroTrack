import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Save, X, RotateCcw, ZoomIn, ZoomOut, MousePointer,
         Square, Leaf, Droplets, Sprout, Bell, Ruler } from "lucide-react";

import { API, TIPOS_ZONA, CELL, HEADER_H, MIN_CELL, CURSOR_MAP, HERRAMIENTAS } from "../constants/editor";
import { coordGlobal, cultivoPermitido } from "../utils/canvas";
import { estadoRiegoVisual, esMuerta } from "../utils/plant";

import { useToast }              from "../hooks/useToast";
import { useHuertoAPI }          from "../hooks/useHuertoAPI";
import { useCanvasInteraction }  from "../hooks/useCanvasInteraction";

import ZonaCanvas from "../canvas/ZonaCanvas";
import ModalPlantacion from "../modals/ModalPlantacion";
import { ModalMaceta, ModalCantero, ModalDimension,
         ModalSalirSinGuardar, ModalEditNombre }  from "../modals/ModalZonas";
import { PanelActividades, SimuladorTiempo }      from "../panels/PanelActividades";

export default function EditorHuerto({ huerto, onGuardar, onCerrar, guardando }) {
  // ── Estado principal ─────────────────────────────────────
  const [zonas,           setZonas]           = useState(() => huerto.layout?.zonas || []);
  const [offsetDias,      setOffsetDias]      = useState(() => huerto.layout?.offsetDias || 0);
  const [cultivosBD,      setCultivosBD]      = useState([]);
  const [plantacionesBD,  setPlantacionesBD]  = useState({});
  const [actividadesGlobal, setActividadesGlobal] = useState([]);
  const [herramienta,     setHerramienta]     = useState("seleccionar");
  const [tipoZona,        setTipoZona]        = useState(TIPOS_ZONA[0]);
  const [cultivoSel,      setCultivoSel]      = useState(null);
  const [zonaActiva,      setZonaActiva]      = useState(null);
  const [editNombre,      setEditNombre]      = useState(null);
  const [cambiosPend,     setCambiosPend]     = useState(false);
  const [panelAbierto,    setPanelAbierto]    = useState(false);
  const [modalMaceta,     setModalMaceta]     = useState(null);
  const [modalCantero,    setModalCantero]    = useState(null);
  const [modalDim,        setModalDim]        = useState(null);
  const [modalPl,         setModalPl]         = useState(null);
  const [actModal,        setActModal]        = useState([]);
  const [cargModal,       setCargModal]       = useState(false);
  const [modalSalir,      setModalSalir]      = useState(false);
  const undoHist = useRef([]);

  const { show: showToast, Toast } = useToast();

  // ── Undo ────────────────────────────────────────────────
  const snap = useCallback(() => {
    undoHist.current = [...undoHist.current.slice(-29), JSON.parse(JSON.stringify(zonas))];
  }, [zonas]);

  const deshacer = useCallback(() => {
    if (!undoHist.current.length) return;
    setZonas(undoHist.current[undoHist.current.length - 1]);
    undoHist.current = undoHist.current.slice(0, -1);
  }, []);

  const registrarAct = useCallback((tipo, desc, nombre = "") => {
    const fecha = new Date().toLocaleString("es-ES", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
    setActividadesGlobal(p => [...p, { tipo_actividad: tipo, descripcion: desc, cultivo_nombre: nombre, fecha }]);
  }, []);

  // ── API hook ────────────────────────────────────────────
  const api = useHuertoAPI({
    huerto, offsetDias, plantacionesBD, setPlantacionesBD,
    setZonas, showToast, registrarAct,
  });

  // ── Canvas hook ──────────────────────────────────────────
  const canvas = useCanvasInteraction({
    zonas, setZonas, herramienta, tipoZona,
    setZonaActiva, setCambiosPend,
    setModalMaceta, setModalCantero, setModalDim, snap,
  });

  // ── Cargar datos iniciales ───────────────────────────────
  useEffect(() => {
    fetch(`${API}/cultivos/`).then(r => r.json()).then(d => {
      setCultivosBD(Array.isArray(d) ? d : []);
      if (d.length) setCultivoSel(d[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await fetch(`${API}/actividad/sincronizar/${huerto.id}/`, { method:"POST" }); } catch (_) {}
      await api.recargar();
    };
    init();
  }, [api.recargar]);

  // ── Sincronizar canvas ← backend ────────────────────────
  useEffect(() => {
    if (!Object.keys(plantacionesBD).length) return;
    setZonas(prev => prev.map((zona, zi) => ({
      ...zona,
      celdas: zona.celdas.map((row, fi) => row.map((cel, ci) => {
        const { fila, columna } = coordGlobal(zi, fi, ci);
        const p = plantacionesBD[`${fila}-${columna}`];
        if (p && !cel) return { cultivoId: p.cultivo_tipo, nombre: p.cultivo_nombre, imagen: p.cultivo_imagen, plantacionId: p.id };
        return cel;
      })),
    })));
  }, [plantacionesBD]);

  // ── Memos ────────────────────────────────────────────────
  const zonaConSecas = useMemo(() => {
    const m = {};
    zonas.forEach((zona, zi) => {
      let s = 0;
      zona.celdas.forEach((row, fi) => row.forEach((_, ci) => {
        if (!zona.celdas[fi][ci]) return;
        const { fila, columna } = coordGlobal(zi, fi, ci);
        const p = plantacionesBD[`${fila}-${columna}`];
        if (p && !esMuerta(p.estado) && estadoRiegoVisual(p.ultimo_riego, offsetDias).nivel !== "bien") s++;
      }));
      if (s > 0) m[zona.id] = s;
    });
    return m;
  }, [zonas, plantacionesBD, offsetDias]);

  const badgeCount = useMemo(() => {
    const rP = Object.values(plantacionesBD).filter(p =>
      !esMuerta(p.estado) && p.estado !== "cosechado" &&
      estadoRiegoVisual(p.ultimo_riego, offsetDias).nivel !== "bien").length;
    return actividadesGlobal.length + rP;
  }, [actividadesGlobal, plantacionesBD, offsetDias]);

  // ── Guardar / Cerrar ─────────────────────────────────────
  const handleGuardar = useCallback(async (yLuegoCerrar = false) => {
    await onGuardar({ zonas, offsetDias, version: 2 });
    setCambiosPend(false);
    if (yLuegoCerrar) onCerrar();
  }, [zonas, offsetDias, onGuardar, onCerrar]);

  const handleCerrar = useCallback(() => {
    if (cambiosPend) setModalSalir(true);
    else onCerrar();
  }, [cambiosPend, onCerrar]);

  // ── Celda: acción y drop ─────────────────────────────────
  const accionCelda = useCallback(async (e, zona, zi, fi, ci) => {
    e.stopPropagation();
    const cel = zona.celdas[fi]?.[ci];
    const { fila, columna } = coordGlobal(zi, fi, ci);
    const pl = plantacionesBD[`${fila}-${columna}`];

    if (herramienta === "sembrar") {
      if (!cultivoSel || !cultivoPermitido(cultivoSel.nombre, zona)) return;
      snap();
      if (cel) {
        await api.eliminarBackend(zi, fi, ci);
        setZonas(p => p.map((z, zii) => { if (zii !== zi) return z; const c = z.celdas.map(r => [...r]); c[fi][ci] = null; return { ...z, celdas: c }; }));
        registrarAct("limpieza", `Eliminado de ${zona.nombre}`); showToast("🗑️ Eliminado");
      } else {
        const plantacion = await api.sembrarBackend(zi, fi, ci, cultivoSel); if (!plantacion) return;
        setZonas(p => p.map((z, zii) => { if (zii !== zi) return z; const c = z.celdas.map(r => [...r]); c[fi][ci] = { cultivoId: cultivoSel.id, nombre: cultivoSel.nombre, imagen: cultivoSel.imagen, plantacionId: plantacion.id }; return { ...z, celdas: c }; }));
        setCambiosPend(true); registrarAct("siembra", `${cultivoSel.nombre} en ${zona.nombre}`, cultivoSel.nombre); showToast(`🌱 ${cultivoSel.nombre} sembrado`);
      }
    }
    if (herramienta === "regar") {
      if (!cel || !pl) { showToast("⚠️ No hay planta aquí", "warn"); return; }
      if (esMuerta(pl.estado)) { showToast("💀 Esta planta ya está muerta", "error"); return; }
      const result = await api.regarPlantacion(pl);
      if (result) { registrarAct("riego", `${pl.cultivo_nombre} regado`, pl.cultivo_nombre); showToast(result.estado === "muerta_ahogo" ? "💀 ¡Planta ahogada!" : "💧 Regado"); }
    }
    if (herramienta === "info") {
      if (!cel) return;
      if (!pl) { showToast("⚠️ Guarda el layout primero", "warn"); return; }
      abrirModal(pl);
    }
  }, [herramienta, cultivoSel, plantacionesBD, snap, api, registrarAct, showToast]);

  const onCeldaDrop = useCallback(async (e, zona, zi, fi, ci) => {
    e.preventDefault(); e.stopPropagation();
    const raw = e.dataTransfer.getData("cultivo"); if (!raw) return;
    const cultivo = JSON.parse(raw);
    if (zona.celdas[fi]?.[ci]) { showToast("⚠️ Celda ocupada", "warn"); return; }
    if (!cultivoPermitido(cultivo.nombre, zona)) { showToast(`🚫 ${cultivo.nombre} no cabe aquí`, "warn"); return; }
    snap();
    const pl = await api.sembrarBackend(zi, fi, ci, cultivo); if (!pl) return;
    setZonas(p => p.map((z, zii) => { if (zii !== zi) return z; const c = z.celdas.map(r => [...r]); c[fi][ci] = { cultivoId: cultivo.id, nombre: cultivo.nombre, imagen: cultivo.imagen, plantacionId: pl.id }; return { ...z, celdas: c }; }));
    setCambiosPend(true); registrarAct("siembra", `${cultivo.nombre} en ${zona.nombre}`, cultivo.nombre); showToast(`🌱 ${cultivo.nombre} sembrado`);
  }, [snap, api, plantacionesBD, zonas, registrarAct, showToast]);

  // ── Modal plantación ─────────────────────────────────────
  const abrirModal = useCallback(async (pl) => {
    setModalPl(pl); setActModal([]); setCargModal(true);
    try {
      let acts = pl.actividades || [];
      try { const r = await fetch(`${API}/actividad/${pl.id}/historial/`); if (r.ok) acts = await r.json(); } catch (_) {}
      setActModal(acts);
      const r2 = await fetch(`${API}/plantacion/plantaciones/huerto/${huerto.id}/`);
      const data = await r2.json(); const upd = data.find(x => x.id === pl.id);
      if (upd) { setModalPl(upd); setPlantacionesBD(prev => ({ ...prev, [`${upd.fila}-${upd.columna}`]: upd })); }
    } catch (e) { console.error(e); } finally { setCargModal(false); }
  }, [huerto.id]);

  const eliminarZona = useCallback(async (zonaId) => {
    const zi = zonas.findIndex(z => z.id === zonaId); const zona = zonas[zi]; if (!zona) return; snap();
    for (let fi = 0; fi < zona.celdas.length; fi++)
      for (let ci = 0; ci < (zona.celdas[0]?.length || 0); ci++)
        if (zona.celdas[fi]?.[ci]) await api.eliminarBackend(zi, fi, ci);
    setZonas(p => p.filter(z => z.id !== zonaId)); setZonaActiva(null); setCambiosPend(true);
  }, [snap, zonas, api]);

  // ── Dimensiones SVG ──────────────────────────────────────
  const svgW = typeof window !== "undefined" ? window.innerWidth - 256 : 1000;
  const svgH = typeof window !== "undefined" ? window.innerHeight - 56  : 700;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100" style={{ userSelect:"none", zIndex:9999 }}>
      {Toast}

      {/* ── Barra superior ── */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-3 gap-1.5 shadow-sm shrink-0 z-30">
        <div className="flex items-center gap-2 mr-1">
          <div className="p-1.5 bg-green-100 rounded-lg"><Leaf className="w-4 h-4 text-green-600"/></div>
          <span className="font-black text-gray-800 text-sm">{huerto.nombre}</span>
          {cambiosPend && <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">Sin guardar</span>}
        </div>
        <div className="w-px h-6 bg-gray-200"/>

        {HERRAMIENTAS.map(h => (
          <button key={h.id} onClick={() => setHerramienta(h.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition
              ${herramienta === h.id
                ? h.id === "regar"   ? "bg-blue-500 text-white border-blue-500"
                : h.id === "sembrar" ? "bg-emerald-600 text-white border-emerald-600"
                : h.id === "info"    ? "bg-violet-500 text-white border-violet-500"
                :                      "bg-gray-700 text-white border-gray-700"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
            {h.id === "seleccionar" && <MousePointer className="w-4 h-4"/>}
            {h.id === "dibujar"     && <Square className="w-4 h-4"/>}
            {h.id === "sembrar"     && <Sprout className="w-4 h-4"/>}
            {h.id === "regar"       && <Droplets className="w-4 h-4"/>}
            {h.id === "info"        && <span className="text-sm">🔍</span>}
            {h.label}
          </button>
        ))}

        {herramienta === "dibujar" && TIPOS_ZONA.map(t => (
          <button key={t.id} onClick={() => setTipoZona(t)}
            className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition ${tipoZona.id === t.id ? "border-2" : "border-gray-200 bg-gray-50 text-gray-500"}`}
            style={tipoZona.id === t.id ? { borderColor:t.border, backgroundColor:t.fill, color:t.color } : {}}>
            {t.emoji} {t.label}
          </button>
        ))}

        {herramienta === "sembrar" && cultivoSel && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs">
            {cultivoSel.imagen && <img src={`${API}${cultivoSel.imagen}`} className="w-5 h-5 rounded object-cover"/>}
            <span className="font-bold text-emerald-800">{cultivoSel.nombre}</span>
            <span className="text-gray-400">{cultivoSel.duracion_dias}d</span>
          </div>
        )}

        <div className="w-px h-6 bg-gray-200 mx-0.5"/>
        <SimuladorTiempo offsetDias={offsetDias} onChange={v => { setOffsetDias(v); setCambiosPend(true); }}/>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setPanelAbierto(p => !p)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition
              ${panelAbierto ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300"}`}>
            <Bell className="w-3.5 h-3.5"/>Actividad
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </button>
          <div className="w-px h-6 bg-gray-200"/>
          <button onClick={canvas.zoomIn}  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomIn className="w-4 h-4"/></button>
          <span className="text-xs font-mono text-gray-400 w-10 text-center">{Math.round(canvas.zoom * 100)}%</span>
          <button onClick={canvas.zoomOut} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomOut className="w-4 h-4"/></button>
          <button onClick={canvas.resetView} className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 font-mono">Reset</button>
          <div className="w-px h-6 bg-gray-200"/>
          <button onClick={deshacer} disabled={!undoHist.current.length} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-30"><RotateCcw className="w-4 h-4"/></button>
          <button onClick={handleCerrar} className="px-3 py-1.5 border-2 border-gray-200 text-gray-600 rounded-lg font-bold text-sm flex items-center gap-1"><X className="w-3.5 h-3.5"/>Volver</button>
          <button onClick={() => handleGuardar(false)} disabled={guardando}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-sm shadow-md flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-3.5 h-3.5"/>{guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Agregar zona</p>
            <div className="space-y-1.5">
              {TIPOS_ZONA.map(t => (
                <button key={t.id} onClick={() => canvas.agregarZonaPredefinida(t)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition hover:scale-[1.02]"
                  style={{ borderColor:t.border, backgroundColor:t.fill, color:t.color }}>
                  <span>{t.emoji}</span>
                  <span className="flex-1 text-left">{t.label}</span>
                  <span className="text-xs opacity-50 flex items-center gap-0.5"><Ruler className="w-3 h-3"/>config</span>
                </button>
              ))}
            </div>
          </div>

          {Object.keys(zonaConSecas).length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Droplets className="w-3 h-3"/>Riego pendiente
              </p>
              <div className="space-y-1.5">
                {zonas.map((zona, zi) => {
                  const s = zonaConSecas[zona.id]; if (!s) return null;
                  return (
                    <button key={zona.id} onClick={() => api.regarZona(zona, zi)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition text-xs font-semibold">
                      <Droplets className="w-3.5 h-3.5 shrink-0"/>
                      <span className="flex-1 text-left truncate">{zona.nombre}</span>
                      <span className="bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-black">{s}🔴</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cultivos</p>
            {cultivosBD.length === 0
              ? <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>
              : <div className="space-y-2">
                  {cultivosBD.map(c => (
                    <div key={c.id} draggable
                      onDragStart={e => e.dataTransfer.setData("cultivo", JSON.stringify(c))}
                      onClick={() => { setCultivoSel(c); setHerramienta("sembrar"); }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-grab transition hover:shadow-md
                        ${cultivoSel?.id === c.id && herramienta === "sembrar"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                      {c.imagen
                        ? <img src={`${API}${c.imagen}`} className="w-10 h-10 rounded-lg object-cover shrink-0" onError={e => { e.target.style.display="none"; }}/>
                        : <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-xl shrink-0">🌱</div>}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{c.nombre}</p>
                        <p className="text-xs text-gray-400">{c.duracion_dias}d · {c.requerimiento_agua_litros}L</p>
                      </div>
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

        {/* ── Canvas SVG ── */}
        <svg
          ref={canvas.svgRef}
          width={panelAbierto ? svgW - 384 : svgW} height={svgH}
          style={{ cursor: CURSOR_MAP[herramienta] || "default", flex:1, background:"#f3f4f6" }}
          onMouseDown={canvas.onSvgMouseDown}
          onMouseMove={canvas.onMouseMove}
          onMouseUp={canvas.onMouseUp}
          onMouseLeave={canvas.onMouseUp}>

          <defs>
            <pattern id="dots" x="0" y="0" width={20 * canvas.zoom} height={20 * canvas.zoom}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${((canvas.pan.x % (20*canvas.zoom)) + (20*canvas.zoom)) % (20*canvas.zoom)},${((canvas.pan.y % (20*canvas.zoom)) + (20*canvas.zoom)) % (20*canvas.zoom)})`}>
              <circle cx={10 * canvas.zoom} cy={10 * canvas.zoom} r={1.2} fill="#cbd5e1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" data-role="bg"/>

          <g transform={`translate(${canvas.pan.x},${canvas.pan.y}) scale(${canvas.zoom})`}>
            {zonas.map((zona, zi) => (
              <ZonaCanvas
                key={zona.id}
                zona={zona} zi={zi}
                activa={zonaActiva === zona.id}
                herramienta={herramienta} cultivoSel={cultivoSel}
                plantacionesBD={plantacionesBD} cultivosBD={cultivosBD}
                offsetDias={offsetDias}
                onZonaMouseDown={canvas.onZonaMouseDown}
                onResizeMouseDown={canvas.onResizeMouseDown}
                onCeldaAccion={accionCelda}
                onCeldaDrop={onCeldaDrop}
                onEliminar={eliminarZona}
                onEditNombre={setEditNombre}
              />
            ))}
            {canvas.dibujoRect && canvas.dibujoRect.w > 4 && canvas.dibujoRect.h > 4 && (
              <rect x={canvas.dibujoRect.x} y={canvas.dibujoRect.y}
                width={canvas.dibujoRect.w} height={canvas.dibujoRect.h}
                rx={12} fill={tipoZona.fill} stroke={tipoZona.border}
                strokeWidth={2} strokeDasharray="6 3" opacity={0.85}/>
            )}
          </g>
        </svg>

        {panelAbierto && (
          <PanelActividades
            actividades={actividadesGlobal} plantacionesBD={plantacionesBD}
            cultivosBD={cultivosBD} offsetDias={offsetDias}
            onCerrar={() => setPanelAbierto(false)}
          />
        )}
      </div>

      {/* ── Modales ── */}
      {modalMaceta  && <ModalMaceta   onConfirmar={t   => { canvas.confirmarZonaConfig(TIPOS_ZONA[0], modalMaceta.x,  modalMaceta.y,  { tamanoMaceta:t });          setModalMaceta(null);  }} onCancelar={() => setModalMaceta(null)}/>}
      {modalCantero && <ModalCantero  onConfirmar={cfg => { canvas.confirmarZonaConfig(TIPOS_ZONA[1], modalCantero.x, modalCantero.y, cfg);                          setModalCantero(null); }} onCancelar={() => setModalCantero(null)}/>}
      {modalDim     && <ModalDimension tipo={modalDim.tipo} onConfirmar={cfg => { canvas.confirmarZonaConfig(modalDim.tipo, modalDim.x, modalDim.y, cfg);             setModalDim(null);     }} onCancelar={() => setModalDim(null)}/>}
      {modalPl      && (
        <ModalPlantacion
          plantacion={modalPl} actividades={actModal} cargando={cargModal}
          offsetDias={offsetDias}
          duracionDias={cultivosBD.find(c => c.id === modalPl.cultivo_tipo)?.duracion_dias || 60}
          onRegar={async () => {
            setCargModal(true);
            const result = await api.regarPlantacion(modalPl);
            if (result) {
              setModalPl(result);
              try { const rH = await fetch(`${API}/actividad/${modalPl.id}/historial/`); if (rH.ok) setActModal(await rH.json()); } catch (_) {}
              registrarAct("riego", `${modalPl.cultivo_nombre} regado`, modalPl.cultivo_nombre);
              showToast(result.estado === "muerta_ahogo" ? "💀 ¡Planta ahogada!" : "💧 Regado");
            }
            setCargModal(false);
          }}
          onCosechar={() => api.cosecharPlantacion(modalPl, () => setModalPl(null))}
          onLimpiar={() => api.limpiarCelda(modalPl, () => { setModalPl(null); setCambiosPend(true); })}
          onCerrar={() => setModalPl(null)}
        />
      )}
      {modalSalir && (
        <ModalSalirSinGuardar
          onGuardarYSalir={() => handleGuardar(true)}
          onSalirSinGuardar={() => { setModalSalir(false); onCerrar(); }}
          onCancelar={() => setModalSalir(false)}
          guardando={guardando}
        />
      )}
      <ModalEditNombre editNombre={editNombre} setEditNombre={setEditNombre} setZonas={setZonas}/>
    </div>
  );
}
