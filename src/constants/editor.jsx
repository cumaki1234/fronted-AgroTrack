// ─── Config base ──────────────────────────────────────────
export const API          = import.meta.env.VITE_API_URL;
export const CELL         = 48;
export const CM_CELDA     = 40;
export const HEADER_H     = 28;
export const MIN_CELL     = 2;
export const FREQ_RIEGO_DEFAULT   = 2;
export const ANCHO_CANTERO_FIJO   = 1.2;

// ─── Zonas ────────────────────────────────────────────────
export const TIPOS_ZONA = [
  { id:"maceta",      label:"Maceta",      emoji:"🪴", color:"#92400e", fill:"#fef3c7", border:"#f59e0b" },
  { id:"cantero",     label:"Cantero",     emoji:"🟫", color:"#78350f", fill:"#fde68a", border:"#b45309" },
  { id:"jardin",      label:"Jardín",      emoji:"🌳", color:"#14532d", fill:"#dcfce7", border:"#16a34a" },
  { id:"invernadero", label:"Invernadero", emoji:"🏠", color:"#1e3a5f", fill:"#e0f2fe", border:"#0284c7" },
];

// ─── Macetas ──────────────────────────────────────────────
export const TAMANOS_MACETA = [
  { id:"chica",   label:"Chica",   cols:1, filas:1, desc:"1×1" },
  { id:"mediana", label:"Mediana", cols:2, filas:2, desc:"2×2" },
  { id:"grande",  label:"Grande",  cols:3, filas:3, desc:"3×3" },
  { id:"enorme",  label:"Enorme",  cols:4, filas:4, desc:"4×4+" },
];

export const CULTIVOS_POR_TAMANO = {
  chica:   ["hierbas","rabano","ajo"],
  mediana: ["hierbas","rabano","ajo","lechuga","espinaca","flores"],
  grande:  ["hierbas","rabano","ajo","lechuga","espinaca","flores","zanahoria","cebolla","fresa"],
  enorme:  null,
};

// ─── Estados de planta ────────────────────────────────────
export const ESTADOS_ORDEN = ["sembrado","germinacion","crecimiento","maduracion","listo"];

export const ESTADO_EMOJI = {
  sembrado:"🌱", germinacion:"🌿", crecimiento:"🍃", maduracion:"🌸",
  listo:"✅", cosechado:"🎉", muerta_sequia:"💀", muerta_ahogo:"💀", pasada:"🍂",
};

export const ESTADO_COLOR = {
  sembrado:"#bbf7d0", germinacion:"#86efac", crecimiento:"#4ade80",
  maduracion:"#f9a8d4", listo:"#fef08a", cosechado:"#e5e7eb",
  muerta_sequia:"#fca5a5", muerta_ahogo:"#fca5a5", pasada:"#d1d5db",
};

export const ESTADO_LABEL = {
  sembrado:"Sembrado", germinacion:"Germinación", crecimiento:"Crecimiento",
  maduracion:"Maduración", listo:"Listo p/ cosechar", cosechado:"Cosechado",
  muerta_sequia:"Muerta por sequía", muerta_ahogo:"Muerta por ahogo",
  pasada:"Pasada — calidad reducida",
};

export const CURSOR_MAP = {
  seleccionar:"grab", dibujar:"crosshair",
  sembrar:"cell", regar:"crosshair", info:"pointer",
};

export const HERRAMIENTAS = [
  { id:"seleccionar", label:"Mover"   },
  { id:"dibujar",     label:"Dibujar" },
  { id:"sembrar",     label:"Sembrar" },
  { id:"regar",       label:"Regar"   },
  { id:"info",        label:"Info"    },
];
