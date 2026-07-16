import { useState, useMemo } from "react";

/* ---------- Data ---------- */

const RATING_TAGS = [
  "Would order again", "Great value", "Generous portion", "Fresh",
  "Rich", "Spicy", "Crispy", "Comforting", "Overpriced", "Small portion",
];

const ALLERGENS = ["Gluten", "Dairy", "Nuts", "Shellfish", "Egg", "Soy", "Sesame"];
const DIETS = ["Vegetarian", "Vegan", "Gluten-free"];

const SEED = [
  { id: 1, name: "Falafel Wrap", restaurant: "Najar's Place", area: "St Giles'", cuisine: "Lebanese", price: 5.5, score: 9.1, count: 214, diets: ["Vegetarian", "Vegan"], allergens: ["Gluten", "Sesame"], tags: { "Would order again": 162, "Great value": 149, "Fresh": 96 }, desc: "Hand-rolled falafel, pickled turnip, tahini and chilli in warm flatbread. The queue exists for a reason." },
  { id: 2, name: "Halloumi & Za'atar Wrap", restaurant: "Najar's Place", area: "St Giles'", cuisine: "Lebanese", price: 6.0, score: 8.6, count: 158, diets: ["Vegetarian"], allergens: ["Gluten", "Dairy", "Sesame"], tags: { "Comforting": 84, "Great value": 77, "Would order again": 71 }, desc: "Grilled halloumi dusted with za'atar, tomato, mint and garlic sauce." },
  { id: 3, name: "Aubergine Massaman", restaurant: "Oli's Thai", area: "Iffley Road", cuisine: "Thai", price: 14.5, score: 9.4, count: 187, diets: ["Vegetarian", "Vegan"], allergens: ["Nuts"], tags: { "Rich": 121, "Would order again": 118, "Comforting": 88 }, desc: "Slow-cooked aubergine in a deep massaman curry with peanuts and jasmine rice. Book weeks ahead — worth it." },
  { id: 4, name: "Pad Krapow Chicken", restaurant: "Oli's Thai", area: "Iffley Road", cuisine: "Thai", price: 13.0, score: 8.9, count: 143, diets: [], allergens: ["Soy", "Egg"], tags: { "Spicy": 97, "Fresh": 64, "Would order again": 59 }, desc: "Holy basil stir-fry with a crispy fried egg. Properly hot — ask for medium if unsure." },
  { id: 5, name: "Jerk Chicken", restaurant: "Spiced Roots", area: "Cowley Road", cuisine: "Caribbean", price: 16.0, score: 8.7, count: 129, diets: [], allergens: [], tags: { "Spicy": 78, "Generous portion": 66, "Would order again": 58 }, desc: "Charred jerk chicken with rice & peas and scotch bonnet heat that builds slowly." },
  { id: 6, name: "Curried Goat", restaurant: "Spiced Roots", area: "Cowley Road", cuisine: "Caribbean", price: 17.5, score: 8.8, count: 104, diets: [], allergens: [], tags: { "Rich": 71, "Comforting": 55, "Generous portion": 49 }, desc: "Slow-braised goat, falling off the bone, with plantain and coconut rice." },
  { id: 7, name: "Hot Battered Cuttlefish", restaurant: "The Coconut Tree", area: "George Street", cuisine: "Sri Lankan", price: 8.5, score: 8.4, count: 96, diets: [], allergens: ["Shellfish", "Gluten"], tags: { "Crispy": 63, "Spicy": 51, "Would order again": 40 }, desc: "Crisp-fried cuttlefish tossed in fiery Sri Lankan spice. Made for sharing, rarely shared." },
  { id: 8, name: "Dhal & Pol Sambol Hopper", restaurant: "The Coconut Tree", area: "George Street", cuisine: "Sri Lankan", price: 7.0, score: 8.2, count: 88, diets: ["Vegetarian", "Vegan", "Gluten-free"], allergens: [], tags: { "Fresh": 47, "Great value": 43, "Would order again": 36 }, desc: "Lacy coconut hopper with creamy dhal and fresh coconut sambol." },
  { id: 9, name: "Moules Marinière", restaurant: "Pierre Victoire", area: "Little Clarendon St", cuisine: "French", price: 13.9, score: 8.1, count: 74, diets: [], allergens: ["Shellfish", "Dairy"], tags: { "Fresh": 39, "Comforting": 31, "Great value": 27 }, desc: "A kilo of mussels in white wine, garlic and cream, with frites for the sauce." },
  { id: 10, name: "Duck Confit", restaurant: "Pierre Victoire", area: "Little Clarendon St", cuisine: "French", price: 18.5, score: 8.5, count: 91, diets: ["Gluten-free"], allergens: [], tags: { "Rich": 58, "Crispy": 44, "Would order again": 39 }, desc: "Crisp-skinned duck leg with dauphinoise and a red wine jus." },
  { id: 11, name: "Oxford Blue Bagel", restaurant: "G&D's Café", area: "St Aldate's", cuisine: "Café", price: 6.2, score: 7.8, count: 67, diets: ["Vegetarian"], allergens: ["Gluten", "Dairy"], tags: { "Comforting": 34, "Great value": 28, "Rich": 22 }, desc: "Toasted bagel with melted Oxford Blue cheese. A late-night institution." },
  { id: 12, name: "Cookie Dough Ice Cream", restaurant: "G&D's Café", area: "St Aldate's", cuisine: "Café", price: 4.5, score: 8.3, count: 112, diets: ["Vegetarian"], allergens: ["Dairy", "Egg", "Gluten"], tags: { "Comforting": 74, "Would order again": 61, "Great value": 48 }, desc: "Made in-house daily. The scoop that ends most Cowley Road evenings." },
  { id: 13, name: "Khao Man Gai", restaurant: "Sasi's Thai", area: "Gloucester Green", cuisine: "Thai", price: 9.0, score: 9.0, count: 176, diets: ["Gluten-free"], allergens: ["Soy"], tags: { "Great value": 118, "Would order again": 102, "Comforting": 71 }, desc: "Poached chicken and ginger rice from the market stall with the longest Wednesday queue in Oxford." },
  { id: 14, name: "Chicken Katsu Curry", restaurant: "Taberu", area: "Cowley Road", cuisine: "Japanese", price: 12.5, score: 8.6, count: 98, diets: [], allergens: ["Gluten", "Egg", "Soy"], tags: { "Crispy": 66, "Comforting": 52, "Generous portion": 41 }, desc: "Panko chicken, glossy house curry sauce, pickles and sticky rice." },
];

const SPONSORED = { id: 100, sponsored: true, name: "Wild Mushroom Gnocchi", restaurant: "Branca", area: "Walton Street", cuisine: "Italian", price: 15.0, score: 8.0, count: 52, diets: ["Vegetarian"], allergens: ["Gluten", "Dairy"], tags: { "Rich": 29, "Comforting": 24, "Fresh": 15 }, desc: "Hand-rolled gnocchi with wild mushrooms, sage butter and parmesan." };

/* ---------- Small pieces ---------- */

function PlateScore({ score, size = 56 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const filled = c * (score / 10);
  return (
    <div className="plate-score" style={{ width: size, height: size }} aria-label={`Rated ${score.toFixed(1)} out of 10`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="#fff" stroke="var(--rim)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="4"
          strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="plate-score-num" style={{ fontSize: size * 0.3 }}>{score.toFixed(1)}</span>
    </div>
  );
}

function Chip({ active, onClick, children, tone }) {
  return (
    <button className={`chip ${active ? "chip-on" : ""} ${tone === "warn" && active ? "chip-warn" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

/* ---------- Dish card ---------- */

function DishCard({ dish, onOpen }) {
  const topTags = Object.entries(dish.tags).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <article className={`card ${dish.sponsored ? "card-sponsored" : ""}`} onClick={() => onOpen(dish)}
      role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(dish)}>
      {dish.sponsored && (
        <div className="sponsored-band">
          <span>Sponsored</span>
          <span className="sponsored-note">Paid placement — never affects rankings</span>
        </div>
      )}
      <div className="card-body">
        <div className="card-top">
          <div>
            <h3 className="dish-name">{dish.name}</h3>
            <p className="dish-where">{dish.restaurant} · {dish.area}</p>
          </div>
          <PlateScore score={dish.score} />
        </div>
        <p className="dish-desc">{dish.desc}</p>
        <div className="card-foot">
          <span className="price">£{dish.price.toFixed(2)}</span>
          <span className="count">{dish.count} ratings</span>
        </div>
        <div className="tag-row">
          {topTags.map(([t]) => <span key={t} className="tag">{t}</span>)}
          {dish.diets.map((d) => <span key={d} className="tag tag-diet">{d}</span>)}
        </div>
      </div>
    </article>
  );
}

/* ---------- Detail + rating modal ---------- */

function DishModal({ dish, onClose, onRate }) {
  const [mode, setMode] = useState("view"); // view | rate | done
  const [score, setScore] = useState(null);
  const [tags, setTags] = useState([]);

  const toggleTag = (t) =>
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 3 ? [...prev, t] : prev);

  const submit = () => {
    onRate(dish.id, score, tags);
    setMode("done");
  };

  const sortedTags = Object.entries(dish.tags).sort((a, b) => b[1] - a[1]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-head">
          <div>
            <p className="eyebrow">{dish.cuisine} · {dish.restaurant} · {dish.area}</p>
            <h2 className="modal-title">{dish.name}</h2>
          </div>
          <PlateScore score={dish.score} size={72} />
        </div>

        <p className="modal-desc">{dish.desc}</p>

        <div className="modal-meta">
          <div><span className="meta-label">Price</span><span className="meta-val">£{dish.price.toFixed(2)}</span></div>
          <div><span className="meta-label">Ratings</span><span className="meta-val">{dish.count}</span></div>
          <div>
            <span className="meta-label">Contains</span>
            <span className="meta-val">{dish.allergens.length ? dish.allergens.join(", ") : "No major allergens listed"}</span>
          </div>
        </div>
        <p className="allergen-note">Allergen information is provided by the restaurant. Always confirm with staff before ordering.</p>

        {mode === "view" && (
          <>
            <h4 className="section-label">What diners say</h4>
            <div className="tag-bars">
              {sortedTags.map(([t, n]) => (
                <div key={t} className="tag-bar">
                  <span className="tag-bar-name">{t}</span>
                  <div className="tag-bar-track"><div className="tag-bar-fill" style={{ width: `${(n / dish.count) * 100}%` }} /></div>
                  <span className="tag-bar-n">{n}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setMode("rate")}>I ate this — rate it</button>
          </>
        )}

        {mode === "rate" && (
          <>
            <h4 className="section-label">Your score</h4>
            <div className="score-grid">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} className={`score-cell ${score === i ? "score-on" : ""}`} onClick={() => setScore(i)}>{i}</button>
              ))}
            </div>
            <h4 className="section-label">Add up to 3 tags <span className="optional">(optional)</span></h4>
            <div className="rate-tags">
              {RATING_TAGS.map((t) => (
                <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</Chip>
              ))}
            </div>
            <button className="btn-primary" disabled={score === null} onClick={submit}>Submit rating</button>
          </>
        )}

        {mode === "done" && (
          <div className="done">
            <div className="done-plate">✓</div>
            <p>Rating saved. It's already in the rankings.</p>
            <button className="btn-quiet" onClick={onClose}>Back to search</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [dishes, setDishes] = useState(SEED);
  const [sponsored, setSponsored] = useState(SPONSORED);
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState([]);
  const [excluded, setExcluded] = useState([]);
  const [sort, setSort] = useState("top");
  const [open, setOpen] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggle = (setter) => (v) =>
    setter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const passes = (d) => {
    const q = query.trim().toLowerCase();
    if (q && ![d.name, d.restaurant, d.cuisine, d.area, ...Object.keys(d.tags)].join(" ").toLowerCase().includes(q)) return false;
    if (diet.includes("Vegetarian") && !d.diets.includes("Vegetarian") && !d.diets.includes("Vegan")) return false;
    if (diet.includes("Vegan") && !d.diets.includes("Vegan")) return false;
    if (diet.includes("Gluten-free") && !d.diets.includes("Gluten-free")) return false;
    if (excluded.some((a) => d.allergens.includes(a))) return false; // hidden entirely, never flagged
    return true;
  };

  const results = useMemo(() => {
    const list = dishes.filter(passes);
    if (sort === "top") list.sort((a, b) => b.score - a.score);
    if (sort === "price") list.sort((a, b) => a.price - b.price);
    if (sort === "count") list.sort((a, b) => b.count - a.count);
    return list;
  }, [dishes, query, diet, excluded, sort]);

  const showSponsored = passes(sponsored);

  const handleRate = (id, score, tags) => {
    const apply = (d) => {
      if (d.id !== id) return d;
      const count = d.count + 1;
      const newScore = (d.score * d.count + score) / count;
      const newTags = { ...d.tags };
      tags.forEach((t) => { newTags[t] = (newTags[t] || 0) + 1; });
      return { ...d, count, score: newScore, tags: newTags };
    };
    setDishes((prev) => prev.map(apply));
    setSponsored((prev) => apply(prev));
    setOpen((prev) => (prev && prev.id === id ? apply(prev) : prev));
  };

  const activeFilters = diet.length + excluded.length;

  return (
    <div className="page">
      <style>{CSS}</style>

      <header className="header">
        <div className="wordmark">
          <span className="mark" aria-hidden="true"><span className="mark-dot" /></span>
          Plate
        </div>
        <span className="city">Oxford</span>
      </header>

      <section className="hero">
        <h1 className="hero-title">Find the dish,<br />not just the restaurant.</h1>
        <p className="hero-sub">Honest, dish-level ratings from Oxford diners. Search what you're craving — Plate tells you where it's best.</p>
        <div className="search-wrap">
          <input
            className="search"
            placeholder="Katsu curry, falafel, something spicy…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search dishes"
          />
        </div>
      </section>

      <div className="controls">
        <button className={`chip ${showFilters || activeFilters ? "chip-on" : ""}`} onClick={() => setShowFilters(!showFilters)}>
          Filters{activeFilters ? ` · ${activeFilters}` : ""}
        </button>
        <div className="sorts">
          {[["top", "Top rated"], ["price", "Cheapest"], ["count", "Most rated"]].map(([k, label]) => (
            <button key={k} className={`sort-btn ${sort === k ? "sort-on" : ""}`} onClick={() => setSort(k)}>{label}</button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-label">Diet</span>
            <div className="chip-row">
              {DIETS.map((d) => <Chip key={d} active={diet.includes(d)} onClick={() => toggle(setDiet)(d)}>{d}</Chip>)}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Hide dishes containing</span>
            <div className="chip-row">
              {ALLERGENS.map((a) => <Chip key={a} tone="warn" active={excluded.includes(a)} onClick={() => toggle(setExcluded)(a)}>{a}</Chip>)}
            </div>
            {excluded.length > 0 && <p className="filter-note">Dishes with these allergens are hidden completely, including sponsored results.</p>}
          </div>
        </div>
      )}

      <main className="grid">
        {showSponsored && <DishCard dish={sponsored} onOpen={setOpen} />}
        {results.map((d) => <DishCard key={d.id} dish={d} onOpen={setOpen} />)}
        {results.length === 0 && !showSponsored && (
          <div className="empty">
            <p className="empty-title">Nothing matches yet.</p>
            <p>Try fewer filters or a broader search — new dishes are rated every day.</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p><strong>Rankings you can trust.</strong> Every score comes from diners. Sponsored slots are always labelled and never change the organic order.</p>
        <p className="footer-fine">Plate · Oxford · Allergen details are restaurant-provided — always confirm with staff.</p>
      </footer>

      {open && <DishModal dish={open} onClose={() => setOpen(null)} onRate={handleRate} />}
    </div>
  );
}

/* ---------- Styles ---------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;500;600;700&display=swap');

:root{
  --bg:#FBF4EA;
  --ink:#33221A;
  --muted:#8C7462;
  --accent:#C4401F;
  --accent-deep:#9E3014;
  --rim:#EBDCC8;
  --card:#FFFFFF;
  --diet:#5E7A3A;
  --gold:#D99A2B;
}
*{box-sizing:border-box;margin:0;padding:0}
.page{min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Figtree',sans-serif;-webkit-font-smoothing:antialiased}

.header{display:flex;justify-content:space-between;align-items:center;padding:22px clamp(18px,5vw,56px)}
.wordmark{font-family:'Young Serif',serif;font-size:26px;display:flex;align-items:center;gap:10px;letter-spacing:-0.01em}
.mark{width:26px;height:26px;border-radius:50%;border:2.5px solid var(--ink);display:inline-flex;align-items:center;justify-content:center}
.mark-dot{width:9px;height:9px;border-radius:50%;background:var(--accent)}
.city{font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);border:1px solid var(--rim);border-radius:99px;padding:6px 14px;background:var(--card)}

.hero{text-align:center;padding:clamp(36px,7vw,72px) 20px 12px;max-width:760px;margin:0 auto}
.hero-title{font-family:'Young Serif',serif;font-size:clamp(34px,6vw,58px);line-height:1.06;letter-spacing:-0.015em}
.hero-sub{margin-top:16px;color:var(--muted);font-size:clamp(15px,2vw,17px);line-height:1.55;max-width:520px;margin-left:auto;margin-right:auto}
.search-wrap{margin-top:28px}
.search{width:100%;max-width:560px;padding:18px 26px;font-size:17px;font-family:inherit;border-radius:99px;border:1.5px solid var(--rim);background:var(--card);color:var(--ink);outline:none;box-shadow:0 6px 24px rgba(51,34,26,0.06);transition:border-color .15s}
.search:focus{border-color:var(--accent)}
.search::placeholder{color:#B7A292}

.controls{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;max-width:1120px;margin:36px auto 0;padding:0 clamp(18px,5vw,56px)}
.sorts{display:flex;gap:4px;background:var(--card);border:1px solid var(--rim);border-radius:99px;padding:4px}
.sort-btn{border:none;background:transparent;font-family:inherit;font-size:13.5px;font-weight:600;color:var(--muted);padding:8px 16px;border-radius:99px;cursor:pointer;transition:all .12s}
.sort-btn:hover{color:var(--ink)}
.sort-on{background:var(--ink);color:#FBF4EA}
.sort-on:hover{color:#FBF4EA}

.chip{border:1.5px solid var(--rim);background:var(--card);font-family:inherit;font-size:13.5px;font-weight:600;color:var(--ink);padding:9px 16px;border-radius:99px;cursor:pointer;transition:all .12s}
.chip:hover{border-color:var(--muted)}
.chip-on{background:var(--ink);border-color:var(--ink);color:#FBF4EA}
.chip-warn{background:var(--accent-deep);border-color:var(--accent-deep)}

.filter-panel{max-width:1120px;margin:16px auto 0;padding:20px clamp(18px,5vw,56px);display:flex;flex-direction:column;gap:16px}
.filter-group{display:flex;flex-direction:column;gap:10px}
.filter-label{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.filter-note{font-size:13px;color:var(--muted)}

.grid{max-width:1120px;margin:28px auto 0;padding:0 clamp(18px,5vw,56px);display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}

.card{background:var(--card);border:1px solid var(--rim);border-radius:20px;overflow:hidden;cursor:pointer;transition:transform .14s,box-shadow .14s}
.card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(51,34,26,0.09)}
.card:focus-visible{outline:2.5px solid var(--accent);outline-offset:2px}
.card-sponsored{border:1.5px dashed #D8B48F;background:#FFF9F1}
.sponsored-band{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 20px;background:#F4E3CB;font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7A5A2E}
.sponsored-note{font-weight:500;text-transform:none;letter-spacing:0;font-size:11.5px}
.card-body{padding:20px}
.card-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.dish-name{font-family:'Young Serif',serif;font-size:20px;line-height:1.15;letter-spacing:-0.01em}
.dish-where{margin-top:5px;font-size:13.5px;color:var(--muted);font-weight:500}
.dish-desc{margin-top:12px;font-size:14px;line-height:1.5;color:#5C4536}
.card-foot{display:flex;justify-content:space-between;margin-top:14px;font-size:14px}
.price{font-weight:700}
.count{color:var(--muted)}
.tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.tag{font-size:12px;font-weight:600;padding:4px 10px;border-radius:99px;background:var(--bg);border:1px solid var(--rim);color:#6B5241}
.tag-diet{background:#EFF3E4;border-color:#D5DEBE;color:var(--diet)}

.plate-score{position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.plate-score-num{position:absolute;font-family:'Young Serif',serif;color:var(--ink)}

.empty{grid-column:1/-1;text-align:center;padding:64px 20px;color:var(--muted);line-height:1.6}
.empty-title{font-family:'Young Serif',serif;font-size:22px;color:var(--ink);margin-bottom:8px}

.footer{max-width:1120px;margin:56px auto 0;padding:32px clamp(18px,5vw,56px) 48px;border-top:1px solid var(--rim);color:var(--muted);font-size:14px;line-height:1.6}
.footer strong{color:var(--ink)}
.footer-fine{margin-top:10px;font-size:12.5px}

.overlay{position:fixed;inset:0;background:rgba(51,34,26,0.4);display:flex;align-items:flex-end;justify-content:center;z-index:50;padding:0}
@media(min-width:640px){.overlay{align-items:center;padding:24px}}
.modal{background:var(--card);border-radius:24px 24px 0 0;width:100%;max-width:600px;max-height:92vh;overflow-y:auto;padding:32px 28px 36px;position:relative}
@media(min-width:640px){.modal{border-radius:24px}}
.close{position:absolute;top:16px;right:18px;border:none;background:var(--bg);width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;color:var(--ink);line-height:1}
.modal-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-right:40px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}
.modal-title{font-family:'Young Serif',serif;font-size:30px;line-height:1.1;margin-top:6px;letter-spacing:-0.015em}
.modal-desc{margin-top:14px;line-height:1.55;color:#5C4536;font-size:15px}
.modal-meta{display:flex;gap:28px;flex-wrap:wrap;margin-top:20px;padding:16px 18px;background:var(--bg);border-radius:14px}
.modal-meta>div{display:flex;flex-direction:column;gap:3px}
.meta-label{font-size:11.5px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted)}
.meta-val{font-size:14.5px;font-weight:600}
.allergen-note{margin-top:10px;font-size:12.5px;color:var(--muted)}

.section-label{font-size:13px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);margin:26px 0 12px}
.optional{font-weight:500;text-transform:none;letter-spacing:0}
.tag-bars{display:flex;flex-direction:column;gap:9px}
.tag-bar{display:grid;grid-template-columns:140px 1fr 36px;align-items:center;gap:12px;font-size:13.5px}
.tag-bar-name{font-weight:600}
.tag-bar-track{height:8px;background:var(--bg);border-radius:99px;overflow:hidden}
.tag-bar-fill{height:100%;background:var(--accent);border-radius:99px}
.tag-bar-n{color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}

.score-grid{display:grid;grid-template-columns:repeat(11,1fr);gap:6px}
@media(max-width:520px){.score-grid{grid-template-columns:repeat(6,1fr)}}
.score-cell{aspect-ratio:1;border:1.5px solid var(--rim);background:var(--card);border-radius:12px;font-family:'Young Serif',serif;font-size:16px;color:var(--ink);cursor:pointer;transition:all .1s}
.score-cell:hover{border-color:var(--accent)}
.score-on{background:var(--accent);border-color:var(--accent);color:#fff}
.rate-tags{display:flex;flex-wrap:wrap;gap:8px}

.btn-primary{margin-top:26px;width:100%;padding:16px;border:none;border-radius:99px;background:var(--accent);color:#fff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:background .12s}
.btn-primary:hover{background:var(--accent-deep)}
.btn-primary:disabled{background:#E0CDBB;cursor:not-allowed}
.btn-quiet{margin-top:18px;padding:12px 24px;border:1.5px solid var(--rim);border-radius:99px;background:var(--card);font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;color:var(--ink)}
.done{text-align:center;padding:32px 0 8px}
.done-plate{width:64px;height:64px;border-radius:50%;border:3px solid var(--accent);color:var(--accent);font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.done p{font-size:16px;line-height:1.5}

@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;