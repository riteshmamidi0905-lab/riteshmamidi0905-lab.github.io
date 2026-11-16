#!/usr/bin/env python3
"""Read public HTTPS reference pages; never bypass TLS, login, consent or access denial."""
import collections, concurrent.futures, datetime, hashlib, json, ssl, urllib.request
from html.parser import HTMLParser
from pathlib import Path

HERE=Path(__file__).resolve().parent
OUT=HERE.parents[1]/'work/design-research'

class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.tags=collections.Counter();self.skip=0;self.in_title=False;self.heading=None;self.title=[];self.headings=[];self.text=[];self.styles=[];self.meta=''
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);self.tags[tag]+=1
        if tag in ('script','style'):self.skip+=1
        if tag=='title':self.in_title=True
        if tag in ('h1','h2') and len(self.headings)<8:self.heading=[tag,''];self.headings.append(self.heading)
        if tag=='link' and 'stylesheet' in a.get('rel',''):self.styles.append(a.get('href',''))
        if tag=='meta' and a.get('name','').lower()=='description':self.meta=a.get('content','')[:240]
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.skip=max(0,self.skip-1)
        if tag=='title':self.in_title=False
        if tag in ('h1','h2'):self.heading=None
    def handle_data(self,data):
        if self.in_title:self.title.append(data)
        if not self.skip:
            self.text.append(data)
            if self.heading is not None:self.heading[1]+=data

class HttpsRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not newurl.startswith('https://'):raise ValueError('Non-HTTPS redirect refused')
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def inspect(row):
    category,url=row
    result={'category':category,'url':url,'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'HTTPS HTML/source inspection; no visual, runtime, performance or accessibility certification'}
    try:
        opener=urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context()),HttpsRedirect())
        with opener.open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; NASHA-Design-Review/1.0)'}),timeout=18) as response:
            data=response.read(3_000_001);result.update(status=response.status,final_url=response.url,content_type=response.headers.get('Content-Type',''))
        if len(data)>3_000_000:raise ValueError('Source exceeds review size limit')
        if 'html' not in result['content_type'].lower():raise ValueError('Not an HTML page')
        page=Page();page.feed(data.decode('utf-8',errors='replace'))
        title=' '.join(''.join(page.title).split())[:200];text=' '.join(' '.join(page.text).split())
        if any(x in title.lower() for x in ['just a moment','access denied','attention required','robot or human','are you a robot','security check']):raise ValueError('Access challenge, not reviewed')
        if not title or len(text)<180:raise ValueError('Insufficient accessible source content')
        result.update(accessible=True,title=title,headings=[{'tag':t,'text':' '.join(v.split())[:160]} for t,v in page.headings],source_sha256=hashlib.sha256(data).hexdigest(),source_bytes=len(data),text_characters=len(text),source_elements={t:page.tags[t] for t in ['nav','main','h1','h2','a','button','img','picture','video','canvas','iframe']},inline_reduced_motion_reference='prefers-reduced-motion' in data.decode('utf-8',errors='replace'),stylesheet_count=len(page.styles))
    except Exception as error:result.update(accessible=False,error=str(error)[:220])
    return result

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    rows=[line.split('\t') for line in (HERE/'reference-candidates.tsv').read_text().splitlines() if line.strip()]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(inspect,rows))
    (OUT/'source-observations.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
    for category in dict(rows):
        values=[r for r in results if r['category']==category];print(category,sum(r['accessible'] for r in values),'/',len(values))
    print('Raw records saved locally; failed pages do not count toward 100 reviewed references.')
