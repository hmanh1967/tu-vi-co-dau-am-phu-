// ====================================================================
//  LINK TRAILER (Facebook). Dán link video FB vào giữa 2 dấu "".
//  Để trống "" thì phần trailer tự ẩn.
const TRAILER_FB_URL = "https://www.facebook.com/share/v/1CuUmfWFJj/";
// ====================================================================

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

let currentId = null;
let pollTimer = null;
let currentInfo = null;

function mountTrailer() {
  const box = $("trailerBox");
  const frame = $("videoFrame");
  if (!TRAILER_FB_URL) { box.classList.add("hidden"); return; }
  if (!frame.dataset.loaded) {
    const src = "https://www.facebook.com/plugins/video.php?href=" +
      encodeURIComponent(TRAILER_FB_URL) +
      "&show_text=false&autoplay=true&mute=true";
    frame.innerHTML =
      '<iframe src="' + src + '" scrolling="no" frameborder="0" ' +
      'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ' +
      'allowfullscreen></iframe>';
    frame.dataset.loaded = "1";
  }
  box.classList.remove("hidden");
}

function stopTrailer() {
  const frame = $("videoFrame");
  frame.innerHTML = "";
  frame.dataset.loaded = "";
  $("trailerBox").classList.add("hidden");
}

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
    mountTrailer();
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
      stopTrailer();
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
