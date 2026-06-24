-- Run this in your Supabase SQL Editor to set up the database.
-- 
-- ⚠️ PRODUCTION REQUIREMENT: BACKUPS
-- Please ensure Supabase Point-in-Time Recovery (PITR) is enabled in your database settings
-- to guarantee robust backups and rollback capability in production.
--

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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS revenue numeric default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score numeric default 50.0 not null;

CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles(trust_score DESC);

CREATE OR REPLACE FUNCTION public.adjust_creator_trust_score(p_creator_id uuid, p_increment numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    trust_score = GREATEST(0.0, LEAST(trust_score + p_increment, 100.0))
  WHERE id = p_creator_id;
END;
$$;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean default false;

-- Create secure view for public profile reads
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, username, avatar_url, bio, instagram, tiktok, created_at, is_brand, is_admin, can_upload
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Videos table
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
  status text default 'active',
  post_status text default 'processing' check (post_status in ('processing', 'pending_review', 'published', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure views and status columns exist if the table was created previously without them
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS views integer default 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS post_status text default 'processing' check (post_status in ('processing', 'pending_review', 'published', 'rejected'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS tags text[] default '{}';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS search_aliases text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS product_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS main_product_image_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS real_life_image_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_verified_real boolean default false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_admin_verified_link boolean default false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Admin Check Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Users can view their own profile or admins." ON public.profiles FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);
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
DROP POLICY IF EXISTS "Users can view their own reports or admins" ON public.reports;
CREATE POLICY "Users can view their own reports or admins" ON public.reports FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure is_pinned column exists if the table was created previously without it
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_pinned boolean default false;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.videos WHERE id = public.comments.video_id AND user_id = auth.uid()) OR
  public.is_admin()
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
CREATE POLICY "Anyone can insert views" ON public.video_views FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "Views viewable by everyone" ON public.video_views;
DROP POLICY IF EXISTS "Admins and video owners can view views" ON public.video_views;
CREATE POLICY "Admins and video owners can view views" ON public.video_views FOR SELECT USING (
  public.is_admin()
  OR 
  (SELECT user_id FROM public.videos WHERE public.videos.id = public.video_views.video_id) = auth.uid()
);

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
DROP POLICY IF EXISTS "Users can view their own applications or admins" ON public.creator_applications;
CREATE POLICY "Users can view their own applications or admins" ON public.creator_applications FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.creator_applications;
CREATE POLICY "Users can insert their own applications" ON public.creator_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can update applications" ON public.creator_applications;
CREATE POLICY "Admins can update applications" ON public.creator_applications FOR UPDATE USING (public.is_admin());

-- Additional Admin Policies
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- Protect role columns from unauthorized updates
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- If the user modifying the record is not an admin, they cannot change role-related fields
  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.can_upload := OLD.can_upload;
    NEW.is_brand := OLD.is_brand;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_roles();

DROP POLICY IF EXISTS "Admins can update videos" ON public.videos;
CREATE POLICY "Admins can update videos" ON public.videos FOR UPDATE USING (public.is_admin());

-- Protect moderated video columns from unauthorized updates
CREATE OR REPLACE FUNCTION public.protect_video_status()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    NEW.status := OLD.status;
    NEW.is_admin_verified_link := OLD.is_admin_verified_link;
    NEW.views := OLD.views;
    NEW.trust_score := OLD.trust_score;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_update ON public.videos;
CREATE TRIGGER on_video_update
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE PROCEDURE public.protect_video_status();

DROP POLICY IF EXISTS "Admins can delete videos" ON public.videos;
CREATE POLICY "Admins can delete videos" ON public.videos FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports" ON public.reports FOR DELETE USING (public.is_admin());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_brand boolean default false;

-- 12. Trust Score System
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS trust_score integer default 100;

CREATE OR REPLACE FUNCTION public.check_report_limit()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  -- Rate limit constraints (5 per user per 24 hours)
  SELECT count(*) INTO report_count
  FROM public.reports
  WHERE user_id = NEW.user_id
    AND created_at >= NOW() - INTERVAL '1 day';

  IF report_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: You can only submit 5 reports per day';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_insert_limit ON public.reports;
CREATE TRIGGER on_report_insert_limit
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE PROCEDURE public.check_report_limit();

CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS TRIGGER AS $$
DECLARE
  penalty INTEGER := 5;
  reporter_is_trusted BOOLEAN;
  new_trust_score INTEGER;
BEGIN
  -- Determine if the reporter is trusted based on their profile
  SELECT (is_admin OR is_brand OR is_premium OR can_upload) INTO reporter_is_trusted
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Untrusted users do not trigger automated penalties, goes straight to human moderation queue
  IF NOT reporter_is_trusted THEN
    RETURN NEW;
  END IF;

  IF NEW.reason LIKE '%CRITICAL%' THEN
    penalty := 20;
  ELSIF NEW.reason LIKE '%HIGH%' THEN
    penalty := 10;
  END IF;

  UPDATE public.videos 
  SET trust_score = GREATEST(0, COALESCE(trust_score, 100) - penalty)
  WHERE id = NEW.video_id
  RETURNING trust_score INTO new_trust_score;

  -- Automated takedown if trust score hits 0
  IF new_trust_score <= 0 THEN
    UPDATE public.videos
    SET status = 'rejected'
    WHERE id = NEW.video_id;
  END IF;
  
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

-- Phase 2 Optimized Indexes added by Architect Audit
CREATE INDEX IF NOT EXISTS idx_videos_feed_optimized ON public.videos(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_caption_gin ON public.videos USING GIN (to_tsvector('english', coalesce(caption, '')));

-- 14.5 Notifications Table 
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  video_id uuid references public.videos(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'admin', 'mention')),
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read, created_at DESC);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Video Rejection Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_video_rejection_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    INSERT INTO public.notifications (
      user_id,
      actor_id,
      video_id,
      type,
      rejection_reason,
      is_read
    ) VALUES (
      NEW.user_id,
      COALESCE(auth.uid(), NEW.user_id),
      NEW.id,
      'admin',
      COALESCE(NEW.rejection_reason, 'No reason specified'),
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_video_rejection_notification ON public.videos;
CREATE TRIGGER tr_video_rejection_notification
  AFTER UPDATE OF status ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_video_rejection_notification();

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
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (public.is_admin());

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
CREATE POLICY "Anyone can create short links" ON public.short_links FOR INSERT WITH CHECK (false);

-- 18. Webhook Dead Letter Queue
CREATE TABLE IF NOT EXISTS public.webhook_dead_letter_queue (
  id uuid default gen_random_uuid() primary key,
  payload jsonb,
  error_message text,
  resolved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view DLQ" ON public.webhook_dead_letter_queue;
CREATE POLICY "Admins can view DLQ" ON public.webhook_dead_letter_queue FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can update DLQ" ON public.webhook_dead_letter_queue;
CREATE POLICY "Admins can update DLQ" ON public.webhook_dead_letter_queue FOR UPDATE USING (public.is_admin());

-- 19. PRODUCTION SEARCH & PERFORMANCE OPTIMIZATIONS
-- Install Trigram Extension for fast fuzzy searching & autocomplete via GIN Index operations
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast fuzzy search matches for creators & video captions
CREATE INDEX IF NOT EXISTS idx_videos_caption_trgm ON public.videos USING gin (caption gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_videos_search_aliases_trgm ON public.videos USING gin (search_aliases gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_videos_tags_gin ON public.videos USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);

-- Avoid file-sorting operations by indexing category feeds pre-sorted
CREATE INDEX IF NOT EXISTS idx_videos_category_status_created ON public.videos (category_id, status, created_at DESC);

-- Native PostgreSQL Trigram Fuzzy Search RPC 
-- Blazing fast similarity matching algorithm directly inside the DB, outperforming Fuse.js
CREATE OR REPLACE FUNCTION search_videos_v2(search_term text, p_category_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  video_url text,
  caption text,
  thumbnail_url text,
  status text,
  created_at timestamp with time zone,
  views integer,
  username text,
  avatar_url text,
  is_brand boolean,
  trust_score numeric,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.video_url,
    v.caption,
    v.thumbnail_url,
    v.status,
    v.created_at,
    v.views,
    p.username,
    p.avatar_url,
    p.is_brand,
    p.trust_score,
    (
      -- Giving more weight (1.5x) to exact/fuzzy username matches
      similarity(COALESCE(p.username, ''), search_term) * 1.5 + 
      -- Standard weight for caption similarity match
      similarity(COALESCE(v.caption, ''), search_term) +
      -- Extra edge for matching search aliases
      similarity(COALESCE(v.search_aliases, ''), search_term) * 1.2
    )::real AS similarity_score
  FROM public.videos v
  JOIN public.profiles p ON v.user_id = p.id
  WHERE v.status = 'active'
    AND (p_category_id IS NULL OR v.category_id = p_category_id)
    AND (
      -- Only match rows that have a trgm similarity threshold match
      p.username % search_term OR 
      v.caption % search_term OR 
      v.search_aliases % search_term OR
      -- Or exact tag match
      v.tags @> ARRAY[search_term] OR
      -- Fallback to standard substring like just in case
      v.caption ILIKE '%' || search_term || '%' OR
      p.username ILIKE '%' || search_term || '%'
    )
  ORDER BY similarity_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fast tracking of admin actions audit trail
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at_desc ON public.admin_audit_logs (created_at DESC);

-- 20. User Interest Scores table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  score numeric default 50.0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category_id)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own interests" ON public.user_interests;
CREATE POLICY "Users can view their own interests" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interests" ON public.user_interests;
CREATE POLICY "Users can insert their own interests" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interests" ON public.user_interests;
CREATE POLICY "Users can update their own interests" ON public.user_interests FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster feed sorting
CREATE INDEX IF NOT EXISTS idx_user_interests_user_score ON public.user_interests(user_id, score DESC);

-- 22. Trending Metrics Table
CREATE TABLE IF NOT EXISTS public.trending_metrics (
  tag text primary key,
  mentions integer default 0,
  views numeric default 0,
  score numeric default 0,
  last_calculated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.trending_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trending metrics viewable by everyone" ON public.trending_metrics;
CREATE POLICY "Trending metrics viewable by everyone" ON public.trending_metrics FOR SELECT USING (true);

-- Function to recalculate trends based on recent videos
CREATE OR REPLACE FUNCTION public.calculate_trending_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear old metrics
  DELETE FROM public.trending_metrics;

  -- Re-calculate metrics from all tags found in video captions
  INSERT INTO public.trending_metrics (tag, mentions, views, score)
  SELECT 
    lower(tag_match[1]) as tag,
    count(DISTINCT v.id) as mentions,
    sum(COALESCE(v.views, 0)) as views,
    (sum(COALESCE(v.views, 0)) + (count(DISTINCT v.id) * 50)) as score
  FROM public.videos v,
  regexp_matches(v.caption, '#([a-zA-Z0-9_]+)', 'g') as tag_match
  WHERE v.created_at >= NOW() - INTERVAL '7 days' AND v.status = 'active'
  GROUP BY lower(tag_match[1])
  ON CONFLICT (tag) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_interest_score(p_user_id uuid, p_category_id uuid, p_increment numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_interests (user_id, category_id, score, updated_at)
  VALUES (p_user_id, p_category_id, 50.0 + p_increment, now())
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET 
    score = LEAST(user_interests.score + p_increment, 1000.0),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_interest_decay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Decay all scores by 2% (0.98 multiplier)
  UPDATE public.user_interests
  SET score = score * 0.98;
END;
$$;


-- 23. Database Migrations History Table
CREATE TABLE IF NOT EXISTS public.database_migrations (
  id serial primary key,
  migration_name text not null unique,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.database_migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.database_migrations;
CREATE POLICY "Enable read access for all" ON public.database_migrations FOR SELECT USING (true);


CREATE OR REPLACE FUNCTION search_videos_v3(
  search_term text, 
  p_category_id uuid DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  video_url text,
  caption text,
  thumbnail_url text,
  status text,
  created_at timestamp with time zone,
  views integer,
  username text,
  avatar_url text,
  is_brand boolean,
  trust_score numeric,
  similarity_score real,
  likes_count bigint,
  saves_count bigint,
  total_score real
) AS $$
BEGIN
  RETURN QUERY
  WITH matching_videos AS (
    SELECT 
      v.id, v.user_id, v.video_url, v.caption, v.thumbnail_url, v.status, v.created_at, v.views, v.category_id, v.tags, v.search_aliases,
      p.username, p.avatar_url, p.is_brand, p.trust_score,
      (
        similarity(COALESCE(p.username, ''), search_term) * 1.5 + 
        similarity(COALESCE(v.caption, ''), search_term) +
        similarity(COALESCE(v.search_aliases, ''), search_term) * 1.2
      )::real AS sim_score,
      -- Extract price safely using regex (handle numbers with commas)
      COALESCE(
        NULLIF(regexp_replace(
          substring(LOWER(COALESCE(v.caption, '')) from '(?:rs\.?|inr|₹|\$|price\s*is\s*|price\s*[:\-]\s*)\s*([\d,]+(?:\.\d+)?)'),
          ',', '', 'g'
        ), '')::numeric,
        NULL
      ) as extracted_price
    FROM public.videos v
    JOIN public.profiles p ON v.user_id = p.id
    WHERE v.status = 'active'
      AND (p_category_id IS NULL OR v.category_id = p_category_id)
      AND (
        search_term = '' OR
        p.username % search_term OR 
        v.caption % search_term OR 
        v.search_aliases % search_term OR
        v.tags @> ARRAY[search_term] OR
        v.caption ILIKE '%' || search_term || '%' OR
        p.username ILIKE '%' || search_term || '%'
      )
  ),
  filtered_videos AS (
    SELECT mv.* 
    FROM matching_videos mv
    WHERE 
      -- Hard price filtering if limits provided and price exists
      (p_max_price IS NULL OR mv.extracted_price IS NULL OR mv.extracted_price <= p_max_price)
      AND
      (p_min_price IS NULL OR mv.extracted_price IS NULL OR mv.extracted_price >= p_min_price)
  )
  SELECT 
    f.id, f.user_id, f.video_url, f.caption, f.thumbnail_url, f.status, f.created_at, f.views,
    f.username, f.avatar_url, f.is_brand, f.trust_score, f.sim_score as similarity_score,
    (SELECT count(*) FROM public.likes l WHERE l.video_id = f.id)::bigint as likes_count,
    (SELECT count(*) FROM public.saved_videos s WHERE s.video_id = f.id)::bigint as saves_count,
    (
      (f.sim_score * 100) + 
      (LEAST((SELECT count(*) FROM public.likes l WHERE l.video_id = f.id), 50) * 0.5) +
      (LEAST((SELECT count(*) FROM public.saved_videos s WHERE s.video_id = f.id), 50)) -
      (CASE WHEN (p_max_price IS NOT NULL OR p_min_price IS NOT NULL) AND f.extracted_price IS NULL THEN 20.0 ELSE 0.0 END)
    )::real as total_score
  FROM filtered_videos f
  ORDER BY total_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text default 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text default 'none';

-- Database Enhancements v5 (Materialized Views and Scalability)
CREATE INDEX IF NOT EXISTS idx_videos_post_status ON public.videos(post_status) WHERE post_status = 'published';
CREATE INDEX IF NOT EXISTS idx_videos_is_verified ON public.videos(is_verified_real) WHERE is_verified_real = true;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_trending_videos AS
SELECT 
    v.id, v.caption, v.video_url, v.thumbnail_url, v.user_id, v.views, v.status, v.post_status, v.created_at,
    COUNT(DISTINCT l.id) as like_count,
    COUNT(DISTINCT c.id) as comment_count,
    (COALESCE(v.views, 0) * 0.1 + COUNT(DISTINCT l.id) * 2.0 + COUNT(DISTINCT c.id) * 3.0) as trending_score
FROM public.videos v
LEFT JOIN public.likes l ON v.id = l.video_id AND l.created_at > (now() - interval '7 days')
LEFT JOIN public.comments c ON v.id = c.video_id AND c.created_at > (now() - interval '7 days')
WHERE v.status = 'active' AND (v.post_status = 'published' OR v.post_status IS NULL)
GROUP BY v.id
ORDER BY trending_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_videos_id ON public.mv_trending_videos(id);
CREATE INDEX IF NOT EXISTS idx_mv_trending_videos_score ON public.mv_trending_videos(trending_score DESC);

CREATE OR REPLACE FUNCTION public.refresh_mv_trending_videos()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_trending_videos;
END;
$$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_creator_stats AS
SELECT 
  p.id as user_id, COUNT(v.id) as total_published_videos, COALESCE(SUM(v.views), 0) as total_views, p.trust_score
FROM public.profiles p
LEFT JOIN public.videos v ON p.id = v.user_id AND v.status = 'active'
GROUP BY p.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_creator_stats_user_id ON public.mv_creator_stats(user_id);

CREATE OR REPLACE FUNCTION public.refresh_mv_creator_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_creator_stats;
END;
$$;