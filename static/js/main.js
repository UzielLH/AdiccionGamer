/* ═══════════════════════════════════════════════════════════
   🧠 IA Predictora — Riesgo de Adicción Gamer (Frontend JS)
   ═══════════════════════════════════════════════════════════ */

// ── Estado global ────────────────────────────────────────
let modeloCargado = false;

// ── Partículas de fondo ──────────────────────────────────
(function crearParticulas() {
  const container = document.getElementById("particles");
  if (!container) return;
  const colores = ["#6c5ce7", "#00cec9", "#a29bfe", "#00b894", "#fd79a8"];
  for (let i = 0; i < 35; i++) {
    const p = document.createElement("div");
    p.classList.add("particle");
    const size = Math.random() * 6 + 2;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "%";
    p.style.background = colores[Math.floor(Math.random() * colores.length)];
    p.style.animationDuration = Math.random() * 20 + 15 + "s";
    p.style.animationDelay = Math.random() * 15 + "s";
    container.appendChild(p);
  }
})();

// ══════════════════════════════════════════════════════════
// VERIFICAR ESTADO DEL MODELO AL CARGAR
// ══════════════════════════════════════════════════════════
(async function verificarEstado() {
  try {
    const res = await fetch("/api/estado");
    const data = await res.json();
    actualizarBadge(data.modelo_cargado, data.modelo_nombre, data.scaler_cargado);
  } catch {
    actualizarBadge(false, "Error de conexión", false);
  }
})();

function actualizarBadge(cargado, nombre, scalerOk) {
  const dot = document.getElementById("badgeDot");
  const texto = document.getElementById("badgeTexto");
  const uploadCard = document.getElementById("uploadCard");

  modeloCargado = cargado;

  if (cargado) {
    dot.className = "badge-dot active";
    let label = "Modelo activo: " + nombre;
    if (scalerOk) label += " · Scaler ✓";
    texto.textContent = label;
    uploadCard.classList.add("modelo-activo");
  } else {
    dot.className = "badge-dot inactive";
    texto.textContent = "Sin modelo — sube uno para comenzar";
    uploadCard.classList.remove("modelo-activo");
  }
}

// ══════════════════════════════════════════════════════════
// UPLOAD DE MODELO
// ══════════════════════════════════════════════════════════
const formUpload = document.getElementById("formUpload");
const btnUpload = document.getElementById("btnUpload");
const inputModelo = document.getElementById("archivoModelo");
const inputConfig = document.getElementById("archivoConfig");
const dropzoneModelo = document.getElementById("dropzoneModelo");
const dropzoneConfig = document.getElementById("dropzoneConfig");

// Mostrar nombre de archivo seleccionado
inputModelo.addEventListener("change", () => {
  const name = inputModelo.files[0]?.name || "Ningún archivo seleccionado";
  document.getElementById("nombreModelo").textContent = name;
  dropzoneModelo.classList.toggle("has-file", inputModelo.files.length > 0);
  btnUpload.disabled = inputModelo.files.length === 0;
});

inputConfig.addEventListener("change", () => {
  const name = inputConfig.files[0]?.name || "Ningún archivo seleccionado";
  document.getElementById("nombreConfig").textContent = name;
  dropzoneConfig.classList.toggle("has-file", inputConfig.files.length > 0);
});

// Drag & drop visual feedback
[dropzoneModelo, dropzoneConfig].forEach((dz) => {
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("dragover");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
  dz.addEventListener("drop", () => dz.classList.remove("dragover"));
});

// Enviar modelo
formUpload.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!inputModelo.files[0]) return;

  btnUpload.classList.add("loading");
  const resultDiv = document.getElementById("uploadResult");
  resultDiv.classList.add("hidden");

  const fd = new FormData();
  fd.append("modelo", inputModelo.files[0]);
  if (inputConfig.files[0]) {
    fd.append("config", inputConfig.files[0]);
  }

  try {
    const res = await fetch("/api/cargar-modelo", { method: "POST", body: fd });
    const data = await res.json();

    resultDiv.classList.remove("hidden", "success", "error");

    if (data.ok) {
      resultDiv.classList.add("success");
      document.getElementById("uploadResultIcon").textContent = "✅";
      document.getElementById("uploadResultText").textContent = data.message;
      actualizarBadge(true, data.modelo_nombre, data.scaler_cargado);
    } else {
      resultDiv.classList.add("error");
      document.getElementById("uploadResultIcon").textContent = "❌";
      document.getElementById("uploadResultText").textContent = data.error;
    }
  } catch (err) {
    const resultDiv = document.getElementById("uploadResult");
    resultDiv.classList.remove("hidden", "success", "error");
    resultDiv.classList.add("error");
    document.getElementById("uploadResultIcon").textContent = "❌";
    document.getElementById("uploadResultText").textContent = "Error de conexión: " + err.message;
  } finally {
    btnUpload.classList.remove("loading");
  }
});

// ══════════════════════════════════════════════════════════
// FORMULARIO DE PREDICCIÓN
// ══════════════════════════════════════════════════════════
const form = document.getElementById("formPrediccion");
const btn = document.getElementById("btnPredecir");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!modeloCargado) {
    alert("⚠️ No hay modelo cargado.\nPor favor sube un archivo .keras primero.");
    document.getElementById("uploadSection").scrollIntoView({ behavior: "smooth" });
    return;
  }

  btn.classList.add("loading");

  // Recopilar datos del formulario
  const formData = new FormData(form);
  const datos = {};
  for (const [key, value] of formData.entries()) {
    datos[key] = parseFloat(value);
  }

  try {
    const res = await fetch("/api/predecir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    const json = await res.json();

    if (!json.ok) {
      alert("Error: " + (json.error || "Respuesta inesperada del servidor."));
      return;
    }

    mostrarResultados(json);
  } catch (err) {
    alert("No se pudo conectar con el servidor.\n" + err.message);
  } finally {
    btn.classList.remove("loading");
  }
});

// ── Presets ───────────────────────────────────────────────
async function cargarPreset(nombre) {
  try {
    const res = await fetch("/api/presets/" + nombre);
    const json = await res.json();
    if (!json.ok) return;

    const datos = json.datos;
    for (const [key, value] of Object.entries(datos)) {
      const el = document.getElementById(key);
      if (el) el.value = value;
    }

    // Efecto visual: flash en las tarjetas
    document.querySelectorAll(".card").forEach((card) => {
      card.style.borderColor = "rgba(108, 92, 231, 0.5)";
      setTimeout(() => (card.style.borderColor = ""), 600);
    });
  } catch (err) {
    console.error("Error cargando preset:", err);
  }
}

// ══════════════════════════════════════════════════════════
// MOSTRAR RESULTADOS
// ══════════════════════════════════════════════════════════
function mostrarResultados(data) {
  const container = document.getElementById("resultados");
  container.classList.remove("hidden");

  // Scroll suave hacia los resultados
  setTimeout(() => container.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  // ── Scores ──
  const addScore = data.addiction_score;
  const hapScore = data.happiness_score;

  animarNumero("addictionScore", addScore, "/10");
  animarNumero("happinessScore", hapScore, "/10");

  // ── Barras ──
  setTimeout(() => {
    document.getElementById("addictionBar").style.width = (addScore / 10) * 100 + "%";
    document.getElementById("happinessBar").style.width = (hapScore / 10) * 100 + "%";
  }, 200);

  // ── Categoría adicción ──
  const catAdd = document.getElementById("addictionCategory");
  catAdd.textContent = data.riesgo.emoji + " " + data.riesgo.nivel;
  catAdd.style.color = data.riesgo.color;

  // ── Categoría bienestar ──
  const catHap = document.getElementById("happinessCategory");
  if (data.bienestar) {
    catHap.textContent = data.bienestar.emoji + " " + data.bienestar.nivel;
    catHap.style.color = data.bienestar.color;
  } else {
    if (hapScore >= 7) {
      catHap.textContent = "🟢 Saludable";
      catHap.style.color = "#00b894";
    } else if (hapScore >= 5) {
      catHap.textContent = "🟡 Aceptable";
      catHap.style.color = "#fdcb6e";
    } else if (hapScore >= 3) {
      catHap.textContent = "🟠 En riesgo";
      catHap.style.color = "#e17055";
    } else {
      catHap.textContent = "🔴 Preocupante";
      catHap.style.color = "#d63031";
    }
  }

  // ── Glow en tarjetas ──
  const cardAdd = document.getElementById("cardAddiction");
  const cardHap = document.getElementById("cardHappiness");
  cardAdd.className = "result-card result-addiction " + glowClass(addScore, true);
  cardHap.className = "result-card result-happiness " + glowClass(hapScore, false);

  // ── Gauges ──
  dibujarGauge("gaugeAddiction", addScore, true);
  dibujarGauge("gaugeHappiness", hapScore, false);

  // ── Recomendaciones ──
  const lista = document.getElementById("listaRecomendaciones");
  lista.innerHTML = "";
  data.recomendaciones.forEach((rec, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = i * 0.1 + "s";
    li.innerHTML = `<span class="rec-icon">${rec.icono}</span><span>${rec.texto}</span>`;
    lista.appendChild(li);
  });
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function glowClass(score, isAddiction) {
  if (isAddiction) {
    if (score < 2.5) return "glow-green";
    if (score < 5)   return "glow-yellow";
    if (score < 7.5) return "glow-orange";
    return "glow-red";
  } else {
    if (score >= 7) return "glow-green";
    if (score >= 5) return "glow-yellow";
    if (score >= 3) return "glow-orange";
    return "glow-red";
  }
}

function animarNumero(elementId, target, suffix) {
  const el = document.getElementById(elementId);
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = (eased * target).toFixed(2);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Gauge semicircular (Canvas) ──────────────────────────
function dibujarGauge(canvasId, valor, isAddiction) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H - 10;
  const radius = 85;
  const lineWidth = 14;

  ctx.clearRect(0, 0, W, H);

  // Fondo del arco
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0, false);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  // Degradado del arco
  const pct = Math.min(Math.max(valor / 10, 0), 1);
  const endAngle = Math.PI + pct * Math.PI;

  let gradient;
  if (isAddiction) {
    gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0, "#00b894");
    gradient.addColorStop(0.4, "#fdcb6e");
    gradient.addColorStop(0.7, "#e17055");
    gradient.addColorStop(1, "#d63031");
  } else {
    gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0, "#d63031");
    gradient.addColorStop(0.3, "#e17055");
    gradient.addColorStop(0.6, "#fdcb6e");
    gradient.addColorStop(1, "#00b894");
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, endAngle, false);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  // Aguja
  const needleAngle = Math.PI + pct * Math.PI;
  const needleLen = radius - 25;
  const nx = cx + Math.cos(needleAngle) * needleLen;
  const ny = cy + Math.sin(needleAngle) * needleLen;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Círculo central
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Texto del valor
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "bold 22px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(valor.toFixed(1), cx, cy - 22);
}
