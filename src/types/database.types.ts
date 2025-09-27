export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cart_items: {
        Row: {
          id: number
          user_id: string
          product_id: number
          size_id: number
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          product_id: number
          size_id: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          product_id?: number
          size_id?: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          }
        ]
      }
      category: {
        Row: {
          created_at: string
          id: number
          imageurl: string
          name: string | null
          products: number[] | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: number
          imageurl: string
          name?: string | null
          products?: number[] | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: number
          imageurl?: string
          name?: string | null
          products?: number[] | null
          slug?: string
        }
        Relationships: []
      }
      order: {
        Row: {
          created_at: string
          description: string | null
          id: number
          slug: string
          status: string
          totalprice: number
          user_id: string
          shipping_id: number | null
          shipping_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          slug?: string
          status?: string
          totalprice: number
          user_id: string
          shipping_id?: number | null
          shipping_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          slug?: string
          status?: string
          totalprice?: number
          user_id?: string
          shipping_id?: number | null
          shipping_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipping_id_fkey"
            columns: ["shipping_id"]
            isOneToOne: false
            referencedRelation: "shipping_options"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item: {
        Row: {
          created_at: string
          id: number
          order_id: number
          product: number
          product_id: number | null
          quantity: number
          size: string | null
          size_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          order_id: number
          product: number
          product_id?: number | null
          quantity: number
          size?: string | null
          size_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          order_id?: number
          product?: number
          product_id?: number | null
          quantity?: number
          size?: string | null
          size_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          }
        ]
      }
      product: {
        Row: {
          status: string | null
          category: number
          created_at: string
          heroimage: string
          id: number
          imagesurl: string[]
          price: number
          slug: string
          title: string
          description: string | null
          supplier: string | null
        }
        Insert: {
          category: number
          created_at?: string
          heroimage: string
          id?: number
          imagesurl: string[]
          price: number
          slug: string
          title: string
          status?: string | null
          description?: string | null
          supplier?: string | null
        }
        Update: {
          category?: number
          created_at?: string
          heroimage?: string
          id?: number
          imagesurl?: string[]
          price?: number
          slug?: string
          title?: string
          status?: string | null
          description?: string | null
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          }
        ]
      }
      product_size: {
        Row: {
          id: number;
          product_id: number;
          size_id: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          product_id: number;
          size_id: number;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          product_id?: number;
          size_id?: number;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_size_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          last_name: string | null
          phone: string | null
          address: string | null
          city: string | null
          country: string | null
          postal_code: string | null
          stripe_customer_id: string | null
          type: string | null
          expo_notification_token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          last_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          postal_code?: string | null
          stripe_customer_id?: string | null
          type?: string | null
          expo_notification_token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          last_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          postal_code?: string | null
          stripe_customer_id?: string | null
          type?: string | null
          expo_notification_token?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_options: {
        Row: {
          id: number
          name: string
          price: number
          description: string | null
          delivery_time_min: number | null
          delivery_time_max: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          price: number
          description?: string | null
          delivery_time_min?: number | null
          delivery_time_max?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          price?: number
          description?: string | null
          delivery_time_min?: number | null
          delivery_time_max?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sizes: {
        Row: {
          id: number;
          value: string;
          display_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          value: string;
          display_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          value?: string;
          display_order?: number | null;
          created_at?: string;
        };
        Relationships: []
      }
      reservations: {
        Row: {
          id: number;
          user_id: string;
          reservation_date: string;
          status: string;
          created_at: string;
          updated_at: string;
          confirmed_at: string | null;
          expires_at: string | null;
          order_id: number | null;
          notes: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          reservation_date: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
          expires_at?: string | null;
          order_id?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          reservation_date?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          confirmed_at?: string | null;
          expires_at?: string | null;
          order_id?: number | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          }
        ]
      }
      reservation_items: {
        Row: {
          id: number;
          reservation_id: number;
          product_id: number;
          size_id: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          reservation_id: number;
          product_id: number;
          size_id: number;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          reservation_id?: number;
          product_id?: number;
          size_id?: number;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_items_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_product_quantity: {
        Args: {
          p_product_id: number
          p_quantity: number
        }
        Returns: undefined
      }
      check_inventory_for_order: {
        Args: {
          order_id: number
        }
        Returns: {
          product_id: number
          product_title: string
          size_id: number
          size_value: string
          ordered_quantity: number
          available_quantity: number
          is_sufficient: boolean
        }[]
      }
      user_has_5_plus_orders: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      create_order_from_reservation: {
        Args: {
          reservation_id_param: number
        }
        Returns: number
      }
      cancel_unconfirmed_reservations: {
        Args: Record<PropertyKey, never>
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
