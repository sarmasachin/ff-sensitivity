-- Purge known demo Coin Shop catalog rows (seed leftovers).
-- Real admin-created items with other ids are kept.
DELETE FROM "shop_items"
WHERE "id" IN (
  'prize_google_play_gift',
  'prize_ff_diamonds',
  'prize_ffmax_diamonds',
  'prize_royale_pass',
  'prize_premium_skin',
  'boost_quiz_double',
  'boost_checkin_plus',
  'unlock_premium_badge',
  'unlock_elite_title',
  'pack_stylish_rare',
  'pack_scratch_bonus',
  'cosmetic_gold_wallet',
  'cosmetic_foil_obsidian'
);
