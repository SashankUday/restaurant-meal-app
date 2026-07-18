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

function numericObject(value = {}) {
  return Object.fromEntries(Object.entries(value || {}).map(([key, item]) => [key, numberOrNull(item)]));
}

function cuisineLabel(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

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
    countryCode: row.country_code,
    price: Number(row.price),
    score: Number(row.score || 0),
    ratingCount: Number(row.rating_count || 0),
    diets: row.diets || [],
    allergens: row.allergens || [],
    tagCounts: row.tag_counts || {},
    searchTags: row.search_tags || [],
    description: row.description || "",
    officialDescription: row.official_description || "",
    shortDescription: row.short_description || row.description || "",
    course: row.course,
    menuPosition: Number(row.menu_position || 0),
    mealOccasions: row.meal_occasions || [],
    ingredients: row.ingredients || [],
    cookingMethods: row.cooking_methods || [],
    servingStyle: row.serving_style,
    culturalOrigin: row.cultural_origin,
    historicalNotes: row.historical_notes,
    portion: {
      category: row.portion_category,
      weightG: numberOrNull(row.weight_g),
      volumeMl: numberOrNull(row.volume_ml),
      pieceCount: numberOrNull(row.piece_count),
      estimatedSatietyScore: numberOrNull(row.estimated_satiety_score),
      suitableForSharing: row.suitable_for_sharing,
      peopleServed: numberOrNull(row.people_served),
    },
    nutrition: row.nutrition || {},
    dietaryFlags: row.dietary_flags || row.diets || [],
    allergenDetails: row.allergen_details || {},
    sensoryProfile: row.sensory_profile || {},
    ingredientProfile: row.ingredient_profile || {},
    recommendationMetadata: row.recommendation_metadata || {},
    availability: row.availability || {},
    officialImageUrl: row.official_image_url,
    visualMetadata: row.visual_metadata || {},
    derivedFeatures: row.derived_features || {},
    dataSources: row.data_sources || {},
    experienceScores: numericObject(row.experience_scores),
    userPhotoCount: Number(row.user_photo_count || 0),
    saveCount: Number(row.save_count || 0),
    favouriteCount: Number(row.favourite_count || 0),
    currentPrices: numericObject(row.current_prices),
    priceHistory: row.price_history || [],
    officialMedia: row.official_media || [],
    relatedDishes: row.related_dishes || [],
    pricePerCalorie: numberOrNull(row.price_per_calorie),
    pricePerGramProtein: numberOrNull(row.price_per_gram_protein),
    searchMetadataText: row.search_metadata_text || "",
    dateAdded: row.date_added,
    dateLastUpdated: row.date_last_updated,
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
    deliveryRadiusKm: numberOrNull(row.delivery_radius_km),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    description: row.description || "",
    score: Number(row.score || 0),
    ratingCount: Number(row.rating_count || 0),
  };
}

export async function fetchCatalog() {
  const [dishResponse, restaurantResponse] = await Promise.all([
    client().from("dish_catalog").select("*").order("score", { ascending: false }),
    client().from("restaurant_catalog").select("*").order("score", { ascending: false }),
  ]);
  throwIfError(dishResponse.error);
  throwIfError(restaurantResponse.error);
  return {
    dishes: (dishResponse.data || []).map(mapDish),
    restaurants: (restaurantResponse.data || []).map(mapRestaurant),
  };
}

export async function createMeal({ userId, dishId, score, tags, comment, visitedAt, photos, scoreBreakdown, wouldOrderAgain }) {
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
      taste_score: scoreBreakdown?.taste ?? null,
      value_score: scoreBreakdown?.value ?? null,
      presentation_score: scoreBreakdown?.presentation ?? null,
      portion_score: scoreBreakdown?.portion ?? null,
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
      id, score, taste_score, value_score, presentation_score, portion_score,
      would_order_again, tags, comment, visited_at, created_at,
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

  const paths = (data || []).flatMap((meal) => meal.rating_photos.map((photo) => photo.storage_path));
  const signedUrls = new Map();
  if (paths.length) {
    const signed = await client().storage.from("meal-photos").createSignedUrls(paths, 60 * 60);
    throwIfError(signed.error);
    (signed.data || []).forEach((item, index) => signedUrls.set(paths[index], item.signedUrl));
  }

  return (data || []).map((meal) => ({
    id: meal.id,
    score: Number(meal.score),
    scoreBreakdown: {
      taste: numberOrNull(meal.taste_score),
      value: numberOrNull(meal.value_score),
      presentation: numberOrNull(meal.presentation_score),
      portion: numberOrNull(meal.portion_score),
    },
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
      cuisine: meal.dishes.restaurants.cuisine,
    },
    photos: meal.rating_photos.map((photo) => ({
      id: photo.id,
      url: signedUrls.get(photo.storage_path),
    })),
  }));
}
