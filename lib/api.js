import { supabase } from "../supabase.js";
import { compressPhoto, validatePhotoSelection } from "./image.js";

function client() {
  if (!supabase) throw new Error("Plate is not connected to Supabase. Add the public project URL and publishable key first.");
  return supabase;
}

function throwIfError(error) {
  if (error) throw new Error(error.message || "Something went wrong while talking to Plate.");
}

function numberOrNull(value) {
  return value === null || value === undefined || value === "" ? null : Number(value);
}

function cuisineLabel(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

const DISH_CATALOG_COLUMNS = [
  "id", "restaurant_id", "name", "price", "description", "short_description",
  "course", "menu_position", "diets", "allergens", "allergen_details", "nutrition",
  "ingredients", "meal_occasions", "crowd_tags", "official_image_url", "availability",
  "hidden_search_tokens", "data_sources", "sponsored", "created_at", "updated_at",
  "restaurant_name", "chain_name", "branch_name", "area", "cuisine", "city", "score",
  "rating_count", "repeat_order_rate", "user_photo_count", "tag_counts", "search_tags",
].join(",");

const RESTAURANT_CATALOG_COLUMNS = [
  "id", "name", "chain_name", "branch_name", "area", "cuisine", "latitude", "longitude",
  "city", "country_code", "description", "created_at", "updated_at", "score", "rating_count",
].join(",");

function mapDish(row) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    name: row.name,
    restaurantName: row.restaurant_name,
    area: row.area,
    cuisine: cuisineLabel(row.cuisine),
    chainName: row.chain_name,
    branchName: row.branch_name,
    city: row.city,
    price: numberOrNull(row.price),
    score: Number(row.score || 0),
    ratingCount: Number(row.rating_count || 0),
    diets: row.diets || [],
    allergens: row.allergens || [],
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
    repeatOrderRate: numberOrNull(row.repeat_order_rate),
    userPhotoCount: Number(row.user_photo_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sponsored: Boolean(row.sponsored),
  };
}

function mapRestaurant(row) {
  return {
    id: Number(row.id),
    name: row.name,
    area: row.area,
    cuisine: cuisineLabel(row.cuisine),
    chainName: row.chain_name,
    branchName: row.branch_name,
    city: row.city,
    countryCode: row.country_code,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    description: row.description || "",
    score: Number(row.score || 0),
    ratingCount: Number(row.rating_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchCatalog() {
  const [dishResponse, restaurantResponse] = await Promise.all([
    client().from("dish_catalog").select(DISH_CATALOG_COLUMNS).order("score", { ascending: false }),
    client().from("restaurant_catalog").select(RESTAURANT_CATALOG_COLUMNS).order("score", { ascending: false }),
  ]);
  throwIfError(dishResponse.error);
  throwIfError(restaurantResponse.error);
  return {
    dishes: (dishResponse.data || []).map(mapDish),
    restaurants: (restaurantResponse.data || []).map(mapRestaurant),
  };
}

export async function createMeal({ userId, dishId, score, tags, comment, visitedAt, photos, wouldOrderAgain }) {
  const selectedPhotos = Array.from(photos || []);
  validatePhotoSelection(selectedPhotos);

  const { data: rating, error: ratingError } = await client()
    .from("ratings")
    .insert({
      user_id: userId,
      dish_id: dishId,
      score,
      tags,
      comment: comment.trim(),
      visited_at: visitedAt,
      would_order_again: wouldOrderAgain,
    })
    .select("id")
    .single();
  throwIfError(ratingError);

  const uploadedPaths = [];
  try {
    for (const photo of selectedPhotos) {
      const compressed = await compressPhoto(photo);
      const path = `${userId}/${rating.id}/${crypto.randomUUID()}.jpg`;
      const upload = await client().storage.from("meal-photos").upload(path, compressed, {
        cacheControl: "3600",
        contentType: compressed.type,
        upsert: false,
      });
      throwIfError(upload.error);
      uploadedPaths.push(path);

      const metadata = await client().from("rating_photos").insert({
        rating_id: rating.id,
        user_id: userId,
        storage_path: path,
        mime_type: compressed.type,
        size_bytes: compressed.size,
      });
      throwIfError(metadata.error);
    }
    return rating.id;
  } catch (error) {
    if (uploadedPaths.length) await client().storage.from("meal-photos").remove(uploadedPaths);
    await client().from("ratings").delete().eq("id", rating.id);
    throw error;
  }
}

export async function fetchMealHistory(userId) {
  const { data, error } = await client()
    .from("ratings")
    .select(`
      id, score, would_order_again, tags, comment, visited_at, created_at,
      dishes!inner (
        id, name, restaurant_id,
        restaurants!inner (id, name, area, cuisine)
      ),
      rating_photos (id, storage_path)
    `)
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .order("created_at", { ascending: false });
  throwIfError(error);

  const paths = (data || []).flatMap((meal) => (meal.rating_photos || []).map((photo) => photo.storage_path));
  const signedUrls = new Map();
  if (paths.length) {
    const signed = await client().storage.from("meal-photos").createSignedUrls(paths, 60 * 60);
    throwIfError(signed.error);
    (signed.data || []).forEach((item, index) => signedUrls.set(paths[index], item.signedUrl));
  }

  return (data || []).map((meal) => ({
    id: meal.id,
    score: Number(meal.score),
    wouldOrderAgain: meal.would_order_again,
    tags: meal.tags || [],
    comment: meal.comment || "",
    visitedAt: meal.visited_at,
    dish: {
      id: Number(meal.dishes.id),
      name: meal.dishes.name,
      restaurantId: Number(meal.dishes.restaurant_id),
    },
    restaurant: {
      id: Number(meal.dishes.restaurants.id),
      name: meal.dishes.restaurants.name,
      area: meal.dishes.restaurants.area,
      cuisine: cuisineLabel(meal.dishes.restaurants.cuisine),
    },
    photos: (meal.rating_photos || []).map((photo) => ({
      id: photo.id,
      url: signedUrls.get(photo.storage_path),
    })),
  }));
}
