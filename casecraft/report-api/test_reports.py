import unittest
from app import validate
from charts import create_visuals, create_pdf

SAMPLE = {
    'id':'ER-12','title':'Phân tích lợi nhuận và thanh khoản','kind':'report',
    'asOfDay':170,'deliveredDay':175,'quality':'REVIEWED',
    'coverage':2,'required':3, 'sourceIds':['EV-10','EV-17','EV-18'],
    'claims':[
        {'label':'Revenue · prior 12 months','value': 100.0,'sourceId':'EV-10'},
        {'label':'Revenue · latest 12 months','value': 98.6,'sourceId':'EV-10'},
        {'label':'EBIT · prior','value': 15.2,'sourceId':'EV-10'},
        {'label':'EBIT · latest','value': 9.3,'sourceId':'EV-10'},
        {'label':'COGS · prior 12 months','value':42.0,'sourceId':'EV-17'},
        {'label':'COGS · latest 12 months','value':46.6,'sourceId':'EV-17'},
    ],
    'bridge': {'opening': 15.2,'closing':9.3,'reconciles':True,'effects':[
        {'label':'Doanh thu thuần', 'value':-1.4,'sourceId':'EV-10'},
        {'label':'Chi phí nguyên liệu','value':-4.6,'sourceId':'EV-17'},
        {'label':'Đối chiếu còn lại','value':.1,'sourceId':'EV-10','inferredResidual':True},
    ]}
}
class Tests(unittest.TestCase):
    def test_charts(self):
        charts=create_visuals(validate(SAMPLE))
        ids={v['id'] for v in charts}
        self.assertEqual(ids,{'comparison','bridge','provenance','coverage'})
        self.assertTrue(all(x['image'].startswith('data:image/png;base64,') for x in charts))
    def test_pdf(self):
        self.assertEqual(create_pdf(validate(SAMPLE))[:4],b'%PDF')
    def test_worldstate_rejected(self):
        with self.assertRaisesRegex(ValueError,'Unexpected fields'):validate({**SAMPLE,'firms':[{'id':'secret'}]})
    def test_invalid_bridge_rejected(self):
        with self.assertRaisesRegex(ValueError,'does not reconcile'):validate({**SAMPLE,'bridge':{**SAMPLE['bridge'],'closing':999}})
    def test_nonnumeric_fallback(self):
        data={k:v for k,v in SAMPLE.items() if k not in ('bridge','claims','coverage','required')}
        self.assertEqual(create_visuals(data),[])
    def test_source_validity(self):
        with self.assertRaisesRegex(ValueError,'Invalid source id'): validate({**SAMPLE,'sourceIds':['e'*100]})
    def test_inf_rejected(self):
        with self.assertRaisesRegex(ValueError,'Invalid claim number'):validate({**SAMPLE,'claims':[{'label':'bad','sourceId':'EV-1','value':float('inf')}]})
if __name__=='__main__':unittest.main()