const CONNECTIVE_WORDS = new Set([
  "a", "an", "and", "at", "for", "from", "in", "of", "or", "the", "to", "with",
]);

function normalise(value = "") {
  return value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenizeQuery(query) {
  return normalise(query)
    .split(/\s+/)
    .filter((token) => token.length > 0 && !CONNECTIVE_WORDS.has(token));
}

function fieldTokens(value) {
  const text = normalise(value);
  return { text, tokens: text.split(/\s+/).filter(Boolean) };
}

function tokenMatches(token, field) {
  return field.tokens.some((candidate) => (
    candidate === token
    || (token.length >= 3 && candidate.startsWith(token))
    || (candidate.length >= 4 && token.startsWith(candidate))
  ));
}

export function matchDish(dish, query) {
  const queryTokens = tokenizeQuery(query);
  if (!queryTokens.length) return { matches: true, quality: 0, matchedTokens: [] };

  const fields = [
    { ...fieldTokens(dish.name), weight: 6 },
    { ...fieldTokens(dish.restaurantName), weight: 5 },
    { ...fieldTokens(dish.cuisine), weight: 4 },
    { ...fieldTokens(dish.area), weight: 4 },
    { ...fieldTokens((dish.searchTags || []).join(" ")), weight: 6 },
    { ...fieldTokens(Object.keys(dish.tagCounts || {}).join(" ")), weight: 6 },
    { ...fieldTokens(dish.description), weight: 1 },
  ];

  const scoredTokens = queryTokens.map((token) => {
    const bestField = fields
      .filter((field) => tokenMatches(token, field))
      .sort((a, b) => b.weight - a.weight)[0];
    return { token, score: bestField?.weight || 0 };
  });

  const matches = scoredTokens.every(({ score }) => score > 0);
  const exactPhrase = fields.some(({ text }) => text.includes(queryTokens.join(" ")));

  return {
    matches,
    quality: matches ? scoredTokens.reduce((sum, item) => sum + item.score, 0) + (exactPhrase ? 3 : 0) : 0,
    matchedTokens: scoredTokens.filter(({ score }) => score > 0).map(({ token }) => token),
  };
}

export function passesFilters(dish, filters) {
  const diets = filters?.diets || [];
  const excludedAllergens = filters?.allergens || [];

  if (diets.includes("Vegetarian") && !dish.diets.includes("Vegetarian") && !dish.diets.includes("Vegan")) return false;
  if (diets.includes("Vegan") && !dish.diets.includes("Vegan")) return false;
  if (diets.includes("Gluten-free") && !dish.diets.includes("Gluten-free")) return false;
  if (excludedAllergens.some((allergen) => dish.allergens.includes(allergen))) return false;
  return true;
}

function dishResultScore(dish, matchQuality) {
  return matchQuality * 10 + dish.score * 2 + Math.log10(Number(dish.ratingCount) + 1) * 3;
}

export function findGroupMatches(dishes, restaurants, people, filters) {
  const activePeople = people.filter((person) => tokenizeQuery(person.query).length > 0);
  if (!activePeople.length) return { complete: [], partial: [], activePeople };

  const eligibleDishes = dishes.filter((dish) => passesFilters(dish, filters) && !dish.sponsored);
  const results = restaurants.map((restaurant) => {
    const restaurantDishes = eligibleDishes.filter((dish) => dish.restaurantId === restaurant.id);
    const matchesByPerson = activePeople.map((person) => {
      const matches = restaurantDishes
        .map((dish) => ({ dish, match: matchDish(dish, person.query) }))
        .filter(({ match }) => match.matches)
        .sort((a, b) => dishResultScore(b.dish, b.match.quality) - dishResultScore(a.dish, a.match.quality));
      return { person, matches };
    });

    const matchedCount = matchesByPerson.filter(({ matches }) => matches.length > 0).length;
    const combinedScore = matchesByPerson.reduce((total, { matches }) => (
      total + matches.slice(0, 3).reduce((sum, { dish, match }) => sum + dishResultScore(dish, match.quality), 0)
    ), 0);

    return {
      restaurant,
      matchesByPerson,
      matchedCount,
      combinedScore,
      isComplete: matchedCount === activePeople.length,
    };
  }).filter((result) => result.matchedCount > 0);

  const rank = (a, b) => b.matchedCount - a.matchedCount
    || b.combinedScore - a.combinedScore
    || b.restaurant.score - a.restaurant.score;

  return {
    complete: results.filter((result) => result.isComplete).sort(rank),
    partial: results.filter((result) => !result.isComplete).sort(rank),
    activePeople,
  };
}
