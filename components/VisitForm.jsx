import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext.jsx";
import { availableBranchesForDish, isDishCurrentlyAvailable, resolveInitialBranchDishId } from "../lib/catalog.js";
import { formatPrice } from "../lib/constants.js";
import SearchableSelect from "./SearchableSelect.jsx";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const DISH_GROUP_ORDER = ["Mains", "Sides & drinks"];

// The visit step, only reached via "Log Meal". Collects the trip (date, branch,
// notes) and one or more dishes ordered on it, then hands the caller a visit
// descriptor plus the ordered branch dish ids so each becomes a rating sharing
// the visit. The branch <select> is skipped entirely when a dish has one branch.
export default function VisitForm({ dish, initialDishId = null, onSubmit }) {
  const { dishes } = useAppData();
  const branchOptions = useMemo(
    () => availableBranchesForDish(dish, { city: dish.isGrouped ? dish.city : undefined }),
    [dish],
  );
  const [selectedDishId, setSelectedDishId] = useState(() => (
    resolveInitialBranchDishId(dish, initialDishId, { city: dish.isGrouped ? dish.city : undefined })
    || (branchOptions.length === 1 ? String(branchOptions[0].dishId) : "")
  ));
  const [visitedAt, setVisitedAt] = useState(today());
  const [notes, setNotes] = useState("");
  const [extraDishIds, setExtraDishIds] = useState([]);
  const [error, setError] = useState("");

  const selectedBranch = branchOptions.find((branch) => String(branch.dishId) === selectedDishId);
  const restaurantId = selectedBranch?.restaurantId ?? null;

  // Additional dishes are drawn from the same physical branch as the primary dish.
  const menu = useMemo(() => {
    if (!restaurantId) return [];
    return dishes.filter((item) => (
      item.restaurantId === restaurantId
      && isDishCurrentlyAvailable(item)
      && String(item.id) !== selectedDishId
    ));
  }, [dishes, restaurantId, selectedDishId]);

  useEffect(() => { setExtraDishIds([]); }, [restaurantId]);

  const extraDishes = extraDishIds
    .map((id) => menu.find((item) => String(item.id) === String(id)))
    .filter(Boolean);
  const menuOptions = menu
    .filter((item) => !extraDishIds.some((id) => String(id) === String(item.id)))
    .map((item) => ({ value: item.id, label: item.name, group: item.course === "mains" ? "Mains" : "Sides & drinks" }));

  function submit(event) {
    event.preventDefault();
    if (!selectedBranch) { setError("Choose the branch where you ate."); return; }
    onSubmit(
      { restaurantId, visitedAt, notes },
      [Number(selectedBranch.dishId), ...extraDishIds.map(Number)],
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">Log a visit</p>
          <h3>{dish.name}</h3>
        </div>
      </div>

      {branchOptions.length > 1 && (
        <label className="branch-picker" htmlFor={`visit-branch-${dish.canonicalDishId || dish.id}`}>
          <span className="field-label">Branch</span>
          <select
            id={`visit-branch-${dish.canonicalDishId || dish.id}`}
            className="select-input"
            value={selectedDishId}
            onChange={(event) => { setSelectedDishId(event.target.value); setError(""); }}
            required
          >
            <option value="">Choose where you ate</option>
            {branchOptions.map((branch) => (
              <option key={branch.dishId} value={String(branch.dishId)}>
                {branch.branchName || branch.restaurantName} · {branch.area} · {formatPrice(branch.price)}
              </option>
            ))}
          </select>
        </label>
      )}
      {branchOptions.length === 1 && selectedBranch && (
        <p className="field-help">At {selectedBranch.branchName || selectedBranch.restaurantName} · {selectedBranch.area}.</p>
      )}
      {!branchOptions.length && <p className="form-error" role="alert">This dish is not currently offered at a selectable branch.</p>}

      <label className="field-label" htmlFor={`visit-date-${dish.id}`}>Visit date</label>
      <input
        id={`visit-date-${dish.id}`}
        className="text-input date-input"
        type="date"
        max={today()}
        value={visitedAt}
        onChange={(event) => setVisitedAt(event.target.value)}
        required
      />

      <fieldset className="fieldset-reset">
        <legend className="section-label">Dishes on this visit</legend>
        <div className="visit-dish-list">
          <span className="tag tag-diet">{dish.name}</span>
          {extraDishes.map((item) => (
            <span className="tag" key={item.id}>
              {item.name}
              <button type="button" className="visit-dish-remove" aria-label={`Remove ${item.name}`}
                onClick={() => setExtraDishIds((current) => current.filter((id) => String(id) !== String(item.id)))}>×</button>
            </span>
          ))}
        </div>
        {restaurantId && menuOptions.length > 0 && (
          <div className="visit-add-dish">
            <SearchableSelect
              value=""
              placeholder="+ Add another dish from this visit"
              groupOrder={DISH_GROUP_ORDER}
              options={menuOptions}
              onChange={(next) => setExtraDishIds((current) => [...current, next])}
            />
          </div>
        )}
      </fieldset>

      <label className="field-label" htmlFor={`visit-notes-${dish.id}`}>Notes <span className="optional">optional</span></label>
      <textarea
        id={`visit-notes-${dish.id}`}
        className="text-area"
        maxLength={2000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Who you were with, the occasion, anything to remember…"
      />

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn-primary" type="submit" disabled={!selectedBranch}>
        Continue to rate {extraDishes.length ? `${extraDishes.length + 1} dishes` : "this dish"}
      </button>
    </form>
  );
}
