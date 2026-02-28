import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Sprout, Download } from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { Modal } from "antd";


export default function ReporteProduccion() {
  const [dataReporte, setDataReporte] = useState([]);
  const [plantacionesCompletas, setPlantacionesCompletas] = useState([]); // NUEVO: Guardar todas las plantaciones
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  // ===== NUEVO: filtros por fecha =====
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");


  useEffect(() => {
    if (!token) return;

    setLoading(true);

    axios
      .get("http://localhost:8000/api/plantacion/plantaciones/listar/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        // IMPORTANTE: Guardar las plantaciones completas
        setPlantacionesCompletas(res.data);

        // Agrupar por nombre de cultivo para el reporte visual
        const resumen = res.data.reduce((acc, p) => {
          const nombreCultivo = p.cultivo_nombre || "Sin nombre";

          acc[nombreCultivo] = acc[nombreCultivo] || {
            cultivo: nombreCultivo,
            total: 0,
          };

          acc[nombreCultivo].total += 1;
          return acc;
        }, {});

        setDataReporte(Object.values(resumen));
      })
      .catch((err) => {
        console.error("Error reporte producción:", err);
        setDataReporte([]);
        setPlantacionesCompletas([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const totalSiembras = dataReporte.reduce((acc, item) => acc + item.total, 0);
  const cultivoMasProductivo = dataReporte.length > 0
    ? dataReporte.reduce((max, item) => (item.total > max.total ? item : max), dataReporte[0])
    : null;

  const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

  
  // ===== NUEVO: plantaciones filtradas por fecha =====
    const plantacionesFiltradas = plantacionesCompletas.filter(p => {
      const fecha = new Date(p.fecha_siembra);
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin) : null;

      if (inicio && fecha < inicio) return false;
      if (fin && fecha > fin) return false;
      return true;
    });
    useEffect(() => {
      // 🚨 si no hay datos base aún, no hacer nada
      if (plantacionesCompletas.length === 0) {
        return;
      }

      // 🚨 si ambos campos están vacíos, usar datos completos
      if (!fechaInicio && !fechaFin) {
        const resumen = plantacionesCompletas.reduce((acc, p) => {
          const nombre = p.cultivo_nombre || "Sin nombre";
          acc[nombre] = acc[nombre] || { cultivo: nombre, total: 0 };
          acc[nombre].total += 1;
          return acc;
        }, {});
        setDataReporte(Object.values(resumen));
        return;
      }

      // 🚨 validar fechas inválidas
      const inicio = fechaInicio ? new Date(fechaInicio) : null;
      const fin = fechaFin ? new Date(fechaFin) : null;

      if (
        (inicio && isNaN(inicio.getTime())) ||
        (fin && isNaN(fin.getTime()))
      ) {
        mostrarAlertaSinDatos();
        return;
      }


      const filtradas = plantacionesCompletas.filter(p => {
        const fecha = new Date(p.fecha_siembra);
        if (inicio && fecha < inicio) return false;
        if (fin && fecha > fin) return false;
        return true;
      });

      // 🚨 SI NO HAY RESULTADOS → ALERTA
      if (filtradas.length === 0) {
        mostrarAlertaSinDatos();

        // 🔄 REINICIAR FECHAS
        setFechaInicio(null);
        setFechaFin(null);
      }


      const resumen = filtradas.reduce((acc, p) => {
        const nombre = p.cultivo_nombre || "Sin nombre";
        acc[nombre] = acc[nombre] || { cultivo: nombre, total: 0 };
        acc[nombre].total += 1;
        return acc;
      }, {});

      setDataReporte(Object.values(resumen));
    }, [fechaInicio, fechaFin, plantacionesCompletas]);



const mostrarAlertaSinDatos = () => {
  Modal.warning({
    title: "Reporte no disponible",
    content: (
      <div>
        <p>No existen datos suficientes para generar el reporte.</p>
        <p style={{ marginTop: 8 }}>
          Verifique el rango de fechas seleccionado o registre nuevas siembras.
        </p>
      </div>
    ),
    okText: "Entendido",
    centered: true,
  });
};



  // Funciones de exportación que reciben las plantaciones completas
  const handleExportarPDF = () => {
    if (plantacionesCompletas.length === 0) {
      alert('No hay datos disponibles para exportar');
      return;
    }
    exportarPDFCompleto(plantacionesFiltradas, [], 'Usuario AgroTrack');
  };

  const handleExportarExcel = () => {
    if (plantacionesCompletas.length === 0) {
      alert('No hay datos disponibles para exportar');
      return;
    }
    exportarExcelCompleto(plantacionesFiltradas, []);
  };

  const handleExportarCSV = () => {
    if (plantacionesCompletas.length === 0) {
      alert('No hay datos disponibles para exportar');
      return;
    }
    exportarCSVCompleto(plantacionesFiltradas, []);
  };


  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800">Reporte de Producción</h1>
                <p className="text-gray-500 mt-1">Análisis detallado de producción por cultivo</p>
              </div>
            </div>

            {/* Botones de exportación mejorados */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportarPDF}
                disabled={loading || plantacionesCompletas.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Download className="w-5 h-5" />
                Exportar PDF
              </button>

              <button
                onClick={handleExportarExcel}
                disabled={loading || plantacionesCompletas.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Download className="w-5 h-5" />
                Exportar Excel
              </button>

              <button
                onClick={handleExportarCSV}
                disabled={loading || plantacionesCompletas.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Download className="w-5 h-5" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* ===== NUEVO: FILTRO POR FECHAS ===== */}
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-gray-600">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="block border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="block border rounded-lg px-3 py-2"
            />
          </div>

          <button
            onClick={() => {
              setFechaInicio("");
              setFechaFin("");
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Limpiar
          </button>
        </div>


        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total de Siembras</p>
                <p className="text-3xl font-bold text-green-600">{totalSiembras}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl">
                <Sprout className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Tipos de Cultivo</p>
                <p className="text-3xl font-bold text-emerald-600">{dataReporte.length}</p>
              </div>
              <div className="p-4 bg-emerald-100 rounded-xl">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Cultivo Principal</p>
                <p className="text-2xl font-bold text-teal-600 truncate">
                  {cultivoMasProductivo?.cultivo || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 mt-1">{cultivoMasProductivo?.total} siembras</p>
              </div>
              <div className="p-4 bg-teal-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de Barras */}
          <div className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Distribución por Cultivo
              </h2>
            </div>
            
            <div className="space-y-4">
              {dataReporte.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-gray-700 truncate">
                    {item.cultivo}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 h-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all duration-500"
                        style={{ width: `${(item.total / totalSiembras) * 100}%` }}
                      >
                        {item.total}
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-gray-600">
                    {((item.total / totalSiembras) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Pastel simulado */}
          <div className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-800">
                Proporción de Siembras
              </h2>
            </div>
            
            <div className="flex flex-col items-center justify-center h-64">
              <div className="relative w-48 h-48 mb-6">
                {dataReporte.map((item, index) => {
                  const startAngle = dataReporte
                    .slice(0, index)
                    .reduce((sum, d) => sum + (d.total / totalSiembras) * 360, 0);
                  const angle = (item.total / totalSiembras) * 360;
                  
                  return (
                    <div
                      key={index}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(from ${startAngle}deg, ${COLORS[index % COLORS.length]} ${angle}deg, transparent 0deg)`,
                      }}
                    />
                  );
                })}
                <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-800">{totalSiembras}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3">
                {dataReporte.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs text-gray-600">{item.cultivo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla detallada */}
        <div className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Resumen Detallado por Cultivo
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cultivo</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Total de siembras</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="text-center py-8 text-gray-500">
                      Cargando...
                    </td>
                  </tr>
                ) : dataReporte.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-8 text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  dataReporte.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="font-medium text-gray-700">{item.cultivo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center bg-green-50 text-green-700 font-semibold px-4 py-1.5 rounded-full">
                          {item.total}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// FUNCIÓN: PREPARAR DATOS COMPLETOS
// ========================================
const prepararDatosCompletos = (plantaciones, huertos) => {
  // Resumen por cultivo
  const resumenCultivos = plantaciones.reduce((acc, p) => {
    const nombre = p.cultivo_nombre || "Sin nombre";
    
    if (!acc[nombre]) {
      acc[nombre] = {
        cultivo: nombre,
        total: 0,
        huertos: new Set(),
        fechas: [],
        estados: {},
        duracionTotal: 0,
        aguaTotal: 0,
        ubicaciones: []
      };
    }
    
    acc[nombre].total += 1;
    acc[nombre].huertos.add(p.huerto_nombre || 'Desconocido');
    acc[nombre].fechas.push(new Date(p.fecha_siembra));
    acc[nombre].estados[p.estado] = (acc[nombre].estados[p.estado] || 0) + 1;
    acc[nombre].duracionTotal += p.duracion_dias || 0;
    acc[nombre].aguaTotal += p.requerimiento_agua_litros || 0;
    acc[nombre].ubicaciones.push(`F${p.fila}C${p.columna}`);
    
    return acc;
  }, {});

  // Convertir a array y calcular promedios
  const datosEnriquecidos = Object.values(resumenCultivos).map(cultivo => {
    const fechasOrdenadas = cultivo.fechas.sort((a, b) => a - b);
    return {
      ...cultivo,
      huertos: Array.from(cultivo.huertos),
      fechaPrimera: fechasOrdenadas[0],
      fechaUltima: fechasOrdenadas[fechasOrdenadas.length - 1],
      duracionPromedio: Math.round(cultivo.duracionTotal / cultivo.total),
      aguaPromedio: Math.round(cultivo.aguaTotal / cultivo.total),
      estadosPorcentaje: Object.entries(cultivo.estados).map(([estado, count]) => ({
        estado,
        porcentaje: ((count / cultivo.total) * 100).toFixed(1)
      }))
    };
  });

  // Resumen por huerto
  const resumenHuertos = plantaciones.reduce((acc, p) => {
    const huerto = p.huerto_nombre || 'Desconocido';
    
    if (!acc[huerto]) {
      acc[huerto] = {
        nombre: huerto,
        totalSiembras: 0,
        cultivos: new Set(),
        ubicaciones: new Set()
      };
    }
    
    acc[huerto].totalSiembras += 1;
    acc[huerto].cultivos.add(p.cultivo_nombre || 'Sin nombre');
    acc[huerto].ubicaciones.add(`${p.fila},${p.columna}`);
    
    return acc;
  }, {});

  const datosHuertos = Object.values(resumenHuertos).map(h => ({
    ...h,
    cultivos: Array.from(h.cultivos),
    diversidad: Array.from(h.cultivos).length
  }));

  // Estadísticas generales
  const stats = {
    totalSiembras: plantaciones.length,
    totalCultivos: datosEnriquecidos.length,
    totalHuertos: datosHuertos.length,
    cultivoMasProductivo: datosEnriquecidos.reduce((max, c) => 
      c.total > max.total ? c : max, datosEnriquecidos[0] || { cultivo: 'N/A', total: 0 }
    ),
    huertoMasActivo: datosHuertos.reduce((max, h) => 
      h.totalSiembras > max.totalSiembras ? h : max, datosHuertos[0] || { nombre: 'N/A', totalSiembras: 0 }
    ),
    fechaGeneracion: new Date().toLocaleString('es-ES')
  };

  return {
    datosEnriquecidos,
    datosHuertos,
    stats
  };
};

// ========================================
// EXPORTAR PDF MEJORADO
// ========================================
export const exportarPDFCompleto = (plantaciones, huertos, nombreUsuario = 'Usuario') => {
  const { datosEnriquecidos, datosHuertos, stats } = prepararDatosCompletos(plantaciones, huertos);
  const doc = new jsPDF();
  let yPos = 20;

  // ===== PORTADA =====
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, 210, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  doc.text('AgroTrack', 105, 25, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'normal');
  doc.text('Reporte de Producción Agrícola', 105, 35, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generado: ${stats.fechaGeneracion}`, 105, 45, { align: 'center' });
  doc.text(`Usuario: ${nombreUsuario}`, 105, 52, { align: 'center' });

  yPos = 70;
  doc.setTextColor(0, 0, 0);

  // ===== RESUMEN EJECUTIVO =====
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Resumen Ejecutivo', 14, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);

  const resumenData = [
    ['Total de Siembras', stats.totalSiembras.toString()],
    ['Tipos de Cultivos', stats.totalCultivos.toString()],
    ['Huertos Activos', stats.totalHuertos.toString()],
    ['Cultivo Más Productivo', `${stats.cultivoMasProductivo.cultivo} (${stats.cultivoMasProductivo.total} siembras)`],
    ['Huerto Más Activo', `${stats.huertoMasActivo.nombre} (${stats.huertoMasActivo.totalSiembras} siembras)`]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: resumenData,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ===== ANÁLISIS POR CULTIVO =====
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Análisis Detallado por Cultivo', 14, yPos);
  yPos += 10;

  const cultivosData = datosEnriquecidos.map(c => [
    c.cultivo,
    c.total.toString(),
    c.huertos.join(', '),
    c.fechaPrimera.toLocaleDateString('es-ES'),
    c.fechaUltima.toLocaleDateString('es-ES'),
    `${c.duracionPromedio} días`,
    `${c.aguaPromedio} L`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Cultivo', 'Siembras', 'Huertos', 'Primera Siembra', 'Última Siembra', 'Duración Prom.', 'Agua Prom.']],
    body: cultivosData,
    theme: 'striped',
    headStyles: { fillColor: [22, 163, 74], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' }
    }
  });

  // ===== ANÁLISIS POR HUERTO =====
  yPos = doc.lastAutoTable.finalY + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Análisis por Huerto', 14, yPos);
  yPos += 10;

  const huertosData = datosHuertos.map(h => [
    h.nombre,
    h.totalSiembras.toString(),
    h.diversidad.toString(),
    h.cultivos.join(', ')
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Huerto', 'Total Siembras', 'Diversidad', 'Cultivos']],
    body: huertosData,
    theme: 'striped',
    headStyles: { fillColor: [22, 163, 74], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 'auto' }
    }
  });

  // ===== RECOMENDACIONES =====
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Recomendaciones y Análisis', 14, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);

  const top3Cultivos = [...datosEnriquecidos]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  doc.text('✓ Cultivos con Mejor Desempeño:', 14, yPos);
  yPos += 7;
  
  top3Cultivos.forEach((c, i) => {
    doc.setFontSize(9);
    doc.text(`   ${i + 1}. ${c.cultivo} - ${c.total} siembras`, 20, yPos);
    yPos += 6;
  });

  yPos += 5;
  doc.setFontSize(10);
  doc.text('✓ Diversificación:', 14, yPos);
  yPos += 7;
  doc.setFontSize(9);
  
  if (stats.totalCultivos < 5) {
    doc.text('   Se recomienda aumentar la diversidad de cultivos para reducir riesgos.', 20, yPos);
  } else {
    doc.text('   Excelente diversificación de cultivos. Se mantiene una buena rotación.', 20, yPos);
  }

  yPos += 10;
  doc.setFontSize(10);
  doc.text('✓ Ocupación de Huertos:', 14, yPos);
  yPos += 7;
  doc.setFontSize(9);
  
  const huertoMenosUtilizado = datosHuertos.reduce((min, h) => 
    h.totalSiembras < min.totalSiembras ? h : min, datosHuertos[0]
  );
  
  doc.text(`   El huerto "${huertoMenosUtilizado.nombre}" tiene menor ocupación (${huertoMenosUtilizado.totalSiembras} siembras).`, 20, yPos);
  yPos += 6;
  doc.text('   Considere optimizar su uso o planificar nuevas siembras.', 20, yPos);

  // ===== PIE DE PÁGINA =====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `AgroTrack - Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`AgroTrack_Reporte_Produccion_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ========================================
// EXPORTAR EXCEL MEJORADO
// ========================================
export const exportarExcelCompleto = (plantaciones, huertos) => {
  const { datosEnriquecidos, datosHuertos, stats } = prepararDatosCompletos(plantaciones, huertos);
  
  const libro = XLSX.utils.book_new();

  // ===== HOJA 1: RESUMEN EJECUTIVO =====
  const resumenData = [
    ['AGROTRACK - REPORTE DE PRODUCCIÓN'],
    [''],
    ['Fecha de Generación:', stats.fechaGeneracion],
    [''],
    ['RESUMEN EJECUTIVO'],
    ['Total de Siembras:', stats.totalSiembras],
    ['Tipos de Cultivos:', stats.totalCultivos],
    ['Huertos Activos:', stats.totalHuertos],
    ['Cultivo Más Productivo:', stats.cultivoMasProductivo.cultivo, stats.cultivoMasProductivo.total],
    ['Huerto Más Activo:', stats.huertoMasActivo.nombre, stats.huertoMasActivo.totalSiembras]
  ];

  const hojaResumen = XLSX.utils.aoa_to_sheet(resumenData);
  
  // Estilos para el resumen
  hojaResumen['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

  // ===== HOJA 2: ANÁLISIS POR CULTIVO =====
  const cultivosExcel = datosEnriquecidos.map(c => ({
    'Cultivo': c.cultivo,
    'Total Siembras': c.total,
    'Huertos': c.huertos.join(', '),
    'Primera Siembra': c.fechaPrimera.toLocaleDateString('es-ES'),
    'Última Siembra': c.fechaUltima.toLocaleDateString('es-ES'),
    'Duración Promedio (días)': c.duracionPromedio,
    'Agua Promedio (L)': c.aguaPromedio,
    'Estados': Object.entries(c.estados).map(([e, count]) => `${e}: ${count}`).join(', ')
  }));

  const hojaCultivos = XLSX.utils.json_to_sheet(cultivosExcel);
  hojaCultivos['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(libro, hojaCultivos, 'Análisis por Cultivo');

  // ===== HOJA 3: ANÁLISIS POR HUERTO =====
  const huertosExcel = datosHuertos.map(h => ({
    'Huerto': h.nombre,
    'Total Siembras': h.totalSiembras,
    'Diversidad de Cultivos': h.diversidad,
    'Cultivos': h.cultivos.join(', ')
  }));

  const hojaHuertos = XLSX.utils.json_to_sheet(huertosExcel);
  hojaHuertos['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 50 }
  ];

  XLSX.utils.book_append_sheet(libro, hojaHuertos, 'Análisis por Huerto');

  // ===== HOJA 4: DETALLE COMPLETO =====
  const detalleCompleto = plantaciones.map(p => ({
    'ID': p.id,
    'Cultivo': p.cultivo_nombre || 'Sin nombre',
    'Huerto': p.huerto_nombre || 'Desconocido',
    'Fila': p.fila,
    'Columna': p.columna,
    'Ubicación': `F${p.fila}C${p.columna}`,
    'Fecha Siembra': new Date(p.fecha_siembra).toLocaleDateString('es-ES'),
    'Estado': p.estado,
    'Duración (días)': p.duracion_dias || 'N/A',
    'Agua (L)': p.requerimiento_agua_litros || 'N/A'
  }));

  const hojaDetalle = XLSX.utils.json_to_sheet(detalleCompleto);
  hojaDetalle['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 20 },
    { wch: 8 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Detalle Completo');

  XLSX.writeFile(libro, `AgroTrack_Reporte_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ========================================
// EXPORTAR CSV MEJORADO
// ========================================
export const exportarCSVCompleto = (plantaciones, huertos) => {
  const { datosEnriquecidos, stats } = prepararDatosCompletos(plantaciones, huertos);

  const lineas = [
    'AGROTRACK - REPORTE DE PRODUCCIÓN',
    `Fecha de Generación: ${stats.fechaGeneracion}`,
    '',
    'RESUMEN EJECUTIVO',
    `Total de Siembras: ${stats.totalSiembras}`,
    `Tipos de Cultivos: ${stats.totalCultivos}`,
    `Huertos Activos: ${stats.totalHuertos}`,
    `Cultivo Más Productivo: ${stats.cultivoMasProductivo.cultivo} (${stats.cultivoMasProductivo.total} siembras)`,
    '',
    'ANÁLISIS POR CULTIVO',
    'Cultivo,Total Siembras,Huertos,Primera Siembra,Última Siembra,Duración Promedio (días),Agua Promedio (L)',
    ...datosEnriquecidos.map(c => 
      `${c.cultivo},${c.total},"${c.huertos.join('; ')}",${c.fechaPrimera.toLocaleDateString('es-ES')},${c.fechaUltima.toLocaleDateString('es-ES')},${c.duracionPromedio},${c.aguaPromedio}`
    ),
    '',
    'DETALLE COMPLETO DE PLANTACIONES',
    'ID,Cultivo,Huerto,Fila,Columna,Fecha Siembra,Estado,Duración (días),Agua (L)',
    ...plantaciones.map(p => 
      `${p.id},${p.cultivo_nombre || 'Sin nombre'},${p.huerto_nombre || 'Desconocido'},${p.fila},${p.columna},${new Date(p.fecha_siembra).toLocaleDateString('es-ES')},${p.estado},${p.duracion_dias || 'N/A'},${p.requerimiento_agua_litros || 'N/A'}`
    )
  ];

  const contenido = lineas.join('\n');
  const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AgroTrack_Reporte_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};