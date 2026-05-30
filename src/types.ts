export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  instagram?: string;
  tiktok?: string;
  created_at: string;
  can_upload?: boolean;
  is_admin?: boolean;
  is_brand?: boolean;
}

export interface CreatorApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  portfolio_url?: string;
  social_url?: string;
  notes?: string;
  created_at: string;
  profiles?: Profile;
}

export interface Video {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  caption: string;
  product_url: string;
  main_product_image_url?: string;
  views?: number;
  created_at: string;
  profiles?: Profile;
  real_life_image_url?: string;
  is_verified_real?: boolean;
  is_admin_verified_link?: boolean;
  status?: 'active' | 'pending_review' | 'rejected';
  category_id?: string;
  categories?: Category;
  metrics?: {
    likes: number;
    comments: number;
    saves: number;
    views: number;
  };
  user_state?: {
    is_liked: boolean;
    is_saved: boolean;
    is_followed: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}
