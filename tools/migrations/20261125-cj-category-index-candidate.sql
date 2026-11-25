-- NOT automatically applied. Requires D1 capacity approval and measured canary.
CREATE INDEX IF NOT EXISTS idx_cj_category_pid_sku ON catalog_products_cj(categories,cj_product_id,sku);
