import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext.jsx";
import { EMPTY_FILTERS, formatPrice } from "../lib/constants.js";
import { findGroupMatches, tokenizeQuery } from "../lib/search.js";
import { ErrorState, LoadingState } from "../components/AsyncState.jsx";
import DishModal from "../components/DishModal.jsx";
import Filters from "../components/Filters.jsx";
import PlateScore from "../components/PlateScore.jsx";

const INITIAL_PEOPLE = [
  { id: "person-1", name: "Person 1", query: "" },
  { id: "person-2", name: "Person 2", query: "" },
];

function GroupResultCard({ result, onOpenDish }) {
  return (
    <article className={`group-result-card ${result.isComplete ? "group-result-complete" : "group-result-partial"}`}>
      <header className="group-result-head">
        <div>
          <span className="result-kicker">{result.isComplete ? "Works for everyone" : `${result.matchedCount} preferences matched`}</span>
          <h2><Link to={`/restaurant/${result.restaurant.id}`}>{result.restaurant.name}</Link></h2>
          <p>{result.restaurant.cuisine} · {result.restaurant.area}</p>
        </div>
        <PlateScore score={result.restaurant.score} />
      </header>
      <div className="group-match-grid">
        {result.matchesByPerson.map(({ person, matches }) => (
          <section key={person.id} className={matches.length ? "person-match" : "person-match person-unmatched"}>
            <p className="person-label">For {person.name}</p>
            <p className="person-query">“{person.query}”</p>
            {matches.length ? (
              <div className="matched-dishes">
                {matches.slice(0, 3).map(({ dish }) => (
                  <button type="button" key={dish.id} onClick={() => onOpenDish(dish.id)}>
                    <strong>{dish.name}</strong>
                    <span>{dish.score.toFixed(1)} · {formatPrice(dish.price)}</span>
                  </button>
                ))}
              </div>
            ) : <p className="unmatched-label">No matching dish</p>}
          </section>
        ))}
      </div>
    </article>
  );
}

export default function GroupPage() {
  const { dishes, restaurants, loading, error, refresh } = useAppData();
  const [people, setPeople] = useState(INITIAL_PEOPLE);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState(null);

  const results = useMemo(() => findGroupMatches(dishes, restaurants, people, filters), [dishes, restaurants, people, filters]);
  const ready = people.every((person) => tokenizeQuery(person.query).length > 0);
  const activeFilters = filters.diets.length + filters.allergens.length
    + (filters.course ? 1 : 0) + (filters.mealTime && filters.mealTime !== "any" ? 1 : 0);

  function updatePerson(id, field, value) {
    setPeople((current) => current.map((person) => person.id === id ? { ...person, [field]: value } : person));
  }

  function addPerson() {
    setPeople((current) => [...current, { id: crypto.randomUUID(), name: `Person ${current.length + 1}`, query: "" }]);
  }

  function removePerson(id) {
    setPeople((current) => current.filter((person) => person.id !== id));
  }

  if (loading) return <LoadingState label="Gathering everyone’s options…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const openDish = dishes.find((dish) => dish.id === openId);

  return (
    <>
      <section className="page-intro group-intro">
        <p className="eyebrow">One restaurant, everyone happy</p>
        <h1>Find a table for every taste.</h1>
        <p>Give each person a craving. Plate finds restaurants with at least one matching dish for every box, then ranks the strongest shared options.</p>
      </section>

      <main className="group-page">
        <section className="people-builder" aria-label="Group taste preferences">
          <div className="people-grid">
            {people.map((person, index) => (
              <div className="person-query-card" key={person.id}>
                <div className="person-query-head">
                  <label className="sr-only" htmlFor={`name-${person.id}`}>Name for person {index + 1}</label>
                  <input
                    id={`name-${person.id}`}
                    className="person-name-input"
                    value={person.name}
                    maxLength={30}
                    onChange={(event) => updatePerson(person.id, "name", event.target.value)}
                  />
                  {people.length > 2 && <button type="button" className="remove-person" onClick={() => removePerson(person.id)} aria-label={`Remove ${person.name}`}>×</button>}
                </div>
                <label className="sr-only" htmlFor={`query-${person.id}`}>Taste preferences for {person.name}</label>
                <textarea
                  id={`query-${person.id}`}
                  value={person.query}
                  onChange={(event) => updatePerson(person.id, "query", event.target.value)}
                  placeholder={index === 0 ? "sweet and spicy" : index === 1 ? "soupy and comforting" : "crispy with something fresh"}
                />
              </div>
            ))}
          </div>
          <div className="builder-actions">
            <button type="button" className="btn-quiet" onClick={addPerson}>+ Add another person</button>
            <button className={`chip ${showFilters || activeFilters ? "chip-on" : ""}`} type="button" onClick={() => setShowFilters((value) => !value)}>
              Shared filters{activeFilters ? ` · ${activeFilters}` : ""}
            </button>
          </div>
          {showFilters && <Filters filters={filters} onChange={setFilters} />}
        </section>

        {!ready ? (
          <div className="group-prompt"><span>1</span><p>Add a craving for each person to see where the whole group can eat.</p></div>
        ) : results.complete.length > 0 ? (
          <section className="group-results">
            <div className="results-heading">
              <div><p className="eyebrow">Best shared matches</p><h2>{results.complete.length} {results.complete.length === 1 ? "restaurant works" : "restaurants work"} for everyone</h2></div>
              <p>Ranked by the number, relevance and PlateScore of matching dishes.</p>
            </div>
            {results.complete.map((result) => <GroupResultCard key={result.restaurant.id} result={result} onOpenDish={setOpenId} />)}
          </section>
        ) : (
          <section className="group-results">
            <div className="no-complete-match">
              <p className="empty-title">No single restaurant satisfies every craving yet.</p>
              <p>These are the closest options. Each missing preference is labelled clearly.</p>
            </div>
            {results.partial.map((result) => <GroupResultCard key={result.restaurant.id} result={result} onOpenDish={setOpenId} />)}
            {results.partial.length === 0 && <div className="empty"><p>None of the current menus match these searches and filters.</p></div>}
          </section>
        )}
      </main>
      {openDish && <DishModal key={openDish.id} dish={openDish} initialDishId={openDish.id} onClose={() => setOpenId(null)} />}
    </>
  );
}
