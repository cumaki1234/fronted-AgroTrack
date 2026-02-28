import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-green-700 text-white p-6 flex flex-col">
      <h2 className="text-2xl font-bold mb-6">AgroTrack</h2>

      <nav className="flex flex-col space-y-3 flex-1 overflow-y-auto">
        <Link to="/dashboard" className="hover:bg-green-600 p-2 rounded">
          Dashboard
        </Link>
        <Link to="/huertos" className="hover:bg-green-600 p-2 rounded">
          Huertos
        </Link>
        <Link to="/simulador" className="hover:bg-green-600 p-2 rounded">
          Simulador
        </Link>
        <Link to="/actividades" className="hover:bg-green-600 p-2 rounded">
          Actividades
        </Link>
        <Link to="/reportes" className="hover:bg-green-600 p-2 rounded">
          Reportes
        </Link>
       <Link to="/profile" className="hover:bg-green-600 p-2 rounded">
          Perfil
        </Link>
        <Link to="/cultivos" className="hover:bg-green-600 p-2 rounded">
          Cultivos
        </Link>
      </nav>
    </aside>
  );
}
