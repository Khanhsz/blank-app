# AI Tutor Studio – Web MVP

**Tạo giáo trình · Bài giảng · Google Search grounding · Quiz · Gia sư AI**

MVP chạy trên Node.js 20+ (không cần cài thư viện). Có giao diện tiếng Việt, tự thích ứng với di động và mẫu khóa Marketing sẵn để dùng thử.

## Chạy thử ngay

1. Cài [Node.js](https://nodejs.org/) phiên bản 20.12+.
2. Mở Terminal tại thư mục này, chạy `npm start` và truy cập **http://localhost:3000**.
3. Chưa có API key vẫn xem được giáo trình Marketing mẫu, bài giảng và làm quiz. Đây là **demo tĩnh**, không gọi Google hay AI.

## Bật Gemini + Google Search

1. Tạo Gemini API key tại https://aistudio.google.com/apikey . Không đưa key vào mã frontend, không commit key lên GitHub.
2. Tạo `.env` từ `.env.example` rồi thay `GEMINI_API_KEY` bằng key thật. Ứng dụng tự đọc file `.env` qua Node 20.12+.
3. Chạy lại `npm start`.
4. Tạo giáo trình: nhập môn, mục tiêu, trình độ, số tuần, thời lượng mỗi buổi. Tick **Tra cứu Google** để tìm nguồn trước khi soạn giáo trình.
5. Mở từng tuần → **Soạn bài học** → quiz → **Gia sư AI**. Tab **Nguồn học thuật** dùng Google Search grounding, hiển thị liên kết và truy vấn trả về.

## Kiến trúc

- **Frontend:** Vanilla JS, CSS responsive, state lưu bằng `localStorage` của trình duyệt.
- **Backend:** `server.js` Node HTTP server, không cần database/dependencies.
- **Soạn giáo trình và bài giảng:** Gemini `gemini-3.5-flash-lite`, structured JSON output.
- **Nghiên cứu Google:** Gemini `gemini-2.5-flash-lite`, `googleSearch` grounding; lấy `groundingMetadata.groundingChunks` để hiển thị nguồn xác minh.
- **Luồng nghiên cứu → soạn:** 2 lượt API, nhằm giữ bước nghiên cứu tách khỏi đầu ra JSON.
- **Gia sư:** Gemini nhận câu hỏi, bài giảng đang chọn và tối đa 8 tin nhắn gần nhất; không tự thực hiện Google Search.

## Lưu ý về nguồn

Chỉ liên kết do Google grounding trả về mới được hiển thị dưới dạng nguồn. Nếu grounding không trả về nguồn hoặc lỗi, giao diện báo rõ trạng thái; **AI vẫn có thể tạo giáo trình/bài giảng nhưng chưa được xác minh qua web**. Google Search grounding không phải trình thu thập toàn bộ trang Google Search hoặc tải PDF nguyên bản.

## Chi phí

- Gemini 3.5 Flash-Lite: có gói sử dụng miễn phí theo giới hạn quota, phụ thuộc tài khoản/dự án.
- Theo bảng giá công khai tháng 10/2026, Gemini 2.5 Flash-Lite hỗ trợ Google Search grounding miễn phí tối đa 500 grounded prompts/ngày (gộp quota với 2.5 Flash); hạn mức có thể đổi và còn tùy tình trạng dự án.
- Gemini 3.5 Flash-Lite **không hỗ trợ Google Search grounding ở API Free Tier**, vì vậy tách sang Gemini 2.5 Flash-Lite.
- Không dùng Google Custom Search JSON API vì đã đóng đăng ký mới và dự kiến ngừng vào 01/01/2027.
- Bật billing có thể phát sinh chi phí: đọc [bảng giá chính thức](https://ai.google.dev/gemini-api/docs/pricing).

## Đưa lên Render

1. Đưa mã nguồn lên repo GitHub **riêng tư** (không commit `.env`).
2. Render → New → Blueprint → chọn repo và `render.yaml`, hoặc New → Web Service.
3. Cấu hình biến môi trường `GEMINI_API_KEY` trong Render Dashboard (Secret/Environment), không nhập API key vào frontend.
4. Build command: `npm install`; Start command: `npm start`; Instance: Free (nếu có).

**Lưu ý:** Render Free có thể ngủ khi không có traffic; dữ liệu khóa học trong demo chỉ lưu theo trình duyệt và **không đồng bộ giữa các thiết bị**. Khi phát triển đa người dùng, nên thêm authentication + database như PostgreSQL/Supabase và hạn chế API rate limit theo tài khoản.

## Test

```sh
npm test
```

## API

- `GET /api/health` – kiểm tra đã có key chưa.
- `POST /api/plan` – tạo giáo trình, tùy chọn Google research.
- `POST /api/research` – nghiên cứu chủ đề qua Google grounding.
- `POST /api/lesson` – tạo bài giảng từ một module.
- `POST /api/tutor` – gia sư trả lời theo ngữ cảnh.

## Điểm cần làm trước production

Phân quyền tài khoản, dữ liệu trên DB, bảo vệ quota bằng auth và rate limits lưu bền, kiểm soát nội dung theo lứa tuổi, thu thập phản hồi chỉnh sửa giáo trình, xuất PDF/DOCX chất lượng cao, map chi tiết từng mệnh đề với source/citation, kiểm định chất lượng học liệu và bản quyền tài liệu web.
