export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    created_at: string | null;
                };
                Insert: {
                    id?: string;
                    email: string;
                    created_at?: string | null;
                };
                Update: {
                    email?: string;
                    created_at?: string | null;
                };
            };
            tasks: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    completed: boolean;
                    date: string;
                    created_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    completed?: boolean;
                    date?: string;
                    created_at?: string | null;
                };
                Update: {
                    title?: string;
                    completed?: boolean;
                    date?: string;
                    created_at?: string | null;
                };
            };
            vision_cards: {
                Row: {
                    id: string;
                    user_id: string;
                    image_url: string;
                    caption: string | null;
                    sort_order: number | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    image_url: string;
                    caption?: string | null;
                    sort_order?: number | null;
                };
                Update: {
                    image_url?: string;
                    caption?: string | null;
                    sort_order?: number | null;
                };
            };
            quotes: {
                Row: {
                    id: string;
                    text: string;
                    author: string;
                };
                Insert: {
                    id?: string;
                    text: string;
                    author: string;
                };
                Update: {
                    text?: string;
                    author?: string;
                };
            };
            block_attempts: {
                Row: {
                    id: string;
                    user_id: string;
                    app_or_url: string;
                    timestamp: string;
                    bypassed: boolean;
                    bypass_reason: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    app_or_url: string;
                    timestamp?: string;
                    bypassed?: boolean;
                    bypass_reason?: string | null;
                };
                Update: {
                    app_or_url?: string;
                    timestamp?: string;
                    bypassed?: boolean;
                    bypass_reason?: string | null;
                };
            };
        };
        Views: {};
        Functions: {};
        Enums: {};
        CompositeTypes: {};
    };
}
