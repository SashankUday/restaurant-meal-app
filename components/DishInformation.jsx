import { availableBranchesForDish, isDishCurrentlyAvailable } from "../lib/catalog.js";
import { formatCourse, formatDishPrice, formatPrice } from "../lib/constants.js";

const NUTRIENT_LABELS = {
  calories_kcal: ["Calories", "kcal"],
  protein_g: ["Protein", "g"],
  carbohydrates_g: ["Carbohydrates", "g"],
  sugars_g: ["Sugars", "g"],
  fibre_g: ["Fibre", "g"],
  total_fat_g: ["Total fat", "g"],
  saturated_fat_g: ["Saturated fat", "g"],
  monounsaturated_fat_g: ["Monounsaturated fat", "g"],
  polyunsaturated_fat_g: ["Polyunsaturated fat", "g"],
  trans_fat_g: ["Trans fat", "g"],
  sodium_mg: ["Sodium", "mg"],
  salt_g: ["Salt", "g"],
  cholesterol_mg: ["Cholesterol", "mg"],
  water_g: ["Water", "g"],
};

function hasValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function labelFor(key) {
  return key.split("_").map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`).join(" ");
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatMetadataValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function EmptyInfo({ children = "Not supplied by the restaurant yet." }) {
  return <p className="info-empty">{children}</p>;
}

function InfoChips({ values, tone = "" }) {
  if (!hasValue(values)) return <EmptyInfo />;
  return <div className="tag-row info-chip-row">{values.map((value) => <span className={`tag ${tone}`} key={value}>{value}</span>)}</div>;
}

function MetadataRows({ value }) {
  if (!hasValue(value)) return <EmptyInfo />;
  return (
    <dl className="metadata-rows">
      {Object.entries(value).filter(([, item]) => hasValue(item)).map(([key, item]) => (
        <div key={key}>
          <dt>{labelFor(key)}</dt>
          <dd>{formatMetadataValue(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function DishInformation({ dish }) {
  const nutritionEntries = Object.entries(dish.nutrition || {}).filter(([key, value]) => key !== "micronutrients" && hasValue(value));
  const micronutrients = dish.nutrition?.micronutrients || {};
  const availability = dish.availability || {};
  const hasDistinctCardDescription = hasValue(dish.shortDescription) && dish.shortDescription !== dish.description;
  const branches = availableBranchesForDish(dish, { city: dish.isGrouped ? dish.city : undefined });
  const locationCount = new Set(branches.map((branch) => branch.restaurantId)).size;
  const currentlyAvailable = dish.isGrouped ? branches.length > 0 : isDishCurrentlyAvailable(dish);

  return (
    <div className="dish-information">
      {dish.officialImageUrl && (
        <div className="official-media-row">
          <img src={dish.officialImageUrl} alt={dish.name} />
        </div>
      )}

      <section className="info-section">
        <h3>At a glance</h3>
        <dl className="info-grid">
          <div><dt>Menu section</dt><dd>{formatCourse(dish.course)}</dd></div>
          <div><dt>Meal occasion</dt><dd>{dish.mealOccasions?.length ? dish.mealOccasions.join(", ") : "Not supplied"}</dd></div>
          <div><dt>Price</dt><dd>{formatDishPrice(dish)}</dd></div>
          <div><dt>Brand</dt><dd>{dish.brandName || dish.restaurantName || "Not supplied"}</dd></div>
          {dish.isGrouped ? (
            <div><dt>Locations</dt><dd>{locationCount} in {dish.city}</dd></div>
          ) : (
            <div><dt>Branch</dt><dd>{dish.branchName || dish.area || "Not supplied"}</dd></div>
          )}
          <div><dt>Location</dt><dd>{dish.isGrouped ? dish.city : [dish.area, dish.city].filter(Boolean).join(", ") || "Not supplied"}</dd></div>
          <div><dt>Currently available</dt><dd>{currentlyAvailable ? "Yes" : "No"}</dd></div>
          <div><dt>Canonical dish ID</dt><dd>{dish.canonicalDishId}</dd></div>
          {dish.marketCode && <div><dt>Market</dt><dd>{dish.marketCode}</dd></div>}
          {dish.canonicalVersion != null && <div><dt>Canonical version</dt><dd>{dish.canonicalVersion}</dd></div>}
          {dish.canonicalReviewStatus && <div><dt>Review status</dt><dd>{labelFor(dish.canonicalReviewStatus)}</dd></div>}
          {!dish.isGrouped && <div><dt>Branch dish ID</dt><dd>{dish.id}</dd></div>}
        </dl>
      </section>

      <details className="info-disclosure" open>
        <summary>Description and ingredients</summary>
        <div className="info-disclosure-body">
          <div className="info-copy-block"><h4>Menu description</h4><p>{dish.description || "Not supplied by the restaurant yet."}</p></div>
          {hasDistinctCardDescription && <div className="info-copy-block"><h4>Card description</h4><p>{dish.shortDescription}</p></div>}
          <div className="info-copy-block"><h4>Ingredients</h4><InfoChips values={dish.ingredients} /></div>
        </div>
      </details>

      <details className="info-disclosure" open>
        <summary>Nutrition per serving</summary>
        <div className="info-disclosure-body">
          {nutritionEntries.length ? (
            <div className="nutrition-grid">
              {nutritionEntries.map(([key, value]) => {
                const [label, unit] = NUTRIENT_LABELS[key] || [labelFor(key), ""];
                return <div key={key}><span>{label}</span><strong>{value}{unit ? ` ${unit}` : ""}</strong></div>;
              })}
            </div>
          ) : <EmptyInfo>Nutrition has not been supplied by the restaurant. Do not treat estimates as medical advice.</EmptyInfo>}
          {hasValue(micronutrients) && <><h4 className="info-subheading">Micronutrients</h4><MetadataRows value={micronutrients} /></>}
        </div>
      </details>

      <details className="info-disclosure" open>
        <summary>Dietary and allergen information</summary>
        <div className="info-disclosure-body">
          <div className="info-copy-block"><h4>Diets</h4><InfoChips values={dish.diets} tone="tag-diet" /></div>
          <div className="info-copy-block"><h4>Official allergens</h4><InfoChips values={dish.allergens} /></div>
          <div className="info-copy-block">
            <h4>Allergen verification</h4>
            <p>{dish.allergensVerified ? "Marked as verified in the restaurant data." : "Not marked as verified in the restaurant data."}</p>
          </div>
          <MetadataRows value={dish.allergenDetails} />
          <p className="allergen-note">Allergen information is provided by the restaurant. Always confirm ingredients, “may contain” warnings and preparation practices with staff before ordering.</p>
        </div>
      </details>

      <details className="info-disclosure">
        <summary>Community experience</summary>
        <div className="info-disclosure-body">
          <dl className="metadata-rows">
            {dish.isGrouped ? (
              <>
                <div><dt>{dish.city} score</dt><dd>{Number(dish.cityScore || 0).toFixed(1)} from {Number(dish.cityRatingCount || 0).toLocaleString()} ratings</dd></div>
                <div><dt>Overall score</dt><dd>{Number(dish.overallScore || 0).toFixed(1)} from {Number(dish.overallRatingCount || 0).toLocaleString()} ratings</dd></div>
              </>
            ) : (
              <>
                <div><dt>Repeat-order rate</dt><dd>{dish.repeatOrderRate == null ? "Not enough data" : `${Math.round(dish.repeatOrderRate * 100)}%`}</dd></div>
                <div><dt>User photos</dt><dd>{Number(dish.userPhotoCount || 0).toLocaleString()}</dd></div>
              </>
            )}
          </dl>
        </div>
      </details>

      <details className="info-disclosure">
        <summary>Availability</summary>
        <div className="info-disclosure-body">
          {dish.isGrouped ? (
            branches.length ? (
              <dl className="metadata-rows">
                {branches.map((branch) => (
                  <div key={branch.dishId}>
                    <dt>{branch.branchName || branch.restaurantName}</dt>
                    <dd>{branch.area} · {formatPrice(branch.price)}</dd>
                  </div>
                ))}
              </dl>
            ) : <EmptyInfo>No branch currently lists this dish as available.</EmptyInfo>
          ) : <MetadataRows value={availability} />}
        </div>
      </details>

      {hasValue(dish.dataSources) && (
        <details className="info-disclosure">
          <summary>Sources and verification</summary>
          <div className="info-disclosure-body">
            <MetadataRows value={dish.dataSources} />
          </div>
        </details>
      )}

      <p className="data-freshness">Added {formatDate(dish.createdAt)} · Last updated {formatDate(dish.updatedAt)}</p>
    </div>
  );
}
