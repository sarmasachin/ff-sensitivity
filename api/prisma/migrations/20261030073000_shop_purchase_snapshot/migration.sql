-- Shop purchase details frozen on the ledger row (title, unlock, device).
ALTER TABLE "wallet_ledger" ADD COLUMN IF NOT EXISTS "shop_snapshot" JSONB;

-- Best effort for buys already on file whose item still exists.
UPDATE "wallet_ledger" AS wl
SET "shop_snapshot" = jsonb_build_object(
  'oneTime', si.one_time,
  'title', si.title,
  'category', si.category,
  'deviceId', COALESCE((
    SELECT di.install_id
    FROM "device_installs" AS di
    WHERE di.user_id = wl.user_id
    ORDER BY di.last_seen_at DESC
    LIMIT 1
  ), ''),
  'deviceLabel', COALESCE((
    SELECT NULLIF(
      concat_ws(' · ', NULLIF(di.model, ''), NULLIF(di.brand, '')),
      ''
    )
    FROM "device_installs" AS di
    WHERE di.user_id = wl.user_id
    ORDER BY di.last_seen_at DESC
    LIMIT 1
  ), '')
)
FROM "shop_items" AS si
WHERE wl.shop_snapshot IS NULL
  AND wl.reason = 'shop:' || si.id;
