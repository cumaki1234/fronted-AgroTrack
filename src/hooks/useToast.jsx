import { useState, useCallback } from "react";

export function useToast() {
  const [msgs, setMsgs] = useState([]);

  const show = useCallback((m, tipo = "ok") => {
    const id = Date.now() + Math.random();
    setMsgs(p => [...p, { id, m, tipo }]);
    setTimeout(() => setMsgs(p => p.filter(x => x.id !== id)), 4000);
  }, []);

  const Toast = (
    <div className="fixed top-16 right-4 z-[20000] flex flex-col gap-2 pointer-events-none">
      {msgs.map(({ id, m, tipo }) => (
        <div key={id} className={`text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl
          ${tipo === "error" ? "bg-red-600" : tipo === "warn" ? "bg-amber-500" : "bg-gray-900"}`}>
          {m}
        </div>
      ))}
    </div>
  );

  return { show, Toast };
}
