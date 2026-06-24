export const up = async (supabaseAdmin: any) => {
  // Add composite indexes for feed and search performance
  
  await supabaseAdmin.rpc("execute_sql", {
      sql_query: `
        -- 6. Database Indexes Improvements
        CREATE INDEX IF NOT EXISTS idx_videos_status_created_at ON videos(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_videos_category_status ON videos(category_id, status);

        -- Add full text search vector for better search performance without ilike
        ALTER TABLE videos ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(caption, '') || ' ' || coalesce(product_name, ''))) STORED;
        CREATE INDEX IF NOT EXISTS idx_videos_search_vector ON videos USING GIN(search_vector);
      `
  });
  console.log("Applied search and generic indexes patch.");
};
