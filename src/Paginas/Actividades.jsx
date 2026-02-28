import { useEffect, useState } from "react";
import axios from "axios";
import { useHuerto } from "../context/HuertoContext";
import { useAuth } from "../context/AuthContext";
import { Activity, Leaf, BarChart3, Calendar, Info } from "lucide-react";


export default function RegistroActividades() {
  const [actividadesHuerto, setActividadesHuerto] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;
  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;

  const actividadesPaginadas = actividadesHuerto.slice(
    indicePrimero,
    indiceUltimo
  );

  const totalPaginas = Math.ceil(
    actividadesHuerto.length / registrosPorPagina
  );
  const [actividadesGlobales, setActividadesGlobales] = useState([]);
  const { huertos, huertoId, setHuertoId, loadingHuertos } = useHuerto();
  



  const { token } = useAuth();


useEffect(() => {
  setPaginaActual(1);
}, [huertoId]);

const huertoMap = huertos.reduce((acc, h) => {
  acc[h.id] = h.nombre;
  return acc;
}, {});

 useEffect(() => {
  if (!huertoId || !token) return;

  const headers = { Authorization: `Bearer ${token}` };

  Promise.all([
    axios.get(`http://localhost:8000/api/actividad/huerto/${huertoId}/`, { headers }),
    axios.get(`http://localhost:8000/api/plantacion/plantaciones/huerto/${huertoId}/`, { headers }),
  ])
  .then(([actividadesRes, plantacionesRes]) => {

    // 🔹 Actividades normales
    const actividades = actividadesRes.data.map((a) => ({
      tipo: a.accion,
      cultivo: a.descripcion || "Actividad",
      fila: a.plantacion?.fila,
      columna: a.plantacion?.columna,
      fecha: a.fecha,
    }));

    // 🔹 Convertir plantaciones en SIEMBRA
    const siembras = plantacionesRes.data.map((p) => ({
      tipo: "siembra",
      cultivo: p.cultivo_nombre,
      fila: p.fila,
      columna: p.columna,
      fecha: p.fecha_siembra,
    }));

    // 🔹 Unir todo
    const todas = [...actividades, ...siembras];

    // 🔹 Ordenar por fecha descendente
    todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    setActividadesHuerto(todas);
  })
  .catch(console.error);

}, [huertoId, token]);


useEffect(() => {
  if (!token) return;

  axios.get(
  "http://localhost:8000/api/plantacion/plantaciones/listar/",
  {
    headers: { Authorization: `Bearer ${token}` },
  }
)

    .then((res) => {
  const data = res.data.map((p) => {
    const huertoObj = huertos.find((h) => h.id === p.huerto);

    return {
      huerto: huertoObj ? huertoObj.nombre : `Huerto ${p.huerto}`,
    };
  });

  setActividadesGlobales(data);
});


}, [token, huertos]);



const resumenGlobalPorHuerto = Object.values(
  actividadesGlobales.reduce((acc, act) => {
    acc[act.huerto] = acc[act.huerto] || {
      huerto: act.huerto,
      siembras: 0,
    };
    acc[act.huerto].siembras += 1;
    return acc;
  }, {})
);

const getTipoStyles = (tipo) => {
  switch (tipo?.toLowerCase()) {
    case "siembra":
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        dot: "bg-green-500",
      };
    case "riego":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-500",
      };
    case "cosecha":
      return {
        bg: "bg-amber-100",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };
    case "muerte":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        dot: "bg-red-500",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        dot: "bg-gray-500",
      };
  }
};
   return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Registro de Actividades</h1>
              <p className="text-gray-500 mt-1">Historial completo de todas las operaciones</p>
            </div>
          </div>
        </div>

        {/* Selector de huerto y tabla */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8">
          {/* Header con selector */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Actividades registradas</h2>
            </div>

            {/* Selector de huerto mejorado */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-2xl border-2 border-gray-200 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Leaf className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Filtrar por huerto
                  </p>
                  <select
                    value={huertoId ?? ""}
                    onChange={(e) => setHuertoId(Number(e.target.value))}
                    disabled={loadingHuertos}
                    className="text-base font-bold text-gray-800 bg-transparent border-none outline-none cursor-pointer pr-8 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2316a34a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right center',
                      backgroundSize: '1.5em 1.5em',
                    }}
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
          </div>

          {/* Tabla mejorada */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-4 font-bold text-gray-700 text-sm uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700 text-sm uppercase tracking-wider">
                    Cultivo
                  </th>
               
                  <th className="text-left py-4 px-4 font-bold text-gray-700 text-sm uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {actividadesHuerto.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-3">
                          <Activity className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg">No hay actividades registradas</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  actividadesPaginadas.map((actividad, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50 hover:to-transparent transition-all duration-200"
                    >
                      <td className="py-4 px-4">
                       {(() => {
                          const styles = getTipoStyles(actividad.tipo);
                          return (
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${styles.bg} ${styles.text}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                              {actividad.tipo}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-800">{actividad.cultivo}</span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-4">
                        <span className="text-gray-500 text-sm">{actividad.fecha}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Paginación simple */}
            {actividadesHuerto.length > 0 && (
              

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Mostrando{" "}
                    <span className="font-semibold">
                      {indicePrimero + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-semibold">
                      {Math.min(indiceUltimo, actividadesHuerto.length)}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold">
                      {actividadesHuerto.length}
                    </span>{" "}
                    registros
                  </p>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 font-medium">
                      Página {paginaActual} de {totalPaginas}
                    </span>
               <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPaginaActual((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={paginaActual === 1}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  onClick={() =>
                    setPaginaActual((prev) =>
                      Math.min(prev + 1, totalPaginas)
                    )
                  }
                  disabled={paginaActual === totalPaginas}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Actividades de siembra por huerto
            </h2>
          </div>

          <div className="space-y-4">
            {resumenGlobalPorHuerto.map((item, index) => {
              const maxSiembras = Math.max(...resumenGlobalPorHuerto.map(h => h.siembras));
              const percentage = (item.siembras / maxSiembras) * 100;
              
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-semibold text-gray-700 truncate">
                    {item.huerto}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-10 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 h-full flex items-center justify-end px-4 text-white text-sm font-bold transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      >
                        {item.siembras}
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm text-gray-600">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen total */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Total de siembras</p>
                <p className="text-3xl font-bold text-green-700">
                  {resumenGlobalPorHuerto.reduce((acc, h) => acc + h.siembras, 0)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-6 rounded-2xl border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Huertos activos</p>
                <p className="text-3xl font-bold text-blue-700">
                  {resumenGlobalPorHuerto.length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-50 p-6 rounded-2xl border border-purple-200">
                <p className="text-sm text-gray-600 mb-1">Promedio por huerto</p>
                <p className="text-3xl font-bold text-purple-700">
                  {(resumenGlobalPorHuerto.reduce((acc, h) => acc + h.siembras, 0) / resumenGlobalPorHuerto.length).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
