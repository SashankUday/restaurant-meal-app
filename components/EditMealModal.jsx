import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { updateVisit } from "../lib/api.js";
import RatingForm from "./RatingForm.jsx";

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Editing a past entry reuses the same rating step, pre-filled from the existing
// rating. When the entry belongs to a visit, its date and notes are editable too.
export default function EditMealModal({ meal, dish, onClose, onSaved }) {
  const { user } = useAuth();
  const [visitDate, setVisitDate] = useState(meal.visit?.visitedAt || today());
  const [notes, setNotes] = useState(meal.visit?.notes || "");
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitError, setVisitError] = useState("");
  const [visitSaved, setVisitSaved] = useState(false);

  useEffect(() => {
    function onKeyDown(event) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  async function saveVisit(event) {
    event.preventDefault();
    setSavingVisit(true);
    setVisitError("");
    try {
      await updateVisit({ visitId: meal.visit.id, userId: user.id, visitedAt: visitDate, notes });
      setVisitSaved(true);
    } catch (error) {
      setVisitError(error.message || "The visit could not be updated.");
    } finally {
      setSavingVisit(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Edit ${meal.dish.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="close" type="button" onClick={onClose} aria-label="Close">×</button>

        {meal.visit && (
          <form className="edit-visit-block" onSubmit={saveVisit}>
            <p className="eyebrow">Visit details</p>
            <label className="field-label" htmlFor="edit-visit-date">Visit date</label>
            <input id="edit-visit-date" className="text-input date-input" type="date" max={today()} value={visitDate} onChange={(event) => { setVisitDate(event.target.value); setVisitSaved(false); }} />
            <label className="field-label" htmlFor="edit-visit-notes">Notes <span className="optional">optional</span></label>
            <textarea id="edit-visit-notes" className="text-area" maxLength={2000} value={notes} onChange={(event) => { setNotes(event.target.value); setVisitSaved(false); }} />
            {visitError && <p className="form-error" role="alert">{visitError}</p>}
            <button className="btn-quiet" type="submit" disabled={savingVisit}>{savingVisit ? "Saving…" : visitSaved ? "Visit saved" : "Save visit details"}</button>
          </form>
        )}

        {dish ? (
          <RatingForm
            dish={dish}
            dishId={meal.dish.id}
            heading="Edit your rating"
            onSaved={() => { onSaved?.(); onClose(); }}
          />
        ) : (
          <p className="field-help">This dish is no longer in the catalogue, so its rating can’t be edited here.</p>
        )}
      </div>
    </div>
  );
}
