export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          show_tasks_on_block_screen: boolean
          show_vision_cards_on_block_screen: boolean
          show_quotes_on_block_screen: boolean
          bypass_cooldown_seconds: number
          bypass_requires_reason: boolean
          pomodoro_work_minutes: number | null
          pomodoro_break_minutes: number | null
          current_streak: number | null
          longest_streak: number | null
          last_completed_date: string | null
          onboarding_complete: boolean | null
        }
        Insert: {
          user_id: string
          show_tasks_on_block_screen?: boolean
          show_vision_cards_on_block_screen?: boolean
          show_quotes_on_block_screen?: boolean
          bypass_cooldown_seconds?: number
          bypass_requires_reason?: boolean
          pomodoro_work_minutes?: number | null
          pomodoro_break_minutes?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          last_completed_date?: string | null
          onboarding_complete?: boolean | null
        }
        Update: {
          show_tasks_on_block_screen?: boolean
          show_vision_cards_on_block_screen?: boolean
          show_quotes_on_block_screen?: boolean
          bypass_cooldown_seconds?: number
          bypass_requires_reason?: boolean
          pomodoro_work_minutes?: number | null
          pomodoro_break_minutes?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          last_completed_date?: string | null
          onboarding_complete?: boolean | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          completed: boolean
          completed_at: string | null
          date: string
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          completed?: boolean
          completed_at?: string | null
          date?: string
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          title?: string
          completed?: boolean
          completed_at?: string | null
          date?: string
          sort_order?: number | null
          created_at?: string | null
        }
      }
      vision_cards: {
        Row: {
          id: string
          user_id: string
          image_url: string
          caption: string | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          caption?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          image_url?: string
          caption?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      quotes: {
        Row: {
          id: string
          text: string
          author: string
          category: string | null
        }
        Insert: {
          id?: string
          text: string
          author: string
          category?: string | null
        }
        Update: {
          text?: string
          author?: string
          category?: string | null
        }
      }
      block_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          daily_limit_minutes: number | null
          is_active: boolean
          color: string | null
          icon: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          daily_limit_minutes?: number | null
          is_active?: boolean
          color?: string | null
          icon?: string | null
        }
        Update: {
          name?: string
          daily_limit_minutes?: number | null
          is_active?: boolean
          color?: string | null
          icon?: string | null
        }
      }
      block_group_items: {
        Row: {
          id: string
          group_id: string
          app_or_url: string
          platform: string | null
        }
        Insert: {
          id?: string
          group_id: string
          app_or_url: string
          platform?: string | null
        }
        Update: {
          app_or_url?: string
          platform?: string | null
        }
      }
      block_attempts: {
        Row: {
          id: string
          user_id: string
          app_or_url: string
          attempted_at: string
          bypassed: boolean
          bypass_reason: string | null
          bypass_waited_seconds: number | null
        }
        Insert: {
          id?: string
          user_id: string
          app_or_url: string
          attempted_at?: string
          bypassed?: boolean
          bypass_reason?: string | null
          bypass_waited_seconds?: number | null
        }
        Update: {
          app_or_url?: string
          attempted_at?: string
          bypassed?: boolean
          bypass_reason?: string | null
          bypass_waited_seconds?: number | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
