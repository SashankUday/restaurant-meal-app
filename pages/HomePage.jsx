import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppDataContext.jsx";
import { groupCityDishes } from "../lib/catalog.js";
import { countActiveConstraints, EMPTY_FILTERS } from "../lib/constants.js";
import { filterHomepageDishes, pickRandomFeatured, restaurantsForDishes, sortDishesByPrice, tokenizeQuery } from "../lib/search.js";
import { ErrorState, LoadingState } from "../components/AsyncState.jsx";
import DishCard from "../components/DishCard.jsx";
import DishModal from "../components/DishModal.jsx";
import Filters from "../components/Filters.jsx";
import MapPanel from "../components/MapPanel.jsx";
import RestaurantCard from "../components/RestaurantCard.jsx";

const CATALOGUE_CITY = "Oxford";

export default function HomePage() {
  const { dishes, restaurants, loading, error, refresh } = useAppData();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("dishes");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("top");
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = Number(searchParams.get("dish")) || null;
  const groupedDishes = useMemo(() => groupCityDishes(dishes, CATALOGUE_CITY), [dishes]);

  const matchingDishes = useMemo(
    () => filterHomepageDishes(groupedDishes, filters, query),
    [groupedDishes, filters, query],
  );

  const [featuredCount] = useState(() => 20 + Math.floor(Math.random() * 11));
  const isBrowsing = !query.trim() && sort === "top";

  const organicResults = useMemo(() => {
    const results = matchingDishes.filter((dish) => !dish.sponsored);
    // Score-weighted randomisation runs for every "top" result set, not just an
    // empty browse — higher-rated dishes still surface more often, but the order
    // isn't deterministic every time. An empty browse keeps the featured cap;
    // an actual query shows all its matches in weighted-random order.
    if (sort === "top") return pickRandomFeatured(results, { count: isBrowsing ? featuredCount : results.length });
    if (sort === "price") return sortDishesByPrice(results);
    if (sort === "count") results.sort((a, b) => b.ratingCount - a.ratingCount || b.score - a.score);
    return results;
  }, [matchingDishes, sort, isBrowsing, featuredCount]);

  const sponsored = matchingDishes.find((dish) => (
    dish.sponsored
    && (sort !== "price" || dish.price !== null)
  ));
  const mapDishes = useMemo(
    () => sort === "price" ? matchingDishes.filter((dish) => dish.price !== null) : matchingDishes,
    [matchingDishes, sort],
  );
  const matchingRestaurants = useMemo(
    () => restaurantsForDishes(restaurants, mapDishes),
    [restaurants, mapDishes],
  );
  const activeFilters = filters.diets.length + filters.allergens.length
    + (filters.course ? 1 : 0) + (filters.mealTime && filters.mealTime !== "any" ? 1 : 0)
    + countActiveConstraints(filters.constraints);
  const openDish = matchingDishes.find((dish) => dish.id === openId);

  const restaurantResults = useMemo(() => {
    const inCity = restaurants.filter((restaurant) => (restaurant.city || "").toLowerCase() === CATALOGUE_CITY.toLowerCase());
    const tokens = tokenizeQuery(query);
    const matched = !tokens.length ? inCity : inCity.filter((restaurant) => {
      const haystack = [restaurant.name, restaurant.brandName, restaurant.chainName, restaurant.area, restaurant.cuisine]
        .filter(Boolean).join(" ").toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
    return [...matched].sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount);
  }, [restaurants, query]);

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
          <div className="sorts search-mode" aria-label="Search dishes or restaurants">
            <button type="button" className={`sort-btn ${searchMode === "dishes" ? "sort-on" : ""}`} onClick={() => setSearchMode("dishes")}>Dishes</button>
            <button type="button" className={`sort-btn ${searchMode === "restaurants" ? "sort-on" : ""}`} onClick={() => setSearchMode("restaurants")}>Restaurants</button>
          </div>
          <input
            className="search"
            placeholder={searchMode === "restaurants" ? "Oli’s Thai, Cowley Road, Japanese…" : "Katsu curry, Cowley Road, sweet and spicy…"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={searchMode === "restaurants" ? "Search restaurants, cuisines and areas" : "Search dishes, restaurants, cuisines, areas and descriptors"}
          />
          <p className="search-hint">Try multiple descriptors: connective words such as “and” and “with” are ignored.</p>
        </div>
      </section>

      {loading ? <LoadingState label="Finding Oxford’s best dishes…" /> : error ? <ErrorState message={error} onRetry={refresh} /> : searchMode === "restaurants" ? (
        <main className="grid">
          {restaurantResults.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}
          {restaurantResults.length === 0 && (
            <div className="empty">
              <p className="empty-title">No Oxford restaurants match that search.</p>
              <p>Try a shorter search, a cuisine, or an area name.</p>
            </div>
          )}
        </main>
      ) : (
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
          <MapPanel restaurants={matchingRestaurants} />

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

      {openDish && <DishModal key={`${openDish.city}-${openDish.canonicalDishId}`} dish={openDish} onClose={() => setOpenDish(null)} />}
    </>
  );
}
