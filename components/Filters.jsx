import { ALLERGEN_FILTERS, DIETS, MEAL_TIME_LABELS, NON_MAIN_COURSES } from "../lib/constants.js";
import { formatCourse } from "../lib/constants.js";
import Chip from "./Chip.jsx";

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function Filters({ filters, onChange }) {
  return (
    <div className="filter-panel">
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
    </div>
  );
}
