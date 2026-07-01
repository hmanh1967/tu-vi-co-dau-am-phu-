const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

let currentId = null;
let pollTimer = null;
let currentInfo = null;

$("tuviForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hide("formErr");
  const btn = $("submitBtn");
  btn.disabled = true;
  btn.textContent = "Đang gửi…";

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

  try {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
    currentId = data.id;
    hide("formSection");
    show("waitSection");
    startPolling();
  } catch (err) {
    $("formErr").textContent = err.message;
    show("formErr");
  } finally {
    btn.disabled = false;
    btn.textContent = "Xin Cô Dâu luận số →";
  }
});

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(checkStatus, 3000);
  checkStatus();
}

async function checkStatus() {
  if (!currentId) return;
  try {
    const res = await fetch(`/api/status/${currentId}`);
    const data = await res.json();
    if (res.ok && data.status === "ready" && data.image) {
      clearInterval(pollTimer);
      $("resultImg").src = data.image;
      hide("waitSection");
      show("resultSection");
    }
  } catch (_) { /* thu lai o lan poll sau */ }
}

$("pdfBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const img = $("resultImg");
  const w = img.naturalWidth || 1024;
  const h = img.naturalHeight || 1536;
  const orientation = h >= w ? "portrait" : "landscape";
  const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
  pdf.addImage(img.src, "PNG", 0, 0, w, h);
  const ten = (currentInfo?.hoTen || "la-so").replace(/\s+/g, "-");
  pdf.save(`tu-vi-${ten}.pdf`);
});

$("againBtn").addEventListener("click", () => {
  currentId = null;
  currentInfo = null;
  $("tuviForm").reset();
  hide("resultSection");
  show("formSection");
});
