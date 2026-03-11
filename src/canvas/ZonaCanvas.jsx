import { memo } from "react";
import { TIPOS_ZONA, CELL, HEADER_H } from "../constants/editor";
import CeldaCanvas from "./CeldaCanvas";

const ZonaCanvas = memo(function ZonaCanvas({
  zona, zi,
  activa, herramienta, cultivoSel,
  plantacionesBD, cultivosBD, offsetDias,
  onZonaMouseDown, onResizeMouseDown,
  onCeldaAccion, onCeldaDrop,
  onEliminar, onEditNombre,
}) {
  const tipo  = TIPOS_ZONA.find(t => t.id === zona.tipo) || TIPOS_ZONA[0];
  const cols  = zona.celdas[0]?.length || 0;
  const filas = zona.celdas.length;
  const esMaceta = zona.tipo === "maceta";

  const dimLabel = esMaceta ? (zona.tamanoMaceta || "")
    : zona.largoM
      ? (zona.anchoCanteroM ? `${zona.largoM}×${zona.anchoCanteroM}m` : `${zona.largoM}×${zona.anchoM || "?"}m`)
      : "";

  return (
    <g>
      {/* Sombra */}
      <rect x={zona.x + 5} y={zona.y + 5} width={zona.w} height={zona.h} rx={12} fill="rgba(0,0,0,0.07)"/>

      {/* Cuerpo */}
      <rect
        x={zona.x} y={zona.y} width={zona.w} height={zona.h} rx={12}
        fill={tipo.fill}
        stroke={activa ? tipo.color : tipo.border}
        strokeWidth={activa ? 3 : 1.5}
        style={{ cursor: herramienta === "seleccionar" ? "move" : "default" }}
        onMouseDown={e => onZonaMouseDown(e, zona)}
      />

      {/* Header */}
      <rect x={zona.x} y={zona.y} width={zona.w} height={HEADER_H}
        rx={12} fill={tipo.border} opacity={0.2} style={{ pointerEvents:"none" }}/>
      <text x={zona.x + 10} y={zona.y + 18} fontSize={11} fontWeight="800"
        fill={tipo.color} style={{ pointerEvents:"none" }}>
        {tipo.emoji} {zona.nombre}
      </text>
      {dimLabel && (
        <text x={zona.x + zona.w - 8} y={zona.y + 18} fontSize={9}
          fill={tipo.color} opacity={0.7} textAnchor="end" style={{ pointerEvents:"none" }}>
          {dimLabel}
        </text>
      )}

      {/* Celdas */}
      {Array.from({ length: filas }).map((_, fi) =>
        Array.from({ length: cols }).map((_, ci) => (
          <CeldaCanvas
            key={`${fi}-${ci}`}
            zona={zona} zi={zi} fi={fi} ci={ci}
            plantacionesBD={plantacionesBD}
            cultivosBD={cultivosBD}
            herramienta={herramienta}
            cultivoSel={cultivoSel}
            offsetDias={offsetDias}
            tipoBorder={tipo.border}
            tipoColor={tipo.color}
            onAccion={onCeldaAccion}
            onDrop={onCeldaDrop}
          />
        ))
      )}

      {/* Controles activos */}
      {activa && (
        <>
          <g style={{ cursor:"pointer" }} onClick={() => onEliminar(zona.id)}>
            <circle cx={zona.x + zona.w - 12} cy={zona.y + 14} r={11} fill="#ef4444" stroke="white" strokeWidth={2}/>
            <text x={zona.x + zona.w - 12} y={zona.y + 19} textAnchor="middle"
              fontSize={14} fill="white" style={{ pointerEvents:"none" }}>✕</text>
          </g>
          <g style={{ cursor:"pointer" }} onClick={() => onEditNombre({ id: zona.id, nombre: zona.nombre })}>
            <circle cx={zona.x + zona.w - 38} cy={zona.y + 14} r={11} fill={tipo.color} stroke="white" strokeWidth={2}/>
            <text x={zona.x + zona.w - 38} y={zona.y + 18} textAnchor="middle"
              fontSize={11} fill="white" style={{ pointerEvents:"none" }}>✎</text>
          </g>
          <rect x={zona.x} y={zona.y} width={zona.w} height={zona.h} rx={12}
            fill="none" stroke={tipo.color} strokeWidth={2} strokeDasharray="6 3"
            opacity={0.4} style={{ pointerEvents:"none" }}/>

          {/* Handle resize — solo no-maceta */}
          {!esMaceta && (
            <rect
              x={zona.x + zona.w - 14} y={zona.y + zona.h - 14}
              width={12} height={12} rx={3}
              fill={tipo.color} opacity={0.7}
              style={{ cursor:"se-resize" }}
              onMouseDown={e => onResizeMouseDown(e, zona)}
            />
          )}
        </>
      )}
    </g>
  );
});

export default ZonaCanvas;
