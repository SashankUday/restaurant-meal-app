import assert from "node:assert/strict";
import test from "node:test";
import {
  groupCityDishes,
  isDishCurrentlyAvailable,
  mapCatalogDish,
  mapCatalogRestaurant,
  resolveInitialBranchDishId,
} from "../lib/catalog.js";
import { formatDishPrice, formatPriceRange } from "../lib/constants.js";
import { restaurantsForDishes, sortDishesByPrice } from "../lib/search.js";

const referenceDate = "2026-07-20";

const oxfordBranches = [
  {
    dishId: 101,
    restaurantId: 1,
    restaurantName: "Wagamama",
    branchName: "Market Street",
    area: "City Centre",
    city: "Oxford",
    countryCode: "GB",
    latitude: 51.7528,
    longitude: -1.2574,
    price: 13.5,
    variantKey: "standard",
    isActive: true,
    availableFrom: null,
    availableUntil: null,
    score: 8.4,
    ratingCount: 12,
  },
  {
    dishId: 202,
    restaurantId: 2,
    restaurantName: "Wagamama",
    branchName: "Westgate",
    area: "Westgate",
    city: "Oxford",
    countryCode: "GB",
    latitude: 51.7499,
    longitude: -1.2607,
    price: 14.25,
    variantKey: "standard",
    isActive: true,
    availableFrom: null,
    availableUntil: null,
    score: 8.8,
    ratingCount: 18,
  },
  {
    dishId: 303,
    restaurantId: 3,
    restaurantName: "Wagamama",
    branchName: "Retired branch",
    area: "Oxford",
    city: "Oxford",
    countryCode: "GB",
    price: 12,
    variantKey: "standard",
    isActive: false,
    availableFrom: null,
    availableUntil: null,
    score: 9,
    ratingCount: 100,
  },
];

function branchDish(overrides = {}) {
  return {
    id: 101,
    canonicalDishId: 50,
    canonicalName: "Chicken Katsu Curry",
    brandId: 7,
    brandName: "Wagamama",
    variantKey: "standard",
    restaurantId: 1,
    restaurantName: "Wagamama",
    branchName: "Market Street",
    area: "City Centre",
    city: "Oxford",
    name: "Chicken Katsu Curry",
    price: 13.5,
    minPrice: 13.5,
    maxPrice: 14.25,
    isActive: true,
    availableFrom: null,
    availableUntil: null,
    course: "mains",
    score: 8.4,
    ratingCount: 12,
    branchScore: 8.4,
    branchRatingCount: 12,
    cityScore: 8.6,
    cityRatingCount: 30,
    overallScore: 8.5,
    overallRatingCount: 45,
    branches: oxfordBranches,
    diets: [],
    allergens: [],
    availability: {},
    sponsored: false,
    isGrouped: false,
    ...overrides,
  };
}

test("catalogue mapping keeps canonical and branch dish IDs separate", () => {
  const mapped = mapCatalogDish({
    id: 101,
    canonical_dish_id: 50,
    canonical_name: "Chicken Katsu Curry",
    brand_id: 7,
    brand_name: "Wagamama",
    market_code: "GB",
    canonical_version: 2,
    canonical_review_status: "verified",
    restaurant_id: 1,
    restaurant_name: "Wagamama",
    branch_name: "Market Street",
    name: "Chicken Katsu Curry",
    city: "Oxford",
    country_code: "GB",
    latitude: 51.7528,
    longitude: -1.2574,
    price: "13.50",
    allergens_verified: true,
    local_overrides: { menu_note: "Branch garnish" },
    branch_score: "8.4",
    branch_rating_count: 12,
    city_score: "8.6",
    city_rating_count: 30,
    overall_score: "8.5",
    overall_rating_count: 45,
    min_price: "13.50",
    max_price: "14.25",
    branch_count: 2,
    is_active: true,
    branches: [{
      dish_id: 202,
      dish_name: "Chicken Katsu Curry",
      restaurant_id: 2,
      restaurant_name: "Wagamama",
      branch_name: "Westgate",
      area: "Westgate",
      city: "Oxford",
      country_code: "GB",
      latitude: 51.7499,
      longitude: -1.2607,
      price: "14.25",
      variant_key: "standard",
      is_active: true,
      is_currently_available: true,
      score: "8.8",
      rating_count: 18,
    }],
  });

  assert.equal(mapped.id, 101);
  assert.equal(mapped.canonicalDishId, 50);
  assert.equal(mapped.marketCode, "GB");
  assert.equal(mapped.canonicalVersion, 2);
  assert.equal(mapped.canonicalReviewStatus, "verified");
  assert.equal(mapped.allergensVerified, true);
  assert.deepEqual(mapped.localOverrides, { menu_note: "Branch garnish" });
  assert.equal(mapped.branchCount, 2);
  assert.equal(mapped.latitude, 51.7528);
  assert.equal(mapped.branches[0].dishId, 202);
  assert.equal(mapped.branches[0].dishName, "Chicken Katsu Curry");
  assert.equal(mapped.branches[0].isCurrentlyAvailable, true);
  assert.equal(mapped.branches[0].restaurantId, 2);
  assert.equal(mapped.branches[0].price, 14.25);
  assert.equal(mapped.score, 8.4);
  assert.equal(mapped.cityScore, 8.6);
  assert.equal(mapped.overallRatingCount, 45);

  const restaurant = mapCatalogRestaurant({
    id: 1,
    brand_id: 7,
    brand_name: "Wagamama",
    name: "Wagamama",
    latitude: 51.7528,
    longitude: -1.2574,
    score: 8.4,
    rating_count: 12,
    active_dish_count: 42,
  });
  assert.equal(restaurant.activeDishCount, 42);
});

test("homepage grouping combines a canonical dish in one city and preserves exact branch IDs", () => {
  const rows = [
    branchDish(),
    branchDish({
      id: 202,
      restaurantId: 2,
      branchName: "Westgate",
      area: "Westgate",
      price: 14.25,
      score: 8.8,
      ratingCount: 18,
      branchScore: 8.8,
      branchRatingCount: 18,
    }),
  ];
  const grouped = groupCityDishes(rows, "Oxford", { referenceDate });

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].id, 50);
  assert.equal(grouped[0].name, "Chicken Katsu Curry");
  assert.equal(grouped[0].score, 8.6);
  assert.equal(grouped[0].ratingCount, 30);
  assert.equal(grouped[0].locationCount, 2);
  assert.deepEqual(grouped[0].branches.map((branch) => branch.dishId), [101, 202]);
  assert.equal(grouped[0].minPrice, 13.5);
  assert.equal(grouped[0].maxPrice, 14.25);
});

test("grouping stays city-scoped and excludes inactive or future offerings", () => {
  const futureBranch = {
    ...oxfordBranches[1],
    dishId: 404,
    restaurantId: 4,
    availableFrom: "2026-07-21",
  };
  const rows = [
    branchDish({ branches: [...oxfordBranches, futureBranch] }),
    branchDish({
      id: 909,
      restaurantId: 9,
      city: "London",
      branchName: "Covent Garden",
      branches: [{ ...oxfordBranches[0], dishId: 909, restaurantId: 9, city: "London", branchName: "Covent Garden" }],
    }),
  ];

  const oxford = groupCityDishes(rows, "Oxford", { referenceDate });
  assert.equal(oxford.length, 1);
  assert.deepEqual(oxford[0].branches.map((branch) => branch.dishId), [101, 202]);
  assert.equal(isDishCurrentlyAvailable(futureBranch, referenceDate), false);
  assert.equal(isDishCurrentlyAvailable({ isActive: true, isCurrentlyAvailable: false }, referenceDate), false);
  assert.equal(isDishCurrentlyAvailable({ isActive: true, availableUntil: "2026-07-19" }, referenceDate), false);
});

test("grouped prices render and sort by the lowest active branch price", () => {
  const grouped = groupCityDishes([branchDish()], "Oxford", { referenceDate })[0];
  const cheaper = { ...grouped, id: 51, canonicalDishId: 51, minPrice: 9, maxPrice: 9, score: 7 };

  assert.equal(formatPriceRange(13.5, 14.25), "£13.50–£14.25");
  assert.equal(formatPriceRange(13.5, 13.5), "£13.50");
  assert.equal(formatPriceRange(null, null), "Price unavailable");
  assert.equal(formatDishPrice(grouped), "£13.50–£14.25");
  assert.deepEqual(sortDishesByPrice([grouped, cheaper]).map((dish) => dish.id), [51, 50]);
});

test("grouped map results include every physical branch serving the dish", () => {
  const grouped = groupCityDishes([branchDish()], "Oxford", { referenceDate });
  const restaurants = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 99 }];

  assert.deepEqual(restaurantsForDishes(restaurants, grouped).map((restaurant) => restaurant.id), [1, 2]);
});

test("branch preselection accepts an exact offering ID and never substitutes the canonical ID", () => {
  const grouped = groupCityDishes([branchDish()], "Oxford", { referenceDate })[0];

  assert.equal(resolveInitialBranchDishId(grouped, null, { city: "Oxford", referenceDate }), "");
  assert.equal(resolveInitialBranchDishId(grouped, 202, { city: "Oxford", referenceDate }), "202");
  assert.equal(resolveInitialBranchDishId(grouped, 50, { city: "Oxford", referenceDate }), "");
  assert.equal(resolveInitialBranchDishId(grouped, 303, { city: "Oxford", referenceDate }), "");
});
