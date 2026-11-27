-- Additive schema for staged publication evidence. No backfill and no live eligibility changes.
-- Apply through the existing D1 migration process only after local/staging checks.
CREATE TABLE catalog_publication_evidence (
 product_id TEXT NOT NULL,
 locale TEXT NOT NULL,
 publication_version TEXT NOT NULL,
 content_revision TEXT NOT NULL,
 canonical_url TEXT NOT NULL CHECK(canonical_url LIKE 'https://sastamilaga.com/%'),
 page_type TEXT NOT NULL CHECK(page_type IN ('informational','purchasable')),
 evidence_ref TEXT NOT NULL CHECK(length(trim(evidence_ref))>0),
 evidence_updated_at INTEGER NOT NULL CHECK(evidence_updated_at>0),
 evidence_expires_at INTEGER NOT NULL CHECK(evidence_expires_at>evidence_updated_at),
 content_approved INTEGER NOT NULL DEFAULT 0 CHECK(content_approved IN(0,1)),
 identity_verified INTEGER NOT NULL DEFAULT 0 CHECK(identity_verified IN(0,1)),
 media_verified INTEGER NOT NULL DEFAULT 0 CHECK(media_verified IN(0,1)),
 canonical_verified INTEGER NOT NULL DEFAULT 0 CHECK(canonical_verified IN(0,1)),
 translation_verified INTEGER NOT NULL DEFAULT 0 CHECK(translation_verified IN(0,1)),
 crawl_allowed INTEGER NOT NULL DEFAULT 0 CHECK(crawl_allowed IN(0,1)),
 route_verified INTEGER NOT NULL DEFAULT 0 CHECK(route_verified IN(0,1)),
 hold_reason TEXT,
 PRIMARY KEY(product_id,locale,publication_version),
 UNIQUE(publication_version,canonical_url),
 UNIQUE(product_id,locale,publication_version,content_revision)
);
CREATE TABLE catalog_merchant_evidence (
 product_id TEXT NOT NULL, locale TEXT NOT NULL, publication_version TEXT NOT NULL,
 content_revision TEXT NOT NULL,
 market TEXT NOT NULL CHECK(length(market)=2 AND market NOT GLOB '*[^A-Z]*'),
 offer_evidence_ref TEXT NOT NULL CHECK(length(trim(offer_evidence_ref))>0),
 offer_updated_at INTEGER NOT NULL CHECK(offer_updated_at>0),
 offer_expires_at INTEGER NOT NULL CHECK(offer_expires_at>offer_updated_at),
 price_verified INTEGER NOT NULL DEFAULT 0 CHECK(price_verified IN(0,1)),
 availability_verified INTEGER NOT NULL DEFAULT 0 CHECK(availability_verified IN(0,1)),
 shipping_verified INTEGER NOT NULL DEFAULT 0 CHECK(shipping_verified IN(0,1)),
 checkout_verified INTEGER NOT NULL DEFAULT 0 CHECK(checkout_verified IN(0,1)),
 merchant_policy_verified INTEGER NOT NULL DEFAULT 0 CHECK(merchant_policy_verified IN(0,1)),
 PRIMARY KEY(product_id,locale,publication_version,market),
 FOREIGN KEY(product_id,locale,publication_version,content_revision)
 REFERENCES catalog_publication_evidence(product_id,locale,publication_version,content_revision)
);
CREATE INDEX idx_catalog_evidence_release_expiry ON catalog_publication_evidence(publication_version,evidence_expires_at,product_id,locale);
