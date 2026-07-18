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

export const ALLERGENS = ["Gluten", "Dairy", "Nuts", "Shellfish", "Egg", "Soy", "Sesame"];
export const DIETS = ["Vegetarian", "Vegan", "Gluten-free"];
export const COURSES = ["starters", "mains", "desserts", "drinks"];

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
