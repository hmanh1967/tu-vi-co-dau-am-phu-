// Nha Ma Am Phu Hue - Web xem tu vi (che do TU DONG bang Gemini)
// Luong: khach nhap thong tin -> server goi Gemini sinh luan giai (JSON)
//        -> frontend do vao template infographic -> khach xem + tai PDF.
//
// Bien moi truong:
//   GEMINI_API_KEY  (bat buoc) - key mien phi tu Google AI Studio
//   GEMINI_MODEL    (tuy chon) - mac dinh "gemini-2.0-flash"
//   DEMO_MODE=1     (tuy chon) - tra du lieu mau de xem truoc layout, khong goi Gemini
//   ADMIN_PASSWORD  - (giu lai cho che do thu cong du phong, khong bat buoc)

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const DEMO_MODE = process.env.DEMO_MODE === "1";

// ---- Can Chi cho nam duong lich (tinh o server cho chinh xac) ----
const CAN = ["Canh","Tân","Nhâm","Quý","Giáp","Ất","Bính","Đinh","Mậu","Kỷ"];
const CHI = ["Thân","Dậu","Tuất","Hợi","Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi"];
function canChi(year) { return CAN[year % 10] + " " + CHI[year % 12]; }
function threeYears() {
  const y = new Date().getFullYear();
  return [y, y + 1, y + 2].map((n) => ({ nam: n, canChi: canChi(n) }));
}

function sanitize(info = {}) {
  return {
    hoTen: String(info.hoTen || "").slice(0, 100),
    ngaySinh: String(info.ngaySinh || "").slice(0, 40),
    gioSinh: String(info.gioSinh || "").slice(0, 40),
    loaiLich: String(info.loaiLich || "").slice(0, 20),
    noiSinh: String(info.noiSinh || "").slice(0, 120),
    gioiTinh: String(info.gioiTinh || "").slice(0, 20),
    trongTam: String(info.trongTam || "").slice(0, 80),
  };
}

function buildGeminiPrompt(info, years) {
  const yLabels = years.map((y) => `${y.nam} (${y.canChi})`).join(", ");
  return `Bạn là "Cô Dâu Âm Phủ" - thầy tử vi trong trải nghiệm horror Gen Z tại Nhà Ma Âm Phủ Huế.
Hãy luận giải tử vi cho người dưới đây bằng TIẾNG VIỆT, giọng huyền bí, cuốn hút, hơi rùng rợn nhưng tích cực, phù hợp giới trẻ 16-30 tuổi. Mỗi mục 2-4 câu, súc tích, cá nhân hoá theo thông tin.

Thông tin:
- Họ tên: ${info.hoTen || "(ẩn danh)"}
- Giới tính: ${info.gioiTinh || "không rõ"}
- Ngày sinh: ${info.ngaySinh} (${info.loaiLich || "dương lịch"})
- Giờ sinh: ${info.gioSinh || "không rõ"}
- Nơi sinh: ${info.noiSinh || "không rõ"}
- Muốn xem trọng tâm: ${info.trongTam || "tổng quan"}

Nhấn mạnh hơn vào mục "${info.trongTam || "tổng quan"}".
Phần dự báo gồm đúng 3 năm theo thứ tự: ${yLabels}.

CHỈ trả về JSON hợp lệ theo đúng cấu trúc sau, không thêm chữ nào ngoài JSON:
{
  "menh": "tên mệnh nạp âm ngắn gọn, ví dụ: Dương Liễu Mộc",
  "moDau": "1-2 câu mở đầu tổng quan về lá số",
  "tinhCach": "...",
  "suNghiep": "...",
  "tinhDuyen": "...",
  "taiLoc": "...",
  "sucKhoe": "...",
  "duBao": ["nội dung năm 1", "nội dung năm 2", "nội dung năm 3"]
}`;
}

function demoReading(info, years) {
  const t = info.trongTam || "tổng quan";
  return {
    menh: "Dương Liễu Mộc",
    moDau: `Lá số của ${info.hoTen || "bạn"} ẩn chứa nhiều tầng vận khí. Cô Dâu đã soi tỏ đường đời phía trước.`,
    tinhCach: "Bạn mang khí chất mềm mại như liễu nhưng bên trong kiên cường. Trực giác nhạy bén, dễ đồng cảm, đôi khi hơi đa sầu đa cảm.",
    suNghiep: "Con đường sự nghiệp nở muộn nhưng bền. Sau một giai đoạn thử thách, quý nhân xuất hiện, công danh hanh thông.",
    tinhDuyen: "Đường tình duyên nhiều duyên nợ. Người thương đến từ nơi bất ngờ; giữ lòng chân thành sẽ gặp lương duyên.",
    taiLoc: "Tài lộc tụ dần theo tuổi. Tránh vay mượn phiêu lưu, giữ chữ tín thì hầu bao ngày một đầy.",
    sucKhoe: "Sức khỏe ổn nhưng cần giữ giấc ngủ và tinh thần. Hạn chế thức khuya, năng vận động.",
    duBao: [
      `Năm ${years[0].canChi}: khởi sắc trong ${t}, nhiều cơ hội mới, cần quyết đoán.`,
      `Năm ${years[1].canChi}: giai đoạn củng cố, giữ vững thành quả, cẩn trọng tiểu nhân.`,
      `Năm ${years[2].canChi}: vận trình lên cao, gặt hái, mở rộng mối quan hệ.`,
    ],
  };
}

function normalizeReading(raw, years) {
  const d = Array.isArray(raw.duBao) ? raw.duBao : [];
  const duBao = years.map((y, i) => ({
    nam: y.nam,
    canChi: y.canChi,
    noiDung: typeof d[i] === "string" ? d[i] : (d[i] && d[i].noiDung) || "",
  }));
  return {
    menh: String(raw.menh || ""),
    moDau: String(raw.moDau || ""),
    tinhCach: String(raw.tinhCach || ""),
    suNghiep: String(raw.suNghiep || ""),
    tinhDuyen: String(raw.tinhDuyen || ""),
    taiLoc: String(raw.taiLoc || ""),
    sucKhoe: String(raw.sucKhoe || ""),
    duBao,
  };
}

app.post("/api/generate", async (req, res) => {
  try {
    const info = sanitize(req.body);
    if (!info.ngaySinh) return res.status(400).json({ error: "Vui lòng nhập ngày sinh." });
    const years = threeYears();

    if (DEMO_MODE) {
      return res.json({ info, reading: normalizeReading(demoReading(info, years), years) });
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server chưa cấu hình GEMINI_API_KEY." });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildGeminiPrompt(info, years) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Gemini error:", r.status, errText);
      return res.status(502).json({ error: "Lỗi khi gọi Gemini.", detail: errText.slice(0, 300) });
    }

    const data = await r.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/^```json\s*/i, "").replace(/```$/,"").trim();
    let raw;
    try { raw = JSON.parse(text); }
    catch (_) { return res.status(502).json({ error: "Gemini trả về không đúng định dạng.", detail: text.slice(0, 300) }); }

    return res.json({ info, reading: normalizeReading(raw, years) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
});

app.get("/api/health", (req, res) =>
  res.json({ ok: true, mode: DEMO_MODE ? "demo" : (GEMINI_API_KEY ? "gemini" : "no-key"), model: GEMINI_MODEL })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chay tai cong ${PORT}`));
