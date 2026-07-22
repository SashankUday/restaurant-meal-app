import { useState } from "react";
import { updateRestaurantInfo } from "../lib/api.js";

const FIELDS = [
  { attribute: "name", label: "Name" },
  { attribute: "cuisine", label: "Cuisine" },
  { attribute: "area", label: "Area" },
  { attribute: "description", label: "Description", multiline: true },
];

export default function RestaurantEditForm({ restaurant, onSaved, onClose }) {
  const [values, setValues] = useState({
    name: restaurant.name || "",
    cuisine: restaurant.cuisine || "",
    area: restaurant.area || "",
    description: restaurant.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const changed = FIELDS.filter(({ attribute }) => values[attribute] !== (restaurant[attribute] || ""));
      for (const { attribute } of changed) {
        // eslint-disable-next-line no-await-in-loop
        await updateRestaurantInfo({ restaurantId: restaurant.id, attribute, value: values[attribute] });
      }
      await onSaved?.();
      onClose?.();
    } catch (nextError) {
      setError(nextError.message || "This restaurant could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="correction-form restaurant-edit-form" onSubmit={submit}>
      {FIELDS.map(({ attribute, label, multiline }) => (
        <label key={attribute} className="field-label">
          {label}
          {multiline ? (
            <textarea
              className="text-area"
              value={values[attribute]}
              onChange={(event) => setValues((current) => ({ ...current, [attribute]: event.target.value }))}
            />
          ) : (
            <input
              className="text-input"
              value={values[attribute]}
              onChange={(event) => setValues((current) => ({ ...current, [attribute]: event.target.value }))}
            />
          )}
        </label>
      ))}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="chip-row">
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        <button className="btn-quiet" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
