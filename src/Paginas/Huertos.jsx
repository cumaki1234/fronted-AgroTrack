import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useHuerto } from "../context/HuertoContext";
import { Popconfirm } from "antd";
import { useNavigate } from "react-router-dom";
import { Leaf, Trash2, Settings, Plus, Grid, Pencil } from "lucide-react";
import EditorHuerto from "./EditorHuerto";

const API = import.meta.env.VITE_API_URL;

// ── El editor se monta en document.body via portal ────────
// Así React Router NUNCA puede desmontarlo
function EditorPortal({ huerto, onGuardar, onCerrar, guardando }) {
  if (!huerto) return null;
  return createPortal(
    <EditorHuerto
      key={huerto.id}
      huerto={huerto}
      onGuardar={onGuardar}
      onCerrar={onCerrar}
      guardando={guardando}
    />,
    document.body
  );
}

export default function GestionHuertos() {
  const { huertos, setHuertos, fetchHuertos } = useHuerto();
  const [nombre,          setNombre]          = useState("");
  const [creando,         setCreando]         = useState(false);
  const [guardando,       setGuardando]       = useState(false);
  const [huertoEditando,  setHuertoEditando]  = useState(null);

  const { token } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    fetchHuertos();
  }, []);
  

  async function crearHuerto() {
    if (!nombre.trim()) return;

    try {
      const res = await fetch(`${API}/huertos/crear/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });

      const data = await res.json();

      await fetchHuertos();   

      setNombre("");
      setCreando(false);
      setHuertoEditando({ ...data, _token: token });

    } catch (e) {
      console.error(e);
    }
  }

  const guardarLayout = useCallback(async (id, layout) => {
    setGuardando(true);
    try {
      const res  = await fetch(`${API}/huertos/${id}/`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body:    JSON.stringify({ layout }),
      });
      const data = await res.json();
      setHuertos(prev => prev.map(h => h.id === id ? data : h));
      // NO tocar huertoEditando aquí — dejaría el editor abierto sin reiniciarlo
    } catch (e) { console.error(e); }
    finally { setGuardando(false); }
  }, [token]);

  async function eliminarHuerto(id) {
    try {
      await fetch(`${API}/huertos/${id}/`, {
        method:  "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      setHuertos(prev => prev.filter(h => h.id !== id));
      if (huertoEditando?.id === id) setHuertoEditando(null);
    } catch (e) { console.error(e); }
  }

  return (
    <>
      {/* Portal: vive en document.body, fuera de React Router */}
      <EditorPortal
        huerto={huertoEditando}
        onGuardar={(layout) => guardarLayout(huertoEditando.id, layout)}
        onCerrar={() => setHuertoEditando(null)}
        guardando={guardando}
      />

      {/* Lista normal */}
      <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="w-full max-w-6xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Mis Huertos</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {huertos.length} huerto{huertos.length !== 1 ? "s" : ""} creado{huertos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {!creando && (
              <button
                onClick={() => setCreando(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-semibold text-sm"
              >
                <Plus className="w-4 h-4" /> Nuevo huerto
              </button>
            )}
          </div>

          {/* Input nombre */}
          {creando && (
            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 mb-6">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">
                ¿Cómo se llamará tu nuevo huerto?
              </p>
              <div className="flex gap-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Ej: Huerto del patio, Mi jardín..."
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  crearHuerto();
                    if (e.key === "Escape") setCreando(false);
                  }}
                  className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100 text-gray-800 font-medium transition-all"
                />
                <button
                  onClick={crearHuerto}
                  disabled={!nombre.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl disabled:opacity-40 hover:from-green-700 hover:to-emerald-700 transition-all font-bold shadow-md"
                >
                  Crear y diseñar →
                </button>
                <button
                  onClick={() => { setCreando(false); setNombre(""); }}
                  className="px-4 py-3 border-2 border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                 Después de crear el nombre, podrás diseñar el huerto con el editor visual.
              </p>
            </div>
          )}

          {/* Lista */}
          {huertos.length === 0 && !creando ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="text-lg font-bold text-gray-400 mb-2">Aún no tienes huertos</h3>
              <p className="text-gray-400 text-sm mb-6">Crea tu primer huerto y empieza a diseñarlo</p>
              <button
                onClick={() => setCreando(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Crear mi primer huerto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {huertos.map(h => (
                <TarjetaHuerto
                  key={h.id}
                  huerto={h}
                  onEditar={() => setHuertoEditando({ ...h, _token: token })}
                  onAdministrar={() => navigate(`/huerto/${h.id}`)}
                  onEliminar={() => eliminarHuerto(h.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Tarjeta ───────────────────────────────────────────────
function TarjetaHuerto({ huerto, onEditar, onAdministrar, onEliminar }) {
  const zonas      = huerto.layout?.zonas || [];
  const tieneLayout = zonas.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300 group flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl group-hover:from-green-200 group-hover:to-emerald-200 transition-all">
            <Leaf className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 leading-tight">{huerto.nombre}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(huerto.fecha_creacion).toLocaleDateString("es-ES", { day:"numeric", month:"short", year:"numeric" })}
            </p>
          </div>
        </div>
      </div>

      {tieneLayout ? (
        <div className="mb-4 flex-1">
          <LayoutPreview zonas={zonas} />
          <p className="text-xs text-gray-400 mt-2 text-center">
            {zonas.length} zona{zonas.length !== 1 ? "s" : ""} diseñada{zonas.length !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        <div className="mb-4 flex-1 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl py-8">
          <div className="text-center">
            <Grid className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Sin diseño aún</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        <button onClick={onEditar}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm shadow-md">
          <Pencil className="w-4 h-4" />
          {tieneLayout ? "Editar diseño" : "Diseñar huerto"}
        </button>
        <button onClick={onAdministrar}
          className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-sm">
          <Settings className="w-4 h-4" /> Administrar
        </button>
        <Popconfirm
          title="Eliminar huerto"
          description="Esta acción eliminará el huerto y su diseño."
          onConfirm={onEliminar}
          okText="Eliminar" cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <button className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all font-semibold text-sm">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </Popconfirm>
      </div>
    </div>
  );
}

// ── Preview miniatura ─────────────────────────────────────
function LayoutPreview({ zonas }) {
  if (!zonas?.length) return null;
  const COLORES = { maceta:"#fef3c7", cantero:"#fde68a", jardin:"#dcfce7", invernadero:"#e0f2fe" };
  const maxX = Math.max(...zonas.map(z => z.x + z.w), 1);
  const maxY = Math.max(...zonas.map(z => z.y + z.h), 1);
  const scale = Math.min(200 / maxX, 112 / maxY) * 0.9;

  return (
    <div className="relative w-full h-28 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
      {zonas.map(z => (
        <div key={z.id} title={z.nombre} style={{
          position: "absolute",
          left: z.x * scale, top: z.y * scale,
          width: z.w * scale, height: z.h * scale,
          backgroundColor: COLORES[z.tipo] || "#f3f4f6",
          borderRadius: 4, border: "1px solid rgba(0,0,0,0.1)",
          overflow: "hidden", padding: 2,
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>
            {z.nombre}
          </span>
        </div>
      ))}
    </div>
  );
}