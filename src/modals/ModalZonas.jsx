import { useState } from "react";
import { TAMANOS_MACETA, CULTIVOS_POR_TAMANO, ANCHO_CANTERO_FIJO, TIPOS_ZONA } from "../constants/editor";
import { mToCeldas } from "../utils/canvas";

// ─── Maceta ───────────────────────────────────────────────
export function ModalMaceta({ onConfirmar, onCancelar }) {
  const [t, setT] = useState("mediana");
  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <p className="font-black text-gray-800 mb-1">¿Qué tamaño de maceta?</p>
        <p className="text-xs text-gray-400 mb-4">El tamaño define qué plantas puedes cultivar</p>
        <div className="space-y-2 mb-5">
          {TAMANOS_MACETA.map(tm => {
            const p = CULTIVOS_POR_TAMANO[tm.id];
            return (
              <button key={tm.id} onClick={() => setT(tm.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition
                  ${t === tm.id ? "border-amber-500 bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-amber-200"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">🪴 {tm.label} <span className="text-gray-400 font-normal text-xs ml-1">{tm.desc}</span></span>
                  {t === tm.id && <span className="text-amber-500 font-black">✓</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p ? `Solo: ${p.join(", ")}` : "Todos los cultivos"}</p>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={() => onConfirmar(t)} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm">Agregar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cantero ──────────────────────────────────────────────
export function ModalCantero({ onConfirmar, onCancelar }) {
  const [largo, setLargo] = useState(2);
  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🟫</span><p className="font-black text-gray-800">Nuevo cantero</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2">
          <span className="text-lg shrink-0">📏</span>
          <p className="text-xs text-amber-700"><span className="font-black">Ancho fijo: {ANCHO_CANTERO_FIJO}m</span> — el estándar de huerta. Solo define el largo.</p>
        </div>
        <div className="mb-5">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">¿Cuánto mide de largo?</p>
          <div className="flex items-center gap-3">
            <input type="range" min={0.5} max={10} step={0.5} value={largo}
              onChange={e => setLargo(Number(e.target.value))} className="flex-1 accent-amber-500"/>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center min-w-[72px]">
              <p className="font-black text-amber-700 text-xl">{largo}m</p>
              <p className="text-xs text-amber-400">{mToCeldas(largo)} celdas</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          {[1,2,3,4,5,6].map(v => (
            <button key={v} onClick={() => setLargo(v)}
              className={`py-2 rounded-xl border-2 text-sm font-bold transition
                ${largo === v ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-400 hover:border-amber-200"}`}>
              {v}m
            </button>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs text-gray-500">
          Cantero resultante: <span className="font-bold text-gray-700">{largo}m × {ANCHO_CANTERO_FIJO}m</span>
          <span className="ml-1 text-gray-400">· {(largo * ANCHO_CANTERO_FIJO).toFixed(1)} m²</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={() => onConfirmar({ largoM: largo, anchoCantero: ANCHO_CANTERO_FIJO })}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm">Agregar cantero</button>
        </div>
      </div>
    </div>
  );
}

// ─── Jardín / Invernadero ─────────────────────────────────
export function ModalDimension({ tipo, onConfirmar, onCancelar }) {
  const [largo, setLargo] = useState(tipo.id === "invernadero" ? 4 : 3);
  const [ancho, setAncho] = useState(tipo.id === "invernadero" ? 3 : 2);
  const maxL = tipo.id === "invernadero" ? 20 : 30;
  const maxA = tipo.id === "invernadero" ? 15 : 20;

  return (
    <div className="fixed inset-0 bg-black/40 z-[10001] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{tipo.emoji}</span><p className="font-black text-gray-800">Configurar {tipo.label}</p></div>
        <p className="text-xs text-gray-400 mb-5">Define las dimensiones reales en metros</p>
        {[{ label:"Largo", val:largo, set:setLargo, max:maxL }, { label:"Ancho", val:ancho, set:setAncho, max:maxA }].map(({ label, val, set, max }) => (
          <div key={label} className="mb-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{label}</p>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={max} step={0.5} value={val}
                onChange={e => set(Number(e.target.value))} className="flex-1"/>
              <div className="rounded-xl px-3 py-2 text-center min-w-[64px]"
                style={{ backgroundColor: tipo.fill, borderColor: tipo.border, border:"1px solid" }}>
                <p className="font-black text-lg" style={{ color: tipo.color }}>{val}m</p>
                <p className="text-xs opacity-60" style={{ color: tipo.color }}>{mToCeldas(val)} celdas</p>
              </div>
            </div>
          </div>
        ))}
        <div className="rounded-xl p-3 mb-5 text-xs" style={{ backgroundColor: tipo.fill + "88" }}>
          <span style={{ color: tipo.color }}>
            Resultado: <span className="font-bold">{largo}m × {ancho}m</span>
            · {mToCeldas(largo)} × {mToCeldas(ancho)} celdas · {(largo * ancho).toFixed(1)} m²
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={() => onConfirmar({ largoM: largo, anchoM: ancho })}
            className="flex-1 py-2.5 text-white rounded-xl font-black text-sm"
            style={{ backgroundColor: tipo.border }}>Agregar {tipo.label}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Salir sin guardar ────────────────────────────────────
export function ModalSalirSinGuardar({ onGuardarYSalir, onSalirSinGuardar, onCancelar, guardando }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[10002] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl shrink-0">⚠️</div>
          <div>
            <p className="font-black text-gray-800 mb-1">¿Salir sin guardar?</p>
            <p className="text-sm text-gray-500">Las posiciones de zonas se perderán. Las plantas y riegos ya están guardados.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onGuardarYSalir} disabled={guardando}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm disabled:opacity-50">
            {guardando ? "Guardando..." : "💾 Guardar y salir"}
          </button>
          <button onClick={onSalirSinGuardar}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm">
            Salir sin guardar
          </button>
          <button onClick={onCancelar}
            className="w-full py-2.5 border-2 border-gray-200 text-gray-500 rounded-xl font-bold text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Editar nombre de zona ────────────────────────────────
export function ModalEditNombre({ editNombre, setEditNombre, setZonas }) {
  if (!editNombre) return null;
  const guardar = () => {
    setZonas(p => p.map(z => z.id === editNombre.id ? { ...z, nombre: editNombre.nombre } : z));
    setEditNombre(null);
  };
  return (
    <div className="fixed inset-0 bg-black/30 z-[10001] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <p className="text-sm font-black text-gray-700 mb-3">Nombre de la zona</p>
        <input
          autoFocus value={editNombre.nombre}
          onChange={e => setEditNombre(n => ({ ...n, nombre: e.target.value }))}
          onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditNombre(null); }}
          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none font-semibold text-gray-800 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={() => setEditNombre(null)} className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-gray-500 font-bold text-sm">Cancelar</button>
          <button onClick={guardar} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm">Guardar</button>
        </div>
      </div>
    </div>
  );
}
