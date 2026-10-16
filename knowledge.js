import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(BASE,'data','knowledge.sqlite'), { readOnly: true });
const toPlain = x => ({...x});
const normalize = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const subjects = db.prepare('SELECT * FROM subjects ORDER BY category,title').all().map(toPlain);
const getUnit = db.prepare('SELECT * FROM units WHERE id = ?');
const getBySubject = db.prepare('SELECT * FROM units WHERE subject_id=? ORDER BY sequence');
const getTopics = db.prepare('SELECT title FROM topics WHERE unit_id=? ORDER BY sequence');
const getResources = db.prepare('SELECT title,url,note,kind FROM resources WHERE category=? ORDER BY id');
const getUnitByIdAndSubject = db.prepare('SELECT * FROM units WHERE id=? AND subject_id=?');
function withTopics(row){return {...row,topics:getTopics.all(row.id).map(x=>x.title)};}
function resourceList(subject){return getResources.all(subject.category).map(x=>({...x,id:0}));}

export function stats(){
  const counts={};for(const table of ['subjects','units','topics','resources']) counts[table]=db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  counts.detailedUnits=db.prepare("SELECT COUNT(*) AS n FROM units WHERE depth='biên soạn'").get().n;
  counts.categories=db.prepare('SELECT COUNT(DISTINCT category) AS n FROM subjects').get().n;
  return {...counts, version:'2.0.0'};
}
export function catalog(query='', category=''){
  const q=normalize(query).slice(0,120);
  return subjects.filter(s=>(!category||s.category===category)&&(!q||normalize(`${s.title} ${s.aliases} ${s.description}`).includes(q) || q.split(' ').every(t=>normalize(`${s.title} ${s.aliases}`).includes(t)))).map(s=>({id:s.id,title:s.title,category:s.category,description:s.description,units:10})).slice(0,80);
}
export function resolveSubject(query){
  const q=normalize(query).slice(0,120);
  if(!q) return null;
  let found=subjects.find(s=>s.title.toLocaleLowerCase('vi')===String(query).trim().toLocaleLowerCase('vi'));
  if(found)return found;
  found=subjects.find(s=>normalize(s.title)===q);
  if(found)return found;
  found=subjects.find(s=>s.aliases.split(',').some(a=>normalize(a)===q));
  if(found)return found;
  const matches=subjects.filter(s=>normalize(s.title).includes(q) || q.includes(normalize(s.title)));
  return matches.length===1?matches[0]:null;
}
export function subjectInfo(id){
  const subject=subjects.find(s=>s.id===id);
  if(!subject)return null;
  return {...subject,units:getBySubject.all(id).map(withTopics),resources:resourceList(subject)};
}
function subjectOrFail(topic){
  const subject=resolveSubject(topic);
  if(subject) return subject;
  const relevant=catalog(topic).slice(0,5).map(x=>x.title);
  throw new Error(`Chủ đề chưa có trong kho dữ liệu. ${relevant.length?'Có thể bạn muốn: '+relevant.join(', '):'Mở Kho tri thức để chọn môn đã hỗ trợ.'}`);
}
function briefSubject(s, limit=5){
  const units=getBySubject.all(s.id).slice(0,limit).map(withTopics);
  return `${s.title}: ${units.map(u=>u.title+' ('+u.topics.join(', ')+')').join(' • ')}.`;
}
export function searchKnowledge(topic,level='Mới bắt đầu'){
  const q=normalize(topic).slice(0,240);
  if(!q)throw new Error('Nhập từ khóa cần tìm trong kho tri thức.');
  const direct=resolveSubject(topic);
  const subjectMatches=direct?[direct]:subjects.filter(s=>normalize(`${s.title} ${s.aliases}`).includes(q)).slice(0,4);
  let hits=[];
  if(subjectMatches.length){
    for(const s of subjectMatches){const units=getBySubject.all(s.id).map(withTopics).slice(0,8); hits.push(...units.map(x=>({...x,subjectTitle:s.title})));}
  }else{
    const tokens=q.split(/\s+/).filter(x=>x.length>2).slice(0,6);
    // Avoid dynamic SQL and FTS syntax injection: rank normalized titles and topic names in JS.
    const all=db.prepare('SELECT id,subject_id,title,summary,example,depth FROM units').all();
    hits=all.map(row=>{
      const topics=getTopics.all(row.id).map(x=>x.title);
      const h=normalize(row.title+' '+topics.join(' ')+' '+row.summary);
      const exact=h.includes(q);
      const score=(exact?20:0)+tokens.filter(t=>h.includes(t)).length;
      return {row:{...row,topics,subjectTitle:subjects.find(s=>s.id===row.subject_id)?.title||''},score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.row);
  }
  const matches=hits.slice(0,8);
  const s=subjectMatches[0]||subjects.find(x=>x.id===matches[0]?.subject_id);
  const sources=s?resourceList(s):[];
  const summary=matches.length
    ? `Kết quả từ kho giáo trình nội bộ (${matches.length} chuyên đề phù hợp), không phải kết quả tìm kiếm Google:\n\n${matches.map((u,i)=>`${i+1}. ${u.subjectTitle} · ${u.title}: ${u.depth==='biên soạn'?u.summary:`Các ý học: ${u.topics.join('; ')}. (Mới có khung nội dung.)`}`).join('\n\n')}`
    : 'Chưa tìm thấy chuyên đề khớp với từ khóa này trong kho nội bộ. Hãy thử tên môn hoặc thuật ngữ khác.';
  return {summary, sources, queries:[`Tra cứu database: ${topic}`],verified:false, sourceType:'reading_list',mode:'database',matchedUnits:matches.length,coverageNote:'Liên kết là nguồn đọc thêm theo lĩnh vực, chưa đối chiếu từng ý học.',units:matches.map(u=>({id:u.id,title:u.title,subject:u.subjectTitle,depth:u.depth,topics:u.topics}))};
}
export function createDatabasePlan(params){
  const requested=String(params.subject||'').slice(0,120),subject=subjectOrFail(requested);
  const duration=Math.max(1,Math.min(12,parseInt(params.weeks,10)||4));
  const units=getBySubject.all(subject.id).map(withTopics);
  const goal=String(params.goal||'Nắm các kiến thức nền tảng và ứng dụng vào bài tập thực hành').trim().slice(0,300);
  const modules=[];
  const instructional=Math.min(duration,units.length);
  for(let i=0;i<instructional;i++){
    const start=Math.floor(i*units.length/instructional);
    const end=Math.floor((i+1)*units.length/instructional);
    const group=units.slice(start,end);
    const last=group.at(-1);
    modules.push({week:i+1,title:group.length===1?group[0].title:`${group[0].title} → ${last.title}`,objective:group.map(x=>x.objective).join(' '),topics:group.flatMap(x=>x.topics).slice(0,12),deliverable:last.exercise,unitIds:group.map(x=>x.id),coverage:group.some(x=>x.depth==='khung')?'khung + nội dung chọn lọc':'nội dung biên soạn'});
  }
  for(let i=instructional;i<duration;i++){
    const isLast=i===duration-1;
    modules.push({week:i+1,title:isLast?'Dự án cuối khóa & tổng kết':'Ôn tập và kết nối kiến thức',objective:isLast?`Vận dụng nội dung ${subject.title} để hoàn thiện sản phẩm phù hợp mục tiêu học.`:'Hệ thống hóa và đối chiếu các chuyên đề đã học.',topics:isLast?['Áp dụng kiến thức','Trình bày kết quả','Tự đánh giá']:['Tổng hợp kiến thức','Bài luyện tập','Phản hồi'],deliverable:isLast?`Hoàn thành sản phẩm theo mục tiêu: ${goal}`:'Bản đồ tư duy và bảng tổng kết 10 chuyên đề',unitIds:units.slice(isLast?-2:0,isLast?undefined:2).map(x=>x.id),coverage:'ôn tập'});
  }
  const plan={title:`${subject.title} · Lộ trình ${duration} tuần`,description:`Giáo trình được lắp ghép từ ${units.length} chuyên đề thuộc kho tri thức nội bộ. Nội dung biên soạn sâu hiện có ở một số chuyên đề; phần còn lại là khung để tiếp tục bổ sung và kiểm chứng.`,outcome:goal,modules};
  return {plan,research:searchKnowledge(subject.title),searchError:'',mode:'database',subjectId:subject.id,coverage:{units:units.length,detailed:units.filter(x=>x.depth==='biên soạn').length}};
}
function quizForUnits(units, duration){
  const questions=[];const allUnitTopics=units.flatMap(x=>x.topics);
  for(let i=0;i<Math.min(4,units.length);i++){
    const unit=units[i];
    const correct=unit.topics[0];
    const wrong=subjects.length>0?db.prepare('SELECT title FROM topics WHERE unit_id NOT IN ('+units.map(()=>'?').join(',')+') LIMIT 200').all(...units.map(x=>x.id)).map(x=>x.title):[];
    const candidates=wrong.filter(x=>normalize(x)!==normalize(correct)&& !allUnitTopics.some(t=>normalize(t)===normalize(x)));
    const unique=[...new Set(candidates)];
    const opts=[correct,...unique.slice((i*3)%Math.max(1,unique.length), (i*3)%Math.max(1,unique.length)+3)];
    while(opts.length<4)opts.push(['Phân tích thiên văn học','Trắc nghiệm học phần','Lý thuyết địa chất'][opts.length-1]);
    const offset=i%4,rotated=opts.slice(offset).concat(opts.slice(0,offset));
    questions.push({question:`Chủ đề nào nằm trong chuyên đề “${unit.title}”?`,options:rotated,answerIndex:rotated.indexOf(correct),explanation:`Trong kho tri thức, “${unit.title}” bao gồm các ý: ${unit.topics.join(', ')}.`});
  }
  return questions;
}
export function createDatabaseLesson(params){
  const course=params.course||{},mod=params.module||{};
  const subject=subjectOrFail(course.subject||course.title||'');
  const idList=Array.isArray(mod.unitIds)?mod.unitIds.slice(0,10).map(x=>Number(x)).filter(Number.isInteger):[];
  let units=idList.map(id=>getUnitByIdAndSubject.get(id,subject.id)).filter(Boolean).map(withTopics);
  if(!units.length){ // Support courses produced before the database release by matching keywords.
    const all=getBySubject.all(subject.id).map(withTopics);
    const query=normalize(mod.title||'');
    units=all.filter(x=>query.includes(normalize(x.title))||normalize(x.title).includes(query)).slice(0,4);
    if(!units.length) units=all.slice(0,1);
  }
  if(!units.length)throw new Error('Chưa có chuyên đề cho môn này.');
  const duration=Math.max(20,Math.min(180,Number(course.minutes)||60));
  const explanations=units.map((u,i)=>({heading:`${i+1}. ${u.title}${u.depth==='khung'?' · khung nội dung':''}`,content:u.depth==='biên soạn'?u.summary:`Chuyên đề này trong cơ sở dữ liệu hiện có các ý học: ${u.topics.join('; ')}. Nội dung này là KHUNG biên soạn, chưa phải phần giải thích học thuật đầy đủ; hãy dùng tài liệu đọc thêm để phát triển và kiểm chứng.`,example:u.example}));
  const activities=units.map(x=>({question:x.exercise,guidance:`Xác định khái niệm chính (${x.topics.join(', ')}), mô tả một tình huống phù hợp và tự đánh giá bằng mục tiêu học tập: ${x.objective}`}));
  const lesson={title:mod.title||units.map(x=>x.title).join(' & '),duration,objectives:units.map(u=>u.objective),warmup:`Trước khi học, hãy ghi lại một tình huống thực tế có liên quan đến “${units[0].title}”. Bạn muốn giải thích hoặc cải thiện điều gì trong tình huống đó?`,explanation:explanations,activities,keyTakeaway:`${units.filter(x=>x.depth==='biên soạn').length?units.filter(x=>x.depth==='biên soạn').map(x=>x.summary.split('.')[0]).join('. '):'Đây mới là khung nội dung, chưa phải một bài giảng đầy đủ. Các trọng tâm cần tìm hiểu là: '+units.flatMap(x=>x.topics).slice(0,7).join(', ')}.`,quiz:quizForUnits(units,duration)};
  return {lesson,research:{summary:'Được biên soạn từ kho tri thức nội bộ.',sources:resourceList(subject),queries:[],verified:false,sourceType:'reading_list'},mode:'database',coverage:{units:units.length,detailed:units.filter(x=>x.depth==='biên soạn').length}};
}
export function tutorFromDatabase(params){
  const question=String(params.question||'').trim().slice(0,1500);
  if(!question)throw new Error('Bạn chưa nhập câu hỏi.');
  const context=params.context||{};
  const expl=Array.isArray(context.lesson?.explanation)?context.lesson.explanation:[];
  const qTokens=normalize(question).split(' ').filter(x=>x.length>3);
  const found=expl.map(x=>({entry:x,score:qTokens.reduce((n,t)=>n+(normalize(x.heading+' '+x.content).includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score)[0];
  if(found&&found.score>0){return {answer:`Dựa trên nội dung bài học “${found.entry.heading}”:\n\n${found.entry.content}\n\nVí dụ hoặc gợi ý: ${found.entry.example}\n\nĐây là câu trả lời từ kho kiến thức có sẵn, không phải tổng hợp web trực tiếp.`,mode:'database'};}
  const r=searchKnowledge(question);
  if(r.matchedUnits)return {answer:r.summary.slice(0,1600)+'\n\nHãy chọn một chuyên đề cụ thể để mình giải thích theo nội dung hiện có.',mode:'database'};
  return {answer:'Kho kiến thức chưa có nội dung phù hợp để trả lời chính xác câu hỏi này. Hãy thử hỏi theo tên chuyên đề trong giáo trình hoặc bổ sung tài liệu về chủ đề cần học. Mình sẽ không tự đoán câu trả lời.',mode:'database'};
}
