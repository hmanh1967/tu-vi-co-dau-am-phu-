// ====================================================================
//  LINK TRAILER (Facebook, video phải để CÔNG KHAI). Để trống "" thì ẩn.
const TRAILER_FB_URL = "https://www.facebook.com/share/v/1CuUmfWFJj/";
// ====================================================================

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let currentInfo = null;

function ddmmyyyy(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || "");
}

/* ---------- Trailer ---------- */
function mountTrailer() {
  const box = $("trailerBox"), frame = $("videoFrame");
  if (!TRAILER_FB_URL) { box.classList.add("hidden"); return; }
  if (!frame.dataset.loaded) {
    const src = "https://www.facebook.com/plugins/video.php?href=" +
      encodeURIComponent(TRAILER_FB_URL) + "&show_text=false&autoplay=true&mute=true";
    frame.innerHTML = '<iframe src="' + src + '" scrolling="no" frameborder="0" ' +
      'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>';
    frame.dataset.loaded = "1";
  }
  box.classList.remove("hidden");
}
function stopTrailer() {
  const frame = $("videoFrame");
  frame.innerHTML = ""; frame.dataset.loaded = "";
  $("trailerBox").classList.add("hidden");
}

/* ---------- Render infographic ---------- */
function item(icon, title, text) {
  return '<div class="laso-item"><div class="li-h">' + icon + " " + title +
    '</div><p>' + esc(text) + "</p></div>";
}
function renderLaso(info, r) {
  const meta = [];
  meta.push("Ngày sinh: " + ddmmyyyy(info.ngaySinh) + " (" + esc(info.loaiLich || "dương lịch") + ")");
  if (info.gioSinh) meta.push("Giờ: " + esc(info.gioSinh));
  if (info.noiSinh) meta.push("Nơi sinh: " + esc(info.noiSinh));
  if (r.menh) meta.push("Mệnh: " + esc(r.menh));

  const cols = (r.duBao || []).map((d) =>
    '<div class="lf-col"><div class="lf-year">' + esc(d.nam) + '</div><div class="lf-cc">' +
    esc(d.canChi) + '</div><p>' + esc(d.noiDung) + "</p></div>").join("");

  $("laso").innerHTML =
    '<div class="laso-head">' +
      '<div class="laso-sub">✧ LÁ SỐ TỬ VI ✧</div>' +
      '<div class="laso-title">CÔ DÂU ÂM PHỦ</div>' +
      '<div class="laso-name">' + (info.hoTen ? esc(info.hoTen.toUpperCase()) : "QUÝ KHÁCH") + '</div>' +
      '<div class="laso-meta">' + meta.join(" &nbsp;·&nbsp; ") + "</div>" +
    "</div>" +
    (r.moDau ? '<div class="laso-intro">“' + esc(r.moDau) + '”</div>' : "") +
    '<div class="laso-grid">' +
      item("✦", "Tính cách", r.tinhCach) +
      item("⚑", "Sự nghiệp", r.suNghiep) +
      item("❦", "Tình duyên", r.tinhDuyen) +
      item("✸", "Tài lộc", r.taiLoc) +
      item("✚", "Sức khỏe", r.sucKhoe) +
    "</div>" +
    '<div class="laso-forecast"><div class="lf-title">DỰ BÁO 3 NĂM TỚI</div><div class="lf-cols">' + cols + "</div></div>" +
    '<div class="laso-foot">Bản luận giải dựa trên hệ thống tử vi truyền thống, chỉ mang tính tham khảo — không phải dự đoán chắc chắn về tương lai.<br/>© Nhà Ma Âm Phủ Huế</div>';
}

/* ---------- Submit -> tu dong sinh la so ---------- */
$("tuviForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hide("formErr");
  const btn = $("submitBtn");
  btn.disabled = true; btn.textContent = "Đang gửi…";

  const form = e.target;
  const info = {
    hoTen: form.hoTen.value.trim(),
    ngaySinh: form.ngaySinh.value,
    loaiLich: form.loaiLich.value,
    gioSinh: form.gioSinh.value,
    noiSinh: form.noiSinh.value.trim(),
    gioiTinh: form.gioiTinh.value,
    trongTam: form.trongTam.value,
  };
  currentInfo = info;

  hide("formSection");
  show("waitSection");
  mountTrailer();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
    renderLaso(data.info || info, data.reading || {});
    stopTrailer();
    hide("waitSection");
    show("resultSection");
  } catch (err) {
    stopTrailer();
    hide("waitSection");
    show("formSection");
    $("formErr").textContent = "Không lấy được lá số: " + err.message + " — vui lòng thử lại.";
    show("formErr");
  } finally {
    btn.disabled = false; btn.textContent = "Xin Cô Dâu luận số →";
  }
});

/* ---------- PDF ---------- */
$("pdfBtn").addEventListener("click", async () => {
  const node = $("laso");
  const btn = $("pdfBtn");
  btn.disabled = true; btn.textContent = "Đang tạo PDF…";
  try {
    const canvas = await html2canvas(node, { backgroundColor: "#0d0a0a", scale: 2, useCORS: true });
    const img = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
    const ten = (currentInfo?.hoTen || "la-so").replace(/\s+/g, "-");
    pdf.save("tu-vi-" + ten + ".pdf");
  } catch (e) {
    alert("Không tạo được PDF, vui lòng thử lại.");
  } finally {
    btn.disabled = false; btn.textContent = "⬇ Tải về file PDF";
  }
});

$("againBtn").addEventListener("click", () => {
  currentInfo = null;
  $("tuviForm").reset();
  hide("resultSection");
  show("formSection");
});
