-- Apply only after the original publication evidence migration. No production execution here.
CREATE TABLE catalog_merchant_destination_evidence (
 product_id TEXT NOT NULL, locale TEXT NOT NULL, publication_version TEXT NOT NULL,
 content_revision TEXT NOT NULL, market TEXT NOT NULL, variant_id TEXT NOT NULL,
 destination TEXT NOT NULL, policy_version TEXT NOT NULL,
 evidence_ref TEXT NOT NULL, verified_at INTEGER NOT NULL CHECK(verified_at>0),
 expires_at INTEGER NOT NULL CHECK(expires_at>verified_at),
 destination_reviewed INTEGER NOT NULL DEFAULT 0 CHECK(destination_reviewed IN (0,1)),
 identifier_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(identifier_status IN ('UNKNOWN','ASSIGNED_GTIN','BRAND_MPN','NO_ASSIGNED_IDENTIFIERS','ASSIGNED_MISSING','INVALID')),
 gtin TEXT, brand TEXT, mpn TEXT, identifier_exists INTEGER CHECK(identifier_exists IN (0,1)),
 identifier_evidence_ref TEXT, identifier_verified INTEGER NOT NULL DEFAULT 0 CHECK(identifier_verified IN (0,1)),
 gtin_assignment_verified INTEGER NOT NULL DEFAULT 0 CHECK(gtin_assignment_verified IN (0,1)),
 cutoff_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(cutoff_state IN ('UNKNOWN','REQUIRED_MISSING','APPLICABLE_VERIFIED','ACCOUNT_LEVEL_INHERITED','NOT_APPLICABLE')),
 cutoff_time TEXT, cutoff_timezone TEXT, cutoff_evidence_ref TEXT, cutoff_inheritance_verified INTEGER NOT NULL DEFAULT 0 CHECK(cutoff_inheritance_verified IN (0,1)),
 minimum_order_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(minimum_order_state IN ('UNKNOWN','REQUIRED_MISSING','APPLICABLE_VERIFIED','ACCOUNT_LEVEL_INHERITED','NOT_APPLICABLE')),
 minimum_order_minor INTEGER CHECK(minimum_order_minor>=0), minimum_order_currency TEXT, minimum_order_evidence_ref TEXT, minimum_order_inheritance_verified INTEGER NOT NULL DEFAULT 0 CHECK(minimum_order_inheritance_verified IN (0,1)),
 loyalty_state TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(loyalty_state IN ('UNKNOWN','REQUIRED_MISSING','APPLICABLE_VERIFIED','ACCOUNT_LEVEL_INHERITED','NOT_APPLICABLE')),
 loyalty_program_label TEXT, loyalty_tier_label TEXT, loyalty_evidence_ref TEXT, loyalty_inheritance_verified INTEGER NOT NULL DEFAULT 0 CHECK(loyalty_inheritance_verified IN (0,1)),
 product_shipping_override INTEGER CHECK(product_shipping_override IN (0,1)), minimum_order_required INTEGER CHECK(minimum_order_required IN (0,1)),
 PRIMARY KEY(product_id,locale,publication_version,market,variant_id,destination),
 FOREIGN KEY(product_id,locale,publication_version,market) REFERENCES catalog_merchant_evidence(product_id,locale,publication_version,market),
 FOREIGN KEY(product_id,locale,publication_version,content_revision) REFERENCES catalog_publication_evidence(product_id,locale,publication_version,content_revision)
);
