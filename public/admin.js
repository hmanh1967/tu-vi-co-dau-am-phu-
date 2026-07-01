const $ = (id) => document.getElementById(id);
let token = null;
let refreshTimer = null;

$("loginBtn").addEventListener("click", login);
$("pw").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });

async function login() {
  const pw = $("pw").value;
  $("loginErr").classList.add("hidden");
  try {
    const res = await fetch("/api/admin/requests?token=" + encodeURIComponent(pw));
    if (!res.ok) throw new Error("Sai mật khẩu.");
    token = pw;
    $("loginCard").classList.add("hidden");
    $("panel").classList.remove("hidden");
    loadList();
    refreshTimer = setInterval(loadList, 5000);
  } catch (err) {
    $("loginErr").textContent = err.message;
    $("loginErr").classList.remove("hidden");
  }
}

async function loadList() {
  try {
    const res = await fetch("/api/admin/requests", { headers: { "x-admin-token": token } });
    const data = await res.json();
    render(data.requests || []);
  } catch (_) {}
}

function render(list) {
  $("count").textContent = list.length;
  const el = $("list");
  el.innerHTML = "";
  if (!list.length) {
    el.innerHTML = '<p class="muted" style="text-align:center">Chưa có yêu cầu nào.</p>';
    return;
  }
  for (const r of list) {
    const i = r.info;
    const div = document.createElement("div");
    div.className = "req";
    div.innerHTML = `
      <span class="badge ${r.status}">${r.status === "ready" ? "Đã xong" : "Chờ xử lý"}</span>
      <h3>${esc(i.hoTen)}</h3>
      <div class="meta">${esc(i.ngaySinh)} (${esc(i.loaiLich)}) · Giờ: ${esc(i.gioSinh) || "?"} · ${esc(i.gioiTinh)}<br/>Nơi sinh: ${esc(i.noiSinh) || "?"}</div>
      <textarea readonly>${esc(r.promptText)}</textarea>
      <div class="btnrow">
        <button data-copy>📋 Copy nội dung dán ChatGPT</button>
        <label class="filebtn">⬆ Upload ảnh PNG<input type="file" accept="image/png,image/jpeg" data-file></label>
      </div>
      <div class="ok hidden" data-msg></div>`;

    div.querySelector("[data-copy]").addEventListener("click", () => {
      navigator.clipboard.writeText(r.promptText);
      const b = div.querySelector("[data-copy]");
      b.textContent = "✓ Đã copy";
      setTimeout(() => (b.textContent = "📋 Copy nội dung dán ChatGPT"), 1500);
    });

    div.querySelector("[data-file]").addEventListener("change", (e) => uploadImage(e, r.id, div));
    el.appendChild(div);
  }
}

function uploadImage(e, id, div) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const msg = div.querySelector("[data-msg]");
    msg.textContent = "Đang tải lên…";
    msg.classList.remove("hidden");
    try {
      const res = await fetch(`/api/admin/requests/${id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ image: reader.result }),
      });
      if (!res.ok) throw new Error("Upload thất bại.");
      msg.textContent = "✓ Đã gửi cho khách!";
      loadList();
    } catch (err) {
      msg.textContent = err.message;
    }
  };
  reader.readAsDataURL(file);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
