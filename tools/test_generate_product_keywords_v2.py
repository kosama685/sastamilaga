import csv,io,pathlib,tempfile,unittest,zipfile
import generate_product_keywords_v2 as g
class Tests(unittest.TestCase):
 def test_title(self):self.assertEqual(g.row({"url":"https://sastamilaga.com/p/a-hhc-12.html","title":"T800 Ultra 8 GB"},"x",1)["primary_keyword"],"T800 Ultra 8 GB")
 def test_variant(self):self.assertEqual(g.row({"url":"https://sastamilaga.com/p/watch-hhc-12-3.html","tier":"A"},"x",1)["index_action"],"PRESERVE_EXISTING_REVIEW_ONLY")
 def test_slug(self):self.assertEqual(g.slug("https://sastamilaga.com/p/watch-pro-hhc-12.html"),"watch pro")
 def test_global(self):self.assertTrue(g.product("https://sastamilaga.com/global-shop/p/id/watch/"))
 def test_locale(self):self.assertTrue(g.product("https://sastamilaga.com/ur/product/watch/"))
 def test_host(self):self.assertFalse(g.valid("https://sastamilaga.com.evil.test/p/x"))
 def test_missing(self):self.assertEqual(g.row({"source_id":"x"},"x",1)["review_status"],"MISSING_TITLE")
 def test_market(self):self.assertEqual(g.row({"title":"Watch","market":"worldwide"},"x",1)["market"],"")
 def test_language(self):self.assertEqual(g.row({"title":"ساعات"},"x",1)["language"],"und")
 def test_unverified(self):
  r=g.row({"title":"Watch","language":"en","entity_type":"CJ_PRODUCT_RECORD","secondary_keyword_candidates":"free delivery; COD"},"x",1)
  self.assertNotIn("COD",r["secondary_keywords"]);self.assertEqual(r["search_volume"],"")
 def test_csv_injection(self):self.assertEqual(g.safe("  =1+1"),"'  =1+1")
 def test_xml(self):self.assertEqual(len(list(g.xml_rows(io.BytesIO(b'<urlset xmlns="x"><url><loc>https://sastamilaga.com/p/x.html</loc><image><loc>https://img.test/x</loc></image></url></urlset>')))),1)
 def test_index(self):self.assertEqual(list(g.xml_rows(io.BytesIO(b'<sitemapindex><sitemap><loc>https://sastamilaga.com/sitemap.xml</loc></sitemap></sitemapindex>')))[0][1]["entity_type"],"SITEMAP_INDEX_REFERENCE")
 def test_reconcile(self):
  with tempfile.TemporaryDirectory() as td:
   p=pathlib.Path(td)/"x.csv";p.write_text("source_id,title,entity_type\na,Watch,CJ_PRODUCT_RECORD\na,,CJ_PRODUCT_RECORD\n");out=pathlib.Path(td)/"out.zip"
   m=g.export([p],out);self.assertEqual(m["total_rows"],2);self.assertEqual(m["review_counts"]["MISSING_TITLE"],1)
   with zipfile.ZipFile(out) as z:self.assertEqual(len(list(csv.DictReader(io.TextIOWrapper(z.open("keyword-map.csv"),encoding="utf-8-sig")))),2)
 def test_atomic_fail(self):
  with tempfile.TemporaryDirectory() as td:
   p=pathlib.Path(td)/"x.csv";p.write_text("bad\n1\n");out=pathlib.Path(td)/"out.zip";out.write_bytes(b"old");self.assertRaises(ValueError,g.export,[p],out);self.assertEqual(out.read_bytes(),b"old")
if __name__=="__main__":unittest.main()
