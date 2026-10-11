-- Soft-delete verified redundant live trips (see TRANSPORT_DUP_RESOLUTION.md).
-- No hard deletes. Only the three documented IDs.

UPDATE public.transport_trip
SET deleted_at = now(), updated_at = now()
WHERE id IN (
  'b4956ac7-4149-4a76-b5eb-9608058f5866',
  'f14d8a24-6a86-4b67-80df-86694a9b8760',
  '899cbe9f-ed50-4865-a152-fc5a47a6a635'
)
AND deleted_at IS NULL;

-- Return counts for verification (mutation + select in one file — CLI returns last)
SELECT 'soft_deleted'::text AS section, COUNT(*)::bigint AS n
FROM public.transport_trip
WHERE id IN (
  'b4956ac7-4149-4a76-b5eb-9608058f5866',
  'f14d8a24-6a86-4b67-80df-86694a9b8760',
  '899cbe9f-ed50-4865-a152-fc5a47a6a635'
)
AND deleted_at IS NOT NULL;
