import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { availableBranchesForDish } from "../lib/catalog.js";
import { fetchDishPhotos } from "../lib/api.js";
import { formatDishPrice, formatPrice } from "../lib/constants.js";
import DishInformation from "./DishInformation.jsx";
import MealForm from "./MealForm.jsx";
import PlateScore from "./PlateScore.jsx";

export default function DishModal({ dish, onClose, initialDishId = null }) {
  const [mode, setMode] = useState("view");
  const [viewTab, setViewTab] = useState("overview");
  const [photos, setPhotos] = useState([]);
  const sortedTags = Object.entries(dish.tagCounts || {}).sort((a, b) => b[1] - a[1]);
  const maxTagCount = Math.max(1, ...sortedTags.map(([, count]) => Number(count)));
  const branches = availableBranchesForDish(dish, { city: dish.isGrouped ? dish.city : undefined });
  const locationCount = new Set(branches.map((branch) => branch.restaurantId)).size;
  const locationLabel = `${locationCount} ${dish.city || "local"} ${locationCount === 1 ? "location" : "locations"}`;
  const branchScore = Number(dish.branchScore ?? dish.score ?? 0);
  const cityScore = Number(dish.cityScore ?? dish.score ?? 0);
  const overallScore = Number(dish.overallScore ?? dish.score ?? 0);

  useEffect(() => {
    if (!dish.canonicalDishId) return;
    let cancelled = false;
    fetchDishPhotos(dish.canonicalDishId).then((result) => {
      if (!cancelled) setPhotos(result.filter((photo) => photo.url));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [dish.canonicalDishId]);

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
          <MealForm dish={dish} initialDishId={initialDishId} onSaved={() => setMode("done")} />
        ) : mode === "quickRate" ? (
          <MealForm dish={dish} initialDishId={initialDishId} quick onSaved={() => setMode("done")} />
        ) : (
          <>
            <div className="modal-head">
              <div>
                <p className="eyebrow">
                  {dish.cuisine} · {dish.isGrouped ? (
                    <>{dish.brandName} · {locationLabel}</>
                  ) : (
                    <><Link to={`/restaurant/${dish.restaurantId}`} onClick={onClose}>{dish.restaurantName}</Link>{dish.branchName && dish.branchName !== dish.restaurantName ? ` · ${dish.branchName}` : ""} · {dish.area}</>
                  )}
                </p>
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
                  <div><span className="meta-label">Price</span><span className="meta-val">{formatDishPrice(dish)}</span></div>
                  <div>
                    <span className="meta-label">{dish.isGrouped ? `${dish.city} ratings` : "Branch ratings"}</span>
                    <span className="meta-val">{Number(dish.ratingCount || 0).toLocaleString()}</span>
                  </div>
                  {!dish.isGrouped && <div><span className="meta-label">Branch score</span><span className="meta-val">{branchScore.toFixed(1)}</span></div>}
                  <div><span className="meta-label">{dish.city} score</span><span className="meta-val">{cityScore.toFixed(1)} · {Number(dish.cityRatingCount || 0).toLocaleString()} ratings</span></div>
                  <div><span className="meta-label">Overall score</span><span className="meta-val">{overallScore.toFixed(1)} · {Number(dish.overallRatingCount || 0).toLocaleString()} ratings</span></div>
                  <div>
                    <span className="meta-label">Contains</span>
                    <span className="meta-val">{dish.allergens?.length ? dish.allergens.join(", ") : "No major allergens listed"}</span>
                  </div>
                </div>
                <p className="allergen-note">Allergen information is provided by the restaurant. Always confirm with staff before ordering.</p>

                {dish.isGrouped && branches.length > 0 && (
                  <div className="modal-location-list">
                    <h3 className="section-label">Available at</h3>
                    {branches.map((branch) => (
                      <Link key={branch.dishId} to={`/restaurant/${branch.restaurantId}?dish=${branch.dishId}`} onClick={onClose}>
                        <span>{branch.branchName || branch.restaurantName} · {branch.area}</span>
                        <strong>{formatPrice(branch.price)}</strong>
                      </Link>
                    ))}
                  </div>
                )}

                {photos.length > 0 && (
                  <>
                    <h3 className="section-label">Photos from diners</h3>
                    <div className="photo-preview-row" aria-label="Diner photos of this dish">
                      {photos.map((photo) => <img key={photo.id} src={photo.url} alt={`A diner's photo of ${dish.name}`} />)}
                    </div>
                  </>
                )}

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
            <div className="modal-actions">
              <button className="btn-primary" type="button" onClick={() => setMode("log")}>I ate this — log my meal</button>
              <button className="btn-quiet" type="button" onClick={() => setMode("quickRate")}>Rate without a visit</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
