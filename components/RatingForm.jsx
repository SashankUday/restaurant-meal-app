import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { createMeal, fetchUserRatingForDish } from "../lib/api.js";
import { RATING_TAGS } from "../lib/constants.js";
import { validatePhotoSelection } from "../lib/image.js";
import Chip from "./Chip.jsx";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanCustomTag(tag) {
  return tag.trim().replace(/\s+/g, " ").slice(0, 30);
}

// The rating step, identical whether reached via "Log Meal" (with a visitId) or
// a bare "Rate" (visitId null). It never shows a branch picker — the dish/branch
// is already resolved by the caller. On success it hands back the new rating id.
export default function RatingForm({ dish, dishId, visitId = null, visitedAt, heading, progressLabel, onSaved }) {
  const { user } = useAuth();
  const { refresh } = useAppData();
  const [score, setScore] = useState(null);
  const [wouldOrderAgain, setWouldOrderAgain] = useState(null);
  const [tags, setTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [photosPrivate, setPhotosPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingRating, setExistingRating] = useState(null);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!user || !dish.canonicalDishId) return;
    let cancelled = false;
    fetchUserRatingForDish(user.id, dish.canonicalDishId).then((rating) => {
      if (cancelled || !rating) return;
      setExistingRating(rating);
      setScore(rating.score);
      setTags(rating.tags);
      setComment(rating.comment);
      setWouldOrderAgain(rating.wouldOrderAgain);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user, dish.canonicalDishId]);

  function toggleTag(tag) {
    setTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      return current.length < 8 ? [...current, tag] : current;
    });
  }

  function addCustomTag() {
    const nextTag = cleanCustomTag(customTag);
    if (!nextTag || tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase()) || tags.length >= 8) return;
    setTags((current) => [...current, nextTag]);
    setCustomTag("");
  }

  function chooseFiles(event) {
    const selection = Array.from(event.target.files || []);
    setError("");
    try {
      validatePhotoSelection(selection);
      setFiles(selection);
    } catch (nextError) {
      setFiles([]);
      event.target.value = "";
      setError(nextError.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (score === null) return;
    if (!dishId) { setError("This dish is not currently offered at a selectable branch."); return; }
    setSaving(true);
    setError("");
    try {
      const ratingId = await createMeal({
        userId: user.id,
        dishId,
        score,
        tags,
        comment,
        visitedAt: visitedAt || existingRating?.visitedAt || today(),
        photos: files,
        photosPrivate,
        wouldOrderAgain,
        visitId,
      });
      await refresh();
      onSaved?.(ratingId);
    } catch (nextError) {
      setError(nextError.message || "This meal could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">{heading || "Rate this dish"}{progressLabel ? ` · ${progressLabel}` : ""}</p>
          <h3>{dish.name}</h3>
        </div>
        <span className="signed-in-email">{user.email}</span>
      </div>
      {existingRating && (
        <p className="field-help">
          You already rated this dish — saving updates your existing rating instead of adding a new one.
        </p>
      )}

      <fieldset className="fieldset-reset">
        <legend className="section-label">Your score</legend>
        <div className="score-grid">
          {Array.from({ length: 11 }, (_, value) => (
            <button
              key={value}
              type="button"
              className={`score-cell ${score === value ? "score-on" : ""}`}
              onClick={() => setScore(value)}
              aria-pressed={score === value}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="fieldset-reset">
        <legend className="section-label">Would you order it again?</legend>
        <div className="chip-row">
          <Chip active={wouldOrderAgain === true} onClick={() => setWouldOrderAgain((current) => current === true ? null : true)}>Yes</Chip>
          <Chip active={wouldOrderAgain === false} onClick={() => setWouldOrderAgain((current) => current === false ? null : false)}>No</Chip>
        </div>
      </fieldset>

      <fieldset className="fieldset-reset">
        <legend className="section-label">Describe it <span className="optional">up to 8</span></legend>
        <div className="rate-tags">
          {RATING_TAGS.map((tag) => (
            <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>{tag}</Chip>
          ))}
          {tags.filter((tag) => !RATING_TAGS.includes(tag)).map((tag) => (
            <Chip key={tag} active onClick={() => toggleTag(tag)}>{tag} ×</Chip>
          ))}
        </div>
        <div className="custom-tag-row">
          <input
            className="text-input"
            value={customTag}
            maxLength={30}
            onChange={(event) => setCustomTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Add your own descriptor"
            aria-label="Custom descriptor tag"
          />
          <button type="button" className="btn-quiet" onClick={addCustomTag} disabled={!customTag.trim() || tags.length >= 8}>Add tag</button>
        </div>
      </fieldset>

      <label className="field-label" htmlFor={`comment-${dishId}`}>Comment <span className="optional">optional</span></label>
      <textarea
        id={`comment-${dishId}`}
        className="text-area"
        maxLength={2000}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="What stood out about the dish?"
      />

      <label className="field-label" htmlFor={`photos-${dishId}`}>Photos <span className="optional">optional, up to 6</span></label>
      <input
        id={`photos-${dishId}`}
        className="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={chooseFiles}
      />
      <p className="field-help">Images are resized before upload. They're public and attached to this dish by default.</p>
      {previews.length > 0 && (
        <>
          <div className="photo-preview-row" aria-label="Selected photo previews">
            {previews.map(({ file, url }) => <img key={`${file.name}-${file.lastModified}`} src={url} alt={`Preview of ${file.name}`} />)}
          </div>
          <label className="repeat-order-field">
            <input type="checkbox" checked={photosPrivate} onChange={(event) => setPhotosPrivate(event.target.checked)} />
            <span>Keep these photos private (only visible to you)</span>
          </label>
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn-primary" type="submit" disabled={saving || score === null}>
        {saving ? "Saving…" : existingRating ? "Update rating" : "Save rating"}
      </button>
    </form>
  );
}
