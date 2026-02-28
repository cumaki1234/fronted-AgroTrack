import './App.css'

import { Routes, Route } from "react-router-dom";
import Login from "./Paginas/Login";
import Register from "./Paginas/Register";
import Dashboard from "./Paginas/Dashboard";
import Profile from "./Paginas/Profile";
import Huertos from "./Paginas/Huertos";
import Simulador from "./Paginas/Simulador";
import Reportes from "./Paginas/Reportes";
import Actividades from "./Paginas/Actividades";
import Sidebar from "./Componentes/Sidebar";
import Cultivos from "./Paginas/Cultivos"
import PrivateRoute from "./components/PrivateRoute";
import HuertoDetalle from "./Paginas/HuertoDetalle";
import { AuthProvider } from "./context/AuthContext";
import { HuertoProvider } from "./context/HuertoContext";

function App() {
  return (
    <AuthProvider>
      <HuertoProvider>
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rutas privadas */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <div className="flex w-full min-h-screen">
              <Sidebar />
              <div className="flex-1 bg-gray-50">
                <Dashboard />
              </div>
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <div className="flex">
              <Sidebar />
              <Profile />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/huertos"
        element={
          <PrivateRoute>
            <div className="flex">
              <Sidebar />
              <Huertos />
            </div>
          </PrivateRoute>
        }
      />
      <Route path="/huerto/:id" element={<HuertoDetalle />} />
      <Route
        path="/simulador"
        element={
          <PrivateRoute>
            <div className="flex">
              <Sidebar />
              <Simulador />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/reportes"
        element={
          <PrivateRoute>
            <div className="flex">
              <Sidebar />
              <Reportes />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/actividades"
        element={
          <PrivateRoute>
            <div className="flex">
              <Sidebar />
              <Actividades />
            </div>
          </PrivateRoute>
        }
      />

      <Route
        path="/cultivos"
        element={
          <PrivateRoute>
            <div className="flex">
              <Sidebar />
              <Cultivos />
            </div>
          </PrivateRoute>
        }
      />
    </Routes>
    </HuertoProvider>
    </AuthProvider>
  );
}

export default App;
