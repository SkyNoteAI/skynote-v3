// Shared type definitions
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: any; // BlockNote content
  user_id: string;
  folder_path?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}