import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { token } = useAuth();

  // Si NO esta logueado → redirigir a /login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si está logueado → permitir acceso
  return children;
}
