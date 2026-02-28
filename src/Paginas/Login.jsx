import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/usuarios/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.access);  
        navigate("/dashboard");
      } else {
        alert("Credenciales incorrectas");
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
      console.error(error);
    }

    setLoading(false);
  };


  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* Sección izquierda con imagen */}
      <div className="hidden md:flex items-center justify-center bg-green-600">
        <h1 className="text-5xl font-bold text-white text-center px-10">
          AgroTrack <br /> Gestiona tus cultivos urbanos
        </h1>
      </div>

      {/* Sección derecha con formulario */}
      <div className="flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-center text-green-700 mb-4">
            Iniciar Sesión
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 
                  border border-gray-300 
                  rounded-xl 
                  text-gray-800 
                  placeholder-gray-400 
                  focus:outline-none 
                  focus:ring-2 focus:ring-green-400 
                  focus:border-green-500
                  bg-white"
              />
            </div>

            {/* Contraseña */}
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 
                  border border-gray-300 
                  rounded-xl 
                  text-gray-800 
                  placeholder-gray-400 
                  focus:outline-none 
                  focus:ring-2 focus:ring-green-400 
                  focus:border-green-500
                  bg-white"
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition"
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <Link
                to="/register"
                className="text-green-700 font-bold hover:underline"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
