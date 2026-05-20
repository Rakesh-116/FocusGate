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
          id: string
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
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
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
          created_at?: string | null
          updated_at?: string | null
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
          updated_at?: string | null
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
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          completed?: boolean
          completed_at?: string | null
          date?: string
          sort_order?: number | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          title?: string
          completed?: boolean
          completed_at?: string | null
          date?: string
          sort_order?: number | null
          metadata?: Json | null
          updated_at?: string | null
        }
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_role: string | null
          target_company: string | null
          intensity: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          target_role?: string | null
          target_company?: string | null
          intensity?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          target_role?: string | null
          target_company?: string | null
          intensity?: number
          is_active?: boolean
          updated_at?: string | null
        }
      }
      daily_commits: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          task_id: string | null
          title: string
          notes: string | null
          date: string
          sort_order: number | null
          created_at: string | null
          completed_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          task_id?: string | null
          title: string
          notes?: string | null
          date?: string
          sort_order?: number | null
          created_at?: string | null
          completed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          goal_id?: string | null
          task_id?: string | null
          title?: string
          notes?: string | null
          date?: string
          sort_order?: number | null
          completed_at?: string | null
          updated_at?: string | null
        }
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          date: string
          committed_count: number
          completed_count: number
          score: number
          outcome: 'hell' | 'heaven' | 'neutral'
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          date?: string
          committed_count?: number
          completed_count?: number
          score?: number
          outcome?: 'hell' | 'heaven' | 'neutral'
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          goal_id?: string | null
          date?: string
          committed_count?: number
          completed_count?: number
          score?: number
          outcome?: 'hell' | 'heaven' | 'neutral'
          notes?: string | null
          updated_at?: string | null
        }
      }
      future_generations: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          daily_log_id: string | null
          date: string
          scenario_type: 'hell' | 'heaven'
          status: 'draft' | 'ready' | 'failed'
          score: number
          streak_days: number
          intensity: number
          prompt: string | null
          narrative: string
          image_url: string | null
          video_url: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          daily_log_id?: string | null
          date?: string
          scenario_type: 'hell' | 'heaven'
          status?: 'draft' | 'ready' | 'failed'
          score?: number
          streak_days?: number
          intensity?: number
          prompt?: string | null
          narrative: string
          image_url?: string | null
          video_url?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          goal_id?: string | null
          daily_log_id?: string | null
          date?: string
          scenario_type?: 'hell' | 'heaven'
          status?: 'draft' | 'ready' | 'failed'
          score?: number
          streak_days?: number
          intensity?: number
          prompt?: string | null
          narrative?: string
          image_url?: string | null
          video_url?: string | null
          metadata?: Json | null
          updated_at?: string | null
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
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          caption?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          image_url?: string
          caption?: string | null
          sort_order?: number | null
          updated_at?: string | null
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
      block_attempts: {
        Row: {
          id: string
          user_id: string
          app_or_url: string
          attempted_at: string
          bypassed: boolean
          bypass_reason: string | null
          bypass_waited_seconds: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          app_or_url: string
          attempted_at?: string
          bypassed?: boolean
          bypass_reason?: string | null
          bypass_waited_seconds?: number | null
          metadata?: Json | null
        }
        Update: {
          app_or_url?: string
          attempted_at?: string
          bypassed?: boolean
          bypass_reason?: string | null
          bypass_waited_seconds?: number | null
          metadata?: Json | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
