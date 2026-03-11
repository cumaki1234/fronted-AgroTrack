import { useRef, useState, useCallback, useEffect } from "react";
import { CELL, MIN_CELL, HEADER_H, TIPOS_ZONA } from "../constants/editor";
import { ptCanvas, resizeCeldas, crearZona } from "../utils/canvas";

export function useCanvasInteraction({ zonas, setZonas, herramienta, tipoZona,
                                       setZonaActiva, setCambiosPend,
                                       setModalMaceta, setModalCantero, setModalDim,
                                       snap }) {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 120, y: 80 });
  const [dibujoRect, setDibujoRect] = useState(null);

  const draggingBg   = useRef(false);
  const dragOrigin   = useRef({ mx:0, my:0, px:0, py:0 });
  const draggingZona = useRef(null);
  const resizingZona = useRef(null);
  const dibujando    = useRef(false);
  const dibujoOrig   = useRef({ x:0, y:0 });

  // ── Rueda del mouse → zoom ─────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const fn = e => {
      e.preventDefault();
      setZoom(z => Math.min(3, Math.max(0.25, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, []);

  // ── Mouse down ─────────────────────────────────────────
  const onSvgMouseDown = useCallback((e) => {
    const isBg = e.target === svgRef.current || e.target.dataset.role === "bg";
    if (!isBg) return;

    if (["seleccionar","regar","info"].includes(herramienta)) {
      draggingBg.current = true;
      dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      setZonaActiva(null);
    }
    if (herramienta === "dibujar") {
      dibujando.current = true;
      const pt = ptCanvas(e, svgRef, pan, zoom);
      dibujoOrig.current = pt;
      setDibujoRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
    }
  }, [herramienta, pan, zoom, setZonaActiva]);

  const onZonaMouseDown = useCallback((e, zona) => {
    if (herramienta !== "seleccionar") return;
    e.stopPropagation();
    setZonaActiva(zona.id);
    const pt = ptCanvas(e, svgRef, pan, zoom);
    draggingZona.current = { id: zona.id, ox: pt.x - zona.x, oy: pt.y - zona.y };
  }, [herramienta, pan, zoom, setZonaActiva]);

  const onResizeMouseDown = useCallback((e, zona) => {
    e.stopPropagation();
    const pt = ptCanvas(e, svgRef, pan, zoom);
    resizingZona.current = { id: zona.id, ox: pt.x, oy: pt.y, initW: zona.w, initH: zona.h - HEADER_H };
  }, [pan, zoom]);

  // ── Mouse move (throttled con requestAnimationFrame) ───
  const rafRef = useRef(null);
  const onMouseMove = useCallback((e) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      if (draggingBg.current) {
        setPan({ x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx),
                 y: dragOrigin.current.py + (e.clientY - dragOrigin.current.my) });
      }
      if (dibujando.current) {
        const pt = ptCanvas(e, svgRef, pan, zoom);
        const ox = dibujoOrig.current.x, oy = dibujoOrig.current.y;
        setDibujoRect({ x: Math.min(pt.x, ox), y: Math.min(pt.y, oy),
                        w: Math.abs(pt.x - ox), h: Math.abs(pt.y - oy) });
      }
      if (draggingZona.current) {
        const { id, ox, oy } = draggingZona.current;
        const pt = ptCanvas(e, svgRef, pan, zoom);
        setZonas(p => p.map(z => z.id === id ? { ...z, x: pt.x - ox, y: pt.y - oy } : z));
      }
      if (resizingZona.current) {
        const { id, ox, oy, initW, initH } = resizingZona.current;
        const pt = ptCanvas(e, svgRef, pan, zoom);
        const nC = Math.max(MIN_CELL, Math.round(Math.max(MIN_CELL * CELL, initW + (pt.x - ox)) / CELL));
        const nF = Math.max(MIN_CELL, Math.round(Math.max(MIN_CELL * CELL, initH + (pt.y - oy)) / CELL));
        setZonas(p => p.map(z => z.id !== id ? z : {
          ...z, w: nC * CELL, h: nF * CELL + HEADER_H,
          celdas: resizeCeldas(z.celdas, nC, nF),
        }));
      }
    });
  }, [pan, zoom, setZonas]);

  // ── Mouse up ───────────────────────────────────────────
  const onMouseUp = useCallback(() => {
    draggingBg.current  = false;
    draggingZona.current = null;
    resizingZona.current = null;

    if (dibujando.current) {
      dibujando.current = false;
      const r = dibujoRect;
      if (r && r.w > MIN_CELL * CELL * 0.5 && r.h > MIN_CELL * CELL * 0.5) {
        if (tipoZona.id === "maceta")       setModalMaceta({ x: r.x, y: r.y });
        else if (tipoZona.id === "cantero") setModalCantero({ x: r.x, y: r.y });
        else                                setModalDim({ tipo: tipoZona, x: r.x, y: r.y });
      }
      setDibujoRect(null);
    }
  }, [dibujoRect, tipoZona, setModalMaceta, setModalCantero, setModalDim]);

  // ── Agregar zona desde sidebar ─────────────────────────
  const agregarZonaPredefinida = useCallback((tipo) => {
    const x = (-pan.x / zoom) + 60 + Math.random() * 30;
    const y = (-pan.y / zoom) + 60 + Math.random() * 30;
    if (tipo.id === "maceta")       setModalMaceta({ x, y });
    else if (tipo.id === "cantero") setModalCantero({ x, y });
    else                            setModalDim({ tipo, x, y });
  }, [pan, zoom, setModalMaceta, setModalCantero, setModalDim]);

  const confirmarZonaConfig = useCallback((tipo, x, y, config) => {
    snap();
    const z = crearZona(tipo, x, y, config);
    setZonas(p => [...p, z]);
    setZonaActiva(z.id);
    setCambiosPend(true);
  }, [snap, setZonas, setZonaActiva, setCambiosPend]);

  const resetView = useCallback(() => { setZoom(1); setPan({ x:120, y:80 }); }, []);
  const zoomIn    = useCallback(() => setZoom(z => Math.min(3, z * 1.2)), []);
  const zoomOut   = useCallback(() => setZoom(z => Math.max(0.25, z * 0.83)), []);

  return {
    svgRef, zoom, pan, dibujoRect,
    onSvgMouseDown, onZonaMouseDown, onResizeMouseDown, onMouseMove, onMouseUp,
    agregarZonaPredefinida, confirmarZonaConfig,
    resetView, zoomIn, zoomOut,
  };
}
