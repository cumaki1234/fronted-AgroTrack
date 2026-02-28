const Perfil = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 w-full">
      {/* Encabezado */}
      <div className="flex items-center gap-6 border-b pb-6">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold">
          U
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-gray-800">
            Usuario
          </h2>
          <p className="text-gray-500">
            usuario@ejemplo.com
          </p>
        </div>

        <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          Editar perfil
        </button>
      </div>

      {/* Información del perfil */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div>
          <p className="text-sm text-gray-500">Nombre completo</p>
          <p className="text-gray-800 font-medium">Usuario Ejemplo</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Correo electrónico</p>
          <p className="text-gray-800 font-medium">usuario@ejemplo.com</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Rol</p>
          <p className="text-gray-800 font-medium">Administrador</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Fecha de registro</p>
          <p className="text-gray-800 font-medium">10/12/2025</p>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
