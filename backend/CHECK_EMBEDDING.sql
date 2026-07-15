-- ============================================
-- CHECK EMBEDDING VECTOR DI DATABASE
-- ============================================

-- 1. Cek apakah ada chunks dengan embedding
SELECT 
  id,
  source_id,
  product_id,
  LEFT(content, 50) as content_preview,
  embedding IS NOT NULL as has_embedding,
  CASE 
    WHEN embedding IS NOT NULL THEN 'Ada' 
    ELSE 'Tidak Ada' 
  END as status_embedding,
  created_at
FROM knowledge_chunks 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Lihat embedding vector (format array)
SELECT 
  id,
  source_id,
  LEFT(content, 100) as content_preview,
  embedding::text as embedding_vector,
  array_length(string_to_array(embedding::text, ','), 1) as vector_dimensions
FROM knowledge_chunks 
WHERE embedding IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Lihat beberapa nilai pertama dari embedding (preview)
SELECT 
  id,
  source_id,
  LEFT(content, 50) as content_preview,
  -- Ambil 5 nilai pertama dari vector
  (
    SELECT array_agg(val::numeric)
    FROM unnest(string_to_array(embedding::text, ',')) WITH ORDINALITY AS t(val, idx)
    WHERE idx <= 5
  ) as first_5_values,
  -- Hitung dimensi vector
  array_length(string_to_array(embedding::text, ','), 1) as dimensions
FROM knowledge_chunks 
WHERE embedding IS NOT NULL
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Cek detail lengkap satu chunk
SELECT 
  kc.id,
  kc.source_id,
  ks.title as source_title,
  ks.type as source_type,
  kc.content,
  kc.metadata,
  kc.embedding IS NOT NULL as has_embedding,
  kc.created_at
FROM knowledge_chunks kc
LEFT JOIN knowledge_sources ks ON kc.source_id = ks.id
WHERE kc.id = 1; -- Ganti dengan ID yang ingin dicek

-- 5. Hitung statistik embedding
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embedding,
  COUNT(*) - COUNT(embedding) as chunks_without_embedding,
  ROUND(COUNT(embedding)::numeric / COUNT(*)::numeric * 100, 2) as percentage_with_embedding
FROM knowledge_chunks;
