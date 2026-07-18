import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCatalog } from "../lib/api.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [dishes, setDishes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const catalog = await fetchCatalog();
      setDishes(catalog.dishes);
      setRestaurants(catalog.restaurants);
    } catch (nextError) {
      setError(nextError.message || "Plate could not load its menu right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ dishes, restaurants, loading, error, refresh }), [dishes, restaurants, loading, error, refresh]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider.");
  return value;
}
