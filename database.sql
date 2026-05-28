-- Run this in your Supabase SQL Editor to set up the database.

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  instagram text,
  tiktok text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok text;

-- 2. Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  video_url text not null,
  caption text,
  product_url text,
  thumbnail_url text,
  main_product_image_url text,
  real_life_image_url text,
  is_verified_real boolean default false,
  views integer default 0,
  status text default 'active' check (status in ('active', 'pending_review', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure views and status columns exist if the table was created previously without them
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views integer default 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS status text default 'active' check (status in ('active', 'pending_review', 'rejected'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS product_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS main_product_image_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS real_life_image_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_verified_real boolean default false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_admin_verified_link boolean default false;

-- 3. Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Videos Policies
DROP POLICY IF EXISTS "Videos are viewable by everyone." ON public.videos;
CREATE POLICY "Videos are viewable by everyone." ON public.videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own videos." ON public.videos;
CREATE POLICY "Users can insert their own videos." ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own videos." ON public.videos;
CREATE POLICY "Users can update own videos." ON public.videos FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own videos." ON public.videos;
CREATE POLICY "Users can delete own videos." ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- 4. Enable Storage bucket for videos
-- (You may need to do this via the Supabase Dashboard UI if the storage schema isn't fully accessible via SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
CREATE POLICY "Videos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
DROP POLICY IF EXISTS "Users can upload videos" ON storage.objects;
CREATE POLICY "Users can upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
CREATE POLICY "Users can update own videos" ON storage.objects FOR UPDATE USING (bucket_id = 'videos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
CREATE POLICY "Users can delete own videos" ON storage.objects FOR DELETE USING (bucket_id = 'videos' AND auth.uid() = owner);

-- 6. Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  video_id uuid references public.videos(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are viewable by everyone." ON public.likes;
CREATE POLICY "Likes are viewable by everyone." ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own likes." ON public.likes;
CREATE POLICY "Users can insert their own likes." ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own likes." ON public.likes;
CREATE POLICY "Users can delete their own likes." ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- 7. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports are viewable by everyone" ON public.reports;
CREATE POLICY "Reports are viewable by everyone" ON public.reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.videos WHERE id = public.comments.video_id AND user_id = auth.uid()) OR
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 9. Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert follows" ON public.follows;
CREATE POLICY "Users can insert follows" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can delete own follows" ON public.follows;
CREATE POLICY "Users can delete own follows" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 5. Trigger to automatically create a profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. Create a table to track exact views to prevent spam
CREATE TABLE IF NOT EXISTS public.video_views (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null,
  session_token text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(video_id, session_token)
);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert views" ON public.video_views;
CREATE POLICY "Anyone can insert views" ON public.video_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Views viewable by everyone" ON public.video_views;
CREATE POLICY "Views viewable by everyone" ON public.video_views FOR SELECT USING (true);

-- To defend against aggressive view-counting bots locally in DB (basic example):
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id_param uuid, session_token_param text DEFAULT 'anonymous')
RETURNS void AS $$
BEGIN
  -- Insert the view, DO NOTHING if it already exists for this session token
  INSERT INTO public.video_views (video_id, session_token) 
  VALUES (video_id_param, session_token_param)
  ON CONFLICT (video_id, session_token) DO NOTHING;
  
  -- Update the aggregate count on the video table based on unique views
  UPDATE public.videos
  SET views = (SELECT count(*) FROM public.video_views WHERE video_id = video_id_param)
  WHERE id = video_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create collections and saved items tables
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
CREATE POLICY "Users can view their own collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own collections" ON public.collections;
CREATE POLICY "Users can insert their own collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.saved_videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  video_id uuid references public.videos(id) on delete cascade not null,
  collection_id uuid references public.collections(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own saved videos" ON public.saved_videos;
CREATE POLICY "Users can view their own saved videos" ON public.saved_videos FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own saved videos" ON public.saved_videos;
CREATE POLICY "Users can insert their own saved videos" ON public.saved_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own saved videos" ON public.saved_videos;
CREATE POLICY "Users can delete their own saved videos" ON public.saved_videos FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  image_url text,
  product_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products viewable by everyone" ON public.products;
CREATE POLICY "Products viewable by everyone" ON public.products FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.saved_products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  collection_id uuid references public.collections(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own saved products" ON public.saved_products;
CREATE POLICY "Users can view their own saved products" ON public.saved_products FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own saved products" ON public.saved_products;
CREATE POLICY "Users can insert their own saved products" ON public.saved_products FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own saved products" ON public.saved_products;
CREATE POLICY "Users can delete their own saved products" ON public.saved_products FOR DELETE USING (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  target_id text,
  target_type text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_upload boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean default false;

CREATE TABLE IF NOT EXISTS public.creator_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  portfolio_url text,
  social_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Creator applications are viewable by everyone" ON public.creator_applications;
CREATE POLICY "Creator applications are viewable by everyone" ON public.creator_applications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.creator_applications;
CREATE POLICY "Users can insert their own applications" ON public.creator_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can update applications" ON public.creator_applications;
CREATE POLICY "Admins can update applications" ON public.creator_applications FOR UPDATE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);

-- Additional Admin Policies
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admins can update videos" ON public.videos;
CREATE POLICY "Admins can update videos" ON public.videos FOR UPDATE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admins can delete videos" ON public.videos;
CREATE POLICY "Admins can delete videos" ON public.videos FOR DELETE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports" ON public.reports FOR DELETE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_brand boolean default false;

-- 12. Trust Score System
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS trust_score integer default 100;

CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS TRIGGER AS $$
DECLARE
  penalty INTEGER := 5;
BEGIN
  IF NEW.reason LIKE '%CRITICAL%' THEN
    penalty := 20;
  ELSIF NEW.reason LIKE '%HIGH%' THEN
    penalty := 10;
  END IF;

  UPDATE public.videos 
  SET trust_score = GREATEST(0, COALESCE(trust_score, 100) - penalty)
  WHERE id = NEW.video_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_report();

-- 14. Performance Indexes for Scalability (Phase 1)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at_desc ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON public.likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_videos_user_id ON public.saved_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_videos_video_id ON public.saved_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON public.video_views(video_id);

-- 15. Creator Dashboard Performance View (Phase 1)
-- Collapses hundreds of thousands of engagement metric records into a single row count per video
CREATE OR REPLACE VIEW public.creator_video_stats AS
SELECT 
  v.id AS video_id,
  v.user_id,
  COALESCE(v.views, 0) AS views_count,
  (SELECT COUNT(*) FROM public.likes l WHERE l.video_id = v.id) AS likes_count,
  (SELECT COUNT(*) FROM public.comments c WHERE c.video_id = v.id) AS comments_count,
  (SELECT COUNT(*) FROM public.saved_videos s WHERE s.video_id = v.id) AS saves_count
FROM public.videos v;

-- Grant access permissions for the view to authenticated & anonymous users
GRANT SELECT ON public.creator_video_stats TO authenticated, anon;


-- 16. Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  sort_order integer default 0,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories viewable by everyone" ON public.categories;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING ((SELECT is_admin FROM public.profiles WHERE public.profiles.id = auth.uid()) = true);

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category_id uuid references public.categories(id) on delete set null;

-- 17. Short Links
CREATE TABLE IF NOT EXISTS public.short_links (
  id text primary key,
  long_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view short links" ON public.short_links;
CREATE POLICY "Public can view short links" ON public.short_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create short links" ON public.short_links;
CREATE POLICY "Anyone can create short links" ON public.short_links FOR INSERT WITH CHECK (true);


