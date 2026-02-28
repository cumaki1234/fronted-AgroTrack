import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Avatar, Typography, notification, Modal } from "antd";


const { Text } = Typography;

export default function HuertoDetalle() {
  const { id } = useParams();
  const { token } = useAuth();
  const [modalPlantacion, setModalPlantacion] = useState(false);
  const [plantacionSeleccionada, setPlantacionSeleccionada] = useState(null);
  const [actividades, setActividades] = useState([]);


  const API = import.meta.env.VITE_API_URL;

  const [salidaConfirmada, setSalidaConfirmada] = useState(false);
  const [huerto, setHuerto] = useState(null);
  const [cultivos, setCultivos] = useState([]);
  const [plantasEnCeldas, setPlantasEnCeldas] = useState({});
  const [accionesPendientes, setAccionesPendientes] = useState([]);

  // ----------------------------
  // 1) Cargar cultivos
  // ----------------------------
  useEffect(() => {
  fetch(`${API}/cultivos/`)
    .then((res) => res.json())
    .then((data) => {
      console.log("CULTIVOS DESDE BACKEND:", data); 
      setCultivos(data);
    })
    .catch((err) => console.error("Error cargando cultivos:", err));
}, []);


  // ----------------------------
  // 2) Cargar huerto
  // ----------------------------
  useEffect(() => {
    fetch(`${API}/api/huertos/${id}/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setHuerto(data))
      .catch((err) => console.error(err));
      

  }, [id, token]);

  // ----------------------------
  // 3) Cargar las palntacioes por huerto
  // ----------------------------

  useEffect(() => {
    if (!huerto) return;

    fetch(`${API}/plantacion/plantaciones/huerto/${huerto.id}/`)
      .then((res) => res.json())
      .then((data) => {
        const plantas = {};

        data.forEach((p) => {
          const key = `${p.fila}-${p.columna}`;
          plantas[key] = {
            id: p.cultivo_tipo,
            imagen: p.cultivo_imagen, // ver nota abajo
          };
        });

        setPlantasEnCeldas(plantas);
      })
      .catch((err) => console.error("Error cargando plantaciones:", err));
  }, [huerto]);

  // ----------------------------
  // 4) Bloquear botón atrás del navegador
  // ----------------------------
  useEffect(() => {
    const handleBackButton = (event) => {
      if (accionesPendientes.length > 0) {
        event.preventDefault();
        Modal.warning({
          title: "Cambios sin guardar",
          content: "Debes guardar antes de salir.",
        });
        window.history.pushState(null, null, window.location.pathname);
      }
    };

    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener("popstate", handleBackButton);

    return () => window.removeEventListener("popstate", handleBackButton);
  }, [accionesPendientes]);

  // ----------------------------
  // Drop: colocar cultivo en celda
  // ----------------------------
 const handleDrop = (e, fila, columna) => {
  const cultivo = JSON.parse(e.dataTransfer.getData("cultivo"));
  const key = `${fila}-${columna}`;

  // Si ya hay planta en esa celda → mostrar advertencia y cancelar
  if (plantasEnCeldas[key]) {
    Modal.warning({
      title: "Celda ocupada",
      content: "Esta celda ya tiene un cultivo. Elimínalo antes de colocar otro.",
    });
    return;
  }

  setPlantasEnCeldas((prev) => ({
    ...prev,
    [key]: cultivo,
  }));

  setAccionesPendientes((prev) => [
    ...prev,
    {
      tipo: "siembra",
      cultivo_id: cultivo.id,
      fila,
      columna,
    },
  ]);
};

const eliminarPlanta = (fila, columna) => {
  const key = `${fila}-${columna}`;

  setPlantasEnCeldas((prev) => {
    const nuevo = { ...prev };
    delete nuevo[key];
    return nuevo;
  });

  setAccionesPendientes((prev) => [
    ...prev,
    {
      tipo: "eliminar",
      fila,
      columna,
    },
  ]);
};

  // ----------------------------
  // Guardar cambios
  // ----------------------------
  const guardarCambios = async () => {
  if (accionesPendientes.length === 0) return;

  for (const accion of accionesPendientes) {
    if (accion.tipo === "siembra") {
      const res = await fetch(
        `${API}/plantacion/plantaciones/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, 
          },
          body: JSON.stringify({
            huerto: huerto.id,
            cultivo_tipo: accion.cultivo_id,
            estado: "sembrado",
            fila: accion.fila,
            columna: accion.columna,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.text();
        console.error("ERROR BACKEND:", res.status, error);
        return;
      }
    }

    if (accion.tipo === "eliminar") {
      const res = await fetch(
        `${API}/plantacion/plantaciones/eliminar/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, 
          },
          body: JSON.stringify({
            huerto_id: huerto.id,
            fila: accion.fila,
            columna: accion.columna,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.text();
        console.error("ERROR BACKEND:", res.status, error);
        return;
      }
    }
  }

  setAccionesPendientes([]);
  notification.success({
    message: "Cambios guardados",
    description: "Las plantaciones se han actualizado correctamente.",
    placement: "bottomRight",
  });
};


  // ----------------------------
  // Riego
  // ----------------------------
  useEffect(() => {
    if (!plantacionSeleccionada || !huerto) return;

    fetch(
      `${API}/plantacion/plantaciones/huerto/${huerto.id}/`
    )
      .then(res => res.json())
      .then(data => {
        const encontrada = data.find(
          p =>
            p.fila === plantacionSeleccionada.fila &&
            p.columna === plantacionSeleccionada.columna
        );

        if (encontrada) {
          setPlantacionSeleccionada(encontrada);
          setActividades(encontrada.actividades || []);
        }
      });
  }, [modalPlantacion]);

  const regarPlantacion = async (id) => {
    await fetch(
      `${API}/actividad/${id}/regar/`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );

    notification.success({ message: "Riego registrado" });
    setModalPlantacion(false);
  };

  const avanzarEstado = async (id) => {
    await fetch(
      `${API}/actividad/${id}/avanzar-estado/`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );

    notification.success({ message: "Estado actualizado" });
    setModalPlantacion(false);
  };

  const cosecharPlantacion = async (id) => {
    await fetch(
      `${API}/actividad/${id}/cosechar/`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );

    notification.success({ message: "Cultivo cosechado" });
    setModalPlantacion(false);
  };

// ----------------------------
// Abrir modal de plantación
// ----------------------------
  const abrirModalPlantacion = (fila, columna) => {
    // Buscar la plantación real (guardada en backend)
    fetch(
      `${API}/plantacion/plantaciones/huerto/${huerto.id}/`
    )
      .then((res) => res.json())
      .then((data) => {
        const encontrada = data.find(
          (p) => p.fila === fila && p.columna === columna
        );

        if (!encontrada) {
          Modal.warning({
            title: "Plantación no disponible",
            content: "Guarda los cambios antes de gestionar este cultivo.",
          });
          return;
        }

        setPlantacionSeleccionada(encontrada);
        setActividades(encontrada.actividades || []);
        setModalPlantacion(true);
      })
      .catch(() => {
        Modal.error({
          title: "Error",
          content: "No se pudo cargar la plantación",
        });
      });
  };

  // ----------------------------
  // Render
  // ----------------------------
  if (!huerto) return <p>Cargando...</p>;

  return (
    <div className="flex gap-6 p-6">

      
      {/* CONTENEDOR IZQUIERDO: Botón + Sidebar */}
<div className="flex flex-col w-64 gap-4">
    
      {/* BOTÓN VOLVER */}
      <Button
        type="primary"
        style={{ width: "100%" }}
        danger={accionesPendientes.length > 0}
        onClick={() => {
          if (accionesPendientes.length > 0) {
            Modal.confirm({
              title: "Tienes cambios sin guardar",
              content: "¿Quieres salir sin guardar?",
              okText: "Salir",
              cancelText: "Cancelar",
              onOk() {
                setSalidaConfirmada(true);
                window.location.href = "/huertos";
              },
            });
          } else {
            window.location.href = "/huertos";
          }
        }}
      >
        Volver
      </Button>


      {/* SIDEBAR IZQUIERDO */}
      <div className="p-4 bg-white shadow-lg rounded-xl border">
        <h3 className="text-lg font-bold mb-3">Cultivos disponibles</h3>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1">
          {cultivos.map((c) => (
            <Card
              key={c.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("cultivo", JSON.stringify(c))
              }
              className="cursor-grab hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={
                    c.imagen
                      ? `http://127.0.0.1:8000${c.imagen}`
                      : "/placeholder-cultivo.png"
                  }
                  shape="square"
                  size={50}
                />


                <div>
                  <Text strong>{c.nombre}</Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    {c.duracion_dias} días · {c.requerimiento_agua_litros} L
                  </Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>

      {/* CUADRÍCULA */}
      <div
        className="grid gap-[6px] p-4 rounded-xl bg-white/40 backdrop-blur-lg shadow-xl border border-green-200"
        style={{
          gridTemplateColumns: `repeat(${huerto.ancho}, 70px)`,
          gridTemplateRows: `repeat(${huerto.largo}, 70px)`,
        }}
      >
        {Array.from({ length: huerto.largo }).map((_, fila) =>
          Array.from({ length: huerto.ancho }).map((_, columna) => {
            const key = `${fila}-${columna}`;
            return (
              <div
                key={key}
                onClick={() => {
                if (accionesPendientes.length > 0) {
                  Modal.warning({
                    title: "Cambios pendientes",
                    content: "Guarda los cambios antes de gestionar el cultivo",
                  });
                  return;
                }

                if (!plantasEnCeldas[key]) return;

                abrirModalPlantacion(fila, columna);
              }}

                onDrop={(e) => handleDrop(e, fila, columna)}
                onDragOver={(e) => e.preventDefault()}
                className="relative w-[70px] h-[70px] rounded-lg border border-green-400/40 bg-green-50/60 flex items-center justify-center hover:bg-green-100 hover:scale-[1.03] transition-all shadow"
              >
                {plantasEnCeldas[key] && (
                  <>
                    <img
                      src={`${API_URL}${plantasEnCeldas[key].imagen}`}
                      alt="Cultivo"
                      className="w-[65px] h-[65px] object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        e.target.src = "/placeholder-cultivo.png";
                      }}
                    />

                    <button
                      onClick={() => eliminarPlanta(fila, columna)}
                      className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 rounded-full"
                    >
                      X
                    </button>
                  </>
                )}

              </div>

            );
          })
        )}
      </div>



       {/* SIDEBAR DERECHO (FUERA DEL IZQUIERDO!) */}
      <div className="w-64 bg-white shadow-xl p-4 rounded-xl flex flex-col gap-4 h-fit">
        <h3 className="font-bold text-lg">Cambios pendientes</h3>

        <div className="flex-1 overflow-y-auto max-h-[400px]">
          {accionesPendientes.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay cambios</p>
          ) : (
            accionesPendientes.map((a, i) => (
              <div key={i} className="border p-2 rounded-lg mb-2 bg-green-50">
                <p><b>Acción:</b> {a.tipo}</p>
                <p><b>Cultivo ID:</b> {a.cultivo_id}</p>
                <p><b>Posición:</b> ({a.fila}, {a.columna})</p>
              </div>
            ))
          )}
        </div>

        <Button
          onClick={guardarCambios}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg shadow"
          disabled={accionesPendientes.length === 0}
        >
          Guardar cambios
        </Button>
      </div>
      <Modal
        open={modalPlantacion}
        onCancel={() => setModalPlantacion(false)}
        footer={null}
        width={600}
        title="Detalle de la plantación"
      >
        {plantacionSeleccionada && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar
                size={64}
                src={plantacionSeleccionada.cultivo_imagen}
              />
              <div>
                <h3 className="text-lg font-bold">
                  {plantacionSeleccionada.cultivo_nombre}
                </h3>
                <p className="text-gray-500">
                  Posición: ({plantacionSeleccionada.fila},{" "}
                  {plantacionSeleccionada.columna})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <p><b>Estado:</b> {plantacionSeleccionada.estado}</p>
              <p><b>Fecha siembra:</b> {plantacionSeleccionada.fecha_siembra}</p>
              <p><b>Último riego:</b> {plantacionSeleccionada.ultimo_riego || "—"}</p>
              <p><b>Próximo riego:</b> {plantacionSeleccionada.proximo_riego || "—"}</p>
            </div>

            {/* ACCIONES */}
            <div className="flex gap-3 pt-2">
              <Button
                type="primary"
                onClick={() => regarPlantacion(plantacionSeleccionada.id)}
              >
                💧 Regar
              </Button>

              <Button
                onClick={() => avanzarEstado(plantacionSeleccionada.id)}
              >
                🌱 Avanzar estado
              </Button>

              <Button
                danger
                disabled={plantacionSeleccionada.estado !== "listo_para_cosecha"}
                onClick={() => cosecharPlantacion(plantacionSeleccionada.id)}
              >
                🌾 Cosechar
              </Button>

            </div>

            {/* HISTORIAL */}
            <div className="pt-4">
              <h4 className="font-bold mb-2">Historial</h4>

              {actividades.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No hay actividades registradas
                </p>
              ) : (
                actividades.map((a, i) => (
                  <div
                    key={i}
                    className="border rounded p-2 mb-2 bg-gray-50"
                  >
                    <p><b>{a.tipo_actividad}</b></p>
                    <p className="text-sm text-gray-500">
                      {new Date(a.fecha).toLocaleString()}
                    </p>
                    {a.descripcion && <p>{a.descripcion}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>

    
  );
}
