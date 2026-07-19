import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/constants.js";
import DishInformation from "./DishInformation.jsx";
import MealForm from "./MealForm.jsx";
import PlateScore from "./PlateScore.jsx";

export default function DishModal({ dish, onClose }) {
  const [mode, setMode] = useState("view");
  const [viewTab, setViewTab] = useState("overview");
  const sortedTags = Object.entries(dish.tagCounts || {}).sort((a, b) => b[1] - a[1]);
  const maxTagCount = Math.max(1, ...sortedTags.map(([, count]) => Number(count)));

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dish-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close" type="button" onClick={onClose} aria-label="Close">×</button>

        {mode === "done" ? (
          <div className="done">
            <div className="done-plate">✓</div>
            <h2>Meal saved.</h2>
            <p>Your rating is already included in PlateScore, and your notes are waiting in My Meals.</p>
            <Link className="btn-primary link-button" to="/me" onClick={onClose}>See My Meals</Link>
            <button className="btn-quiet" type="button" onClick={onClose}>Back to browsing</button>
          </div>
        ) : mode === "log" ? (
          <MealForm dish={dish} onSaved={() => setMode("done")} />
        ) : (
          <>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{dish.cuisine} · <Link to={`/restaurant/${dish.restaurantId}`} onClick={onClose}>{dish.restaurantName}</Link>{dish.branchName && dish.branchName !== dish.restaurantName ? ` · ${dish.branchName}` : ""} · {dish.area}</p>
                <h2 className="modal-title" id="dish-modal-title">{dish.name}</h2>
              </div>
              <PlateScore score={dish.score} size={72} />
            </div>

            <div className="modal-tabs" role="tablist" aria-label="Dish detail sections">
              <button type="button" role="tab" aria-selected={viewTab === "overview"} className={viewTab === "overview" ? "modal-tab-on" : ""} onClick={() => setViewTab("overview")}>Overview</button>
              <button type="button" role="tab" aria-selected={viewTab === "information"} className={viewTab === "information" ? "modal-tab-on" : ""} onClick={() => setViewTab("information")}>Dish information</button>
            </div>

            {viewTab === "information" ? <DishInformation dish={dish} /> : (
              <>
                <p className="modal-desc">{dish.shortDescription || dish.description}</p>
                <div className="modal-meta">
                  <div><span className="meta-label">Price</span><span className="meta-val">{formatPrice(dish.price)}</span></div>
                  <div><span className="meta-label">Ratings</span><span className="meta-val">{dish.ratingCount.toLocaleString()}</span></div>
                  <div>
                    <span className="meta-label">Contains</span>
                    <span className="meta-val">{dish.allergens.length ? dish.allergens.join(", ") : "No major allergens listed"}</span>
                  </div>
                </div>
                <p className="allergen-note">Allergen information is provided by the restaurant. Always confirm with staff before ordering.</p>

                <h3 className="section-label">What diners say</h3>
                <div className="tag-bars">
                  {sortedTags.map(([tag, count]) => (
                    <div key={tag} className="tag-bar">
                      <span className="tag-bar-name">{tag}</span>
                      <div className="tag-bar-track"><div className="tag-bar-fill" style={{ width: `${(Number(count) / maxTagCount) * 100}%` }} /></div>
                      <span className="tag-bar-n">{Number(count).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button className="btn-primary" type="button" onClick={() => setMode("log")}>I ate this — log my meal</button>
          </>
        )}
      </div>
    </div>
  );
}
