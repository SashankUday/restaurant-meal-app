import { ALLERGENS, DIETS } from "../lib/constants.js";
import Chip from "./Chip.jsx";

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function Filters({ filters, onChange }) {
  return (
    <div className="filter-panel">
      <div className="filter-group">
        <span className="filter-label">Diet</span>
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
      </div>
      <div className="filter-group">
        <span className="filter-label">Hide dishes containing</span>
        <div className="chip-row">
          {ALLERGENS.map((allergen) => (
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
    </div>
  );
}
