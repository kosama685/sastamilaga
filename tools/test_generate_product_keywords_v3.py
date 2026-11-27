import io,csv,tempfile,pathlib,unittest,zipfile,json
import generate_product_keywords_v3 as g
class Tests(unittest.TestCase):
 def test_tv_language(self):self.assertEqual(g.language("國語",{}),("zh","LABEL_MAPPED_NOT_LOCALE_APPROVED"))
 def test_unknown(self):self.assertEqual(g.language("Romania",{}),("und","UNMAPPED_REVIEW"))
 def test_registry(self):self.assertEqual(g.language("ur",{"ur":"ur"})[0],"ur")
 def test_action(self):self.assertEqual(g.url_state("https://sastamilaga.com/?%61dd-to-cart=42"),"ACTION_DO_NOT_PROBE")
 def test_wrong_host(self):self.assertEqual(g.url_state("https://sastamilaga.com@evil.test/p/x"),"INVALID_OR_EXTERNAL")
 def test_private(self):self.assertEqual(g.url_state("https://sastamilaga.com/checkout/"),"PRIVATE_OR_UTILITY_REVIEW")
 def test_full_keyword(self):self.assertEqual(g.normalize({"primary_keyword":"T800 8 GB Pro"},"legacy_page","x",2,{})["keyword_candidate"],"T800 8 GB Pro")
 def test_old_policy_not_executed(self):self.assertEqual(g.normalize({"primary_keyword":"Watch","index_action":"301","target_market":"Global"},"legacy_page","x",2,{})["index_action"],"PRESERVE_EXISTING_REVIEW_ONLY")
 def test_injection(self):self.assertEqual(g.safe("  =1+1"),"'  =1+1")
 def test_schema(self):
  for k,fields in g.SCHEMAS.items():
   a=sorted(fields);self.assertEqual(next(g.records(io.StringIO(",".join(a)+"\n"+",".join("x" for _ in a)+"\n")))[1],k)
 def test_bad_schema(self):self.assertRaises(ValueError,lambda:list(g.records(io.StringIO("url,unknown\nx,y\n"))))
 def test_atomic_and_privacy(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/"x.csv";out=pathlib.Path(d)/"result.zip";out.write_bytes(b"old")
   fields=sorted(g.SCHEMAS["gsc"]);p.write_text(",".join(fields)+"\n"+",".join("x" for _ in fields)+"\n")
   self.assertRaises(ValueError,g.export,[p],out,{})
   self.assertEqual(out.read_bytes(),b"old")
   self.assertEqual(g.export([p],out,{},True)["total_rows"],1)
 def test_nested_archive(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/"outer.zip";b=io.BytesIO();fields=sorted(g.SCHEMAS["keyword_v2"])
   with zipfile.ZipFile(b,"w") as z:z.writestr("keyword-map.csv",",".join(fields)+"\n"+",".join("x" for _ in fields)+"\n")
   with zipfile.ZipFile(p,"w") as z:z.writestr("keyword-map-v2.zip",b.getvalue())
   self.assertEqual(g.export([p],pathlib.Path(d)/"out.zip",{})["total_rows"],1)
if __name__=="__main__":unittest.main()
