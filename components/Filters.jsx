import { ALLERGEN_FILTERS, DIETS, MEAL_TIME_LABELS, NON_MAIN_COURSES } from "../lib/constants.js";
import { formatCourse } from "../lib/constants.js";
import Chip from "./Chip.jsx";

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function Filters({ filters, onChange }) {
  const constraints = filters.constraints || {};
  function setConstraint(key, value) {
    const next = { ...constraints };
    if (value === "" || value === null || value === undefined) delete next[key];
    else next[key] = value;
    onChange({ ...filters, constraints: next });
  }

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <span className="filter-label">Price &amp; calories</span>
        <div className="constraint-row">
          <label className="constraint-field">
            <span>Min price (£)</span>
            <input className="text-input" type="number" min="0" step="0.5" inputMode="decimal"
              value={constraints.minPrice ?? ""} onChange={(event) => setConstraint("minPrice", event.target.value)} placeholder="0" />
          </label>
          <label className="constraint-field">
            <span>Max price (£)</span>
            <input className="text-input" type="number" min="0" step="0.5" inputMode="decimal"
              value={constraints.maxPrice ?? ""} onChange={(event) => setConstraint("maxPrice", event.target.value)} placeholder="Any" />
          </label>
          <label className="constraint-field">
            <span>Max calories</span>
            <input className="text-input" type="number" min="0" step="50" inputMode="numeric"
              value={constraints.maxCalories ?? ""} onChange={(event) => setConstraint("maxCalories", event.target.value)} placeholder="Any" />
          </label>
        </div>
        <p className="filter-note">Dishes without the relevant figure are hidden when a limit is set.</p>
      </div>
      <div className="filter-group">
        <span className="filter-label">When are you eating?</span>
        <div className="chip-row">
          {Object.entries(MEAL_TIME_LABELS).map(([key, label]) => (
            <Chip
              key={key}
              active={(filters.mealTime || "any") === key}
              onClick={() => onChange({ ...filters, mealTime: key })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <span className="filter-label">Looking for a side, dessert or drink instead?</span>
        <div className="chip-row">
          {NON_MAIN_COURSES.map((course) => (
            <Chip
              key={course}
              active={filters.course === course}
              onClick={() => onChange({ ...filters, course: filters.course === course ? null : course })}
            >
              {formatCourse(course)}
            </Chip>
          ))}
        </div>
        {filters.course && <p className="filter-note">Showing {formatCourse(filters.course).toLowerCase()} instead of mains.</p>}
      </div>
      <div className="filter-group">
        <span className="filter-label">Diet</span>
        <p className="filter-note">Applying your saved dietary requirements from Account.</p>
        <details className="diet-override-disclosure">
          <summary>Adjust diet for today</summary>
          <div className="chip-row">
            {DIETS.map((diet) => (
              <Chip
                key={diet}
                active={filters.diets.includes(diet)}
                onClick={() => onChange({ ...filters, diets: toggleValue(filters.diets, diet) })}
              >
                {diet}
              </Chip>
            ))}
          </div>
          <p className="filter-note">Changes here apply to this search only — your saved account preferences are untouched.</p>
        </details>
      </div>
      <div className="filter-group">
        <span className="filter-label">Hide dishes containing</span>
        <div className="chip-row">
          {ALLERGEN_FILTERS.map((allergen) => (
            <Chip
              key={allergen}
              tone="warn"
              active={filters.allergens.includes(allergen)}
              onClick={() => onChange({ ...filters, allergens: toggleValue(filters.allergens, allergen) })}
            >
              {allergen}
            </Chip>
          ))}
        </div>
        {filters.allergens.length > 0 && (
          <p className="filter-note">Dishes with these allergens are hidden completely, including sponsored and group-search results.</p>
        )}
      </div>
      {filters.blockedIngredients?.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">Blocked ingredients</span>
          <p className="filter-note">Dishes containing {filters.blockedIngredients.join(", ")} are hidden by default.</p>
          <Chip active={filters.showBlocked} onClick={() => onChange({ ...filters, showBlocked: !filters.showBlocked })}>
            Show blocked items anyway
          </Chip>
        </div>
      )}
    </div>
  );
}
