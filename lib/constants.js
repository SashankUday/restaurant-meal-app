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

export const EMPTY_FILTERS = { diets: [], allergens: [] };

export function formatCourse(course) {
  return course ? `${course[0].toUpperCase()}${course.slice(1)}` : "Menu";
}

export function formatTag(tag) {
  return tag
    .split(" ")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : "")
    .join(" ");
}
