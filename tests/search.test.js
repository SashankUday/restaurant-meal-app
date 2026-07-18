import assert from "node:assert/strict";
import test from "node:test";
import { findGroupMatches, matchDish, passesFilters, tokenizeQuery } from "../lib/search.js";

const restaurants = [
  { id: 1, name: "Coconut Tree", score: 8.5 },
  { id: 2, name: "Other Place", score: 9.2 },
];

const dishes = [
  {
    id: 1, restaurantId: 1, name: "Hot Cuttlefish", restaurantName: "Coconut Tree", cuisine: "Sri Lankan",
    area: "Oxford", description: "", searchTags: ["sweet", "spicy"], tagCounts: {}, score: 8.4,
    ratingCount: 100, price: 8.5, diets: [], allergens: ["Shellfish"], sponsored: false,
  },
  {
    id: 2, restaurantId: 1, name: "Dhal Hopper", restaurantName: "Coconut Tree", cuisine: "Sri Lankan",
    area: "Oxford", description: "", searchTags: ["soupy", "comforting"], tagCounts: {}, score: 8.2,
    ratingCount: 90, price: 7, diets: ["Vegan", "Vegetarian", "Gluten-free"], allergens: [], sponsored: false,
  },
  {
    id: 3, restaurantId: 2, name: "Sweet Curry", restaurantName: "Other Place", cuisine: "Thai",
    area: "Oxford", description: "", searchTags: ["sweet", "spicy"], tagCounts: {}, score: 9.1,
    ratingCount: 10, price: 14, diets: [], allergens: [], sponsored: false,
  },
];

test("tokenisation removes connective words", () => {
  assert.deepEqual(tokenizeQuery("Sweet and spicy with rice"), ["sweet", "spicy", "rice"]);
});

test("a multi-descriptor query requires every meaningful token", () => {
  assert.equal(matchDish(dishes[0], "sweet and spicy").matches, true);
  assert.equal(matchDish(dishes[0], "sweet and comforting").matches, false);
});

test("diet and allergen filters hide unsafe results", () => {
  assert.equal(passesFilters(dishes[1], { diets: ["Vegan"], allergens: ["Shellfish"] }), true);
  assert.equal(passesFilters(dishes[0], { diets: [], allergens: ["Shellfish"] }), false);
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
