export const RATING_TAGS = [
  "Would order again",
  "Great value",
  "Generous portion",
  "Fresh",
  "Rich",
  "Spicy",
  "Sweet",
  "Sour",
  "Crispy",
  "Comforting",
  "Soupy",
  "Smoky",
  "Overpriced",
  "Small portion",
];

export const ALLERGEN_FILTERS = [
  "Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Lupin", "Milk",
  "Molluscs", "Mustard", "Peanuts", "Sesame", "Soybeans", "Sulphites", "Tree nuts",
];
export const DIETS = [
  "Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "Jain",
  "Gluten-free", "Dairy-free", "Nut-free", "Egg-free", "Soy-free",
  "Low FODMAP", "Keto", "Paleo", "Low-carb", "High-protein",
  "Low-calorie", "Low-sodium", "Diabetic-friendly", "Pregnancy-friendly",
];
export const COURSES = ["starters", "mains", "sides", "desserts", "drinks"];
export const NON_MAIN_COURSES = ["starters", "sides", "desserts", "drinks"];

export const MEAL_TIME_LABELS = {
  any: "Any time",
  now: "Right now",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  late_night: "Late night",
};

export const EMPTY_FILTERS = { diets: [], allergens: [], course: null, mealTime: "any" };

export function formatCourse(course) {
  return course ? `${course[0].toUpperCase()}${course.slice(1)}` : "Menu";
}

export function formatPrice(price) {
  if (price === null || price === undefined || price === "") return "Price unavailable";
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) ? `£${numericPrice.toFixed(2)}` : "Price unavailable";
}

export function formatPriceRange(minPrice, maxPrice) {
  const minimum = minPrice === null || minPrice === undefined || minPrice === "" ? null : Number(minPrice);
  const maximum = maxPrice === null || maxPrice === undefined || maxPrice === "" ? null : Number(maxPrice);
  if (!Number.isFinite(minimum) && !Number.isFinite(maximum)) return "Price unavailable";
  if (!Number.isFinite(minimum)) return formatPrice(maximum);
  if (!Number.isFinite(maximum) || minimum === maximum) return formatPrice(minimum);
  return `${formatPrice(minimum)}–${formatPrice(maximum)}`;
}

export function formatDishPrice(dish) {
  return dish?.isGrouped ? formatPriceRange(dish.minPrice, dish.maxPrice) : formatPrice(dish?.price);
}

export function formatTag(tag) {
  return tag
    .split(" ")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : "")
    .join(" ");
}
