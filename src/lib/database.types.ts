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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      home_members: {
        Row: {
          home_id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          home_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          home_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_members_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_settings: {
        Row: {
          category_order: Database["public"]["Enums"]["ingredient_category"][]
          home_id: string
          visible_slots: Database["public"]["Enums"]["meal_slot"][]
        }
        Insert: {
          category_order?: Database["public"]["Enums"]["ingredient_category"][]
          home_id: string
          visible_slots?: Database["public"]["Enums"]["meal_slot"][]
        }
        Update: {
          category_order?: Database["public"]["Enums"]["ingredient_category"][]
          home_id?: string
          visible_slots?: Database["public"]["Enums"]["meal_slot"][]
        }
        Relationships: [
          {
            foreignKeyName: "home_settings_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: true
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      homes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: Database["public"]["Enums"]["ingredient_category"]
          created_at: string
          density_g_per_ml: number | null
          diet_tag: Database["public"]["Enums"]["diet_class"] | null
          dimension: Database["public"]["Enums"]["unit_dimension"]
          home_id: string | null
          id: string
          name: string
          package_size: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["ingredient_category"]
          created_at?: string
          density_g_per_ml?: number | null
          diet_tag?: Database["public"]["Enums"]["diet_class"] | null
          dimension: Database["public"]["Enums"]["unit_dimension"]
          home_id?: string | null
          id?: string
          name: string
          package_size?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ingredient_category"]
          created_at?: string
          density_g_per_ml?: number | null
          diet_tag?: Database["public"]["Enums"]["diet_class"] | null
          dimension?: Database["public"]["Enums"]["unit_dimension"]
          home_id?: string | null
          id?: string
          name?: string
          package_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          home_id: string
          id: string
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          home_id: string
          id?: string
          revoked?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          home_id?: string
          id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_tokens_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_meals: {
        Row: {
          created_at: string
          home_id: string
          id: string
          meal_date: string
          recipe_id: string
          servings: number
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Insert: {
          created_at?: string
          home_id: string
          id?: string
          meal_date: string
          recipe_id: string
          servings: number
          slot: Database["public"]["Enums"]["meal_slot"]
        }
        Update: {
          created_at?: string
          home_id?: string
          id?: string
          meal_date?: string
          recipe_id?: string
          servings?: number
          slot?: Database["public"]["Enums"]["meal_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "planned_meals_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_facets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_recipe_ingredients: {
        Row: {
          amount_base: number
          display_amount: number
          display_unit: Database["public"]["Enums"]["unit_code"]
          id: string
          ingredient_id: string
          public_recipe_id: string
        }
        Insert: {
          amount_base?: number
          display_amount: number
          display_unit: Database["public"]["Enums"]["unit_code"]
          id?: string
          ingredient_id: string
          public_recipe_id: string
        }
        Update: {
          amount_base?: number
          display_amount?: number
          display_unit?: Database["public"]["Enums"]["unit_code"]
          id?: string
          ingredient_id?: string
          public_recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_recipe_ingredients_public_recipe_id_fkey"
            columns: ["public_recipe_id"]
            isOneToOne: false
            referencedRelation: "public_recipe_facets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_recipe_ingredients_public_recipe_id_fkey"
            columns: ["public_recipe_id"]
            isOneToOne: false
            referencedRelation: "public_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      public_recipe_steps: {
        Row: {
          content: string
          id: string
          position: number
          public_recipe_id: string
        }
        Insert: {
          content: string
          id?: string
          position: number
          public_recipe_id: string
        }
        Update: {
          content?: string
          id?: string
          position?: number
          public_recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_recipe_steps_public_recipe_id_fkey"
            columns: ["public_recipe_id"]
            isOneToOne: false
            referencedRelation: "public_recipe_facets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_recipe_steps_public_recipe_id_fkey"
            columns: ["public_recipe_id"]
            isOneToOne: false
            referencedRelation: "public_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      public_recipes: {
        Row: {
          description: string | null
          id: string
          image_path: string
          name: string
          prep_minutes: number | null
          published_at: string
          published_by: string | null
          servings: number
          source_home_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          image_path: string
          name: string
          prep_minutes?: number | null
          published_at?: string
          published_by?: string | null
          servings: number
          source_home_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          image_path?: string
          name?: string
          prep_minutes?: number | null
          published_at?: string
          published_by?: string | null
          servings?: number
          source_home_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_recipes_source_home_id_fkey"
            columns: ["source_home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          amount_base: number
          display_amount: number
          display_unit: Database["public"]["Enums"]["unit_code"]
          id: string
          ingredient_id: string
          recipe_id: string
        }
        Insert: {
          amount_base?: number
          display_amount: number
          display_unit: Database["public"]["Enums"]["unit_code"]
          id?: string
          ingredient_id: string
          recipe_id: string
        }
        Update: {
          amount_base?: number
          display_amount?: number
          display_unit?: Database["public"]["Enums"]["unit_code"]
          id?: string
          ingredient_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_facets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          content: string
          id: string
          position: number
          recipe_id: string
        }
        Insert: {
          content: string
          id?: string
          position: number
          recipe_id: string
        }
        Update: {
          content?: string
          id?: string
          position?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_facets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          diet_override: Database["public"]["Enums"]["diet_class"] | null
          home_id: string
          id: string
          image_path: string | null
          name: string
          prep_minutes: number | null
          servings: number
          tags: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          diet_override?: Database["public"]["Enums"]["diet_class"] | null
          home_id: string
          id?: string
          image_path?: string | null
          name: string
          prep_minutes?: number | null
          servings: number
          tags?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          diet_override?: Database["public"]["Enums"]["diet_class"] | null
          home_id?: string
          id?: string
          image_path?: string | null
          name?: string
          prep_minutes?: number | null
          servings?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "recipes_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_items: {
        Row: {
          amount_base: number | null
          created_at: string
          dimension: Database["public"]["Enums"]["unit_dimension"] | null
          home_id: string
          id: string
          ingredient_id: string | null
          name: string
        }
        Insert: {
          amount_base?: number | null
          created_at?: string
          dimension?: Database["public"]["Enums"]["unit_dimension"] | null
          home_id: string
          id?: string
          ingredient_id?: string | null
          name: string
        }
        Update: {
          amount_base?: number | null
          created_at?: string
          dimension?: Database["public"]["Enums"]["unit_dimension"] | null
          home_id?: string
          id?: string
          ingredient_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_items_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      seeded_weeks: {
        Row: {
          home_id: string
          seeded_at: string
          week_start: string
        }
        Insert: {
          home_id: string
          seeded_at?: string
          week_start: string
        }
        Update: {
          home_id?: string
          seeded_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeded_weeks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["ingredient_category"] | null
          checked: boolean
          created_at: string
          dimension: Database["public"]["Enums"]["unit_dimension"] | null
          id: string
          ingredient_id: string | null
          is_orphaned: boolean
          list_id: string
          name: string
          recurring_item_id: string | null
          source: Database["public"]["Enums"]["list_item_source"]
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["ingredient_category"] | null
          checked?: boolean
          created_at?: string
          dimension?: Database["public"]["Enums"]["unit_dimension"] | null
          id?: string
          ingredient_id?: string | null
          is_orphaned?: boolean
          list_id: string
          name: string
          recurring_item_id?: string | null
          source: Database["public"]["Enums"]["list_item_source"]
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["ingredient_category"] | null
          checked?: boolean
          created_at?: string
          dimension?: Database["public"]["Enums"]["unit_dimension"] | null
          id?: string
          ingredient_id?: string | null
          is_orphaned?: boolean
          list_id?: string
          name?: string
          recurring_item_id?: string | null
          source?: Database["public"]["Enums"]["list_item_source"]
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_recurring_item_fkey"
            columns: ["recurring_item_id"]
            isOneToOne: false
            referencedRelation: "recurring_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          generated_at: string | null
          home_id: string
          id: string
          total_cost: number | null
          week_start: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          home_id: string
          id?: string
          total_cost?: number | null
          week_start: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          home_id?: string
          id?: string
          total_cost?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      standing_meals: {
        Row: {
          created_at: string
          created_by: string | null
          home_id: string
          id: string
          recipe_id: string
          servings: number
          slot: Database["public"]["Enums"]["meal_slot"]
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          home_id: string
          id?: string
          recipe_id: string
          servings: number
          slot: Database["public"]["Enums"]["meal_slot"]
          weekdays: number[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          home_id?: string
          id?: string
          recipe_id?: string
          servings?: number
          slot?: Database["public"]["Enums"]["meal_slot"]
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "standing_meals_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_facets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_cleanup_queue: {
        Row: {
          attempts: number
          bucket_id: string
          claimed_at: string | null
          enqueued_at: string
          id: number
          last_error: string | null
          object_path: string
        }
        Insert: {
          attempts?: number
          bucket_id: string
          claimed_at?: string | null
          enqueued_at?: string
          id?: never
          last_error?: string | null
          object_path: string
        }
        Update: {
          attempts?: number
          bucket_id?: string
          claimed_at?: string | null
          enqueued_at?: string
          id?: never
          last_error?: string | null
          object_path?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_recipe_facets: {
        Row: {
          diet: Database["public"]["Enums"]["diet_class"] | null
          id: string | null
          image_path: string | null
          is_quick: boolean | null
          name: string | null
          prep_minutes: number | null
          published_at: string | null
        }
        Insert: {
          diet?: never
          id?: string | null
          image_path?: string | null
          is_quick?: never
          name?: string | null
          prep_minutes?: number | null
          published_at?: string | null
        }
        Update: {
          diet?: never
          id?: string | null
          image_path?: string | null
          is_quick?: never
          name?: string | null
          prep_minutes?: number | null
          published_at?: string | null
        }
        Relationships: []
      }
      recipe_facets: {
        Row: {
          created_at: string | null
          diet: Database["public"]["Enums"]["diet_class"] | null
          home_id: string | null
          id: string | null
          image_path: string | null
          is_quick: boolean | null
          name: string | null
          prep_minutes: number | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          diet?: never
          home_id?: string | null
          id?: string | null
          image_path?: string | null
          is_quick?: never
          name?: string | null
          prep_minutes?: number | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          diet?: never
          home_id?: string | null
          id?: string | null
          image_path?: string | null
          is_quick?: never
          name?: string | null
          prep_minutes?: number | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_storage_cleanup: {
        Args: { _limit?: number }
        Returns: {
          bucket_id: string
          id: number
          object_path: string
        }[]
      }
      complete_storage_cleanup: { Args: { _ids: number[] }; Returns: undefined }
      create_home: { Args: { _name: string }; Returns: string }
      create_recipe: {
        Args: { _ingredients: Json; _name: string; _servings: number }
        Returns: string
      }
      current_home_id: { Args: never; Returns: string }
      delete_home: { Args: { _home_id: string }; Returns: undefined }
      enqueue_storage_delete: {
        Args: { _bucket: string; _path: string }
        Returns: undefined
      }
      fail_storage_cleanup: {
        Args: { _error: string; _id: number }
        Returns: undefined
      }
      generate_shopping_list: {
        Args: { _home_id: string; _week_start: string }
        Returns: string
      }
      is_home_member: { Args: { _home_id: string }; Returns: boolean }
      is_home_owner: { Args: { _home_id: string }; Returns: boolean }
      leave_home: { Args: never; Returns: undefined }
      peek_invite: {
        Args: { _token: string }
        Returns: {
          home_id: string
          home_name: string
          member_count: number
        }[]
      }
      redeem_invite: { Args: { _token: string }; Returns: string }
      seed_standing_meals: {
        Args: { _home_id: string; _week_start: string }
        Returns: undefined
      }
      shares_home_with: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unit_dimension_of: {
        Args: { _unit: Database["public"]["Enums"]["unit_code"] }
        Returns: Database["public"]["Enums"]["unit_dimension"]
      }
      unit_to_base: {
        Args: {
          _amount: number
          _unit: Database["public"]["Enums"]["unit_code"]
        }
        Returns: number
      }
      week_monday: { Args: { _d: string }; Returns: string }
    }
    Enums: {
      diet_class: "vegetariskt" | "kott" | "fisk"
      ingredient_category:
        | "produce"
        | "protein"
        | "seafood"
        | "dairy"
        | "bakery"
        | "grains"
        | "fruit"
        | "beverages"
        | "frozen"
        | "snacks"
        | "spices"
        | "household"
        | "other"
      list_item_source: "generated" | "manual" | "recurring"
      meal_slot:
        | "frukost"
        | "brunch"
        | "mellanmal_1"
        | "lunch"
        | "mellanmal_2"
        | "middag"
        | "snacks"
      member_role: "owner" | "member"
      unit_code:
        | "gram"
        | "kilogram"
        | "milliliter"
        | "centiliter"
        | "deciliter"
        | "liter"
        | "matsked"
        | "tesked"
        | "kryddmatt"
        | "styck"
      unit_dimension: "vikt" | "volym" | "antal"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      diet_class: ["vegetariskt", "kott", "fisk"],
      ingredient_category: [
        "produce",
        "protein",
        "seafood",
        "dairy",
        "bakery",
        "grains",
        "fruit",
        "beverages",
        "frozen",
        "snacks",
        "spices",
        "household",
        "other",
      ],
      list_item_source: ["generated", "manual", "recurring"],
      meal_slot: [
        "frukost",
        "brunch",
        "mellanmal_1",
        "lunch",
        "mellanmal_2",
        "middag",
        "snacks",
      ],
      member_role: ["owner", "member"],
      unit_code: [
        "gram",
        "kilogram",
        "milliliter",
        "centiliter",
        "deciliter",
        "liter",
        "matsked",
        "tesked",
        "kryddmatt",
        "styck",
      ],
      unit_dimension: ["vikt", "volym", "antal"],
    },
  },
} as const
