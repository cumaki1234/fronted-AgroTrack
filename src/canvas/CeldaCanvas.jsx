import { memo } from "react";
import { API, CELL, ESTADO_EMOJI, ESTADOS_ORDEN } from "../constants/editor";
import { coordGlobal, cultivoPermitido } from "../utils/canvas";
import { calcularEstadoVisual, estadoRiegoVisual, esMuerta } from "../utils/plant";

const CeldaCanvas = memo(function CeldaCanvas({
  zona, zi, fi, ci,
  plantacionesBD, cultivosBD,
  herramienta, cultivoSel,
  offsetDias, tipoBorder, tipoColor,
  onAccion, onDrop,
}) {
  const cx  = zona.x + ci * CELL;
  const cy  = zona.y + fi * CELL + 28; // HEADER_H
  const cel = zona.celdas[fi]?.[ci];

  const { fila, columna } = coordGlobal(zi, fi, ci);
  const pl       = plantacionesBD[`${fila}-${columna}`];
  const duracion = cultivosBD.find(c => c.id === pl?.cultivo_tipo)?.duracion_dias || 60;
  const estadoSim = pl ? calcularEstadoVisual(pl, offsetDias, duracion) : null;
  const riegoEst  = pl ? estadoRiegoVisual(pl.ultimo_riego, offsetDias) : null;
  const muerta    = esMuerta(estadoSim) || esMuerta(pl?.estado);
  const regadaHoy = pl && pl.ultimo_riego === new Date().toISOString().split("T")[0];
  const bloq      = herramienta === "sembrar" && !cultivoPermitido(cultivoSel?.nombre || "", zona);

  let bg = "rgba(255,255,255,0.6)";
  if (bloq)         bg = "rgba(239,68,68,0.06)";
  else if (muerta)  bg = "#fee2e2";
  else if (pl)      bg = (riegoEst?.color || "#bbf7d0") + "99";
  else if (cel)     bg = "#fef9c3";

  const isInteractive = ["sembrar","regar","info"].includes(herramienta);

  return (
    <g>
      <rect
        x={cx + 1} y={cy + 1} width={CELL - 2} height={CELL - 2} rx={5}
        fill={bg}
        stroke={regadaHoy ? "#3b82f6" : muerta ? "#ef4444" : cel ? tipoBorder : "rgba(0,0,0,0.05)"}
        strokeWidth={regadaHoy ? 3 : muerta ? 2 : 0.8}
        strokeDasharray={bloq ? "3 2" : "none"}
        style={{ cursor: isInteractive ? "pointer" : "default" }}
        onClick={e => onAccion(e, zona, zi, fi, ci)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => onDrop(e, zona, zi, fi, ci)}
      />
      {cel?.imagen && (
        <image
          href={`${API}${cel.imagen}`}
          x={cx + 4} y={cy + 4} width={CELL - 8} height={CELL - 8}
          style={{ pointerEvents:"none", opacity: muerta ? 0.25 : 1 }}
        />
      )}
      {cel && !cel.imagen && (
        <text x={cx + CELL/2} y={cy + CELL/2 + 7} textAnchor="middle"
          fontSize={20} style={{ pointerEvents:"none", opacity: muerta ? 0.25 : 1 }}>🌱</text>
      )}
      {estadoSim && (
        <text x={cx + 7} y={cy + 13} textAnchor="middle" fontSize={11}
          style={{ pointerEvents:"none" }}>{ESTADO_EMOJI[estadoSim]}</text>
      )}
      {regadaHoy && (
        <text x={cx + CELL/2} y={cy + CELL - 5} textAnchor="middle"
          fontSize={9} fill="#3b82f6" style={{ pointerEvents:"none" }}>💦</text>
      )}
      {pl && !muerta && riegoEst?.nivel === "seca" && (
        <rect x={cx + 3} y={cy + 3} width={CELL - 6} height={CELL - 6} rx={4}
          fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2"
          style={{ pointerEvents:"none" }}/>
      )}
      {bloq && !cel && (
        <text x={cx + CELL/2} y={cy + CELL/2 + 6} textAnchor="middle"
          fontSize={12} opacity={0.3} style={{ pointerEvents:"none" }}>🚫</text>
      )}
    </g>
  );
});

export default CeldaCanvas;
