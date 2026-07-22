import { Link } from "react-router-dom";
import PlateScore from "./PlateScore.jsx";

export default function RestaurantCard({ restaurant }) {
  return (
    <article className="card restaurant-card">
      <div className="card-body">
        <div className="card-top">
          <div>
            <h3 className="dish-name"><Link to={`/restaurant/${restaurant.id}`}>{restaurant.name}</Link></h3>
            <p className="dish-where">{[restaurant.cuisine, restaurant.branchName, restaurant.area].filter(Boolean).join(" · ")}</p>
          </div>
          <PlateScore score={restaurant.score} ratingCount={restaurant.ratingCount} />
        </div>
        {restaurant.description && <p className="dish-desc">{restaurant.description}</p>}
        <div className="card-foot">
          <span className="count">{restaurant.activeDishCount.toLocaleString()} {restaurant.activeDishCount === 1 ? "dish" : "dishes"}</span>
          <span className="count">{restaurant.ratingCount.toLocaleString()} ratings</span>
        </div>
      </div>
    </article>
  );
}
