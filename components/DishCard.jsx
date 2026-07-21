import { Link } from "react-router-dom";
import { formatDishPrice } from "../lib/constants.js";
import PlateScore from "./PlateScore.jsx";

export default function DishCard({ dish, onOpen }) {
  const topTags = Object.entries(dish.tagCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const openDish = () => onOpen?.(dish.id);
  const locationCount = dish.locationCount || new Set((dish.branches || []).map((branch) => branch.restaurantId)).size;
  const locationLabel = `${locationCount} ${dish.city || "local"} ${locationCount === 1 ? "location" : "locations"}`;
  const whereLabel = dish.isGrouped
    ? `${dish.brandName} · ${locationLabel}`
    : `${dish.restaurantName}${dish.branchName && dish.branchName !== dish.restaurantName ? ` · ${dish.branchName}` : ""} · ${dish.area}`;

  return (
    <article
      className={`card ${dish.sponsored ? "card-sponsored" : ""}`}
      onClick={openDish}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDish();
        }
      }}
      aria-label={`View ${dish.name} ${dish.isGrouped ? `from ${dish.brandName}` : `at ${dish.restaurantName}`}`}
    >
      {dish.sponsored && (
        <div className="sponsored-band">
          <span>Sponsored</span>
          <span className="sponsored-note">Paid placement — never affects rankings</span>
        </div>
      )}
      <div className="card-body">
        <div className="card-top">
          <div>
            <h3 className="dish-name">{dish.name}</h3>
            <p className="dish-where">
              {dish.isGrouped ? whereLabel : (
                <>
                  <Link to={`/restaurant/${dish.restaurantId}`} onClick={(event) => event.stopPropagation()}>{dish.restaurantName}</Link>
                  {dish.branchName && dish.branchName !== dish.restaurantName ? ` · ${dish.branchName}` : ""}
                  {` · ${dish.area}`}
                </>
              )}
            </p>
          </div>
          <PlateScore score={dish.score} />
        </div>
        <p className="dish-desc">{dish.shortDescription || dish.description}</p>
        <div className="card-foot">
          <span className="price">{formatDishPrice(dish)}</span>
          <span className="count">{dish.ratingCount.toLocaleString()} ratings</span>
        </div>
        <div className="tag-row">
          {topTags.map(([tag]) => <span key={tag} className="tag">{tag}</span>)}
          {dish.diets.slice(0, 3).map((diet) => <span key={diet} className="tag tag-diet">{diet}</span>)}
        </div>
      </div>
    </article>
  );
}
