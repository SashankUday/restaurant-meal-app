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
  "price", "description", "short_description", "course", "menu_position", "menu_tags", "badges", "diets", "allergens",
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

export async function createVisit({ userId, restaurantId, visitedAt, notes = "" }) {
  const payload = { user_id: userId, restaurant_id: restaurantId, notes: notes.trim() };
  if (visitedAt) payload.visited_at = visitedAt;
  const { data, error } = await client().from("visits").insert(payload).select("id").single();
  throwIfError(error);
  return data.id;
}

export async function updateVisit({ visitId, userId, visitedAt, notes }) {
  const payload = {};
  if (visitedAt) payload.visited_at = visitedAt;
  if (notes !== undefined) payload.notes = notes.trim();
  const visitUpdate = await client().from("visits").update(payload).eq("id", visitId).eq("user_id", userId);
  throwIfError(visitUpdate.error);
}

// Backfill a visit for a rating that was saved without one ("Did you eat here
// recently?") and point the rating at it. Ratings carry no date of their own;
// the visit's date is the only date associated with this rating going forward.
export async function attachVisitToRating({ ratingId, userId, restaurantId, visitedAt, notes = "" }) {
  const visitId = await createVisit({ userId, restaurantId, visitedAt, notes });
  const update = await client().from("ratings")
    .update({ visit_id: visitId })
    .eq("id", ratingId).eq("user_id", userId);
  throwIfError(update.error);
  return visitId;
}

export async function deleteRating({ ratingId, userId }) {
  const photos = await client().from("rating_photos").select("storage_path").eq("rating_id", ratingId);
  throwIfError(photos.error);
  const paths = (photos.data || []).map((photo) => photo.storage_path);
  if (paths.length) {
    const storageCleanup = await client().storage.from("meal-photos").remove(paths);
    throwIfError(storageCleanup.error);
  }
  const deletion = await client().from("ratings").delete().eq("id", ratingId).eq("user_id", userId);
  throwIfError(deletion.error);
}

export async function fetchVisitHistory(userId) {
  const { data, error } = await client()
    .from("visits")
    .select(`
      id, visited_at, notes, restaurant_id,
      restaurants!inner (id, name, area, cuisine),
      ratings (id, score, would_order_again, tags, comment, created_at, dish_id, dishes (id, name))
    `)
    .eq("user_id", userId)
    .order("visited_at", { ascending: false });
  throwIfError(error);
  return (data || []).map((visit) => ({
    id: visit.id,
    visitedAt: visit.visited_at,
    notes: visit.notes || "",
    restaurant: {
      id: Number(visit.restaurants.id),
      name: visit.restaurants.name,
      area: visit.restaurants.area,
      cuisine: cuisineLabel(visit.restaurants.cuisine),
    },
    ratings: (visit.ratings || []).map((rating) => ({
      id: rating.id,
      score: Number(rating.score),
      wouldOrderAgain: rating.would_order_again,
      tags: rating.tags || [],
      comment: rating.comment || "",
      dish: { id: Number(rating.dishes.id), name: rating.dishes.name },
    })),
  }));
}

export async function createMeal({
  userId, dishId, score, tags = [], comment = "", photos, wouldOrderAgain = null, photosPrivate = false, visitId = null,
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
  // Only touch visit_id when a visit is supplied, so a bare re-rating keeps any
  // visit the row already had. Ratings carry no date of their own.
  if (visitId) payload.visit_id = visitId;

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

export async function submitDishAttributeFlag({ dishId, attribute, action, value }) {
  const { data, error } = await client().rpc("submit_dish_attribute_flag", {
    target_dish_id: dishId,
    target_attribute: attribute,
    correction_action: action,
    correction_value: value,
  });
  throwIfError(error);
  return data;
}

export async function updateRestaurantInfo({ restaurantId, attribute, value }) {
  const { data, error } = await client().rpc("update_restaurant_info", {
    target_restaurant_id: restaurantId,
    target_attribute: attribute,
    new_value: value,
  });
  throwIfError(error);
  return data;
}

export async function requestEditAccess() {
  const { data, error } = await client().rpc("request_edit_access");
  throwIfError(error);
  return data;
}

export async function fetchOwnEditRequest(userId) {
  const { data, error } = await client()
    .from("edit_access_requests")
    .select("status, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function fetchPendingEditRequests() {
  const { data, error } = await client()
    .from("edit_access_requests")
    .select("id, email, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data || [];
}

export async function approveEditAccess(email) {
  const { error } = await client().rpc("approve_edit_access", { target_email: email });
  throwIfError(error);
}

export async function rejectEditAccess(email) {
  const { error } = await client().rpc("reject_edit_access", { target_email: email });
  throwIfError(error);
}

export async function fetchDishFlagCounts(dishId) {
  const { data, error } = await client()
    .from("dish_attribute_flag_counts")
    .select("attribute, flag_count, last_edited_at")
    .eq("dish_id", dishId);
  throwIfError(error);
  const counts = {};
  (data || []).forEach((row) => { counts[row.attribute] = { count: Number(row.flag_count), lastEditedAt: row.last_edited_at }; });
  return counts;
}

export async function fetchUserRatingForDish(userId, canonicalDishId) {
  const { data, error } = await client()
    .from("ratings")
    .select("id, dish_id, score, tags, comment, would_order_again, visit_id")
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
      wouldOrderAgain: data.would_order_again,
      visitId: data.visit_id ?? null,
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
      id, score, would_order_again, tags, comment, created_at, visit_id,
      dishes!inner (
        id, name, restaurant_id,
        restaurants!inner (id, name, area, cuisine)
      ),
      visits (id, visited_at, notes),
      rating_photos (id, storage_path)
    `)
    .eq("user_id", userId)
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
    createdAt: meal.created_at,
    visit: meal.visits ? { id: meal.visits.id, visitedAt: meal.visits.visited_at, notes: meal.visits.notes || "" } : null,
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
