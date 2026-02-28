import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const HuertoContext = createContext();

export function HuertoProvider({ children }) {
  const { token } = useAuth();

  const [huertos, setHuertos] = useState([]);
  const [huertoId, setHuertoId] = useState(null);
  const [loadingHuertos, setLoadingHuertos] = useState(true);

  // 🔥 HACEMOS FETCH REUTILIZABLE
  const fetchHuertos = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingHuertos(true);

      const res = await axios.get(
        "http://localhost:8000/api/huertos/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setHuertos(res.data);

      if (res.data.length > 0 && !huertoId) {
        setHuertoId(res.data[0].id);
      }

    } catch (err) {
      console.error("Error huertos:", err);
      setHuertos([]);
    } finally {
      setLoadingHuertos(false);
    }
  }, [token, huertoId]);

  // 🔥 ahora el useEffect usa esa función
  useEffect(() => {
    fetchHuertos();
  }, [fetchHuertos]);

  return (
    <HuertoContext.Provider
      value={{
        huertos,
        setHuertos,     
        huertoId,
        setHuertoId,
        loadingHuertos,
        fetchHuertos,   
      }}
    >
      {children}
    </HuertoContext.Provider>
  );
}

export function useHuerto() {
  return useContext(HuertoContext);
}