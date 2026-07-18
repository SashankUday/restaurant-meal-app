import { Link } from "react-router-dom";
import PlateScore from "./PlateScore.jsx";

export default function DishCard({ dish, onOpen }) {
  const topTags = Object.entries(dish.tagCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const openDish = () => onOpen?.(dish.id);

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
      aria-label={`View ${dish.name} at ${dish.restaurantName}`}
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
              <Link to={`/restaurant/${dish.restaurantId}`} onClick={(event) => event.stopPropagation()}>{dish.restaurantName}</Link>
              {` · ${dish.area}`}
            </p>
          </div>
          <PlateScore score={dish.score} />
        </div>
        <p className="dish-desc">{dish.description}</p>
        <div className="card-foot">
          <span className="price">£{dish.price.toFixed(2)}</span>
          <span className="count">{dish.ratingCount.toLocaleString()} ratings</span>
        </div>
        <div className="tag-row">
          {topTags.map(([tag]) => <span key={tag} className="tag">{tag}</span>)}
          {dish.diets.map((diet) => <span key={diet} className="tag tag-diet">{diet}</span>)}
        </div>
      </div>
    </article>
  );
}
