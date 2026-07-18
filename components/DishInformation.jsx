import { Link } from "react-router-dom";
import { formatCourse, formatTag } from "../lib/constants.js";

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

const EXPERIENCE_LABELS = {
  taste: "Taste",
  value: "Value",
  presentation: "Presentation",
  portion: "Portion",
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

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not supplied";
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
          <dd>{Array.isArray(item) ? item.join(", ") : typeof item === "boolean" ? formatBoolean(item) : typeof item === "object" ? JSON.stringify(item) : String(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function DishInformation({ dish }) {
  const nutritionEntries = Object.entries(dish.nutrition || {}).filter(([key, value]) => key !== "micronutrients" && hasValue(value));
  const micronutrients = dish.nutrition?.micronutrients || {};
  const currentPrices = Object.entries(dish.currentPrices || {}).filter(([, value]) => value !== null);
  const experienceScores = Object.entries(dish.experienceScores || {}).filter(([key, value]) => key !== "repeat_order_rate" && value !== null);
  const availability = dish.availability || {};
  const media = dish.officialMedia?.length ? dish.officialMedia : dish.officialImageUrl ? [{ url: dish.officialImageUrl, alt_text: dish.name }] : [];

  return (
    <div className="dish-information">
      {media.length > 0 && (
        <div className="official-media-row">
          {media.map((item) => <img key={item.id || item.url} src={item.url} alt={item.alt_text || dish.name} />)}
        </div>
      )}

      <section className="info-section">
        <h3>At a glance</h3>
        <dl className="info-grid">
          <div><dt>Menu section</dt><dd>{formatCourse(dish.course)}</dd></div>
          <div><dt>Meal occasion</dt><dd>{dish.mealOccasions.length ? dish.mealOccasions.join(", ") : "Not supplied"}</dd></div>
          <div><dt>Portion</dt><dd>{dish.portion.category ? formatTag(dish.portion.category) : "Not supplied"}</dd></div>
          <div><dt>Serving style</dt><dd>{dish.servingStyle || "Not supplied"}</dd></div>
          <div><dt>Branch</dt><dd>{dish.branchName || dish.chainName || "Independent / not supplied"}</dd></div>
          <div><dt>Location</dt><dd>{[dish.area, dish.city, dish.countryCode].filter(Boolean).join(", ") || "Not supplied"}</dd></div>
          <div><dt>Currently available</dt><dd>{availability.currently_available === false || availability.out_of_stock === true ? "No" : "Yes"}</dd></div>
          <div><dt>Suitable for sharing</dt><dd>{formatBoolean(dish.portion.suitableForSharing)}</dd></div>
          <div><dt>Dish ID</dt><dd>{dish.id}</dd></div>
        </dl>
      </section>

      <details className="info-disclosure" open>
        <summary>Description and preparation</summary>
        <div className="info-disclosure-body">
          <div className="info-copy-block"><h4>Official menu description</h4><p>{dish.officialDescription || dish.description || "Not supplied by the restaurant yet."}</p></div>
          <div className="info-copy-block"><h4>Ingredients</h4><InfoChips values={dish.ingredients} /></div>
          <dl className="metadata-rows">
            <div><dt>Cooking method</dt><dd>{dish.cookingMethods.length ? dish.cookingMethods.join(", ") : "Not supplied"}</dd></div>
            <div><dt>Cultural origin</dt><dd>{dish.culturalOrigin || "Not supplied"}</dd></div>
            <div><dt>Historical notes</dt><dd>{dish.historicalNotes || "Not supplied"}</dd></div>
          </dl>
        </div>
      </details>

      <details className="info-disclosure" open>
        <summary>Pricing and portion</summary>
        <div className="info-disclosure-body">
          <div className="metric-grid">
            {(currentPrices.length ? currentPrices : [["eat_in", dish.price]]).map(([type, price]) => (
              <div key={type}><span>{labelFor(type)}</span><strong>£{Number(price).toFixed(2)}</strong></div>
            ))}
            {dish.pricePerCalorie !== null && <div><span>Per calorie</span><strong>£{dish.pricePerCalorie.toFixed(4)}</strong></div>}
            {dish.pricePerGramProtein !== null && <div><span>Per gram protein</span><strong>£{dish.pricePerGramProtein.toFixed(2)}</strong></div>}
          </div>
          <dl className="metadata-rows">
            <div><dt>Weight</dt><dd>{dish.portion.weightG ? `${dish.portion.weightG} g` : "Not supplied"}</dd></div>
            <div><dt>Volume</dt><dd>{dish.portion.volumeMl ? `${dish.portion.volumeMl} ml` : "Not supplied"}</dd></div>
            <div><dt>Pieces</dt><dd>{dish.portion.pieceCount ?? "Not supplied"}</dd></div>
            <div><dt>People served</dt><dd>{dish.portion.peopleServed ?? "Not supplied"}</dd></div>
            <div><dt>Satiety estimate</dt><dd>{dish.portion.estimatedSatietyScore !== null ? `${dish.portion.estimatedSatietyScore}/10` : "Not supplied"}</dd></div>
          </dl>
          {dish.priceHistory.length > 0 && (
            <div className="price-history"><h4>Recorded prices</h4>{dish.priceHistory.map((entry, index) => <span key={`${entry.service_type}-${entry.valid_from}-${index}`}>{labelFor(entry.service_type)} · £{Number(entry.price).toFixed(2)} {entry.currency || "GBP"}{entry.region ? ` · ${entry.region}` : ""} · {formatDate(entry.valid_from)}{entry.valid_to ? ` to ${formatDate(entry.valid_to)}` : " onwards"}</span>)}</div>
          )}
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
          <div className="info-copy-block"><h4>Dietary flags</h4><InfoChips values={dish.dietaryFlags} tone="tag-diet" /></div>
          <div className="info-copy-block"><h4>Official allergens</h4><InfoChips values={dish.allergens} /></div>
          <MetadataRows value={dish.allergenDetails} />
          <p className="allergen-note">Allergen information is provided by the restaurant. Always confirm ingredients, “may contain” warnings and preparation practices with staff before ordering.</p>
        </div>
      </details>

      <details className="info-disclosure">
        <summary>Sensory and ingredient profile</summary>
        <div className="info-disclosure-body info-two-column">
          <div><h4>Sensory descriptors</h4><MetadataRows value={dish.sensoryProfile} /></div>
          <div><h4>Ingredient profile</h4><MetadataRows value={dish.ingredientProfile} /></div>
        </div>
      </details>

      <details className="info-disclosure">
        <summary>Community experience</summary>
        <div className="info-disclosure-body">
          {experienceScores.length ? (
            <div className="metric-grid">
              {experienceScores.map(([key, value]) => <div key={key}><span>{EXPERIENCE_LABELS[key] || labelFor(key)}</span><strong>{value.toFixed(1)}</strong></div>)}
            </div>
          ) : <EmptyInfo>No optional score breakdowns have been submitted yet.</EmptyInfo>}
          <dl className="metadata-rows">
            <div><dt>Repeat-order rate</dt><dd>{dish.experienceScores.repeat_order_rate !== null && dish.experienceScores.repeat_order_rate !== undefined ? `${Math.round(dish.experienceScores.repeat_order_rate * 100)}%` : "Not enough data"}</dd></div>
            <div><dt>User photos</dt><dd>{dish.userPhotoCount.toLocaleString()}</dd></div>
            <div><dt>Saved</dt><dd>{dish.saveCount.toLocaleString()}</dd></div>
            <div><dt>Favourites</dt><dd>{dish.favouriteCount.toLocaleString()}</dd></div>
          </dl>
        </div>
      </details>

      <details className="info-disclosure">
        <summary>Availability and recommendations</summary>
        <div className="info-disclosure-body">
          <MetadataRows value={availability} />
          {dish.relatedDishes.length > 0 && (
            <div className="related-dishes"><h4>Related dishes and pairings</h4>{dish.relatedDishes.map((related) => <Link key={`${related.dish_id}-${related.relationship_type}`} to={`/restaurant/${related.restaurant_id}?dish=${related.dish_id}`}>{related.name} · {labelFor(related.relationship_type)}</Link>)}</div>
          )}
          {hasValue(dish.recommendationMetadata) && <MetadataRows value={dish.recommendationMetadata} />}
        </div>
      </details>

      {hasValue(dish.derivedFeatures) && (
        <details className="info-disclosure">
          <summary>Derived features</summary>
          <div className="info-disclosure-body">
            <MetadataRows value={dish.derivedFeatures} />
            <p className="field-help">Derived or AI-assisted fields should include their source and verification date before publication.</p>
          </div>
        </details>
      )}

      {(hasValue(dish.visualMetadata) || media.some((item) => hasValue(item.colour_profile) || hasValue(item.plating_style))) && (
        <details className="info-disclosure">
          <summary>Visual information</summary>
          <div className="info-disclosure-body">
            <MetadataRows value={dish.visualMetadata} />
            {media.map((item) => (hasValue(item.colour_profile) || hasValue(item.plating_style)) && (
              <dl className="metadata-rows" key={`visual-${item.id || item.url}`}>
                <div><dt>Colour profile</dt><dd>{item.colour_profile?.join(", ") || "Not supplied"}</dd></div>
                <div><dt>Plating style</dt><dd>{item.plating_style || "Not supplied"}</dd></div>
              </dl>
            ))}
          </div>
        </details>
      )}

      {hasValue(dish.dataSources) && (
        <details className="info-disclosure">
          <summary>Sources and verification</summary>
          <div className="info-disclosure-body">
            <MetadataRows value={dish.dataSources} />
          </div>
        </details>
      )}

      <p className="data-freshness">Added {formatDate(dish.dateAdded)} · Last updated {formatDate(dish.dateLastUpdated)}</p>
    </div>
  );
}
