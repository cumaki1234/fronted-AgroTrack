import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
    notification,
  Popconfirm
} from "antd";
import { PlusOutlined, UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { Leaf, Plus, Search, Droplets, Clock, Trash2, Upload, X } from "lucide-react";


export default function CatalogoCultivos() {
  const [cultivos, setCultivos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [preview, setPreview] = useState(null);

  const cultivosPorPagina = 6;
    const [formData, setFormData] = useState({
      nombre: "",
      descripcion: "",
      duracion_dias: "",
      requerimiento_agua_litros: "",
    });

  const API = import.meta.env.VITE_API_URL;


  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [imagen, setImagen] = useState(null);

  // 🔹 Cargar cultivos
  const cargarCultivos = async () => {
    const res = await fetch(`${API}/cultivos/`);
    const data = await res.json();
    setCultivos(data);
  };

  useEffect(() => {
    cargarCultivos();
  }, []);

  // 🔹 Crear cultivo
 const crearCultivo = async () => {
  const formDataToSend = new FormData();

  Object.keys(formData).forEach((key) => {
    formDataToSend.append(key, formData[key]);
  });

  if (imagen) {
    formDataToSend.append("imagen", imagen);
  }

  const res = await fetch(`${API}/cultivos/`, {
    method: "POST",
    body: formDataToSend,
  });

  if (res.ok) {
    notification.success({ message: "Cultivo agregado correctamente" });

    setModalVisible(false);
    setFormData({
      nombre: "",
      descripcion: "",
      duracion_dias: "",
      requerimiento_agua_litros: "",
    });
    setImagen(null);
    setPreview(null);
    cargarCultivos();
  } else {
    notification.error({ message: "Error al crear cultivo" });
  }
};


  // 🔹 Eliminar cultivo
  const eliminarCultivo = async (id) => {
    await fetch(`${API}/cultivos/${id}/`, {
      method: "DELETE",
    });
    notification.success({ message: "Cultivo eliminado" });
    cargarCultivos();
  };

  // 🔹 Filtros + paginación
  const filtrados = cultivos.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const indexUltimo = paginaActual * cultivosPorPagina;
  const indexPrimero = indexUltimo - cultivosPorPagina;
  const cultivosPaginados = filtrados.slice(indexPrimero, indexUltimo);
  const totalPaginas = Math.ceil(filtrados.length / cultivosPorPagina);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800">
                  Catálogo de Cultivos
                </h1>
                <p className="text-gray-500 mt-1">
                  Gestiona tu biblioteca de plantas
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalVisible(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 duration-200 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Agregar cultivo
            </button>
          </div>
        </div>

        {/* Buscador mejorado */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cultivo por nombre..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all text-gray-800 font-medium shadow-sm"
            />
          </div>
        </div>

        {/* Grid de cultivos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {cultivosPaginados.map((cultivo) => (
            <div
              key={cultivo.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-green-300 transition-all duration-300 group flex flex-col h-[380px]"
            >
              {/* Imagen */}
              <div className="relative w-full h-48 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center overflow-hidden">
                {cultivo.imagen ? (
                          <img
                            src={
                              cultivo.imagen.startsWith("http")
                                ? cultivo.imagen
                                : `${API}${cultivo.imagen}`
                            }
                            alt={cultivo.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (

                  <div className="flex flex-col items-center justify-center text-green-600">
                    <Leaf className="w-16 h-16 mb-2 opacity-50" />
                    <span className="text-sm text-gray-500">Sin imagen</span>
                  </div>
                )}
                <div className="absolute top-3 right-3 px-3 py-1 bg-white bg-opacity-90 backdrop-blur-sm rounded-full text-xs font-bold text-green-700 shadow-md">
                  #{cultivo.id}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {cultivo.nombre}
                  </h2>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {cultivo.descripcion || "Sin descripción"}
                  </p>

                  {/* Estadísticas */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Duración: <span className="font-bold text-blue-700">{cultivo.duracion_dias} días</span></span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-cyan-50 p-2 rounded-lg">
                      <Droplets className="w-4 h-4 text-cyan-600" />
                      <span>Agua: <span className="font-bold text-cyan-700">{cultivo.requerimiento_agua_litros} L</span></span>
                    </div>
                  </div>
                </div>

                {/* Botón eliminar */}
               <Popconfirm
                  title="Eliminar cultivo"
                  description="Esta acción no se puede deshacer"
                  onConfirm={() => eliminarCultivo(cultivo.id)}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 
                              bg-white border-2 border-red-200 text-red-600 
                              rounded-xl hover:bg-red-50 hover:border-red-400 
                              transition-all font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </Popconfirm>

              </div>
            </div>
          ))}
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual(paginaActual - 1)}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <div className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg font-bold">
              Página {paginaActual} de {totalPaginas}
            </div>

            <button
              disabled={paginaActual === totalPaginas}
              onClick={() => setPaginaActual(paginaActual + 1)}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Modal Agregar Cultivo */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-xl">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-white">Agregar nuevo cultivo</h2>
              </div>
              <button
                onClick={() => {
                  setModalVisible(false);
                  setFormData({
                    nombre: "",
                    descripcion: "",
                    duracion_dias: "",
                    requerimiento_agua_litros: "",
                  });
                  setImagen(null);
                  setPreview(null);
                }}

                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-5">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Nombre del cultivo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lechuga Romana"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                  />
                </div>

                {/* Duración y Agua */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Duración (días) *
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 30"
                      value={formData.duracion_dias}
                      onChange={(e) => setFormData({ ...formData, duracion_dias: e.target.value })}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Agua requerida (L)
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 10"
                      value={formData.requerimiento_agua_litros}
                      onChange={(e) => setFormData({ ...formData, requerimiento_agua_litros: e.target.value })}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                      min="0"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Descripción
                  </label>
                  <textarea
                    placeholder="Información adicional del cultivo..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={4}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all resize-none"
                  />
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Imagen del cultivo
                  </label>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-green-500 transition-all">
                    <div className="flex flex-col items-center justify-center gap-3">

                      {/* PREVIEW */}
                      {preview ? (
                        <div className="relative">
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-40 h-40 object-cover rounded-xl shadow"
                          />
                          <button
                            onClick={() => {
                              setImagen(null);
                              setPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">
                            Haz clic para subir una imagen
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG o JPG (máx. 10MB)
                          </p>
                        </>
                      )}

                      {/* INPUT FILE */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setImagen(file);
                            setPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                        id="file-upload"
                      />

                      {!preview && (
                        <label
                          htmlFor="file-upload"
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all cursor-pointer font-medium"
                        >
                          Seleccionar archivo
                        </label>
                      )}

                      {imagen && (
                        <span className="text-xs text-green-600 mt-2">
                          ✔ Imagen seleccionada: {imagen.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer del Modal */}
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                  onClick={() => {
                    setModalVisible(false);
                    setImagen(null);
                    setPreview(null);
                  }}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl"
                >
                  Cancelar
                </button>

              <button
                onClick={crearCultivo}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                Guardar cultivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
