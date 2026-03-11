import { FREQ_RIEGO_DEFAULT, ESTADO_EMOJI, ESTADO_LABEL, ESTADOS_ORDEN } from "../constants/editor";

export const esMuerta = (s) => ["muerta_sequia", "muerta_ahogo"].includes(s);
export const esMala   = (s) => esMuerta(s) || s === "pasada";

export function calcularEstadoVisual(pl, offsetDias = 0, duracionDias = 60) {
  if (!pl) return null;
  if (esMuerta(pl.estado) || pl.estado === "pasada" || pl.estado === "cosechado") return pl.estado;

  const hoy    = new Date(Date.now() + offsetDias * 86400000);
  const siembra = new Date(pl.fecha_siembra);
  const diasP  = Math.max(0, Math.floor((hoy - siembra) / 86400000));
  const diasSR = pl.ultimo_riego
    ? Math.max(0, Math.floor((hoy - new Date(pl.ultimo_riego)) / 86400000))
    : diasP;

  if (diasSR > FREQ_RIEGO_DEFAULT * 3)        return "muerta_sequia";
  if (diasP - duracionDias > duracionDias * 0.5) return "pasada";

  const pct = diasP / duracionDias;
  if (pct < 0.1) return "sembrado";
  if (pct < 0.3) return "germinacion";
  if (pct < 0.6) return "crecimiento";
  if (pct < 0.9) return "maduracion";
  return "listo";
}

export function calcularSaludVisual(pl, offsetDias = 0) {
  if (!pl || esMuerta(pl.estado)) return pl ? 0 : 100;
  const hoy   = new Date(Date.now() + offsetDias * 86400000);
  const siemb = new Date(pl.fecha_siembra);
  const diasSR = pl.ultimo_riego
    ? Math.max(0, Math.floor((hoy - new Date(pl.ultimo_riego)) / 86400000))
    : Math.max(0, Math.floor((hoy - siemb) / 86400000));
  return Math.max(0, 100 - Math.max(0, diasSR - FREQ_RIEGO_DEFAULT) * 15);
}

export function estadoRiegoVisual(ultimoRiego, offsetDias = 0) {
  if (!ultimoRiego) return { emoji:"🔴", label:"Sin riego", color:"#fca5a5", nivel:"seca" };
  const hoy  = new Date(Date.now() + offsetDias * 86400000);
  const dias = Math.max(0, Math.floor((hoy - new Date(ultimoRiego)) / 86400000));
  if (dias === 0)                       return { emoji:"💦", label:"Regada hoy", color:"#bfdbfe", nivel:"bien" };
  if (dias <= FREQ_RIEGO_DEFAULT)       return { emoji:"✅", label:"Bien",       color:"#bbf7d0", nivel:"bien" };
  if (dias <= FREQ_RIEGO_DEFAULT * 1.5) return { emoji:"⚠️", label:"Pronto",    color:"#fef08a", nivel:"alerta" };
  return                                       { emoji:"🔴", label:"Seca",       color:"#fca5a5", nivel:"seca" };
}

export function calcularProximosRiegos(diasSR, muerta) {
  if (muerta) return [];
  const arr = [];
  for (let d = 1; d <= 7; d++) {
    if ((diasSR + d) % FREQ_RIEGO_DEFAULT === 0) arr.push(d);
  }
  return arr.slice(0, 3);
}
