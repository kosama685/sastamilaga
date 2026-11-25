-- Additive, independent of public SEO approval. Times are Unix milliseconds.
CREATE TABLE catalog_facet_attributes (
 category_slug TEXT NOT NULL, product_id TEXT NOT NULL, brand TEXT, model TEXT,
 evidence_ref TEXT NOT NULL CHECK(length(trim(evidence_ref))>0),
 observed_at INTEGER NOT NULL CHECK(observed_at>0),
 expires_at INTEGER NOT NULL CHECK(expires_at>observed_at),
 PRIMARY KEY(category_slug,product_id)
);
CREATE TABLE catalog_facet_variant_market (
 category_slug TEXT NOT NULL, country TEXT NOT NULL CHECK(length(country)=2 AND country NOT GLOB '*[^A-Z]*'),
 product_id TEXT NOT NULL, variant_id TEXT NOT NULL, origin_country TEXT NOT NULL CHECK(length(origin_country)=2 AND origin_country NOT GLOB '*[^A-Z]*'),
 quantity INTEGER NOT NULL CHECK(quantity=1),
 stock_state TEXT NOT NULL CHECK(stock_state IN ('WAREHOUSE_POSITIVE','FACTORY_ONLY','ZERO','UNKNOWN')),
 delivery_state TEXT NOT NULL CHECK(delivery_state IN ('QUOTED','UNKNOWN')),
 stock_observed_at INTEGER NOT NULL CHECK(stock_observed_at>0), stock_expires_at INTEGER NOT NULL CHECK(stock_expires_at>stock_observed_at),
 delivery_observed_at INTEGER NOT NULL CHECK(delivery_observed_at>0), delivery_expires_at INTEGER NOT NULL CHECK(delivery_expires_at>delivery_observed_at),
 stock_evidence_ref TEXT NOT NULL CHECK(length(trim(stock_evidence_ref))>0),
 delivery_evidence_ref TEXT NOT NULL CHECK(length(trim(delivery_evidence_ref))>0),
 PRIMARY KEY(category_slug,country,product_id,variant_id,origin_country)
);
