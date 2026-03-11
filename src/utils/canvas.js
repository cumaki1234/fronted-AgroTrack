import { CELL, CM_CELDA, MIN_CELL, HEADER_H, TAMANOS_MACETA, ANCHO_CANTERO_FIJO } from "../constants/editor";

let _uid = Date.now();
export const uid = () => `z_${_uid++}`;

// ─── Conversión metros ↔ celdas ───────────────────────────
export const mToCeldas  = (m) => Math.max(MIN_CELL, Math.round((m * 100) / CM_CELDA));
export const celdasToM  = (n) => ((n * CM_CELDA) / 100).toFixed(1);

// ─── Coordenadas canvas ───────────────────────────────────
export function ptCanvas(e, ref, pan, zoom) {
  const r = ref.current.getBoundingClientRect();
  return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom };
}

export const coordGlobal = (zi, fi, ci) => ({ fila: zi * 100 + fi, columna: ci });

// ─── Celdas ───────────────────────────────────────────────
export const crearCeldas  = (f, c) => Array.from({ length: f }, () => Array(c).fill(null));
export const resizeCeldas = (celdas, nC, nF) => {
  const oF = celdas.length, oC = celdas[0]?.length || 0;
  return Array.from({ length: nF }, (_, fi) =>
    Array.from({ length: nC }, (_, ci) => fi < oF && ci < oC ? celdas[fi][ci] : null)
  );
};

// ─── Cultivos permitidos ──────────────────────────────────
import { CULTIVOS_POR_TAMANO } from "../constants/editor";
export function cultivoPermitido(nombre, zona) {
  if (zona.tipo !== "maceta") return true;
  const p = CULTIVOS_POR_TAMANO[zona.tamanoMaceta];
  return !p || p.some(x => nombre?.toLowerCase().includes(x));
}

// ─── Crear zona ───────────────────────────────────────────
import { TIPOS_ZONA } from "../constants/editor";
export function crearZona(tipo, x, y, config) {
  const esMaceta  = tipo.id === "maceta";
  const esCantero = tipo.id === "cantero";
  let cols, filas, metadatos = {};

  if (esMaceta) {
    const t = TAMANOS_MACETA.find(t => t.id === config.tamanoMaceta) || TAMANOS_MACETA[1];
    cols = t.cols; filas = t.filas;
    metadatos = { tamanoMaceta: config.tamanoMaceta };
  } else if (esCantero) {
    const anchoFijoM = config.anchoCantero || ANCHO_CANTERO_FIJO;
    cols  = Math.max(MIN_CELL, mToCeldas(config.largoM || 2));
    filas = Math.max(1, mToCeldas(anchoFijoM));
    metadatos = { largoM: config.largoM || 2, anchoCanteroM: anchoFijoM };
  } else {
    cols  = Math.max(MIN_CELL, mToCeldas(config.largoM || 3));
    filas = Math.max(MIN_CELL, mToCeldas(config.anchoM || 2));
    metadatos = { largoM: config.largoM || 3, anchoM: config.anchoM || 2 };
  }

  const nombre = esMaceta  ? `Maceta ${config.tamanoMaceta}`
    : esCantero             ? `Cantero ${metadatos.largoM}m`
    : tipo.id === "jardin"  ? `Jardín ${metadatos.largoM}×${metadatos.anchoM}m`
    :                         `Invernadero ${metadatos.largoM}×${metadatos.anchoM}m`;

  return {
    id: uid(), tipo: tipo.id, nombre, fija: esMaceta, x, y,
    w: cols * CELL, h: filas * CELL + HEADER_H,
    celdas: crearCeldas(filas, cols),
    ...metadatos,
  };
}
