import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { isDishCurrentlyAvailable } from "../lib/catalog.js";
import { fetchMealHistory } from "../lib/api.js";
import { tokenizeQuery } from "../lib/search.js";
import AccountSignIn from "../components/AccountSignIn.jsx";
import { LoadingState } from "../components/AsyncState.jsx";
import MealForm from "../components/MealForm.jsx";
import PlateScore from "../components/PlateScore.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";

const DISH_GROUP_ORDER = ["Mains", "Sides & drinks"];

function formatVisitDate(value) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function MealHistoryCard({ meal }) {
  return (
    <article className="meal-history-card">
      <div className="meal-history-main">
        <div>
          <p className="eyebrow">{formatVisitDate(meal.visitedAt)}</p>
          <h3><Link to={`/restaurant/${meal.restaurant.id}?dish=${meal.dish.id}`}>{meal.dish.name}</Link></h3>
          <p className="dish-where"><Link to={`/restaurant/${meal.restaurant.id}`}>{meal.restaurant.name}</Link> · {meal.restaurant.area}</p>
        </div>
        <PlateScore score={meal.score} />
      </div>
      {meal.comment && <p className="meal-comment">“{meal.comment}”</p>}
      {meal.wouldOrderAgain !== null && (
        <div className="meal-breakdown-row">
          <span>Order again <strong>{meal.wouldOrderAgain ? "Yes" : "No"}</strong></span>
        </div>
      )}
      {meal.tags.length > 0 && <div className="tag-row">{meal.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
      {meal.photos.length > 0 && (
        <div className="history-photo-row">
          {meal.photos.map((photo) => photo.url && <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`${meal.dish.name} from this visit`} /></a>)}
        </div>
      )}
    </article>
  );
}

export default function MePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { dishes, restaurants, loading: dataLoading } = useAppData();
  const [meals, setMeals] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [searchMode, setSearchMode] = useState("restaurant");
  const [query, setQuery] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedDishId, setSelectedDishId] = useState("");
  const [mealSaved, setMealSaved] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      setMeals(await fetchMealHistory(user.id));
    } catch (error) {
      setHistoryError(error.message || "Your meal history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const restaurantDishes = useMemo(() => dishes.filter((dish) => (
    dish.restaurantId === Number(selectedRestaurantId) && isDishCurrentlyAvailable(dish)
  )), [dishes, selectedRestaurantId]);
  const selectedDish = dishes.find((dish) => dish.id === Number(selectedDishId));

  useEffect(() => {
    if (!restaurantDishes.some((dish) => String(dish.id) === selectedDishId)) {
      setSelectedDishId(restaurantDishes[0] ? String(restaurantDishes[0].id) : "");
    }
  }, [restaurantDishes, selectedDishId]);

  const filteredMeals = useMemo(() => {
    const tokens = tokenizeQuery(query);
    if (!tokens.length) return meals;
    return meals.filter((meal) => {
      const field = searchMode === "restaurant" ? meal.restaurant.name : meal.dish.name;
      const normalisedField = field.toLowerCase();
      return tokens.every((token) => normalisedField.includes(token));
    });
  }, [meals, query, searchMode]);

  if (authLoading || dataLoading) return <LoadingState label="Opening My Meals…" />;

  if (!user) {
    return (
      <main className="me-page signed-out-page">
        <div className="page-intro me-intro">
          <p className="eyebrow">Your private food diary</p>
          <h1>Remember every plate.</h1>
          <p>Save what you ordered, how it tasted and the photos that bring the meal back.</p>
        </div>
        <AccountSignIn />
      </main>
    );
  }

  return (
    <main className="me-page">
      <section className="me-header">
        <div>
          <p className="eyebrow">My Meals</p>
          <h1>Your table, remembered.</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <button type="button" className="btn-quiet" onClick={signOut}>Sign out on this browser</button>
      </section>

      <section className="meal-logger-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Add a visit</p><h2>What did you eat?</h2></div>
          <span>Ratings saved here feed public PlateScores.</span>
        </div>
        <div className="meal-pickers">
          <label>
            <span className="field-label">Restaurant</span>
            <select className="select-input" value={selectedRestaurantId} onChange={(event) => { setSelectedRestaurantId(event.target.value); setMealSaved(false); }}>
              <option value="">Choose a restaurant</option>
              {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name} · {restaurant.area}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Dish</span>
            <SearchableSelect
              value={selectedDishId}
              disabled={!selectedRestaurantId}
              placeholder="Search this menu"
              groupOrder={DISH_GROUP_ORDER}
              onChange={(next) => { setSelectedDishId(String(next)); setMealSaved(false); }}
              options={restaurantDishes.map((dish) => ({
                value: dish.id,
                label: dish.name,
                group: dish.course === "mains" ? "Mains" : "Sides & drinks",
              }))}
            />
          </label>
        </div>
        {selectedDish && !mealSaved && (
          <div className="embedded-meal-form"><MealForm key={selectedDish.id} dish={selectedDish} initialDishId={selectedDish.id} onSaved={async () => { await loadHistory(); setMealSaved(true); }} /></div>
        )}
        {mealSaved && (
          <div className="inline-success" role="status">
            <strong>Meal saved.</strong>
            <span>It is now first in your history.</span>
            <button type="button" className="btn-quiet" onClick={() => setMealSaved(false)}>Log another visit</button>
          </div>
        )}
      </section>

      <section className="history-section">
        <div className="history-heading">
          <div><p className="eyebrow">Newest first</p><h2>Your history</h2></div>
          <span>{meals.length} {meals.length === 1 ? "meal" : "meals"}</span>
        </div>
        <div className="history-search">
          <div className="sorts" aria-label="Search history by">
            <button type="button" className={`sort-btn ${searchMode === "restaurant" ? "sort-on" : ""}`} onClick={() => setSearchMode("restaurant")}>By restaurant</button>
            <button type="button" className={`sort-btn ${searchMode === "dish" ? "sort-on" : ""}`} onClick={() => setSearchMode("dish")}>By dish</button>
          </div>
          <input
            className="text-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchMode === "restaurant" ? "Search restaurant history" : "Search dishes you ate"}
            aria-label={`Search meal history by ${searchMode}`}
          />
        </div>

        {historyLoading ? <LoadingState label="Loading your visits…" /> : historyError ? (
          <div className="status-card status-error"><p>{historyError}</p><button type="button" className="btn-quiet" onClick={loadHistory}>Try again</button></div>
        ) : filteredMeals.length ? (
          <div className="history-list">{filteredMeals.map((meal) => <MealHistoryCard key={meal.id} meal={meal} />)}</div>
        ) : (
          <div className="empty">
            <p className="empty-title">{meals.length ? "No past meals match that search." : "Your first meal is waiting."}</p>
            <p>{meals.length ? "Try the other history view or a shorter search." : "Choose a restaurant and dish above to start your private food diary."}</p>
          </div>
        )}
      </section>
    </main>
  );
}
