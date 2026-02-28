import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { Modal, Button, List, Tag, Select } from "antd";
import { useNavigate } from "react-router-dom";
import { useHuerto } from "../context/HuertoContext";
import { Power, TrendingUp, Calendar, CheckCircle2, Activity, Leaf } from "lucide-react";




export default function Dashboard() {
  const { logout } = useAuth();
  const [plantaciones, setPlantaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { huertos, huertoId, setHuertoId, loadingHuertos } = useHuerto();


  const [mostrarCultivos, setMostrarCultivos] = useState(false);
  const navigate = useNavigate();
  const { Option } = Select;


  useEffect(() => {
    if (!huertoId) {
      setPlantaciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    axios
      .get(`https://backend-agrotrack.onrender.com/api/plantacion/plantaciones/huerto/${huertoId}/`)
      .then((res) => setPlantaciones(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [huertoId]);





  const totalCultivos = plantaciones.length;

  const tareasPendientes = plantaciones.filter(
    (p) => p.estado === "sembrado"
  ).length;

  const proximasCosechas = plantaciones.filter(
    (p) => p.estado === "crecimiento"
  ).length;

  const ultimasActividades = [...plantaciones]
    .sort((a, b) => new Date(b.fecha_siembra) - new Date(a.fecha_siembra))
    .slice(0, 5);

  if (loadingHuertos) {
  return <div className="p-8">Cargando huertos...</div>;
}

 return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full px-6 py-8">
        {/* Header mejorado */}
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
                  <p className="text-gray-500 mt-1">
                    Panel de gestión de plantaciones
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 duration-200"
            >
              <Power size={20} />
              <span className="font-medium">Cerrar sesión</span>
            </button>

          </div>
        </header>

        {/* Selector de huerto mejorado */}
        <section className="mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 inline-block">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Huerto activo
                </p>
                <select
                  value={huertoId}
                  onChange={(e) => setHuertoId(Number(e.target.value))}
                  className="text-lg font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-lg px-4 py-2 pr-10 cursor-pointer hover:border-green-500 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all appearance-none"
                >
                  {huertos.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre}
                    </option>
                  ))}
                </select>

              </div>
            </div>
          </div>
        </section>

        {/* Cards de estadísticas mejoradas */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Cultivos activos"
            value={totalCultivos}
            icon={<TrendingUp className="w-8 h-8" />}
            color="green"
            isClickable={true}
            onClick={() => setMostrarCultivos(true)}
          />

          <StatCard
            title="Próximas cosechas"
            value={proximasCosechas}
            icon={<Calendar className="w-8 h-8" />}
            color="blue"
          />
          <StatCard
            title="Tareas pendientes"
            value={tareasPendientes}
            icon={<CheckCircle2 className="w-8 h-8" />}
            color="orange"
          />
        </section>

        {/* Contenido mejorado */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estado de plantaciones */}
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                Estado de plantaciones
              </h3>
            </div>

            <div className="space-y-4">
              <StatusItem
                label="Sembradas"
                value={tareasPendientes}
                color="bg-yellow-500"
                percentage={(tareasPendientes / totalCultivos) * 100}
              />
              <StatusItem
                label="En crecimiento"
                value={proximasCosechas}
                color="bg-green-500"
                percentage={(proximasCosechas / totalCultivos) * 100}
              />
              <StatusItem
                label="Total"
                value={totalCultivos}
                color="bg-blue-500"
                percentage={100}
              />
            </div>
          </div>

          {/* Últimas actividades */}
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                Últimas actividades
              </h3>
            </div>

            <div className="space-y-3">
              {ultimasActividades.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No hay actividades recientes</p>
                </div>
              ) : (
                ultimasActividades.map((p) => (
                  <ActivityItem
                    cultivo={p.cultivo_nombre}
                    fila={p.fila}
                    columna={p.columna}
                    fecha={p.fecha_siembra}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <Modal
      title="🌱 Cultivos activos"
      open={mostrarCultivos}
      onCancel={() => setMostrarCultivos(false)}
      footer={[
        <Button key="close" onClick={() => setMostrarCultivos(false)}>
          Cerrar
        </Button>,
      ]}
    >
      <div className="max-h-[420px] overflow-y-auto pr-2">
        <List
          dataSource={plantaciones}
          locale={{ emptyText: "No hay cultivos activos" }}
          itemLayout="horizontal"
          renderItem={(p) => (
            <List.Item
              className="hover:bg-gray-50 rounded-lg px-3 transition"
              actions={[
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate(`/huerto/${p.huerto}`)}
                >
                  Ver
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">🌱</span>
                    <span className="font-medium">{p.cultivo_nombre}</span>
                  </div>
                }
                description={
                  <div className="text-xs text-gray-500">
                    Fila {p.fila}, Columna {p.columna}
                  </div>
                }
              />
              <Tag color="green" className="ml-2">
                {p.estado}
              </Tag>
            </List.Item>
          )}
        />
      </div>
    </Modal>


    </div>
  );
}

function StatCard({ title, value, icon, color, isClickable, onClick }) {

  const colorClasses = {
    green: {
      bg: "from-green-500 to-emerald-600",
      hover: "hover:from-green-600 hover:to-emerald-700",
      text: "text-green-600",
      iconBg: "bg-green-100",
    },
    blue: {
      bg: "from-blue-500 to-blue-600",
      hover: "hover:from-blue-600 hover:to-blue-700",
      text: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    orange: {
      bg: "from-orange-500 to-orange-600",
      hover: "hover:from-orange-600 hover:to-orange-700",
      text: "text-orange-600",
      iconBg: "bg-orange-100",
    },
  };

  const colors = colorClasses[color];

  return (
    <div
        onClick={onClick}
        className={`
          bg-white p-6 rounded-2xl shadow-lg 
          hover:shadow-xl transition-all duration-300
          border border-gray-100
          ${isClickable ? "cursor-pointer transform hover:scale-105" : ""}
        `}
      >

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </h2>
        <div className={`p-3 ${colors.iconBg} rounded-xl`}>
          <div className={colors.text}>{icon}</div>
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-800">{value}</p>
      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors.bg} ${colors.hover} transition-all duration-500 rounded-full`}
          style={{ width: "75%" }}
        />
      </div>
    </div>
  );
}

function StatusItem({ label, value, color, percentage }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-3 h-3 ${color} rounded-full`} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-lg font-bold text-gray-800 w-8 text-right">
          {value}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ cultivo, fila, columna, fecha }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-100">
      <div className="p-2 bg-green-100 rounded-lg mt-1">
        <Leaf className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">
          Nueva plantación: {cultivo}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          📍 Fila {fila}, Columna {columna}
        </p>
        <p className="text-xs text-gray-400 mt-1">{fecha}</p>
      </div>
      <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
        Activo
      </div>
    </div>
  );
}





