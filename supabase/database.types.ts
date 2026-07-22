export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          brand_key: string
          created_at: string
          id: number
          is_chain: boolean
          name: string
          updated_at: string
        }
        Insert: {
          brand_key: string
          created_at?: string
          id?: number
          is_chain?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          brand_key?: string
          created_at?: string
          id?: number
          is_chain?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      canonical_dish_match_suggestions: {
        Row: {
          brand_id: number
          candidate_canonical_dish_id: number
          confidence: number | null
          created_at: string
          dish_id: number
          evidence: Json
          id: number
          reason_codes: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: number
          candidate_canonical_dish_id: number
          confidence?: number | null
          created_at?: string
          dish_id: number
          evidence?: Json
          id?: number
          reason_codes?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: number
          candidate_canonical_dish_id?: number
          confidence?: number | null
          created_at?: string
          dish_id?: number
          evidence?: Json
          id?: number
          reason_codes?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_match_suggestion_candidate_brand_fkey"
            columns: ["candidate_canonical_dish_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "canonical_dishes"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "canonical_match_suggestion_dish_brand_fkey"
            columns: ["dish_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "dish_catalog"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "canonical_match_suggestion_dish_brand_fkey"
            columns: ["dish_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      canonical_dishes: {
        Row: {
          allergen_details: Json
          allergens: string[]
          allergens_verified: boolean
          brand_id: number
          canonical_key: string
          canonicalisation_method: string
          course: string
          created_at: string
          data_sources: Json
          description: string
          diets: string[]
          id: number
          ingredients: string[]
          is_current: boolean
          market_code: string
          meal_occasions: string[]
          name: string
          nutrition: Json
          official_image_url: string | null
          official_menu_item_id: string | null
          review_status: string
          short_description: string | null
          source_identifiers: Json
          supersedes_id: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          version: number
        }
        Insert: {
          allergen_details?: Json
          allergens?: string[]
          allergens_verified?: boolean
          brand_id: number
          canonical_key: string
          canonicalisation_method?: string
          course?: string
          created_at?: string
          data_sources?: Json
          description?: string
          diets?: string[]
          id?: number
          ingredients?: string[]
          is_current?: boolean
          market_code?: string
          meal_occasions?: string[]
          name: string
          nutrition?: Json
          official_image_url?: string | null
          official_menu_item_id?: string | null
          review_status?: string
          short_description?: string | null
          source_identifiers?: Json
          supersedes_id?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version?: number
        }
        Update: {
          allergen_details?: Json
          allergens?: string[]
          allergens_verified?: boolean
          brand_id?: number
          canonical_key?: string
          canonicalisation_method?: string
          course?: string
          created_at?: string
          data_sources?: Json
          description?: string
          diets?: string[]
          id?: number
          ingredients?: string[]
          is_current?: boolean
          market_code?: string
          meal_occasions?: string[]
          name?: string
          nutrition?: Json
          official_image_url?: string | null
          official_menu_item_id?: string | null
          review_status?: string
          short_description?: string | null
          source_identifiers?: Json
          supersedes_id?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "canonical_dishes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canonical_dishes_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "canonical_dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_attribute_flags: {
        Row: {
          action: string
          applied_at: string | null
          attribute: string
          created_at: string
          dish_id: number
          id: number
          user_id: string
          value: Json
        }
        Insert: {
          action: string
          applied_at?: string | null
          attribute: string
          created_at?: string
          dish_id: number
          id?: number
          user_id: string
          value: Json
        }
        Update: {
          action?: string
          applied_at?: string | null
          attribute?: string
          created_at?: string
          dish_id?: number
          id?: number
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dish_attribute_flags_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_attribute_flags_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_attribute_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_rating_rollups: {
        Row: {
          dish_id: number
          legacy_rating_count: number
          legacy_score_sum: number
          rating_count: number
          rating_tag_counts: Json
          repeat_response_count: number
          repeat_yes_count: number
          score_sum: number
          updated_at: string
          user_photo_count: number
        }
        Insert: {
          dish_id: number
          legacy_rating_count?: number
          legacy_score_sum?: number
          rating_count?: number
          rating_tag_counts?: Json
          repeat_response_count?: number
          repeat_yes_count?: number
          score_sum?: number
          updated_at?: string
          user_photo_count?: number
        }
        Update: {
          dish_id?: number
          legacy_rating_count?: number
          legacy_score_sum?: number
          rating_count?: number
          rating_tag_counts?: Json
          repeat_response_count?: number
          repeat_yes_count?: number
          score_sum?: number
          updated_at?: string
          user_photo_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "dish_rating_rollups_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: true
            referencedRelation: "dish_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_rating_rollups_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: true
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          allergen_details: Json
          allergens: string[]
          allergens_verified: boolean
          availability: Json
          available_from: string | null
          available_until: string | null
          badges: string[]
          brand_id: number
          canonical_dish_id: number
          course: string
          created_at: string
          crowd_tags: Json
          data_sources: Json
          description: string
          diets: string[]
          hidden_search_tokens: string[]
          id: number
          ingredients: string[]
          is_active: boolean
          local_overrides: Json
          meal_occasions: string[]
          menu_position: number
          menu_tags: string[]
          name: string
          nutrition: Json
          official_image_url: string | null
          price: number | null
          restaurant_id: number
          short_description: string | null
          sponsored: boolean
          updated_at: string
          variant_key: string
        }
        Insert: {
          allergen_details?: Json
          allergens?: string[]
          allergens_verified?: boolean
          availability?: Json
          available_from?: string | null
          available_until?: string | null
          badges?: string[]
          brand_id: number
          canonical_dish_id: number
          course?: string
          created_at?: string
          crowd_tags?: Json
          data_sources?: Json
          description: string
          diets?: string[]
          hidden_search_tokens?: string[]
          id?: number
          ingredients?: string[]
          is_active?: boolean
          local_overrides?: Json
          meal_occasions?: string[]
          menu_position?: number
          menu_tags?: string[]
          name: string
          nutrition?: Json
          official_image_url?: string | null
          price?: number | null
          restaurant_id: number
          short_description?: string | null
          sponsored?: boolean
          updated_at?: string
          variant_key?: string
        }
        Update: {
          allergen_details?: Json
          allergens?: string[]
          allergens_verified?: boolean
          availability?: Json
          available_from?: string | null
          available_until?: string | null
          badges?: string[]
          brand_id?: number
          canonical_dish_id?: number
          course?: string
          created_at?: string
          crowd_tags?: Json
          data_sources?: Json
          description?: string
          diets?: string[]
          hidden_search_tokens?: string[]
          id?: number
          ingredients?: string[]
          is_active?: boolean
          local_overrides?: Json
          meal_occasions?: string[]
          menu_position?: number
          menu_tags?: string[]
          name?: string
          nutrition?: Json
          official_image_url?: string | null
          price?: number | null
          restaurant_id?: number
          short_description?: string | null
          sponsored?: boolean
          updated_at?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_canonical_brand_fkey"
            columns: ["canonical_dish_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "canonical_dishes"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "dishes_restaurant_brand_fkey"
            columns: ["restaurant_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "restaurant_catalog"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "dishes_restaurant_brand_fkey"
            columns: ["restaurant_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      edit_access_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          id: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          id?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          id?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_access_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_access_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blocked_ingredients: string[]
          can_edit: boolean
          created_at: string
          dietary_requirements: string[]
          email: string
          id: string
        }
        Insert: {
          blocked_ingredients?: string[]
          can_edit?: boolean
          created_at?: string
          dietary_requirements?: string[]
          email: string
          id: string
        }
        Update: {
          blocked_ingredients?: string[]
          can_edit?: boolean
          created_at?: string
          dietary_requirements?: string[]
          email?: string
          id?: string
        }
        Relationships: []
      }
      rating_photos: {
        Row: {
          created_at: string
          id: string
          is_private: boolean
          mime_type: string
          rating_id: string
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_private?: boolean
          mime_type: string
          rating_id: string
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_private?: boolean
          mime_type?: string
          rating_id?: string
          size_bytes?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_photos_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          canonical_dish_id: number
          comment: string
          created_at: string
          dish_id: number
          id: string
          score: number
          tags: string[]
          user_id: string
          visit_id: number | null
          visited_at: string | null
          would_order_again: boolean | null
        }
        Insert: {
          canonical_dish_id: number
          comment?: string
          created_at?: string
          dish_id: number
          id?: string
          score: number
          tags?: string[]
          user_id: string
          visit_id?: number | null
          visited_at?: string | null
          would_order_again?: boolean | null
        }
        Update: {
          canonical_dish_id?: number
          comment?: string
          created_at?: string
          dish_id?: number
          id?: string
          score?: number
          tags?: string[]
          user_id?: string
          visit_id?: number | null
          visited_at?: string | null
          would_order_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_attribute_flags: {
        Row: {
          applied_at: string | null
          attribute: string
          created_at: string
          id: number
          restaurant_id: number
          user_id: string
          value: Json
        }
        Insert: {
          applied_at?: string | null
          attribute: string
          created_at?: string
          id?: number
          restaurant_id: number
          user_id: string
          value: Json
        }
        Update: {
          applied_at?: string | null
          attribute?: string
          created_at?: string
          id?: number
          restaurant_id?: number
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_attribute_flags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_attribute_flags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_attribute_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          area: string
          branch_name: string | null
          brand_id: number
          chain_name: string | null
          city: string
          country_code: string
          created_at: string
          cuisine: Json
          description: string
          id: number
          latitude: number
          longitude: number
          menu_windows: Json
          name: string
          updated_at: string
        }
        Insert: {
          area: string
          branch_name?: string | null
          brand_id: number
          chain_name?: string | null
          city?: string
          country_code?: string
          created_at?: string
          cuisine: Json
          description?: string
          id?: number
          latitude: number
          longitude: number
          menu_windows?: Json
          name: string
          updated_at?: string
        }
        Update: {
          area?: string
          branch_name?: string | null
          brand_id?: number
          chain_name?: string | null
          city?: string
          country_code?: string
          created_at?: string
          cuisine?: Json
          description?: string
          id?: number
          latitude?: number
          longitude?: number
          menu_windows?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          created_at: string
          id: number
          notes: string
          restaurant_id: number
          user_id: string
          visited_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          notes?: string
          restaurant_id: number
          user_id: string
          visited_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          notes?: string
          restaurant_id?: number
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dish_attribute_flag_counts: {
        Row: {
          attribute: string | null
          dish_id: number | null
          flag_count: number | null
          last_edited_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_attribute_flags_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_attribute_flags_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_catalog: {
        Row: {
          allergen_details: Json | null
          allergens: string[] | null
          allergens_verified: boolean | null
          area: string | null
          availability: Json | null
          available_from: string | null
          available_until: string | null
          badges: string[] | null
          branch_count: number | null
          branch_name: string | null
          branch_rating_count: number | null
          branch_score: number | null
          branches: Json | null
          brand_id: number | null
          brand_name: string | null
          canonical_dish_id: number | null
          canonical_name: string | null
          canonical_review_status: string | null
          canonical_version: number | null
          chain_name: string | null
          city: string | null
          city_rating_count: number | null
          city_score: number | null
          country_code: string | null
          course: string | null
          created_at: string | null
          crowd_tags: Json | null
          cuisine: Json | null
          data_sources: Json | null
          description: string | null
          diets: string[] | null
          hidden_search_tokens: string[] | null
          id: number | null
          ingredients: string[] | null
          is_active: boolean | null
          latitude: number | null
          local_overrides: Json | null
          longitude: number | null
          market_code: string | null
          max_price: number | null
          meal_occasions: string[] | null
          menu_position: number | null
          menu_tags: string[] | null
          menu_windows: Json | null
          min_price: number | null
          name: string | null
          nutrition: Json | null
          official_image_url: string | null
          overall_rating_count: number | null
          overall_score: number | null
          price: number | null
          rating_count: number | null
          repeat_order_rate: number | null
          restaurant_id: number | null
          restaurant_name: string | null
          score: number | null
          search_tags: string[] | null
          short_description: string | null
          sponsored: boolean | null
          tag_counts: Json | null
          updated_at: string | null
          user_photo_count: number | null
          variant_key: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_canonical_brand_fkey"
            columns: ["canonical_dish_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "canonical_dishes"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "dishes_restaurant_brand_fkey"
            columns: ["restaurant_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "restaurant_catalog"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "dishes_restaurant_brand_fkey"
            columns: ["restaurant_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      dish_photos: {
        Row: {
          canonical_dish_id: number | null
          created_at: string | null
          dish_id: number | null
          id: string | null
          storage_path: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dish_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_catalog: {
        Row: {
          active_dish_count: number | null
          area: string | null
          branch_name: string | null
          brand_id: number | null
          brand_name: string | null
          chain_name: string | null
          city: string | null
          country_code: string | null
          created_at: string | null
          cuisine: Json | null
          description: string | null
          id: number | null
          latitude: number | null
          longitude: number | null
          menu_windows: Json | null
          name: string | null
          rating_count: number | null
          score: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_edit_access: {
        Args: { target_email: string }
        Returns: undefined
      }
      is_plate_admin: { Args: never; Returns: boolean }
      reject_edit_access: { Args: { target_email: string }; Returns: undefined }
      request_edit_access: { Args: never; Returns: number }
      submit_dish_attribute_flag: {
        Args: {
          correction_action: string
          correction_value: Json
          target_attribute: string
          target_dish_id: number
        }
        Returns: number
      }
      update_restaurant_info: {
        Args: {
          new_value: string
          target_attribute: string
          target_restaurant_id: number
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
