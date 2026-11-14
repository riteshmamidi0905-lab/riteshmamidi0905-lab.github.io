"""Negative controls for the exact, owner-approved generated-image exception."""
import copy, json
from pathlib import Path
import pages_policy as P
root=Path(__file__).resolve().parents[1]
reg={r['file']:r for r in json.loads((root/'data/image-register.json').read_text())}
checks=0
for rel in P.APPROVED_GENERATED_IMAGES:
 r=reg[rel];data=(root/rel).read_bytes()
 assert not P.generated_image_errors(rel,r,data);checks+=1
 for field,value in [('kind','screenshot'),('cleared_for_public_release',False),('sha256','0'*64),('generation_id',''),('approval_basis','')]:
  bad=copy.deepcopy(r);bad[field]=value;assert P.generated_image_errors(rel,bad,data);checks+=1
 assert P.generated_image_errors(rel,r,data+b'changed');checks+=1
assert P.generated_image_errors('assets/img/business/unreviewed.webp',{'kind':'generated-concept','cleared_for_public_release':True},b'new');checks+=1
print('concept policy:',checks,'checks passed; no wildcard generated-image permission')
