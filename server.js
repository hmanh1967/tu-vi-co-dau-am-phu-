// Nha Ma Am Phu Hue - Web xem tu vi (che do NHAN VIEN THU CONG)
// Luong: khach nhap thong tin -> tao "yeu cau" trong hang cho
//        -> nhan vien mo /admin, gen anh bang ChatGPT Plus roi upload
//        -> man hinh khach tu hien anh + tai PDF.
//
// Luu tru: trong bo nho (RAM). Yeu cau ton tai ngan (vai phut) nen du dung.
// Anh/yeu cau tu dong het han sau REQUEST_TTL_MS de khong phinh bo nho.

import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "30mb" })); // du cho anh PNG base64
app.use(express.static(path.join(__dirname, "public")));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const REQUEST_TTL_MS = Number(process.env.REQUEST_TTL_MS || 2 * 60 * 60 * 1000); // 2 gio

/** requests: Map<id, { id, info, status, image, createdAt, updatedAt }> */
const requests = new Map();

function cleanup() {
  const now = Date.now();
  for (const [id, r] of requests) {
    if (now - r.createdAt > REQUEST_TTL_MS) requests.delete(id);
  }
}
setInterval(cleanup, 10 * 60 * 1000).unref?.();

// Noi dung goi y de nhan vien dan vao ChatGPT (co the sua qua bien TUVI_PROMPT)
function buildPromptText(info) {
  const base = process.env.TUVI_PROMPT || `
Xem tử vi giúp mình theo thông tin sau:
- Họ tên: {{hoTen}}
- Giới tính: {{gioiTinh}}
- Ngày sinh: {{ngaySinh}} ({{loaiLich}})
- Giờ sinh: {{gioSinh}}
- Nơi sinh: {{noiSinh}}
- Muốn xem trọng tâm: {{trongTam}}
`.trim();
  return base
    .replaceAll("{{hoTen}}", info.hoTen || "(không cung cấp)")
    .replaceAll("{{ngaySinh}}", info.ngaySinh || "")
    .replaceAll("{{gioSinh}}", info.gioSinh || "không rõ")
    .replaceAll("{{loaiLich}}", info.loaiLich || "dương lịch")
    .replaceAll("{{noiSinh}}", info.noiSinh || "không rõ")
    .replaceAll("{{gioiTinh}}", info.gioiTinh || "không rõ")
    .replaceAll("{{trongTam}}", info.trongTam || "tổng quan");
}

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mat khau admin." });
  }
  next();
}

// ---------- KHACH ----------
app.post("/api/requests", (req, res) => {
  const info = req.body || {};
  if (!info.ngaySinh) {
    return res.status(400).json({ error: "Vui lòng nhập ngày sinh." });
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  requests.set(id, {
    id,
    info: {
      hoTen: String(info.hoTen || "").slice(0, 100),
      ngaySinh: String(info.ngaySinh).slice(0, 40),
      gioSinh: String(info.gioSinh || "").slice(0, 40),
      loaiLich: String(info.loaiLich || "").slice(0, 20),
      noiSinh: String(info.noiSinh || "").slice(0, 120),
      gioiTinh: String(info.gioiTinh || "").slice(0, 20),
      trongTam: String(info.trongTam || "").slice(0, 80),
    },
    status: "pending",
    image: null,
    createdAt: now,
    updatedAt: now,
  });
  res.json({ id });
});

// Khach hoi trang thai (poll)
app.get("/api/status/:id", (req, res) => {
  const r = requests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Khong tim thay yeu cau (co the da het han)." });
  res.json({ status: r.status, image: r.status === "ready" ? r.image : null, info: r.info });
});

// ---------- ADMIN ----------
app.get("/api/admin/requests", requireAdmin, (req, res) => {
  const list = [...requests.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => ({
      id: r.id,
      info: r.info,
      status: r.status,
      createdAt: r.createdAt,
      promptText: buildPromptText(r.info),
    }));
  res.json({ requests: list });
});

app.post("/api/admin/requests/:id/image", requireAdmin, (req, res) => {
  const r = requests.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Khong tim thay yeu cau." });
  const image = (req.body || {}).image;
  if (!image || !/^data:image\//.test(image)) {
    return res.status(400).json({ error: "Thieu anh hoac dinh dang khong dung." });
  }
  r.image = image;
  r.status = "ready";
  r.updatedAt = Date.now();
  res.json({ ok: true });
});

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.get("/api/health", (req, res) => res.json({ ok: true, count: requests.size }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chay tai cong ${PORT}`));
