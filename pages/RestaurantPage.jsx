import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { isDishCurrentlyAvailable } from "../lib/catalog.js";
import { countActiveConstraints, COURSES, EMPTY_FILTERS, formatCourse } from "../lib/constants.js";
import { passesFilters, sortDishesByPrice } from "../lib/search.js";
import { ErrorState, LoadingState } from "../components/AsyncState.jsx";
import DishCard from "../components/DishCard.jsx";
import DishModal from "../components/DishModal.jsx";
import Filters from "../components/Filters.jsx";
import PlateScore from "../components/PlateScore.jsx";
import RestaurantEditForm from "../components/RestaurantEditForm.jsx";

export default function RestaurantPage() {
  const { id } = useParams();
  const restaurantId = Number(id);
  const { canEdit } = useAuth();
  const { dishes, restaurants, loading, error, refresh } = useAppData();
  const [sort, setSort] = useState("rating");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = Number(searchParams.get("dish")) || null;
  const restaurant = restaurants.find((item) => item.id === restaurantId);

  const visibleDishes = useMemo(() => {
    const next = dishes.filter((dish) => (
      dish.restaurantId === restaurantId
      && isDishCurrentlyAvailable(dish)
      && passesFilters(dish, filters)
    ));
    if (sort === "rating") next.sort((a, b) => b.score - a.score || b.ratingCount - a.ratingCount);
    if (sort === "price") return sortDishesByPrice(next);
    if (sort === "menu") next.sort((a, b) => COURSES.indexOf(a.course) - COURSES.indexOf(b.course) || a.menuPosition - b.menuPosition);
    return next;
  }, [dishes, filters, restaurantId, sort]);

  function setOpenDish(dishId) {
    const next = new URLSearchParams(searchParams);
    if (dishId) next.set("dish", dishId);
    else next.delete("dish");
    setSearchParams(next, { replace: true });
  }

  if (loading) return <LoadingState label="Opening the menu…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!restaurant) {
    return (
      <div className="status-card">
        <p className="empty-title">Restaurant not found.</p>
        <Link className="btn-quiet link-button" to="/">Back to Plate</Link>
      </div>
    );
  }

  const activeFilters = filters.diets.length + filters.allergens.length
    + (filters.course ? 1 : 0) + (filters.mealTime && filters.mealTime !== "any" ? 1 : 0)
    + countActiveConstraints(filters.constraints);
  const openDish = dishes.find((dish) => dish.id === openId && dish.restaurantId === restaurantId);

  return (
    <>
      <section className="restaurant-hero">
        <Link className="back-link" to="/">← All dishes</Link>
        <div className="restaurant-heading">
          <div>
            <p className="eyebrow">{[restaurant.cuisine, restaurant.branchName, restaurant.area].filter(Boolean).join(" · ")}</p>
            <h1>{restaurant.name}</h1>
            {restaurant.brandName && restaurant.brandName !== restaurant.name && <p className="restaurant-chain">Part of {restaurant.brandName}</p>}
            <p>{restaurant.description}</p>
            {canEdit && !editingRestaurant && (
              <button type="button" className="btn-quiet" onClick={() => setEditingRestaurant(true)}>Edit restaurant</button>
            )}
            {editingRestaurant && (
              <RestaurantEditForm
                restaurant={restaurant}
                onSaved={refresh}
                onClose={() => setEditingRestaurant(false)}
              />
            )}
          </div>
          <div className="restaurant-score">
            <PlateScore score={restaurant.score} size={86} ratingCount={restaurant.ratingCount} />
            <span>{restaurant.ratingCount.toLocaleString()} dish ratings</span>
          </div>
        </div>
      </section>

      <div className="controls restaurant-controls">
        <button className={`chip ${showFilters || activeFilters ? "chip-on" : ""}`} type="button" onClick={() => setShowFilters((value) => !value)}>
          Filters{activeFilters ? ` · ${activeFilters}` : ""}
        </button>
        <div className="sorts" aria-label="Choose menu order">
          {[["rating", "Top rated"], ["price", "Price"], ["menu", "Menu order"]].map(([key, label]) => (
            <button key={key} type="button" className={`sort-btn ${sort === key ? "sort-on" : ""}`} onClick={() => setSort(key)}>{label}</button>
          ))}
        </div>
      </div>
      {showFilters && <Filters filters={filters} onChange={setFilters} />}

      {sort === "menu" ? (
        <main className="menu-sections">
          {COURSES.map((course) => {
            const courseDishes = visibleDishes.filter((dish) => dish.course === course);
            if (!courseDishes.length) return null;
            return (
              <section key={course}>
                <div className="course-heading"><span>{formatCourse(course)}</span><span>{courseDishes.length}</span></div>
                <div className="grid menu-grid">{courseDishes.map((dish) => <DishCard key={dish.id} dish={dish} onOpen={setOpenDish} />)}</div>
              </section>
            );
          })}
        </main>
      ) : (
        <main className="grid restaurant-grid">
          {visibleDishes.map((dish) => <DishCard key={dish.id} dish={dish} onOpen={setOpenDish} />)}
        </main>
      )}

      {visibleDishes.length === 0 && (
        <div className="empty"><p className="empty-title">No menu items pass those filters.</p><p>Remove a dietary or allergen filter to see more of the menu.</p></div>
      )}
      <p className="allergen-page-note">Allergen information is provided by the restaurant. Always confirm with staff before ordering.</p>
      {openDish && <DishModal key={openDish.id} dish={openDish} initialDishId={openDish.id} onClose={() => setOpenDish(null)} />}
    </>
  );
}
