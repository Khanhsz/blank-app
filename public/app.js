const STORE = 'ai-tutor-studio-v1';
const view = document.getElementById('view');
const crumb = document.getElementById('breadcrumb');
const apiIndicator = document.getElementById('apiStatus');
const sampleLesson = {
  title:'Marketing là gì? Tư duy tạo giá trị cho khách hàng', duration:60,
  objectives:['Giải thích được khái niệm marketing bằng ngôn ngữ của bản thân','Phân biệt nhu cầu, mong muốn và nhu cầu có khả năng thanh toán','Nhận diện đề xuất giá trị của một thương hiệu'],
  warmup:'Hãy nghĩ về lần gần nhất bạn lựa chọn một thương hiệu đồ uống. Điều gì khiến bạn chọn thương hiệu đó thay vì đối thủ?',
  explanation:[
    {heading:'1. Marketing là quá trình tạo giá trị',content:'Marketing không chỉ là quảng cáo hay bán hàng. Marketing bao gồm việc hiểu nhu cầu, thiết kế sản phẩm/dịch vụ phù hợp, truyền tải giá trị và xây dựng quan hệ với khách hàng. Một chiến dịch quảng cáo hấp dẫn nhưng sản phẩm không giải quyết đúng nhu cầu vẫn có thể thất bại.',example:'Một quán cà phê gần trường đại học nhận thấy sinh viên cần nơi học nhóm có ổ cắm và Wi-Fi tốt. Việc thiết kế không gian phù hợp là một quyết định marketing, không chỉ việc đăng bài trên mạng xã hội.'},
    {heading:'2. Nhu cầu, mong muốn và nhu cầu có khả năng thanh toán',content:'Nhu cầu (need) là trạng thái thiếu hụt cơ bản. Mong muốn (want) là cách cụ thể để thỏa mãn nhu cầu, chịu ảnh hưởng bởi văn hóa và cá nhân. Nhu cầu có khả năng thanh toán (demand) là mong muốn được hỗ trợ bởi sức mua.',example:'Nhu cầu: cần di chuyển. Mong muốn: muốn đi xe điện. Nhu cầu có khả năng thanh toán: có ngân sách và sẵn sàng chi trả cho một mẫu xe cụ thể.'},
    {heading:'3. Đề xuất giá trị (Value proposition)',content:'Khách hàng chọn sản phẩm khi lợi ích họ cảm nhận phù hợp với mức chi phí và nỗ lực cần bỏ ra. Một đề xuất giá trị tốt giải thích rõ: phục vụ ai, giải quyết vấn đề gì, tại sao lựa chọn này đáng cân nhắc.',example:'Thay vì nói “đồ uống ngon”, một quán có thể nhấn mạnh “cà phê pha nhanh, thuận tiện cho sinh viên giữa giờ học”.'}
  ],
  activities:[{question:'Chọn một thương hiệu quen thuộc, viết 1 câu mô tả khách hàng mục tiêu và một lợi ích cốt lõi.',guidance:'Sử dụng cấu trúc: “Dành cho [nhóm khách hàng], [thương hiệu] giúp [lợi ích] bằng cách [điểm khác biệt]”.'},{question:'Phân loại 3 tình huống thực tế theo need, want và demand.',guidance:'Kiểm tra xem có sức mua và ý định mua hay chưa trước khi gọi là demand.'}],
  keyTakeaway:'Marketing bắt đầu từ việc hiểu khách hàng và tạo ra giá trị; quảng cáo chỉ là một phần của quá trình ấy.',
  quiz:[
    {question:'Hoạt động nào dưới đây là marketing?',options:['Chỉ đăng quảng cáo','Chỉ gọi điện bán hàng','Tìm hiểu nhu cầu và thiết kế giải pháp','Chỉ giảm giá sản phẩm'],answerIndex:2,explanation:'Marketing gồm cả nghiên cứu nhu cầu, xây dựng sản phẩm, truyền thông, phân phối và quan hệ khách hàng.'},
    {question:'Một bạn rất muốn mua laptop nhưng chưa đủ ngân sách. Đây chủ yếu là:',options:['Demand','Want','Doanh số','Lợi nhuận'],answerIndex:1,explanation:'Mong muốn chưa được hỗ trợ bởi khả năng thanh toán thì chưa được xem là demand.'},
    {question:'Đề xuất giá trị cần làm rõ điều gì?',options:['Logo dùng màu gì','Sản phẩm tạo lợi ích gì cho ai','Văn phòng ở đâu','Có bao nhiêu nhân viên'],answerIndex:1,explanation:'Đề xuất giá trị tập trung vào lợi ích dành cho khách hàng mục tiêu và lý do lựa chọn.'},
    {question:'Phát biểu nào chính xác nhất?',options:['Marketing đồng nghĩa với bán hàng','Marketing chỉ dành cho tập đoàn','Marketing bắt đầu từ khách hàng','Marketing không liên quan tới sản phẩm'],answerIndex:2,explanation:'Tư duy hướng khách hàng là nền tảng của marketing hiện đại.'}
  ]
};
const DEMO = {
  id:'demo-marketing', demo:true, subject:'Marketing căn bản', goal:'Hiểu nền tảng marketing và tự xây dựng kế hoạch marketing', level:'Mới bắt đầu', weeks:4, minutes:60,
  createdAt:'demo', plan:{title:'Marketing Foundation',description:'4 tuần khám phá tư duy marketing: từ khách hàng, thị trường đến kế hoạch truyền thông.',outcome:'Hoàn thành bản kế hoạch marketing mini cho một sản phẩm hoặc dịch vụ.',modules:[
    {week:1,title:'Tư duy marketing & tạo giá trị',objective:'Hiểu khái niệm và phân biệt nhu cầu của khách hàng',topics:['Khái niệm marketing','Need – Want – Demand','Value proposition'],deliverable:'Viết đề xuất giá trị của một thương hiệu'},
    {week:2,title:'Thấu hiểu thị trường & khách hàng',objective:'Phân khúc khách hàng và xác định chân dung mục tiêu',topics:['Nghiên cứu thị trường','STP','Customer persona'],deliverable:'Vẽ 1 chân dung khách hàng mục tiêu'},
    {week:3,title:'Chiến lược Marketing Mix',objective:'Áp dụng các yếu tố của 4P cho sản phẩm',topics:['Product','Price','Place','Promotion'],deliverable:'Đề xuất Marketing Mix cho sản phẩm'},
    {week:4,title:'Thiết kế kế hoạch marketing',objective:'Gắn mục tiêu, hoạt động và tiêu chí đo lường',topics:['SMART objectives','KPI','Campaign planning','Review'],deliverable:'Nộp bản kế hoạch marketing 1 trang'}
  ]}, research:{summary:'Đây là giáo trình mẫu được soạn sẵn để thử giao diện. Chưa có truy vấn Google Search được thực hiện và chưa có nguồn xác minh.',sources:[],queries:[],verified:false},lessons:{'1':{lesson:sampleLesson,research:{summary:'Bài giảng mẫu soạn sẵn, chưa tra cứu Google.',sources:[],queries:[],verified:false}}},chat:[], selectedModule:1, tab:'curriculum'
};

const getState = () => { try { const x = JSON.parse(localStorage.getItem(STORE)); return Array.isArray(x) ? x : [structuredClone(DEMO)]; } catch { return [structuredClone(DEMO)]; } };
let courses = getState(), currentId = null, mode = 'home', online = false, toastTimeout;
let quizAnswers = {};
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = s => { try { const u = new URL(s); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(courses)); } catch { toast('Không thể lưu nội dung: bộ nhớ trình duyệt đã đầy.'); } renderSidebar(); };
const current = () => courses.find(c=>c.id === currentId);
function toast(msg) { const box=document.getElementById('toast'); box.textContent=msg;box.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>box.classList.remove('show'),4000); }
function setHTML(html){view.innerHTML=html;window.scrollTo({top:0,behavior:'instant'});}
function renderSidebar(){
  document.getElementById('courseCount').textContent = courses.length;
  document.getElementById('courseList').innerHTML = courses.map(c=>`<button class="course-nav ${currentId===c.id && mode==='course'?'active':''}" data-open-course="${esc(c.id)}"><span class="round">${c.demo?'D':'✦'}</span><span class="course-label">${esc(c.plan?.title||c.subject)}</span></button>`).join('');
  document.querySelectorAll('[data-open-course]').forEach(b=>b.addEventListener('click',()=>openCourse(b.dataset.openCourse)));
  document.getElementById('navHome').classList.toggle('selected',mode==='home');
  document.getElementById('navNew').classList.toggle('selected',mode==='create');
}
function navigate(next){mode=next;currentId=next==='course'?currentId:null;render();}
function openCourse(id, tab){ currentId=id;mode='course';if(tab)current().tab=tab;render(); }
function render(){ renderSidebar();crumb.textContent=mode==='home'?'Tổng quan':mode==='create'?'Tạo giáo trình':current()?.plan?.title||'Giáo trình';if(mode==='home')return showHome();if(mode==='create')return showCreate();return showCourse(); }
function showHome(){
  view.innerHTML='';view.appendChild(document.getElementById('homeTemplate').content.cloneNode(true));
  document.getElementById('heroCreate').onclick=()=>navigate('create');
  document.getElementById('recentCourses').innerHTML=courses.slice(0,6).map(c=>`<button class="recent-card" data-recent="${esc(c.id)}"><div class="symbol">▤</div><strong>${esc(c.plan?.title||c.subject)}</strong><span>${esc(c.weeks)} tuần · ${c.demo?'Giáo trình mẫu':'Đã lưu trong trình duyệt'}</span></button>`).join('') || '<div class="empty-state">Chưa có giáo trình nào. Hãy tạo giáo trình đầu tiên.</div>';
  document.querySelectorAll('[data-recent]').forEach(b=>b.onclick=()=>openCourse(b.dataset.recent));
}
function showCreate(){
  view.innerHTML='';view.appendChild(document.getElementById('createTemplate').content.cloneNode(true));
  document.getElementById('createForm').onsubmit=async e=>{
    e.preventDefault();
    if(!online){ toast('Chưa cấu hình API. Bạn có thể mở giáo trình Marketing mẫu để khám phá.'); openCourse('demo-marketing'); return; }
    const f=new FormData(e.currentTarget);
    const payload={subject:f.get('subject').trim(),goal:f.get('goal').trim(),level:f.get('level'),weeks:Number(f.get('weeks')),minutes:Number(f.get('minutes')),findSources:f.has('findSources')};
    const button=document.getElementById('submitCreate');button.disabled=true;button.textContent='✦ AI đang thiết kế giáo trình...';
    try{
      const result=await post('/api/plan',payload);
      if(!Array.isArray(result.plan.modules)||!result.plan.modules.length)throw new Error('AI chưa tạo được danh sách bài học.');
      const c={id:crypto.randomUUID(),...payload,plan:result.plan,research:result.research,searchError:result.searchError,lessons:{},chat:[],selectedModule:1,createdAt:new Date().toISOString(),tab:'curriculum'};
      courses.unshift(c);save();openCourse(c.id);
      toast('Đã tạo giáo trình và lưu trong trình duyệt!');
    }catch(err){toast(err.message);button.disabled=false;button.textContent='✦ Tạo giáo trình bằng AI →';}
  };
}
function courseTabs(c){return `<div class="tabs" role="tablist">${[['curriculum','▤ Giáo trình'],['lesson','✎ Bài giảng'],['research','⌕ Nguồn học thuật'],['tutor','✧ Gia sư AI']].map(([id,label])=>`<button class="tab ${c.tab===id?'active':''}" data-tab="${id}" role="tab" aria-selected="${c.tab===id}">${label}</button>`).join('')}</div>`;}
function showCourse(){
  const c=current();if(!c){navigate('home');return;}
  const generated=Object.keys(c.lessons||{}).length;
  setHTML(`<div class="course-header"><div><div class="mini-label">✳ ${c.demo?'DEMO COURSE':'PERSONALIZED LEARNING'}</div><h1 class="course-title">${esc(c.plan.title)}</h1><p class="course-desc">${esc(c.plan.description)}</p></div><div class="header-buttons"><button class="btn btn-outline" id="exportCourse">↓ Xuất Markdown</button><button class="btn btn-ghost" id="deleteCourse">✕ Xóa</button></div></div>
  <div class="course-metrics"><div class="metric"><strong>${esc(c.weeks)} tuần</strong><span>THỜI LƯỢNG KHÓA HỌC</span></div><div class="metric"><strong>${esc(c.minutes)} phút</strong><span>MỖI BUỔI HỌC</span></div><div class="metric"><strong>${generated} / ${esc(c.plan.modules.length)}</strong><span>BÀI GIẢNG ĐÃ SOẠN</span></div><div class="metric"><strong>${esc(c.level)}</strong><span>TRÌNH ĐỘ</span></div></div>
  ${courseTabs(c)}<div id="courseContent" class="tab-content"></div>`);
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{c.tab=b.dataset.tab;save();showCourse();});
  document.getElementById('exportCourse').onclick=()=>exportMarkdown(c);
  document.getElementById('deleteCourse').onclick=()=>{if(c.demo){toast('Giáo trình mẫu được giữ để bạn khám phá.');return;}if(confirm('Xóa giáo trình này khỏi trình duyệt?')){courses=courses.filter(x=>x.id!==c.id);save();navigate('home');}};
  const target=document.getElementById('courseContent');
  if(c.tab==='curriculum')showCurriculum(c,target);
  else if(c.tab==='lesson')showLesson(c,target);
  else if(c.tab==='research')showResearch(c,target);
  else showTutor(c,target);
}
function showCurriculum(c,target){
  const modules=c.plan.modules||[];
  target.innerHTML=`${c.demo?'<div class="notice">✧ Đây là <strong>giáo trình mẫu</strong>. Bài học đầu tiên có sẵn để khám phá. Muốn AI tạo nội dung mới và tìm Google, hãy thêm GEMINI_API_KEY vào máy chủ.</div>':''}
  <div class="two-col"><div>${modules.map((m,i)=>`<div class="module-card"><div class="mod-num">${String(m.week??i+1).padStart(2,'0')}</div><div class="module-info"><h3>${esc(m.title)}</h3><p>${esc(m.objective)}</p><div class="mod-tags">${(m.topics||[]).slice(0,6).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div><div class="module-action"><button class="small-btn" data-lesson="${i}">${c.lessons[String(m.week)]?'Xem bài giảng →':'✦ Soạn bài học'}</button></div></div>`).join('')}</div><aside><div class="detail-card"><h3>🎯 Đầu ra khóa học</h3><p>${esc(c.plan.outcome)}</p></div><div class="detail-card"><h3>Kiến thức → Thực hành</h3><p>Mỗi tuần có một đầu ra cụ thể:</p><ul>${modules.map(m=>`<li>${esc(m.deliverable)}</li>`).join('')}</ul></div><div class="callout"><strong>✧ Học tập có hệ thống</strong>Chọn “Soạn bài học” để AI tự xây dựng ví dụ, bài tập và câu hỏi trắc nghiệm theo từng tuần.</div></aside></div>`;
  target.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>{let m=modules[Number(b.dataset.lesson)];c.selectedModule=String(m.week);c.tab='lesson';save();showCourse();});
}
function showLesson(c,target){
  const modules=c.plan.modules||[];
  let idx=modules.findIndex(m=>String(m.week)===String(c.selectedModule));if(idx<0)idx=0;
  const mod=modules[idx], key=String(mod.week);
  const entry=(c.lessons||{})[key];
  const options=modules.map((m,i)=>`<option value="${i}" ${i===idx?'selected':''}>Tuần ${esc(m.week)} · ${esc(m.title)}</option>`).join('');
  const selector=`<div class="lesson-topline"><div class="field" style="margin:0;max-width:460px;flex:1"><select id="moduleSelector" aria-label="Chọn bài học">${options}</select></div><div class="lesson-buttons"><button class="btn btn-outline" id="printLesson">⎙ In</button>${entry?'<button class="btn btn-ghost" id="regenerateLesson">↻ Soạn lại</button>':''}</div></div>`;
  if(!entry){ target.innerHTML=selector+`<div class="course-empty"><div style="font-size:36px;color:#7461e5">✎</div><h3>${esc(mod.title)}</h3><p>${esc(mod.objective)}</p><button class="btn btn-primary btn-lg" style="max-width:290px" id="generateLesson">✦ Soạn bài giảng chi tiết</button><p style="margin-top:13px">AI sẽ tạo lý thuyết, ví dụ, thực hành và quiz.</p></div>`;}
  else {const l=entry.lesson;const qaKey=`${c.id}-${key}`;const ans=quizAnswers[qaKey]||{};const correct=Object.entries(ans).filter(([i,a])=>Number(a)===Number(l.quiz[Number(i)].answerIndex)).length;
    target.innerHTML=selector+`${entry.searchError?`<div class="notice">Google Search chưa thành công: ${esc(entry.searchError)}. Bài giảng vẫn được tạo nhưng chưa được xác minh qua Google.</div>`:''}
    <div class="lesson-hero"><span>LESSON ${esc(mod.week)} · ${esc(l.duration||c.minutes)} MINUTES</span><h2>${esc(l.title)}</h2><p>Học kiến thức · Thực hành · Kiểm tra</p></div><div class="two-col"><div>
    <section class="lesson-block"><h3>🎯 Mục tiêu bài học</h3><ul class="lesson-bullets">${(l.objectives||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
    <section class="lesson-block"><h3>💡 Khởi động</h3><p>${esc(l.warmup)}</p></section>
    <section class="lesson-block"><h3>▤ Nội dung bài giảng</h3>${(l.explanation||[]).map(s=>`<div class="lesson-section"><h4>${esc(s.heading)}</h4><p>${esc(s.content)}</p><div class="example"><strong>Ví dụ thực tế</strong>\n${esc(s.example)}</div></div>`).join('')}</section>
    <section class="lesson-block"><h3>✎ Bài tập thực hành</h3>${(l.activities||[]).map((a,i)=>`<div class="lesson-section"><h4>Bài ${i+1}. ${esc(a.question)}</h4><div class="example"><strong>Gợi ý thực hiện</strong>\n${esc(a.guidance)}</div></div>`).join('')}</section>
    <section class="lesson-block"><h3>✓ Tự kiểm tra kiến thức <span id="quizScore" class="score-pill">${correct}/${(l.quiz||[]).length} đúng</span></h3>${(l.quiz||[]).map((q,i)=>`<div class="quiz-question"><h4>Câu ${i+1}. ${esc(q.question)}</h4><div class="quiz-options">${(q.options||[]).map((o,j)=>`<button class="answer ${ans[i]!==undefined&&Number(q.answerIndex)===j?'correct':''} ${ans[i]!==undefined&&Number(ans[i])===j&&Number(q.answerIndex)!==j?'wrong':''}" data-q="${i}" data-option="${j}" ${ans[i]!==undefined?'disabled':''}><span class="letter">${'ABCD'[j]||j}.</span> ${esc(o)}</button>`).join('')}</div>${ans[i]!==undefined?`<div class="quiz-explain">${Number(ans[i])===Number(q.answerIndex)?'✓ Chính xác!':'ⓘ Đáp án đúng: '+esc(q.options[q.answerIndex])}<br>${esc(q.explanation)}</div>`:''}</div>`).join('')}<button class="btn btn-ghost" id="resetQuiz">↻ Làm lại quiz</button></section>
    </div><aside><div class="detail-card"><h3>✳ Key takeaway</h3><p>${esc(l.keyTakeaway)}</p></div><div class="detail-card"><h3>⌕ Nguồn học thuật</h3>${sourceLinks(entry.research?.sources, true)}<p class="results-note">${entry.research?.verified?'Liên kết do Google grounding cung cấp.':'Bài học này chưa có nguồn web xác minh.'}</p></div><div class="callout"><strong>✧ Chỗ nào chưa hiểu?</strong>Chuyển sang tab “Gia sư AI” để hỏi từng bước về bài học này.</div></aside></div>`;
    target.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const qa=quizAnswers[qaKey]||(quizAnswers[qaKey]={});qa[Number(b.dataset.q)]=Number(b.dataset.option);showCourse();});
    target.querySelector('#resetQuiz')?.addEventListener('click',()=>{delete quizAnswers[qaKey];showCourse();});
  }
  target.querySelector('#moduleSelector').onchange=e=>{c.selectedModule=String(modules[Number(e.target.value)].week);save();showCourse();};
  target.querySelector('#printLesson').onclick=()=>window.print();
  target.querySelector('#generateLesson')?.addEventListener('click',()=>generateLesson(c,mod,false));
  target.querySelector('#regenerateLesson')?.addEventListener('click',()=>generateLesson(c,mod,true));
}
async function generateLesson(c,mod,overwrite){
  if(!online){toast('Bản demo chỉ có bài giảng mẫu tuần 1. Cần GEMINI_API_KEY để tạo thêm.');return;}
  if(overwrite&&!confirm('Soạn lại bài học này? Nội dung cũ sẽ bị thay thế.'))return;
  document.getElementById('courseContent').innerHTML=loading('Đang tìm tài liệu và soạn bài giảng chi tiết...');
  try{
    const result=await post('/api/lesson',{course:{subject:c.subject,level:c.level,minutes:c.minutes},module:mod,findSources:true});
    c.lessons[String(mod.week)]=result;quizAnswers[`${c.id}-${mod.week}`]={};save();toast('Bài học đã sẵn sàng!');showCourse();
  }catch(err){toast(err.message);showCourse();}
}
function sourceLinks(sources,mini=false){
  if(!sources?.length)return '<div class="research-empty">Chưa có đường dẫn nguồn được Google trả về. Không thể xác nhận tài liệu tham khảo ở trạng thái hiện tại.</div>';
  return sources.map(s=>{const url=safeUrl(s.url);if(!url)return '';const hostname=(()=>{try{return new URL(url).hostname}catch{return ''}})();return mini?`<div style="margin:10px 0"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="source-chip">↗ ${esc(s.title||hostname)}</a></div>`:`<div class="research-card"><div class="source-ico">↗</div><div class="source-info"><strong>${esc(s.title||hostname)}</strong><small>${esc(hostname)}</small></div><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Mở ↗</a></div>`}).join('');
}
function showResearch(c,target){
  const r=c.research||{summary:'',sources:[]};
  target.innerHTML=`<div class="two-col"><section><div class="research-title"><h3>⌕ Tìm dữ liệu & nguồn tham khảo</h3></div><form id="researchForm" class="research-form"><input name="topic" required maxlength="240" value="${esc(c.subject)}" placeholder="Chủ đề bạn muốn tra cứu trên Google..."><button class="btn btn-primary" type="submit">✦ Nghiên cứu</button></form>
  <div id="researchResult">${c.searchError?`<div class="notice">Google Search chưa thành công: ${esc(c.searchError)}. Nội dung khóa học chưa được xác minh qua nguồn web.</div>`:''}<div class="detail-card"><h3>Tổng hợp kiến thức</h3><div class="research-summary">${esc(r.summary||'Chưa có nghiên cứu Google Search. Nhập một chủ đề ở trên để tìm nguồn.')}</div></div></div></section>
  <aside><div class="detail-card"><h3>🔗 Nguồn Google Search <span class="muted">(${r.sources?.length||0})</span></h3>${sourceLinks(r.sources)}<p class="results-note">${r.verified?'Các đường dẫn xuất phát từ phản hồi Google Search grounding, không phải nguồn do AI tự viết.':'Chưa xác nhận bất kỳ nguồn web nào.'}</p></div><div class="detail-card"><h3>Truy vấn đã thực hiện</h3><div class="sources-chips">${(r.queries||[]).map(q=>`<span class="tag">${esc(q)}</span>`).join('')||'<span class="muted">Chưa có dữ liệu</span>'}</div></div></aside></div>`;
  target.querySelector('#researchForm').onsubmit=async e=>{
    e.preventDefault();if(!online){toast('Cần GEMINI_API_KEY để tìm trên Google.');return;}
    const topic=new FormData(e.currentTarget).get('topic').trim();
    const resultBox=target.querySelector('#researchResult');resultBox.innerHTML=loading('Đang tra cứu Google và đối chiếu nguồn...');
    try{const result=await post('/api/research',{topic,level:c.level});c.research=result;c.searchError='';save();showCourse();toast('Đã cập nhật dữ liệu nghiên cứu.');}
    catch(err){resultBox.innerHTML=`<div class="notice error">${esc(err.message)}</div>`;}
  };
}
function showTutor(c,target){
  target.innerHTML=`<div class="two-col"><div class="chat-panel"><div class="chat-header"><div class="chat-avatar">✳</div><div><strong>Gia sư AI</strong><small>Hỏi đáp theo giáo trình · Gemini ${online?'đã kết nối':'chưa kết nối'}</small></div></div><div class="chat-messages" id="messages"></div><form class="chat-form" id="chatForm"><input name="question" maxlength="1500" required placeholder="Hỏi bất cứ điều gì về bài học..." autocomplete="off"><button type="submit">Gửi ↗</button></form></div><aside><div class="detail-card"><h3>✧ Hỏi gì hôm nay?</h3><p>Thử một trong các câu hỏi sau:</p><div style="display:grid;gap:8px"><button class="small-btn prompt-example" data-prompt="Giải thích khái niệm trọng tâm bằng một ví dụ thực tế." style="text-align:left">Giải thích bằng ví dụ thực tế</button><button class="small-btn prompt-example" data-prompt="Hãy đặt cho mình 3 câu hỏi ngắn để kiểm tra kiến thức." style="text-align:left">Kiểm tra kiến thức của tôi</button><button class="small-btn prompt-example" data-prompt="Tóm tắt bài học hiện tại thành 5 ý dễ nhớ." style="text-align:left">Tóm tắt bài học</button></div></div><div class="callout"><strong>Lưu ý</strong>Gia sư giải thích dựa trên bài học đã tạo. Chức năng chat không tự tra cứu web; dùng tab “Nguồn học thuật” khi cần thông tin mới.</div></aside></div>`;
  renderMessages(c);
  target.querySelectorAll('.prompt-example').forEach(b=>b.onclick=()=>{target.querySelector('[name="question"]').value=b.dataset.prompt;target.querySelector('[name="question"]').focus();});
  target.querySelector('#chatForm').onsubmit=async e=>{
    e.preventDefault();const input=e.currentTarget.elements.question;const text=input.value.trim();if(!text)return;
    if(!online){toast('Cần GEMINI_API_KEY để trò chuyện với gia sư AI.');return;}
    const previous=(c.chat||[]).slice(-8);
    c.chat.push({role:'user',text});input.value='';save();renderMessages(c);
    const key=c.selectedModule;const entry=c.lessons[key];const button=e.currentTarget.querySelector('button');button.disabled=true;button.textContent='...';
    try{const ans=await post('/api/tutor',{question:text,history:previous,context:{course:c.plan?.title,goal:c.goal,lesson:entry?.lesson}});c.chat.push({role:'assistant',text:ans.answer});save();renderMessages(c);}
    catch(err){toast(err.message);c.chat.push({role:'assistant',text:`Không thể kết nối lúc này: ${err.message}`});renderMessages(c);}
    finally{button.disabled=false;button.textContent='Gửi ↗';}
  };
}
function renderMessages(c){const el=document.getElementById('messages');if(!el)return;const history=c.chat||[];el.innerHTML=history.length?history.map(m=>`<div class="bubble ${m.role==='user'?'user':'assistant'}">${esc(m.text)}</div>`).join(''):'<div class="bubble assistant">Xin chào! Mình là gia sư AI của bạn. Hãy đặt câu hỏi về khóa học, nhờ giải thích khái niệm hoặc yêu cầu bài tập luyện tập nhé. ✨</div>';el.scrollTop=el.scrollHeight;}
function exportMarkdown(c){
  let md=`# ${c.plan.title}\n\n**Môn:** ${c.subject}\n\n**Mục tiêu:** ${c.goal}\n\n**Trình độ:** ${c.level} · **Thời lượng:** ${c.weeks} tuần\n\n${c.plan.description}\n\n## Đầu ra\n\n${c.plan.outcome}\n`;
  for(const m of c.plan.modules||[]){md+=`\n## Tuần ${m.week}: ${m.title}\n\n**Mục tiêu:** ${m.objective}\n\n${(m.topics||[]).map(t=>`- ${t}`).join('\n')}\n\n**Thực hành:** ${m.deliverable}\n`;
    const l=c.lessons?.[String(m.week)]?.lesson;
    if(l){md+=`\n### Bài giảng: ${l.title}\n\n**Khởi động:** ${l.warmup}\n\n`;
      for(const x of l.explanation||[])md+=`#### ${x.heading}\n\n${x.content}\n\n*Ví dụ:* ${x.example}\n\n`;
      md+=`**Ghi nhớ:** ${l.keyTakeaway}\n\n`;}
  }
  const sources=[...(c.research?.sources||[]),...Object.values(c.lessons||{}).flatMap(e=>e.research?.sources||[])];
  const map=new Map(sources.filter(s=>safeUrl(s.url)).map(s=>[s.url,s]));
  md+='\n## Tài liệu tham khảo (Google Search grounding)\n\n'+([...map.values()].map(s=>`- [${s.title}](${s.url})`).join('\n')||'Chưa có đường dẫn nguồn được xác minh.')+'\n';
  const blob=new Blob([md],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`giao-trinh-${c.subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,36)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function loading(label){return `<div class="loader" role="status"><div class="spinner"></div><p>${esc(label)}</p></div>`;}
async function post(endpoint,payload){
  const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const json=await res.json().catch(()=>({error:`HTTP ${res.status}`}));if(!res.ok)throw new Error(json.error||`Lỗi HTTP ${res.status}`);return json;
}
document.getElementById('navHome').onclick=()=>navigate('home');
document.getElementById('navNew').onclick=()=>navigate('create');
document.getElementById('topNew').onclick=()=>navigate('create');
(async()=>{
  try{const res=await fetch('/api/health');const json=await res.json();online=!!json.hasKey;apiIndicator.innerHTML=`<span class="status-dot ${online?'on':''}"></span> ${online?'Gemini đã kết nối':'Demo · Chưa có API key'}`;}
  catch { apiIndicator.textContent='Máy chủ chưa sẵn sàng'; }
  render();
})();
