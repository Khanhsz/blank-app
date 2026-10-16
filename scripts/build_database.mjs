/** Build the versioned read-only SQLite reference corpus at deployment time. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seed=JSON.parse(readFileSync(path.join(root,'data','catalog-seed.json'),'utf8'));
const out=path.join(root,'data','knowledge.sqlite');
mkdirSync(path.dirname(out),{recursive:true});if(existsSync(out))unlinkSync(out);
const db=new DatabaseSync(out);
db.exec(`CREATE TABLE meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE subjects (id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,aliases TEXT NOT NULL,search TEXT NOT NULL,description TEXT NOT NULL);
CREATE TABLE units (id INTEGER PRIMARY KEY,subject_id TEXT NOT NULL,sequence INTEGER NOT NULL,title TEXT NOT NULL,objective TEXT NOT NULL,summary TEXT NOT NULL,example TEXT NOT NULL,exercise TEXT NOT NULL,depth TEXT NOT NULL,FOREIGN KEY(subject_id) REFERENCES subjects(id));
CREATE TABLE topics (id INTEGER PRIMARY KEY,unit_id INTEGER NOT NULL,sequence INTEGER NOT NULL,title TEXT NOT NULL,FOREIGN KEY(unit_id) REFERENCES units(id));
CREATE TABLE resources (id INTEGER PRIMARY KEY,category TEXT NOT NULL,title TEXT NOT NULL,url TEXT NOT NULL,note TEXT NOT NULL,kind TEXT NOT NULL);
CREATE INDEX units_subject_sequence ON units(subject_id,sequence);
CREATE INDEX topics_unit_sequence ON topics(unit_id,sequence);
CREATE INDEX subjects_category ON subjects(category);`);
const slugify=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('đ','d').replaceAll('Đ','D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const norm=s=>slugify(s).replaceAll('-',' ');
const sb=db.prepare('INSERT INTO subjects VALUES (?,?,?,?,?,?)');
const un=db.prepare('INSERT INTO units(subject_id,sequence,title,objective,summary,example,exercise,depth) VALUES (?,?,?,?,?,?,?,?)');
const tp=db.prepare('INSERT INTO topics(unit_id,sequence,title) VALUES (?,?,?)');
const rs=db.prepare('INSERT INTO resources(category,title,url,note,kind) VALUES (?,?,?,?,?)');
const meta=db.prepare('INSERT INTO meta VALUES (?,?)');
db.exec('BEGIN');
for(const [category,title,aliases,units] of seed.subjects){
  const slug=title==='Kinh tế vĩ mô'?'kinh-te-vi-mo-macro':slugify(title);
  sb.run(slug,title,category,aliases,norm(title+' '+aliases),`Khung giáo trình ${title}, gồm ${units.length} chuyên đề theo tiến trình từ nền tảng đến thực hành.`);
  for(let i=0;i<units.length;i++){
    const [unit,topics]=units[i];const fact=seed.facts[unit];
    const summary=fact?fact[0]:`Chủ đề ${unit.toLowerCase()} bao gồm ${topics.join(', ')}. Đây là **khung kiến thức**; cần đối chiếu tài liệu chuyên ngành trước khi xem như bài giảng đầy đủ.`;
    const example=fact?fact[1]:`Thực hành: tìm một tình huống thực tế và xác định cách ${topics[0].toLowerCase()} liên hệ với ${topics[1].toLowerCase()}.`;
    const objective=`Trình bày được ${topics[0].toLowerCase()}, phân biệt với ${topics[1].toLowerCase()} và vận dụng vào một tình huống minh họa.`;
    const exercise=`Lập bảng so sánh hoặc sơ đồ minh họa về ${topics[0]}, ${topics[1]} và ${topics.at(-1)}; nêu một ví dụ thực tế và giải thích lựa chọn.`;
    const result=un.run(slug,i+1,unit,objective,summary,example,exercise,fact?'biên soạn':'khung');
    for(let j=0;j<topics.length;j++)tp.run(Number(result.lastInsertRowid),j+1,topics[j]);
  }
}
for(const [category,title,url,note] of seed.sources)rs.run(category,title,url,note,'đọc thêm');
meta.run('version','2.0.0');meta.run('origin','Original curriculum outlines, external resources linked only');meta.run('knowledge_depth','Mixed: authored explanations for selected units, outlines for others');
db.exec('COMMIT');
for(const t of ['subjects','units','topics','resources'])console.log(t,db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n);
db.close();
