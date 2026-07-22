import { useState } from "react";
import { formatTag } from "../lib/constants.js";
import Chip from "./Chip.jsx";

export function cleanCustomTag(tag) {
  return formatTag(tag.trim().replace(/\s+/g, " ").slice(0, 30));
}

// Shared preset-chips + custom-tag input, used by the rating tag picker and by
// editor tag editing (e.g. dish tags / Chef's special).
export default function TagPicker({ presetTags, tags, onChange, max = 8, label = "Descriptors", ariaLabel = "Custom tag" }) {
  const [customTag, setCustomTag] = useState("");

  function toggleTag(tag) {
    if (tags.includes(tag)) {
      onChange(tags.filter((item) => item !== tag));
      return;
    }
    if (tags.length < max) onChange([...tags, tag]);
  }

  function addCustomTag() {
    const nextTag = cleanCustomTag(customTag);
    if (!nextTag || tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase()) || tags.length >= max) return;
    onChange([...tags, nextTag]);
    setCustomTag("");
  }

  return (
    <fieldset className="fieldset-reset">
      <legend className="section-label">{label} <span className="optional">up to {max}</span></legend>
      <div className="rate-tags">
        {presetTags.map((tag) => (
          <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>{tag}</Chip>
        ))}
        {tags.filter((tag) => !presetTags.includes(tag)).map((tag) => (
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
          aria-label={ariaLabel}
        />
        <button type="button" className="btn-quiet" onClick={addCustomTag} disabled={!customTag.trim() || tags.length >= max}>Add tag</button>
      </div>
    </fieldset>
  );
}
