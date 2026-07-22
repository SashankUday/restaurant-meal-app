import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { availableBranchesForDish, resolveInitialBranchDishId } from "../lib/catalog.js";
import { createMeal, fetchUserRatingForDish } from "../lib/api.js";
import { formatPrice, RATING_TAGS } from "../lib/constants.js";
import { validatePhotoSelection } from "../lib/image.js";
import AccountSignIn from "./AccountSignIn.jsx";
import Chip from "./Chip.jsx";
import TagPicker from "./TagPicker.jsx";

export default function MealForm({ dish, onSaved, initialDishId = null, quick = false }) {
  const { user } = useAuth();
  const { refresh } = useAppData();
  const branchOptions = useMemo(
    () => availableBranchesForDish(dish, { city: dish.isGrouped ? dish.city : undefined }),
    [dish],
  );
  const initialSelectedDishId = resolveInitialBranchDishId(
    dish,
    initialDishId,
    { city: dish.isGrouped ? dish.city : undefined },
  );
  const [selectedDishId, setSelectedDishId] = useState(initialSelectedDishId);
  const [score, setScore] = useState(null);
  const [wouldOrderAgain, setWouldOrderAgain] = useState(null);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [photosPrivate, setPhotosPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingRating, setExistingRating] = useState(null);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => {
    setSelectedDishId(resolveInitialBranchDishId(
      dish,
      initialDishId,
      { city: dish.isGrouped ? dish.city : undefined },
    ));
  }, [dish, initialDishId]);

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
      setSelectedDishId((current) => {
        if (current) return current;
        const wanted = String(rating.dishId);
        return branchOptions.some((branch) => String(branch.dishId) === wanted) ? wanted : current;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dish.canonicalDishId]);

  const selectedBranch = branchOptions.find((branch) => String(branch.dishId) === selectedDishId);

  if (!user) return <AccountSignIn compact />;

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
    if (score === null || !selectedBranch) {
      if (!selectedBranch) setError("Choose the branch where you ate this dish.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createMeal({
        userId: user.id,
        dishId: selectedBranch.dishId,
        score,
        tags: quick ? [] : tags,
        comment: quick ? "" : comment,
        photos: quick ? [] : files,
        photosPrivate,
        wouldOrderAgain,
      });
      await refresh();
      onSaved?.();
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
          <p className="eyebrow">{quick ? "Rate this dish" : "Log a meal"}</p>
          <h3>{dish.name}</h3>
        </div>
        <span className="signed-in-email">{user.email}</span>
      </div>
      {existingRating && (
        <p className="field-help">
          You already rated this dish — {quick ? "saving will update" : "logging a new visit will update"} your existing rating instead of adding a new one.
        </p>
      )}

      <label className="branch-picker" htmlFor={`branch-${dish.canonicalDishId || dish.id}`}>
        <span className="field-label">Branch</span>
        <select
          id={`branch-${dish.canonicalDishId || dish.id}`}
          className="select-input"
          value={selectedDishId}
          onChange={(event) => {
            setSelectedDishId(event.target.value);
            setError("");
          }}
          required
        >
          <option value="">Choose where you ate it</option>
          {branchOptions.map((branch) => (
            <option key={branch.dishId} value={String(branch.dishId)}>
              {branch.branchName || branch.restaurantName} · {branch.area} · {formatPrice(branch.price)}
            </option>
          ))}
        </select>
      </label>
      {selectedBranch && (
        <p className="field-help branch-choice">
          This rating will be saved to {selectedBranch.branchName || selectedBranch.restaurantName}’s menu item #{selectedBranch.dishId}.
        </p>
      )}
      {!branchOptions.length && <p className="form-error" role="alert">This dish is not currently offered at a selectable branch.</p>}

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
        <legend className="section-label">Order again? <span className="optional">optional</span></legend>
        <div className="repeat-order-field">
          <span>Would you order it again?</span>
          <div className="chip-row">
            <Chip active={wouldOrderAgain === true} onClick={() => setWouldOrderAgain((current) => current === true ? null : true)}>Yes</Chip>
            <Chip active={wouldOrderAgain === false} onClick={() => setWouldOrderAgain((current) => current === false ? null : false)}>No</Chip>
          </div>
        </div>
      </fieldset>

      {!quick && (
        <>
          <TagPicker presetTags={RATING_TAGS} tags={tags} onChange={setTags} label="Describe it" ariaLabel="Custom descriptor tag" />

          <label className="field-label" htmlFor={`comment-${dish.id}`}>Comment <span className="optional">optional</span></label>
          <textarea
            id={`comment-${dish.id}`}
            className="text-area"
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What stood out about the dish?"
          />

          <label className="field-label" htmlFor={`photos-${dish.id}`}>Photos <span className="optional">optional, up to 6</span></label>
          <input
            id={`photos-${dish.id}`}
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
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn-primary" type="submit" disabled={saving || score === null || !selectedBranch}>
        {saving ? "Saving…" : existingRating ? "Update rating" : quick ? "Save rating" : "Save to My Meals"}
      </button>
    </form>
  );
}
