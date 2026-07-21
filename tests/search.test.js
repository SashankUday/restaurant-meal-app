import assert from "node:assert/strict";
import test from "node:test";
import { formatPrice } from "../lib/constants.js";
import {
  filterHomepageDishes,
  findGroupMatches,
  matchDish,
  passesFilters,
  restaurantsForDishes,
  sortDishesByPrice,
  tokenizeQuery,
} from "../lib/search.js";

const restaurants = [
  { id: 1, name: "Coconut Tree", score: 8.5 },
  { id: 2, name: "Other Place", score: 9.2 },
];

const dishes = [
  {
    id: 1, restaurantId: 1, name: "Hot Cuttlefish", restaurantName: "Coconut Tree", cuisine: "Sri Lankan",
    area: "Oxford", description: "", searchTags: ["sweet", "spicy"], tagCounts: {}, score: 8.4,
    ratingCount: 100, price: 8.5, course: "mains", diets: [], allergens: ["Shellfish"], sponsored: false,
  },
  {
    id: 2, restaurantId: 1, name: "Dhal Hopper", restaurantName: "Coconut Tree", cuisine: "Sri Lankan",
    area: "Oxford", description: "", searchTags: ["soupy", "comforting"], tagCounts: {}, score: 8.2,
    ratingCount: 90, price: 7, course: "mains", diets: ["Vegan", "Vegetarian", "Gluten-free"], allergens: [], sponsored: false,
  },
  {
    id: 3, restaurantId: 2, name: "Sweet Curry", restaurantName: "Other Place", cuisine: "Thai",
    area: "Oxford", description: "", searchTags: ["sweet", "spicy"], tagCounts: {}, score: 9.1,
    ratingCount: 10, price: 14, course: "mains", diets: [], allergens: [], sponsored: false,
  },
];

test("tokenisation removes connective words", () => {
  assert.deepEqual(tokenizeQuery("Sweet and spicy with rice"), ["sweet", "spicy", "rice"]);
});

test("a multi-descriptor query requires every meaningful token", () => {
  assert.equal(matchDish(dishes[0], "sweet and spicy").matches, true);
  assert.equal(matchDish(dishes[0], "sweet and comforting").matches, false);
});

test("kept nutrition and search fields support calorie, protein, price, and negation constraints", () => {
  const richDish = {
    ...dishes[1],
    price: 14,
    description: "A rich and comforting broth.",
    ingredients: ["rice", "broth"],
    mealOccasions: ["lunch"],
    hiddenSearchTokens: ["high-protein"],
    nutrition: { calories_kcal: 650, protein_g: 38 },
  };

  assert.equal(matchDish(
    richDish,
    "I want a comforting high-protein meal under 700 calories with at least 30g protein that isn't too spicy and has a rich broth",
  ).matches, true);
  assert.equal(matchDish(richDish, "under 600 calories").matches, false);
  assert.equal(matchDish(richDish, "at least 30g protein").matches, true);
  assert.equal(matchDish(richDish, "at least 40g protein").matches, false);
  assert.equal(matchDish(richDish, "under £15").matches, true);
  assert.equal(matchDish(richDish, "under £12").matches, false);
});

test("unpriced dishes are excluded from price constraints and price sorting", () => {
  const unpricedDish = { ...dishes[0], id: 4, price: null };

  assert.equal(matchDish(unpricedDish, "under £100").matches, false);
  assert.deepEqual(sortDishesByPrice([unpricedDish, dishes[2], dishes[1]]).map((dish) => dish.id), [2, 3]);
  assert.equal(formatPrice(null), "Price unavailable");
  assert.equal(formatPrice(0), "£0.00");
});

test("homepage results are mains-only and map restaurants follow matching dishes", () => {
  const nonMains = [
    { ...dishes[0], id: 4, restaurantId: 2, course: "starters", name: "Spicy Starter" },
    { ...dishes[0], id: 5, restaurantId: 2, course: "sides", name: "Spicy Side" },
    { ...dishes[0], id: 6, restaurantId: 2, course: "desserts", name: "Spicy Dessert" },
    { ...dishes[0], id: 7, restaurantId: 2, course: "drinks", name: "Spicy Drink" },
  ];
  const matches = filterHomepageDishes([...dishes, ...nonMains], { diets: [], allergens: [] }, "soupy comforting");

  assert.deepEqual(matches.map((dish) => dish.id), [2]);
  assert.deepEqual(restaurantsForDishes(restaurants, matches).map((restaurant) => restaurant.id), [1]);
  assert.equal(filterHomepageDishes(nonMains, { diets: [], allergens: [] }, "spicy").length, 0);
});

test("diet and allergen filters hide unsafe results", () => {
  assert.equal(passesFilters(dishes[1], { diets: ["Vegan"], allergens: ["Shellfish"] }), true);
  assert.equal(passesFilters(dishes[0], { diets: [], allergens: ["Shellfish"] }), false);
  assert.equal(passesFilters(
    { ...dishes[1], allergenDetails: { may_contain: ["Tree nuts"] } },
    { diets: [], allergens: ["Tree nuts"] },
  ), false);
  assert.equal(passesFilters(
    { ...dishes[1], allergenDetails: { official_allergens: ["Egg"] } },
    { diets: [], allergens: ["Eggs"] },
  ), false);
});

test("group search requires a matching dish for each person", () => {
  const result = findGroupMatches(dishes, restaurants, [
    { id: "a", name: "A", query: "sweet and spicy" },
    { id: "b", name: "B", query: "soupy and comforting" },
  ], { diets: [], allergens: [] });

  assert.deepEqual(result.complete.map((item) => item.restaurant.id), [1]);
  assert.deepEqual(result.partial.map((item) => item.restaurant.id), [2]);
  assert.equal(result.complete[0].matchesByPerson.every((item) => item.matches.length > 0), true);
});

test("group filters are applied before restaurant matching", () => {
  const result = findGroupMatches(dishes, restaurants, [
    { id: "a", name: "A", query: "sweet and spicy" },
    { id: "b", name: "B", query: "soupy and comforting" },
  ], { diets: [], allergens: ["Shellfish"] });

  assert.equal(result.complete.length, 0);
  assert.deepEqual(result.partial.map((item) => item.restaurant.id), [1, 2]);
});

test("group matching never combines suitable dishes from different physical branches of one brand", () => {
  const chainRestaurants = [
    { id: 10, name: "Wagamama Market Street", brandId: 7, score: 8.5 },
    { id: 20, name: "Wagamama Westgate", brandId: 7, score: 8.5 },
  ];
  const chainDishes = [
    {
      ...dishes[0],
      id: 101,
      canonicalDishId: 501,
      restaurantId: 10,
      restaurantName: "Wagamama Market Street",
      searchTags: ["sweet", "spicy"],
      isGrouped: false,
      isActive: true,
    },
    {
      ...dishes[1],
      id: 202,
      canonicalDishId: 502,
      restaurantId: 20,
      restaurantName: "Wagamama Westgate",
      searchTags: ["soupy", "comforting"],
      isGrouped: false,
      isActive: true,
    },
  ];
  const result = findGroupMatches(chainDishes, chainRestaurants, [
    { id: "a", name: "A", query: "sweet and spicy" },
    { id: "b", name: "B", query: "soupy and comforting" },
  ], { diets: [], allergens: [] });

  assert.equal(result.complete.length, 0);
  assert.deepEqual(new Set(result.partial.map((item) => item.restaurant.id)), new Set([10, 20]));
  assert.equal(result.partial.every((item) => item.matchedCount === 1), true);
});

test("inactive branch offerings are not eligible for group recommendations", () => {
  const result = findGroupMatches([
    { ...dishes[0], id: 99, isActive: false },
  ], restaurants, [
    { id: "a", name: "A", query: "sweet and spicy" },
  ], { diets: [], allergens: [] });

  assert.equal(result.complete.length, 0);
  assert.equal(result.partial.length, 0);
});

test("sibling branch location terms are searchable only on grouped catalogue dishes", () => {
  const branchDish = {
    ...dishes[0],
    brandName: "Wagamama",
    branchName: "Market Street",
    area: "City Centre",
    branches: [{
      dishId: 202,
      restaurantId: 20,
      restaurantName: "Wagamama",
      branchName: "Westgate",
      area: "Westgate",
      city: "Oxford",
    }],
    isGrouped: false,
  };

  assert.equal(matchDish(branchDish, "Westgate").matches, false);
  assert.equal(matchDish({ ...branchDish, isGrouped: true }, "Westgate").matches, true);
});
