import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppDataContext.jsx";
import { EMPTY_FILTERS } from "../lib/constants.js";
import { matchDish, passesFilters } from "../lib/search.js";
import { ErrorState, LoadingState } from "../components/AsyncState.jsx";
import DishCard from "../components/DishCard.jsx";
import DishModal from "../components/DishModal.jsx";
import Filters from "../components/Filters.jsx";
import MapPanel from "../components/MapPanel.jsx";

export default function HomePage() {
  const { dishes, restaurants, loading, error, refresh } = useAppData();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("top");
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = Number(searchParams.get("dish")) || null;

  const organicResults = useMemo(() => {
    const results = dishes.filter((dish) => !dish.sponsored && passesFilters(dish, filters) && matchDish(dish, query).matches);
    if (sort === "top") results.sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount);
    if (sort === "price") results.sort((a, b) => a.price - b.price || b.score - a.score);
    if (sort === "count") results.sort((a, b) => b.ratingCount - a.ratingCount || b.score - a.score);
    return results;
  }, [dishes, filters, query, sort]);

  const sponsored = dishes.find((dish) => dish.sponsored && passesFilters(dish, filters) && matchDish(dish, query).matches);
  const activeFilters = filters.diets.length + filters.allergens.length;
  const openDish = dishes.find((dish) => dish.id === openId);

  function setOpenDish(id) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("dish", id);
    else next.delete("dish");
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow hero-eyebrow">Dish-level recommendations for Oxford</p>
        <h1 className="hero-title">Find the dish,<br />not just the restaurant.</h1>
        <p className="hero-sub">Honest ratings from Oxford diners. Search a dish, place, area or craving — Plate tells you where it’s best.</p>
        <div className="search-wrap">
          <input
            className="search"
            placeholder="Katsu curry, Cowley Road, sweet and spicy…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search dishes, restaurants, cuisines, areas and descriptors"
          />
          <p className="search-hint">Try multiple descriptors: connective words such as “and” and “with” are ignored.</p>
        </div>
      </section>

      {loading ? <LoadingState label="Finding Oxford’s best dishes…" /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <>
          <div className="controls">
            <button className={`chip ${showFilters || activeFilters ? "chip-on" : ""}`} type="button" onClick={() => setShowFilters((value) => !value)}>
              Filters{activeFilters ? ` · ${activeFilters}` : ""}
            </button>
            <div className="sorts" aria-label="Sort dishes">
              {[["top", "Top rated"], ["price", "Cheapest"], ["count", "Most rated"]].map(([key, label]) => (
                <button key={key} type="button" className={`sort-btn ${sort === key ? "sort-on" : ""}`} onClick={() => setSort(key)}>{label}</button>
              ))}
            </div>
          </div>

          {showFilters && <Filters filters={filters} onChange={setFilters} />}
          <MapPanel restaurants={restaurants} />

          <main className="grid">
            {sponsored && <DishCard dish={sponsored} onOpen={setOpenDish} />}
            {organicResults.map((dish) => <DishCard key={dish.id} dish={dish} onOpen={setOpenDish} />)}
            {organicResults.length === 0 && !sponsored && (
              <div className="empty">
                <p className="empty-title">Nothing matches every part of that craving.</p>
                <p>Try fewer descriptors, remove a filter or search a broader area.</p>
              </div>
            )}
          </main>
        </>
      )}

      {openDish && <DishModal dish={openDish} onClose={() => setOpenDish(null)} />}
    </>
  );
}
