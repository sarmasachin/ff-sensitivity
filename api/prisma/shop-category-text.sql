ALTER TABLE "shop_items" ALTER COLUMN "category" TYPE TEXT USING ("category"::text);
DROP TYPE IF EXISTS "ShopCategory";
