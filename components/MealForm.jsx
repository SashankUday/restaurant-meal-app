import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import { createMeal } from "../lib/api.js";
import { RATING_TAGS } from "../lib/constants.js";
import { validatePhotoSelection } from "../lib/image.js";
import AccountSignIn from "./AccountSignIn.jsx";
import Chip from "./Chip.jsx";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanCustomTag(tag) {
  return tag.trim().replace(/\s+/g, " ").slice(0, 30);
}

export default function MealForm({ dish, onSaved }) {
  const { user } = useAuth();
  const { refresh } = useAppData();
  const [score, setScore] = useState(null);
  const [tags, setTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [comment, setComment] = useState("");
  const [visitedAt, setVisitedAt] = useState(today());
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  if (!user) return <AccountSignIn compact />;

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
    setSaving(true);
    setError("");
    try {
      await createMeal({
        userId: user.id,
        dishId: dish.id,
        score,
        tags,
        comment,
        visitedAt,
        photos: files,
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
          <p className="eyebrow">Log a meal</p>
          <h3>{dish.name}</h3>
        </div>
        <span className="signed-in-email">{user.email}</span>
      </div>

      <label className="field-label" htmlFor={`visited-${dish.id}`}>Visit date</label>
      <input
        id={`visited-${dish.id}`}
        className="text-input date-input"
        type="date"
        max={today()}
        value={visitedAt}
        onChange={(event) => setVisitedAt(event.target.value)}
        required
      />

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
      <p className="field-help">Images are resized before upload and kept in your private meal history.</p>
      {previews.length > 0 && (
        <div className="photo-preview-row" aria-label="Selected photo previews">
          {previews.map(({ file, url }) => <img key={`${file.name}-${file.lastModified}`} src={url} alt={`Preview of ${file.name}`} />)}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn-primary" type="submit" disabled={saving || score === null}>
        {saving ? "Saving your meal…" : "Save to My Meals"}
      </button>
    </form>
  );
}
