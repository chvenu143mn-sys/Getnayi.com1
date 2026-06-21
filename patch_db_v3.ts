import fs from 'fs';
let content = fs.readFileSync('database.sql', 'utf8');
if (!content.includes('search_videos_v3')) {
  const v3 = `

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
          substring(LOWER(COALESCE(v.caption, '')) from '(?:rs\\.?|inr|₹|\\$|price\\s*is\\s*|price\\s*[:\\-]\\s*)\\s*([\\d,]+(?:\\.\\d+)?)'),
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
`;
  content += v3;
  fs.writeFileSync('database.sql', content);
  console.log("Added search_videos_v3 to database.sql");
}
