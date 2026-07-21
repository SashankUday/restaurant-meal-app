import { useEffect, useMemo, useRef, useState } from "react";

// A typeahead combobox over grouped options. `options` is a flat array of
// { value, label, group } and the visible list is filtered by the typed text
// and split into its groups (e.g. Mains / Sides & Drinks) so a long menu stays
// navigable. `value` is the selected option's value; onChange gives it back.
export default function SearchableSelect({
  options, value, onChange, placeholder = "Search…", groupOrder = [], disabled = false, id,
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const wrapRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    function onDocClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const grouped = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const matches = options.filter((option) => !needle || option.label.toLowerCase().includes(needle));
    const byGroup = new Map();
    matches.forEach((option) => {
      const key = option.group || "";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(option);
    });
    const orderedKeys = [
      ...groupOrder.filter((key) => byGroup.has(key)),
      ...[...byGroup.keys()].filter((key) => !groupOrder.includes(key)),
    ];
    return orderedKeys.map((key) => ({ group: key, items: byGroup.get(key) }));
  }, [options, text, groupOrder]);

  function choose(option) {
    onChange(option.value);
    setText("");
    setOpen(false);
  }

  return (
    <div className={`searchable-select ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
      <input
        id={id}
        className="text-input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        value={open ? text : (selected?.label || "")}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setText(event.target.value); setOpen(true); }}
      />
      {open && !disabled && (
        <div className="searchable-menu" role="listbox">
          {grouped.length === 0 && <p className="searchable-empty">No matches.</p>}
          {grouped.map(({ group, items }) => (
            <div key={group || "_"} className="searchable-group">
              {group && <p className="searchable-group-label">{group}</p>}
              {items.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                  className={`searchable-option ${String(option.value) === String(value) ? "is-selected" : ""}`}
                  onClick={() => choose(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
