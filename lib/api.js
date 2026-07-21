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
  "price", "description", "short_description", "course", "menu_position", "diets", "allergens",
  "allergens_verified", "allergen_details", "nutrition",
  "ingredients", "meal_occasions", "crowd_tags", "official_image_url", "availability",
  "hidden_search_tokens", "data_sources", "sponsored", "local_overrides", "created_at", "updated_at",
  "restaurant_name", "chain_name", "branch_name", "area", "cuisine", "city", "country_code",
  "latitude", "longitude", "score", "rating_count", "branch_score", "branch_rating_count",
  "city_score", "city_rating_count", "overall_score", "overall_rating_count", "min_price",
  "max_price", "branch_count", "is_active", "available_from", "available_until", "branches",
  "repeat_order_rate", "user_photo_count", "tag_counts", "search_tags",
].join(",");

const RESTAURANT_CATALOG_COLUMNS = [
  "id", "brand_id", "brand_name", "name", "chain_name", "branch_name", "area", "cuisine",
  "latitude", "longitude", "city", "country_code", "description", "created_at", "updated_at",
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
    const cleanupErrors = [];
    const photoMetadataCleanup = await client().from("rating_photos").delete().eq("rating_id", rating.id);
    if (photoMetadataCleanup.error) {
      cleanupErrors.push(photoMetadataCleanup.error.message || "photo metadata cleanup failed");
    } else {
      if (uploadedPaths.length) {
        const storageCleanup = await client().storage.from("meal-photos").remove(uploadedPaths);
        if (storageCleanup.error) cleanupErrors.push(storageCleanup.error.message || "photo storage cleanup failed");
      }

      const ratingCleanup = await client().from("ratings").delete().eq("id", rating.id);
      if (ratingCleanup.error) cleanupErrors.push(ratingCleanup.error.message || "rating cleanup failed");
    }

    if (cleanupErrors.length) {
      throw new Error(`${error.message || "This meal could not be saved."} Cleanup was incomplete: ${cleanupErrors.join("; ")}`, { cause: error });
    }
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
