/** CaseCraft Matplotlib report exhibits — report-only disclosed snapshot, never WorldState. */
const CC_REPORT_PY_URL='https://casecraft-report-engine.onrender.com';
const ccPyCache=new Map();
const ccPyJobs=new Map();
function ccPyKey(d){return JSON.stringify(ccPyReportData(d));}

function ccPyReportData(d){
 const keys=['id','title','kind','quality','asOfDay','deliveredDay','coverage','required'];
 const payload=Object.fromEntries(keys.filter(k=>d[k]!==undefined).map(k=>[k,d[k]]));
 payload.sourceIds=(d.sourceIds||[]).slice(0,70).map(String);
 payload.claims=(d.claims||[]).slice(0,50).map(r=>({label:String(r.label),value:r.value,sourceId:String(r.sourceId)}));
 if(d.bridge){payload.bridge={opening:d.bridge.opening,closing:d.bridge.closing,reconciles:!!d.bridge.reconciles,effects:(d.bridge.effects||[]).slice(0,12).map(e=>({label:String(e.label),value:e.value,sourceId:String(e.sourceId),inferredResidual:!!e.inferredResidual}))};}
 return payload;
}
function ccReportChartsMarkup(charts){
 return charts.map(c=>`<figure class="cc-py-figure"><img src="${c.image}" alt="${esc(c.title)}. Biểu đồ từ báo cáo đã được công bố." loading="lazy"><figcaption>${esc(c.title)}</figcaption></figure>`).join('');
}
function ccUpdatePyStatus(id,html){let node=document.querySelector(`[data-cc-python-report="${id}"] .cc-py-status`);if(node)node.innerHTML=html;}
function ccPyChartLoad(d){
 if(!d||d.kind!=='report')return;
 const panel=document.querySelector(`[data-cc-python-report="${d.id}"]`);
 if(!panel)return;
 const key=ccPyKey(d);
 if(ccPyCache.has(key)){
   const charts=ccPyCache.get(key);
   const list=panel.querySelector('.cc-py-gallery');
   if(list){list.innerHTML=ccReportChartsMarkup(charts);list.hidden=!charts.length;}
   const status=panel.querySelector('.cc-py-status');if(status)status.textContent=charts.length?`${charts.length} biểu đồ được tạo bằng Python · Matplotlib`:'Chưa đủ chỉ tiêu đồng đơn vị để vẽ biểu đồ.';
   const fallback=document.getElementById('cc-py-bridge-fallback');if(fallback&&charts.some(c=>c.id==='bridge'))fallback.hidden=true;
   return;
 }
 if(ccPyJobs.has(key))return;
 ccUpdatePyStatus(d.id,'Đang dựng biểu đồ Python theo dữ liệu đã được mở…');
 const ac=new AbortController(); const timeout=setTimeout(()=>ac.abort(),90000);
 const task=fetch(CC_REPORT_PY_URL+'/api/charts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ccPyReportData(d)),signal:ac.signal})
  .then(async response=>{if(!response.ok)throw Error('Dịch vụ biểu đồ chưa sẵn sàng');return response.json();})
  .then(data=>{let charts=Array.isArray(data.charts)?data.charts:[];ccPyCache.set(key,charts);if(page==='reports')ccPyChartLoad(d);})
  .catch(()=>ccUpdatePyStatus(d.id,'Báo cáo dạng bảng vẫn dùng được. Dịch vụ Python đang tạm thời chưa sẵn sàng; chọn “Tạo lại biểu đồ” để thử lại.'))
  .finally(()=>{clearTimeout(timeout);ccPyJobs.delete(key);});
 ccPyJobs.set(key,task);
}
function ccPythonReportSection(d){
 if(d.kind!=='report')return '';
 return `<section class="x-report-section cc-py-panel" data-cc-python-report="${esc(d.id)}">
   <div class="cc-py-head"><div><h3>Biểu đồ phân tích bằng Python</h3><p>Matplotlib · dữ liệu đã được mở, không có dữ liệu tương lai</p></div><div class="cc-py-actions"><button type="button" class="btn minimal" data-cc-python-retry="${esc(d.id)}">Tạo lại biểu đồ</button><button type="button" class="btn dark" data-cc-python-pdf="${esc(d.id)}">Xuất PDF biểu đồ</button></div></div>
   <div class="cc-py-status" role="status" aria-live="polite">Đang chuẩn bị biểu đồ…</div><div class="cc-py-gallery" hidden></div>
   <p class="x-note">Đơn vị tài chính: triệu tín dụng giả lập. Mỗi biểu đồ chỉ dùng chỉ tiêu có nguồn và kỳ so sánh rõ ràng.</p>
 </section>`;
}
function ccPyFindReport(id){const c=activeEngagement(w);return c?initializeExpertNetwork(w).deliverables.find(d=>d.caseId===c.id&&d.id===id):null;}
document.addEventListener('click',async event=>{
 const retry=event.target.closest('[data-cc-python-retry]');
 if(retry){const d=ccPyFindReport(retry.dataset.ccPythonRetry);if(!d)return;ccPyCache.delete(ccPyKey(d));ccPyChartLoad(d);return;}
 const pdf=event.target.closest('[data-cc-python-pdf]');
 if(!pdf)return;
 const d=ccPyFindReport(pdf.dataset.ccPythonPdf);if(!d)return;
 pdf.disabled=true;const original=pdf.textContent;pdf.textContent='Đang tạo PDF…';
 try{
  const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),90000);
  let r;try{r=await fetch(CC_REPORT_PY_URL+'/api/report.pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ccPyReportData(d)),signal:ac.signal});}finally{clearTimeout(timeout);}
  if(!r.ok)throw Error('Dịch vụ chưa sẵn sàng');
  const url=URL.createObjectURL(await r.blob()),anchor=document.createElement('a');anchor.href=url;anchor.download=`casecraft-${d.id}-matplotlib.pdf`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
 }catch(_e){toast('Không thể tạo PDF bằng Python. Có thể xem báo cáo HTML hoặc thử lại.');}
 finally{pdf.disabled=false;pdf.textContent=original;}
});