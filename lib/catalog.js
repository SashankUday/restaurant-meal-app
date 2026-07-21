export function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function cuisineLabel(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function numberOrZero(value) {
  const number = numberOrNull(value);
  return number === null ? 0 : number;
}

export function mapCatalogBranch(row = {}) {
  return {
    dishId: numberOrNull(row.dish_id ?? row.dishId),
    dishName: row.dish_name ?? row.dishName ?? "",
    restaurantId: numberOrNull(row.restaurant_id ?? row.restaurantId),
    restaurantName: row.restaurant_name ?? row.restaurantName ?? "",
    branchName: row.branch_name ?? row.branchName ?? "",
    area: row.area || "",
    city: row.city || "",
    countryCode: row.country_code ?? row.countryCode ?? "",
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    price: numberOrNull(row.price),
    variantKey: row.variant_key ?? row.variantKey ?? "",
    isActive: (row.is_active ?? row.isActive) !== false,
    isCurrentlyAvailable: (row.is_currently_available ?? row.isCurrentlyAvailable) !== false,
    availableFrom: row.available_from ?? row.availableFrom ?? null,
    availableUntil: row.available_until ?? row.availableUntil ?? null,
    menuTags: arrayValue(row.menu_tags ?? row.menuTags).length ? arrayValue(row.menu_tags ?? row.menuTags) : ["all_day"],
    menuWindows: row.menu_windows ?? row.menuWindows ?? {},
    score: numberOrZero(row.score),
    ratingCount: numberOrZero(row.rating_count ?? row.ratingCount),
  };
}

export function mapCatalogDish(row) {
  const id = numberOrNull(row.id);
  const branchScore = numberOrZero(row.branch_score ?? row.score);
  const branchRatingCount = numberOrZero(row.branch_rating_count ?? row.rating_count);
  const canonicalDishId = numberOrNull(row.canonical_dish_id) ?? id;

  return {
    id,
    canonicalDishId,
    canonicalName: row.canonical_name || row.name,
    brandId: numberOrNull(row.brand_id),
    brandName: row.brand_name || row.chain_name || row.restaurant_name || "",
    marketCode: row.market_code || "",
    canonicalVersion: numberOrNull(row.canonical_version),
    canonicalReviewStatus: row.canonical_review_status || "",
    variantKey: row.variant_key || "",
    restaurantId: numberOrNull(row.restaurant_id),
    name: row.name,
    restaurantName: row.restaurant_name,
    area: row.area,
    cuisine: cuisineLabel(row.cuisine),
    chainName: row.chain_name,
    branchName: row.branch_name,
    city: row.city,
    countryCode: row.country_code || "",
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    price: numberOrNull(row.price),
    minPrice: numberOrNull(row.min_price),
    maxPrice: numberOrNull(row.max_price),
    branchCount: numberOrZero(row.branch_count),
    isActive: row.is_active !== false,
    availableFrom: row.available_from || null,
    availableUntil: row.available_until || null,
    menuTags: arrayValue(row.menu_tags).length ? arrayValue(row.menu_tags) : ["all_day"],
    menuWindows: row.menu_windows || {},
    branchScore,
    branchRatingCount,
    cityScore: numberOrZero(row.city_score ?? branchScore),
    cityRatingCount: numberOrZero(row.city_rating_count ?? branchRatingCount),
    overallScore: numberOrZero(row.overall_score ?? row.city_score ?? branchScore),
    overallRatingCount: numberOrZero(row.overall_rating_count ?? row.city_rating_count ?? branchRatingCount),
    score: branchScore,
    ratingCount: branchRatingCount,
    branches: arrayValue(row.branches).map(mapCatalogBranch).filter((branch) => branch.dishId !== null),
    diets: row.diets || [],
    allergens: row.allergens || [],
    allergensVerified: Boolean(row.allergens_verified),
    allergenDetails: row.allergen_details || {},
    nutrition: row.nutrition || {},
    tagCounts: row.tag_counts || {},
    searchTags: row.search_tags || [],
    crowdTags: row.crowd_tags || {},
    description: row.description || "",
    shortDescription: row.short_description || "",
    course: row.course,
    menuPosition: Number(row.menu_position || 0),
    mealOccasions: row.meal_occasions || [],
    ingredients: row.ingredients || [],
    availability: row.availability || {},
    hiddenSearchTokens: row.hidden_search_tokens || [],
    officialImageUrl: row.official_image_url,
    dataSources: row.data_sources || {},
    localOverrides: row.local_overrides || {},
    repeatOrderRate: numberOrNull(row.repeat_order_rate),
    userPhotoCount: Number(row.user_photo_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sponsored: Boolean(row.sponsored),
    isGrouped: false,
  };
}

export function mapCatalogRestaurant(row) {
  return {
    id: numberOrNull(row.id),
    brandId: numberOrNull(row.brand_id),
    brandName: row.brand_name || row.chain_name || row.name,
    name: row.name,
    area: row.area,
    cuisine: cuisineLabel(row.cuisine),
    chainName: row.chain_name,
    branchName: row.branch_name,
    city: row.city,
    countryCode: row.country_code,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    description: row.description || "",
    menuWindows: row.menu_windows || {},
    score: numberOrZero(row.score),
    ratingCount: numberOrZero(row.rating_count),
    activeDishCount: numberOrZero(row.active_dish_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MEAL_TIMES = ["breakfast", "lunch", "dinner", "late_night"];

function minutesSinceMidnight(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function timeWithinWindow(time, window) {
  const start = minutesSinceMidnight(window?.start);
  const end = minutesSinceMidnight(window?.end);
  const now = minutesSinceMidnight(time);
  if (start === null || end === null || now === null) return true;
  return start <= end ? now >= start && now <= end : now >= start || now <= end;
}

export function isDishAvailableForMealTime(dish, mealTime, referenceTime) {
  if (!mealTime || mealTime === "any") return true;
  const tags = dish?.menuTags?.length ? dish.menuTags : ["all_day"];
  if (tags.includes("all_day")) return true;
  if (mealTime === "now") {
    const windows = dish?.menuWindows || {};
    return tags.some((tag) => !windows[tag] || timeWithinWindow(referenceTime, windows[tag]));
  }
  return tags.includes(mealTime);
}

export const MEAL_TIME_OPTIONS = MEAL_TIMES;

function dateKey(value) {
  if (!value || value instanceof Date) {
    const date = value instanceof Date ? value : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function isDishCurrentlyAvailable(dish, referenceDate) {
  if (!dish || dish.isActive === false || dish.isCurrentlyAvailable === false) return false;
  const today = dateKey(referenceDate);
  if (dish.availableFrom && dateKey(dish.availableFrom) > today) return false;
  if (dish.availableUntil && dateKey(dish.availableUntil) < today) return false;
  if (dish.availability?.currently_available === false || dish.availability?.out_of_stock === true) return false;
  return true;
}

export function branchFromDish(dish) {
  return {
    dishId: dish.id,
    dishName: dish.name || dish.canonicalName || "",
    restaurantId: dish.restaurantId,
    restaurantName: dish.restaurantName || dish.brandName || "",
    branchName: dish.branchName || "",
    area: dish.area || "",
    city: dish.city || "",
    countryCode: dish.countryCode || "",
    latitude: numberOrNull(dish.latitude),
    longitude: numberOrNull(dish.longitude),
    price: numberOrNull(dish.price),
    variantKey: dish.variantKey || "",
    isActive: dish.isActive !== false,
    isCurrentlyAvailable: dish.isCurrentlyAvailable !== false,
    availableFrom: dish.availableFrom || null,
    availableUntil: dish.availableUntil || null,
    menuTags: dish.menuTags?.length ? dish.menuTags : ["all_day"],
    menuWindows: dish.menuWindows || {},
    score: numberOrZero(dish.branchScore ?? dish.score),
    ratingCount: numberOrZero(dish.branchRatingCount ?? dish.ratingCount),
    availability: dish.availability || {},
  };
}

function sameCity(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function branchSort(left, right) {
  return String(left.branchName || left.area || left.restaurantName).localeCompare(
    String(right.branchName || right.area || right.restaurantName),
  );
}

export function availableBranchesForDish(dish, { city, referenceDate } = {}) {
  const source = dish?.branches?.length ? dish.branches : dish ? [branchFromDish(dish)] : [];
  const unique = new Map();

  source.forEach((branch) => {
    if (branch.dishId === null || branch.dishId === undefined) return;
    if (city && !sameCity(branch.city, city)) return;
    if (!isDishCurrentlyAvailable(branch, referenceDate)) return;
    unique.set(String(branch.dishId), branch);
  });

  return [...unique.values()].sort(branchSort);
}

export function resolveInitialBranchDishId(dish, initialDishId, options) {
  if (initialDishId === null || initialDishId === undefined || initialDishId === "") return "";
  const wanted = String(initialDishId);
  return availableBranchesForDish(dish, options).some((branch) => String(branch.dishId) === wanted) ? wanted : "";
}

export function minimumDishPrice(dish) {
  return numberOrNull(dish?.isGrouped ? dish.minPrice : dish?.price);
}

export function groupCityDishes(dishes, city, { referenceDate } = {}) {
  const grouped = new Map();

  dishes.forEach((dish) => {
    if (city && !sameCity(dish.city, city)) return;
    const canonicalDishId = dish.canonicalDishId ?? dish.id;
    const key = `${String(city || dish.city || "")}:${String(canonicalDishId)}`;
    let group = grouped.get(key);

    if (!group) {
      group = {
        ...dish,
        id: canonicalDishId,
        name: dish.canonicalName || dish.name,
        canonicalDishId,
        restaurantId: null,
        restaurantName: dish.brandName || dish.restaurantName,
        branchName: "",
        area: city || dish.city,
        city: city || dish.city,
        score: dish.cityScore,
        ratingCount: dish.cityRatingCount,
        price: null,
        branches: [],
        isActive: true,
        availability: { currently_available: true },
        isGrouped: true,
        sponsored: Boolean(dish.sponsored),
        menuTags: new Set(),
      };
      grouped.set(key, group);
    } else {
      group.sponsored ||= Boolean(dish.sponsored);
    }

    const candidates = dish.branches?.length ? dish.branches : [branchFromDish(dish)];
    candidates.forEach((branch) => {
      if (city && !sameCity(branch.city, city)) return;
      if (!isDishCurrentlyAvailable(branch, referenceDate)) return;
      if (!group.branches.some((current) => String(current.dishId) === String(branch.dishId))) {
        group.branches.push(branch);
        (branch.menuTags?.length ? branch.menuTags : ["all_day"]).forEach((tag) => group.menuTags.add(tag));
      }
    });
  });

  return [...grouped.values()].flatMap((dish) => {
    dish.branches.sort(branchSort);
    if (!dish.branches.length) return [];
    const prices = dish.branches.map((branch) => numberOrNull(branch.price)).filter((price) => price !== null);
    dish.minPrice = prices.length ? Math.min(...prices) : dish.minPrice;
    dish.maxPrice = prices.length ? Math.max(...prices) : dish.maxPrice;
    dish.price = dish.minPrice;
    dish.locationCount = new Set(dish.branches.map((branch) => branch.restaurantId)).size;
    dish.menuTags = dish.menuTags.size ? [...dish.menuTags] : ["all_day"];
    return [dish];
  });
}
