import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { submitDishAttributeFlag } from "../lib/api.js";
import { ALLERGEN_FILTERS, DIETS } from "../lib/constants.js";

const OPTION_SETS = { diets: DIETS, allergens: ALLERGEN_FILTERS };
const ATTRIBUTE_LABELS = { diets: "diet", allergens: "allergen", price: "price", name: "name" };

// A per-field "suggest an edit" affordance. Corrections auto-apply through the
// security-definer RPC (which enforces the 24h-per-field rate limit), so on
// success we just refresh the catalogue to show the new value.
export default function DishCorrection({ dishId, attribute, currentValues = [] }) {
  const { user } = useAuth();
  const { refresh } = useAppData();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(attribute === "diets" || attribute === "allergens" ? "add" : "correct");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!user || !dishId) return null;

  const isList = attribute === "diets" || attribute === "allergens";
  const options = isList
    ? (action === "remove" ? currentValues : (OPTION_SETS[attribute] || []).filter((item) => !currentValues.includes(item)))
    : [];

  async function submit(event) {
    event.preventDefault();
    const payload = attribute === "price" ? Number(value) : value.trim();
    if (payload === "" || (attribute === "price" && !Number.isFinite(payload))) {
      setError("Enter a value first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await submitDishAttributeFlag({ dishId, attribute, action, value: payload });
      await refresh();
      setDone(true);
      setOpen(false);
      setValue("");
    } catch (nextError) {
      setError(nextError.message || "That correction could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (done && !open) {
    return <span className="correction-done" role="status">Thanks — updated.</span>;
  }

  return (
    <span className="dish-correction">
      <button type="button" className="correction-trigger" onClick={() => { setOpen((value) => !value); setError(""); }}>
        Suggest an edit
      </button>
      {open && (
        <form className="correction-form" onSubmit={submit}>
          {isList && (
            <div className="chip-row">
              <button type="button" className={`sort-btn ${action === "add" ? "sort-on" : ""}`} onClick={() => { setAction("add"); setValue(""); }}>Add</button>
              <button type="button" className={`sort-btn ${action === "remove" ? "sort-on" : ""}`} onClick={() => { setAction("remove"); setValue(""); }}>Remove</button>
            </div>
          )}
          {isList ? (
            <select className="select-input" value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Choose a {ATTRIBUTE_LABELS[attribute]}</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : (
            <input
              className="text-input"
              type={attribute === "price" ? "number" : "text"}
              min={attribute === "price" ? "0" : undefined}
              step={attribute === "price" ? "0.01" : undefined}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={attribute === "price" ? "Corrected price" : "Corrected name"}
            />
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="chip-row">
            <button className="btn-primary" type="submit" disabled={saving || !value}>{saving ? "Saving…" : "Submit"}</button>
            <button className="btn-quiet" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {attribute === "allergens" && <p className="field-help">Editing allergens clears the restaurant’s verified badge until re-confirmed.</p>}
        </form>
      )}
    </span>
  );
}
