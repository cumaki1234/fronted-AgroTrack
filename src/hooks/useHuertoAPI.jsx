import { useCallback } from "react";
import { API } from "../constants/editor";
import { coordGlobal } from "../utils/canvas";
import { estadoRiegoVisual, esMuerta } from "../utils/plant";

export function useHuertoAPI({ huerto, offsetDias, plantacionesBD, setPlantacionesBD,
                                setZonas, showToast, registrarAct }) {
  const tkn   = huerto._token || null;
  const authH = tkn ? { Authorization: `Bearer ${tkn}` } : {};

  // ── Recargar todas las plantaciones del huerto ────────
  const recargar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/plantacion/plantaciones/huerto/${huerto.id}/`);
      const d = await r.json();
      const m = {};
      (d || []).forEach(p => { m[`${p.fila}-${p.columna}`] = p; });
      setPlantacionesBD(m);
    } catch (e) { console.error(e); }
  }, [huerto.id, setPlantacionesBD]);

  // ── Regar una plantación ───────────────────────────────
  const regarPlantacion = useCallback(async (pl) => {
    const clave = `${pl.fila}-${pl.columna}`;
    try {
      const r = await fetch(`${API}/actividad/${pl.id}/regar/`, {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ offset_dias: offsetDias }),
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error || "Error al regar", "error"); return null; }
      setPlantacionesBD(prev => ({ ...prev, [clave]: data }));
      return data;
    } catch (e) { console.error(e); return null; }
  }, [offsetDias, authH, showToast, setPlantacionesBD]);

  // ── Sembrar en backend ─────────────────────────────────
  const sembrarBackend = useCallback(async (zi, fi, ci, cultivo) => {
    const { fila, columna } = coordGlobal(zi, fi, ci);
    const clave = `${fila}-${columna}`;
    if (plantacionesBD[clave]) return plantacionesBD[clave];
    try {
      const fechaSimulada = new Date(Date.now() + offsetDias * 86400000);
      const r = await fetch(`${API}/plantacion/plantaciones/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({
          huerto: huerto.id, cultivo_tipo: cultivo.id, estado: "sembrado",
          fila, columna, fecha_siembra: fechaSimulada.toISOString().split("T")[0],
        }),
      });
      if (!r.ok) { showToast("Error al sembrar", "error"); return null; }
      const d = await r.json();
      setPlantacionesBD(p => ({ ...p, [clave]: d }));
      return d;
    } catch (e) { console.error(e); return null; }
  }, [huerto.id, offsetDias, authH, plantacionesBD, showToast, setPlantacionesBD]);

  // ── Eliminar plantación ────────────────────────────────
  const eliminarBackend = useCallback(async (zi, fi, ci) => {
    const { fila, columna } = coordGlobal(zi, fi, ci);
    const clave = `${fila}-${columna}`;
    if (!plantacionesBD[clave]) return;
    await fetch(`${API}/plantacion/plantaciones/eliminar/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authH },
      body: JSON.stringify({ huerto_id: huerto.id, fila, columna }),
    }).catch(console.error);
    setPlantacionesBD(p => { const n = { ...p }; delete n[clave]; return n; });
  }, [huerto.id, authH, plantacionesBD, setPlantacionesBD]);

  // ── Regar zona completa ────────────────────────────────
  const regarZona = useCallback(async (zona, zi) => {
    let regadas = 0;
    for (let fi = 0; fi < zona.celdas.length; fi++) {
      for (let ci = 0; ci < (zona.celdas[0]?.length || 0); ci++) {
        if (!zona.celdas[fi]?.[ci]) continue;
        const { fila, columna } = coordGlobal(zi, fi, ci);
        const pl = plantacionesBD[`${fila}-${columna}`];
        if (!pl || esMuerta(pl.estado) || estadoRiegoVisual(pl.ultimo_riego, offsetDias).nivel === "bien") continue;
        const result = await regarPlantacion(pl);
        if (result) regadas++;
      }
    }
    if (regadas > 0) {
      registrarAct("riego", `${zona.nombre}: ${regadas} plantas regadas`, zona.nombre);
      showToast(`💧 ${zona.nombre}: ${regadas} plantas regadas`);
    }
  }, [plantacionesBD, offsetDias, regarPlantacion, registrarAct, showToast]);

  // ── Cosechar ───────────────────────────────────────────
  const cosecharPlantacion = useCallback(async (pl, onSuccess) => {
    try {
      const r = await fetch(`${API}/actividad/${pl.id}/cosechar/`, { method: "POST", headers: authH });
      const data = await r.json();
      if (!r.ok) { showToast(data.error || "Error", "error"); return; }
      const clave = `${pl.fila}-${pl.columna}`;
      setPlantacionesBD(prev => ({ ...prev, [clave]: data }));
      registrarAct("cosecha", `${pl.cultivo_nombre} cosechado`, pl.cultivo_nombre);
      showToast("✂️ Cosechado — limpia la celda cuando quieras");
      onSuccess?.();
    } catch (e) { console.error(e); }
  }, [authH, showToast, registrarAct, setPlantacionesBD]);

  // ── Limpiar celda ──────────────────────────────────────
  const limpiarCelda = useCallback(async (pl, onSuccess) => {
    try {
      const r = await fetch(`${API}/actividad/${pl.id}/limpiar/`, {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ offset_dias: offsetDias }),
      });
      if (!r.ok) { showToast("❌ No se puede limpiar aún", "error"); return; }
      const clave = `${pl.fila}-${pl.columna}`;
      setZonas(p => p.map(z => ({
        ...z,
        celdas: z.celdas.map(row => row.map(cel => cel?.plantacionId === pl.id ? null : cel)),
      })));
      setPlantacionesBD(p => { const n = { ...p }; delete n[clave]; return n; });
      showToast("🧹 Celda limpiada");
      onSuccess?.();
    } catch (e) { console.error(e); }
  }, [offsetDias, authH, showToast, setPlantacionesBD, setZonas]);

  return { recargar, regarPlantacion, sembrarBackend, eliminarBackend, regarZona, cosecharPlantacion, limpiarCelda };
}
