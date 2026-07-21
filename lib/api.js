import { supabase } from "../supabase.js";
import { cuisineLabel, mapCatalogDish, mapCatalogRestaurant } from "./catalog.js";
import { compressPhoto, validatePhotoSelection } from "./image.js";

function client() {
  if (!supabase) throw new Error("Plate is not connected to Supabase. Add the public project URL and publishable key first.");
  return supabase;
}

function throwIfError(error) {
  if (error) throw new Error(error.message || "Something went wrong while talking to Plate.");
}

const DISH_CATALOG_COLUMNS = [
  "id", "canonical_dish_id", "canonical_name", "brand_id", "brand_name", "variant_key",
  "market_code", "canonical_version", "canonical_review_status", "restaurant_id", "name",
  "price", "description", "short_description", "course", "menu_position", "menu_tags", "diets", "allergens",
  "allergens_verified", "allergen_details", "nutrition",
  "ingredients", "meal_occasions", "crowd_tags", "official_image_url", "availability",
  "hidden_search_tokens", "data_sources", "sponsored", "local_overrides", "created_at", "updated_at",
  "restaurant_name", "chain_name", "branch_name", "area", "cuisine", "city", "country_code",
  "latitude", "longitude", "menu_windows", "score", "rating_count", "branch_score", "branch_rating_count",
  "city_score", "city_rating_count", "overall_score", "overall_rating_count", "min_price",
  "max_price", "branch_count", "is_active", "available_from", "available_until", "branches",
  "repeat_order_rate", "user_photo_count", "tag_counts", "search_tags",
].join(",");

const RESTAURANT_CATALOG_COLUMNS = [
  "id", "brand_id", "brand_name", "name", "chain_name", "branch_name", "area", "cuisine",
  "latitude", "longitude", "city", "country_code", "description", "menu_windows", "created_at", "updated_at",
  "score", "rating_count", "active_dish_count",
].join(",");

export async function fetchCatalog() {
  const [dishResponse, restaurantResponse] = await Promise.all([
    client().from("dish_catalog").select(DISH_CATALOG_COLUMNS).order("score", { ascending: false }),
    client().from("restaurant_catalog").select(RESTAURANT_CATALOG_COLUMNS).order("score", { ascending: false }),
  ]);
  throwIfError(dishResponse.error);
  throwIfError(restaurantResponse.error);
  return {
    dishes: (dishResponse.data || []).map(mapCatalogDish),
    restaurants: (restaurantResponse.data || []).map(mapCatalogRestaurant),
  };
}

export async function createMeal({
  userId, dishId, score, tags = [], comment = "", visitedAt, photos, wouldOrderAgain = null, photosPrivate = false,
}) {
  const selectedPhotos = Array.from(photos || []);
  validatePhotoSelection(selectedPhotos);

  const payload = {
    user_id: userId,
    dish_id: dishId,
    score,
    tags,
    comment: comment.trim(),
    would_order_again: wouldOrderAgain,
  };
  if (visitedAt) payload.visited_at = visitedAt;

  const { data: rating, error: ratingError } = await client()
    .from("ratings")
    .upsert(payload, { onConflict: "user_id,canonical_dish_id" })
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
        is_private: photosPrivate,
      });
      throwIfError(metadata.error);
    }
    return rating.id;
  } catch (error) {
    // The rating itself (score/tags/comment) is already saved at this point.
    // Only roll back the photos uploaded during this attempt, not the rating
    // or any photos it already had from a previous save.
    const cleanupErrors = [];
    if (uploadedPaths.length) {
      const photoMetadataCleanup = await client().from("rating_photos").delete().in("storage_path", uploadedPaths);
      if (photoMetadataCleanup.error) cleanupErrors.push(photoMetadataCleanup.error.message || "photo metadata cleanup failed");

      const storageCleanup = await client().storage.from("meal-photos").remove(uploadedPaths);
      if (storageCleanup.error) cleanupErrors.push(storageCleanup.error.message || "photo storage cleanup failed");
    }

    if (cleanupErrors.length) {
      throw new Error(`${error.message || "This meal could not be saved."} Cleanup was incomplete: ${cleanupErrors.join("; ")}`, { cause: error });
    }
    throw error;
  }
}

export async function fetchUserRatingForDish(userId, canonicalDishId) {
  const { data, error } = await client()
    .from("ratings")
    .select("id, dish_id, score, tags, comment, visited_at, would_order_again")
    .eq("user_id", userId)
    .eq("canonical_dish_id", canonicalDishId)
    .maybeSingle();
  throwIfError(error);
  return data
    ? {
      id: data.id,
      dishId: Number(data.dish_id),
      score: Number(data.score),
      tags: data.tags || [],
      comment: data.comment || "",
      visitedAt: data.visited_at,
      wouldOrderAgain: data.would_order_again,
    }
    : null;
}

export async function fetchDishPhotos(canonicalDishId, limit = 12) {
  const { data, error } = await client()
    .from("dish_photos")
    .select("id, storage_path")
    .eq("canonical_dish_id", canonicalDishId)
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfError(error);
  const paths = (data || []).map((photo) => photo.storage_path);
  if (!paths.length) return [];
  const signed = await client().storage.from("meal-photos").createSignedUrls(paths, 60 * 60);
  throwIfError(signed.error);
  return (data || []).map((photo, index) => ({ id: photo.id, url: signed.data?.[index]?.signedUrl }));
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
