import { isDishAvailableForMealTime, isDishCurrentlyAvailable, minimumDishPrice } from "./catalog.js";

const CONNECTIVE_WORDS = new Set([
  "a", "an", "and", "anything", "at", "can", "could", "dish", "feel", "feeling", "food",
  "for", "from", "has", "have", "i", "id", "im", "in", "is", "like", "meal", "me", "my", "of", "or",
  "please", "something", "that", "the", "to", "want", "with", "would",
]);

function normalise(value = "") {
  return (value ?? "")
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

const ALLERGEN_EQUIVALENTS = {
  Crustaceans: ["Crustaceans", "Shellfish"],
  "Cereals containing gluten": ["Cereals containing gluten", "Gluten"],
  Eggs: ["Eggs", "Egg"],
  Milk: ["Milk", "Dairy"],
  Molluscs: ["Molluscs", "Shellfish"],
  Soybeans: ["Soybeans", "Soy"],
  "Tree nuts": ["Tree nuts", "Nuts"],
};

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseSearchIntent(query) {
  let remaining = normalise(query.toString().replace(/£/g, " GBP "));
  const constraints = {};
  const excludedTokens = [];

  remaining = remaining.replace(
    /\b(?:under|below|less than|up to|maximum|max)\s+(\d+(?:[.]\d+)?)\s*(?:calories|cal|kcal)\b/g,
    (_, value) => {
      constraints.maxCalories = Number(value);
      return " ";
    },
  );
  remaining = remaining.replace(
    /\b(?:at least|over|above|more than|minimum|min)\s+(\d+(?:[.]\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s+)?protein\b/g,
    (_, value) => {
      constraints.minProtein = Number(value);
      return " ";
    },
  );
  remaining = remaining.replace(
    /\b(?:under|below|less than|up to|maximum|max)\s+(?:gbp\s*(\d+(?:[.]\d+)?)|(\d+(?:[.]\d+)?)\s*(?:pounds?|quid))\b/g,
    (_, gbpValue, wordValue) => {
      constraints.maxPrice = Number(gbpValue || wordValue);
      return " ";
    },
  );
  remaining = remaining.replace(
    /\b(?:not|isnt|is not|without)\s+(?:too\s+)?([a-z0-9-]+)\b/g,
    (_, value) => {
      excludedTokens.push(value);
      return " ";
    },
  );

  return { queryTokens: tokenizeQuery(remaining), excludedTokens, constraints };
}

function searchableFields(dish) {
  const allergenTerms = [
    ...(dish.allergens || []),
    ...(dish.allergenDetails?.official_allergens || []),
    ...(dish.allergenDetails?.may_contain || []),
  ];
  const groupedBranchTerms = dish.isGrouped
    ? (dish.branches || []).flatMap((branch) => [branch.restaurantName, branch.branchName, branch.area, branch.city]).join(" ")
    : "";

  return [
    { ...fieldTokens(dish.name), weight: 6 },
    { ...fieldTokens(dish.canonicalName), weight: 6 },
    { ...fieldTokens(dish.brandName), weight: 5 },
    { ...fieldTokens(dish.restaurantName), weight: 5 },
    { ...fieldTokens(dish.chainName), weight: 5 },
    { ...fieldTokens(dish.branchName), weight: 4 },
    { ...fieldTokens(groupedBranchTerms), weight: 4 },
    { ...fieldTokens(dish.cuisine), weight: 4 },
    { ...fieldTokens(dish.area), weight: 4 },
    { ...fieldTokens((dish.searchTags || []).join(" ")), weight: 6 },
    { ...fieldTokens(Object.keys(dish.tagCounts || {}).join(" ")), weight: 6 },
    { ...fieldTokens(Object.keys(dish.crowdTags || {}).join(" ")), weight: 6 },
    { ...fieldTokens((dish.hiddenSearchTokens || []).join(" ")), weight: 5 },
    { ...fieldTokens((dish.ingredients || []).join(" ")), weight: 5 },
    { ...fieldTokens((dish.mealOccasions || []).join(" ")), weight: 4 },
    { ...fieldTokens((dish.diets || []).join(" ")), weight: 4 },
    { ...fieldTokens(allergenTerms.join(" ")), weight: 4 },
    { ...fieldTokens(dish.description), weight: 1 },
    { ...fieldTokens(dish.shortDescription), weight: 1 },
  ];
}

function satisfiesStructuredConstraints(dish, constraints) {
  const calories = finiteNumber(dish.nutrition?.calories_kcal);
  const protein = finiteNumber(dish.nutrition?.protein_g);
  const price = minimumDishPrice(dish);

  if (constraints.maxCalories != null && constraints.maxCalories !== "" && (calories === null || calories > Number(constraints.maxCalories))) return false;
  if (constraints.minProtein != null && constraints.minProtein !== "" && (protein === null || protein < Number(constraints.minProtein))) return false;
  if (constraints.maxPrice != null && constraints.maxPrice !== "" && (price === null || price > Number(constraints.maxPrice))) return false;
  if (constraints.minPrice != null && constraints.minPrice !== "" && (price === null || price < Number(constraints.minPrice))) return false;
  return true;
}

export function matchDish(dish, query) {
  const { queryTokens, excludedTokens, constraints } = parseSearchIntent(query);
  const fields = searchableFields(dish);
  const structuredMatch = satisfiesStructuredConstraints(dish, constraints);
  const exclusionMatch = excludedTokens.every((token) => !fields.some((field) => tokenMatches(token, field)));
  if (!queryTokens.length) {
    return { matches: structuredMatch && exclusionMatch, quality: 0, matchedTokens: [] };
  }

  const scoredTokens = queryTokens.map((token) => {
    const bestField = fields
      .filter((field) => tokenMatches(token, field))
      .sort((a, b) => b.weight - a.weight)[0];
    return { token, score: bestField?.weight || 0 };
  });

  const matches = structuredMatch && exclusionMatch && scoredTokens.every(({ score }) => score > 0);
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
  const dishDiets = dish.diets || [];
  const dishAllergens = [
    ...(dish.allergens || []),
    ...(dish.allergenDetails?.official_allergens || []),
    ...(dish.allergenDetails?.may_contain || []),
  ];

  if (filters?.course && dish.course !== filters.course) return false;
  if (!isDishAvailableForMealTime(dish, filters?.mealTime)) return false;
  if (diets.includes("Vegetarian") && !dishDiets.includes("Vegetarian") && !dishDiets.includes("Vegan")) return false;
  if (diets.some((diet) => diet !== "Vegetarian" && !dishDiets.includes(diet))) return false;
  if (excludedAllergens.some((allergen) => (
    (ALLERGEN_EQUIVALENTS[allergen] || [allergen]).some((equivalent) => (
      dishAllergens.some((dishAllergen) => normalise(dishAllergen) === normalise(equivalent))
    ))
  ))) return false;
  // Explicit price/calorie filter inputs funnel through the same matching
  // function as the free-text "under £10" / "under 500 calories" parsing.
  if (filters?.constraints && !satisfiesStructuredConstraints(dish, filters.constraints)) return false;
  return true;
}

export function pickRandomFeatured(dishes, { count, seed = Math.random } = {}) {
  const weighted = dishes.map((dish) => {
    const weight = Math.max(Number(dish.score) || 0, 0.5) ** 2 * (Math.log10(Number(dish.ratingCount) + 1) + 1);
    const key = weight > 0 ? seed() ** (1 / weight) : -1;
    return { dish, key };
  });
  weighted.sort((a, b) => b.key - a.key);
  return weighted.slice(0, count).map(({ dish }) => dish);
}

export function sortDishesByPrice(dishes) {
  return dishes
    .filter((dish) => minimumDishPrice(dish) !== null)
    .sort((a, b) => minimumDishPrice(a) - minimumDishPrice(b) || b.score - a.score);
}

export function filterHomepageDishes(dishes, filters, query) {
  const wantedCourse = filters?.course || "mains";
  return dishes.filter((dish) => (
    dish.course === wantedCourse
    && isDishCurrentlyAvailable(dish)
    && passesFilters(dish, filters)
    && matchDish(dish, query).matches
  ));
}

export function restaurantsForDishes(restaurants, dishes) {
  const restaurantIds = new Set(dishes.flatMap((dish) => (
    dish.isGrouped
      ? (dish.branches || []).map((branch) => branch.restaurantId)
      : [dish.restaurantId]
  )).filter((id) => id !== null && id !== undefined));
  return restaurants.filter((restaurant) => restaurantIds.has(restaurant.id));
}

function dishResultScore(dish, matchQuality) {
  return matchQuality * 10 + dish.score * 2 + Math.log10(Number(dish.ratingCount) + 1) * 3;
}

export function findGroupMatches(dishes, restaurants, people, filters) {
  const activePeople = people.filter((person) => tokenizeQuery(person.query).length > 0);
  if (!activePeople.length) return { complete: [], partial: [], activePeople };

  const wantedCourse = filters?.course || "mains";
  const eligibleDishes = dishes.filter((dish) => (
    !dish.isGrouped
    && dish.course === wantedCourse
    && isDishCurrentlyAvailable(dish)
    && passesFilters(dish, filters)
    && !dish.sponsored
  ));
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
