"""Small standard-library HTTP service for CaseCraft Matplotlib report rendering.
No database, no Flask dependency, no reading WorldState or hidden game causes.
"""
import json
import math
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from charts import create_visuals, create_pdf

ALLOWED_ORIGINS={'https://casecraft-stage4.onrender.com','http://localhost:5173','http://127.0.0.1:5173'}
MAX_BYTES=120*1024


def safe_num(x):
    if isinstance(x,bool) or not isinstance(x,(float,int)) or not math.isfinite(x):return None
    return float(x)


def validate(data):
    if not isinstance(data,dict):raise ValueError('JSON object expected')
    allowed={'id','title','asOfDay','deliveredDay','kind','quality','sourceIds','claims','bridge','coverage','required'}
    if set(data)-allowed:raise ValueError('Unexpected fields. Do not send WorldState')
    for key in ('id','title','kind','quality'):
        if len(str(data.get(key,'')))>180:raise ValueError('Field too long')
    for key in ('asOfDay','deliveredDay','coverage','required'):
        if key in data and safe_num(data[key]) is None:raise ValueError('Invalid numeric field')
    sources,claims=data.get('sourceIds',[]),data.get('claims',[])
    if not isinstance(sources,list) or len(sources)>70 or not isinstance(claims,list) or len(claims)>50:
        raise ValueError('Too many sources or claims')
    if any(not isinstance(s,str) or len(s)>60 for s in sources):raise ValueError('Invalid source id')
    for c in claims:
        if not isinstance(c,dict) or set(c)-{'label','value','sourceId'} or len(str(c.get('label','')))>110 or len(str(c.get('sourceId','')))>60:
            raise ValueError('Invalid claim')
        if isinstance(c.get('value'),(int,float)) and safe_num(c['value']) is None:
            raise ValueError('Invalid claim number')
    bridge=data.get('bridge')
    if bridge is not None:
        if not isinstance(bridge,dict) or set(bridge)-{'opening','closing','effects','reconciles'}:
            raise ValueError('Invalid bridge')
        if safe_num(bridge.get('opening')) is None or safe_num(bridge.get('closing')) is None:
            raise ValueError('Invalid bridge totals')
        effects=bridge.get('effects',[])
        if not isinstance(effects,list) or len(effects)>12:raise ValueError('Invalid bridge effects')
        for e in effects:
            if not isinstance(e,dict) or set(e)-{'label','value','sourceId','inferredResidual'} or safe_num(e.get('value')) is None or len(str(e.get('label','')))>110:
                raise ValueError('Invalid effect')
        if abs(bridge['opening']+sum(e['value'] for e in effects)-bridge['closing'])>.005:
            raise ValueError('EBIT bridge does not reconcile')
    return data


class Handler(BaseHTTPRequestHandler):
    def _headers(self,code,content_type='application/json; charset=utf-8'):
        self.send_response(code)
        self.send_header('Content-Type',content_type)
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        origin=self.headers.get('Origin','')
        if origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Content-Type')
            self.send_header('Vary','Origin')
        self.end_headers()
    def _json(self,code,payload):
        data=json.dumps(payload,ensure_ascii=False).encode('utf-8')
        self._headers(code)
        self.wfile.write(data)
    def do_OPTIONS(self):
        self._headers(204)
    def do_GET(self):
        if urlparse(self.path).path=='/health':
            self._json(200,{'ok':True,'renderer':'matplotlib','storesData':False})
        else:self._json(404,{'error':'Not found'})
    def do_POST(self):
        route=urlparse(self.path).path
        if route not in ('/api/charts','/api/report.pdf'):
            return self._json(404,{'error':'Not found'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n<=0 or n>MAX_BYTES:raise ValueError('Request exceeds 120 KB limit')
            payload=validate(json.loads(self.rfile.read(n)))
            if route=='/api/charts':
                return self._json(200,{'charts':create_visuals(payload),'scope':'disclosed_report_snapshot','renderer':'Matplotlib'})
            result=create_pdf(payload)
            self._headers(200,'application/pdf')
            self.wfile.write(result)
        except (ValueError,TypeError,json.JSONDecodeError) as ex:
            self._json(400,{'error':str(ex)[:140]})
        except Exception:
            self._json(500,{'error':'Unable to render charts'})


def main():
    port=int(os.getenv('PORT','5000'))
    HTTPServer(('0.0.0.0',port),Handler).serve_forever()
if __name__=='__main__':main()