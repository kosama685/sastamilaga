import tempfile,pathlib,unittest
import repair_product_titles as r
def page(title,name):return ('<html><head><title>'+title+'</title><meta property="og:title" content="'+title+'"><meta name="twitter:title" content="'+title+'"><link rel="canonical" href="https://sastamilaga.com/p/x.html"></head><body><h1>'+name+'</h1><p>Rs 1472</p></body></html>').encode()
class Tests(unittest.TestCase):
 def test_model_preserved(self):
  self.assertIn("210000",r.candidate("Umrah Saving Box 210000",False,52))
 def test_exact_id(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/"a-hhc-123456.html";p.write_bytes(page("Watch 123456"+r.BRAND,"Watch Model 210000"));self.assertEqual(r.inspect(p)[2],"CANDIDATE");p.write_bytes(page("Watch 210000"+r.BRAND,"Watch Model 210000"));self.assertEqual(r.inspect(p)[2],"REVIEW_NUMERIC_OR_MISSING_TITLE")
 def test_variant(self):self.assertEqual(r.candidate("Unisex Hoodies for Men & Women - Mehroon, L",True,52),"Unisex Hoodies for Men & Women – Mehroon, L")
 def test_byte_parity(self):
  b=page("Watch 123456"+r.BRAND,"Watch &amp; Case");out=r.rewrite(b,"Watch & Case"+r.BRAND);self.assertEqual(r.normalized(b),r.normalized(out));self.assertEqual(out.count(b"Watch &amp; Case | Sasta Milaga"),3)
 def test_missing_tag(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/"a-hhc-123456.html";p.write_bytes(page("Watch 123456"+r.BRAND,"Watch Model").replace(b'twitter:title',b'twitter:other'));self.assertEqual(r.inspect(p)[2],"HELD_TITLE_TAG_MISMATCH")
 def test_idempotence_and_report(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d);(root/"p").mkdir();p=root/"p/a-hhc-123456.html";p.write_bytes(page("Watch 123456"+r.BRAND,"Watch Model 210000"));a=r.run(root,True,root/"out.csv",1);self.assertEqual(a["repaired_or_proposed"],1);after=p.read_bytes();self.assertEqual(r.run(root,True,root/"out.csv",1)["repaired_or_proposed"],0);self.assertEqual(p.read_bytes(),after)
 def test_formula_escape(self):self.assertEqual(r.safe(" =1"),"' =1")
 def test_long_variant_preserved(self):self.assertIn("extra long variation name for product size",r.candidate("Watch - extra long variation name for product size",True,52))
if __name__=="__main__":unittest.main()
