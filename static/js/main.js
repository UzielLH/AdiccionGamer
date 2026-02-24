/* ═══════════════════════════════════════════════════════════
   IA Predictora — Riesgo de Adicción Gamer (Frontend JS v2)
   Enhanced UX: toasts, scroll animations, range sync, etc.
   ═══════════════════════════════════════════════════════════ */

// ── Estado global ────────────────────────────────────────
let modeloCargado = false;

// ══════════════════════════════════════════════════════════
// PARTÍCULAS DE FONDO
// ══════════════════════════════════════════════════════════
(function crearParticulas() {
  const container = document.getElementById("particles");
  if (!container) return;
  const colores = ["#6c5ce7", "#00cec9", "#a29bfe", "#00b894", "#fd79a8"];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.classList.add("particle");
    const size = Math.random() * 5 + 2;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "%";
    p.style.background = colores[Math.floor(Math.random() * colores.length)];
    p.style.animationDuration = Math.random() * 25 + 15 + "s";
    p.style.animationDelay = Math.random() * 15 + "s";
    container.appendChild(p);
  }
})();

// ══════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ══════════════════════════════════════════════════════════
function showToast(message, type = "info", duration = 3800) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "💡" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

// ══════════════════════════════════════════════════════════
// SCROLL REVEAL (Intersection Observer)
// ══════════════════════════════════════════════════════════
(function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
})();

// ══════════════════════════════════════════════════════════
// HEADER SCROLL EFFECT + ACTIVE NAV
// ══════════════════════════════════════════════════════════
(function initHeader() {
  const header = document.getElementById("header");
  const backToTop = document.getElementById("backToTop");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = ["heroSection", "uploadSection", "mainContent", "aboutSection"];

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;

    // Sticky header shadow
    if (scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }

    // Back to top button
    if (scrollY > 400) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }

    // Active nav link
    let currentSection = sections[0];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.offsetTop - 120 <= scrollY) {
        currentSection = id;
      }
    }
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.section === currentSection);
    });
  });

  // Back to top click
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();

// ══════════════════════════════════════════════════════════
// HERO STATS COUNTER ANIMATION
// ══════════════════════════════════════════════════════════
(function initCounters() {
  const counters = document.querySelectorAll(".stat-num[data-count]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          animateCounter(el, target);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((c) => observer.observe(c));

  function animateCounter(el, target) {
    const duration = 1500;
    const start = performance.now();
    const format = target >= 1000;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      if (format && current >= 1000) {
        el.textContent = Math.round(current / 1000) + "K+";
      } else {
        el.textContent = current;
      }

      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
})();

// ══════════════════════════════════════════════════════════
// RANGE SLIDER ↔ NUMBER INPUT SYNC
// ══════════════════════════════════════════════════════════
(function initRangeSync() {
  document.querySelectorAll(".range-slider").forEach((slider) => {
    const targetId = slider.dataset.sync;
    const numInput = document.getElementById(targetId);
    if (!numInput) return;

    slider.addEventListener("input", () => {
      numInput.value = slider.value;
    });

    numInput.addEventListener("input", () => {
      slider.value = numInput.value;
    });
  });
})();

// ══════════════════════════════════════════════════════════
// FORM PROGRESS STEPS
// ══════════════════════════════════════════════════════════
function irASeccion(stepNum) {
  const target = document.querySelector(`.form-step[data-step="${stepNum}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  actualizarProgreso(stepNum);
}

function actualizarProgreso(activeStep) {
  const steps = document.querySelectorAll(".progress-steps .step");
  const fill = document.getElementById("progressFill");
  const totalSteps = steps.length;

  steps.forEach((step) => {
    const num = parseInt(step.dataset.step, 10);
    step.classList.remove("active", "completed");
    if (num < activeStep) {
      step.classList.add("completed");
    } else if (num === activeStep) {
      step.classList.add("active");
    }
  });

  if (fill) {
    fill.style.width = ((activeStep / totalSteps) * 100) + "%";
  }
}

// Track scroll position to update progress
(function initProgressTracking() {
  const formSteps = document.querySelectorAll(".form-step");
  if (!formSteps.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const step = parseInt(entry.target.dataset.step, 10);
          actualizarProgreso(step);
        }
      });
    },
    { threshold: 0.4, rootMargin: "-10% 0px -40% 0px" }
  );

  formSteps.forEach((el) => observer.observe(el));
})();

// ══════════════════════════════════════════════════════════
// VERIFICAR ESTADO DEL MODELO
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
    texto.textContent = "Sin modelo — sube uno";
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

// File selection feedback
inputModelo.addEventListener("change", () => {
  const name = inputModelo.files[0]?.name || "Sin archivo";
  document.getElementById("nombreModelo").textContent = name;
  dropzoneModelo.classList.toggle("has-file", inputModelo.files.length > 0);
  btnUpload.disabled = inputModelo.files.length === 0;
});

inputConfig.addEventListener("change", () => {
  const name = inputConfig.files[0]?.name || "Sin archivo";
  document.getElementById("nombreConfig").textContent = name;
  dropzoneConfig.classList.toggle("has-file", inputConfig.files.length > 0);
});

// Drag & drop visual
[dropzoneModelo, dropzoneConfig].forEach((dz) => {
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragover"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
  dz.addEventListener("drop", () => dz.classList.remove("dragover"));
});

// Submit model upload
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
      showToast("Modelo cargado correctamente", "success");
    } else {
      resultDiv.classList.add("error");
      document.getElementById("uploadResultIcon").textContent = "❌";
      document.getElementById("uploadResultText").textContent = data.error;
      showToast(data.error, "error");
    }
  } catch (err) {
    resultDiv.classList.remove("hidden", "success", "error");
    resultDiv.classList.add("error");
    document.getElementById("uploadResultIcon").textContent = "❌";
    document.getElementById("uploadResultText").textContent = "Error de conexión: " + err.message;
    showToast("Error de conexión", "error");
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
    showToast("No hay modelo cargado. Sube un archivo .keras primero.", "warning");
    document.getElementById("uploadSection").scrollIntoView({ behavior: "smooth" });
    return;
  }

  btn.classList.add("loading");

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
      showToast(json.error || "Respuesta inesperada del servidor.", "error");
      return;
    }

    mostrarResultados(json);
    showToast("Análisis completado", "success");
  } catch (err) {
    showToast("No se pudo conectar con el servidor.", "error");
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
      if (el) {
        el.value = value;
        // Also sync range sliders
        const range = document.querySelector(`.range-slider[data-sync="${key}"]`);
        if (range) range.value = value;
      }
    }

    // Visual flash on cards
    document.querySelectorAll(".card").forEach((card) => {
      card.style.borderColor = "rgba(108, 92, 231, 0.4)";
      card.style.boxShadow = "0 0 20px rgba(108, 92, 231, 0.1)";
      setTimeout(() => {
        card.style.borderColor = "";
        card.style.boxShadow = "";
      }, 700);
    });

    showToast(`Perfil "${nombre}" cargado`, "info");
  } catch (err) {
    showToast("Error cargando preset", "error");
  }
}

// ══════════════════════════════════════════════════════════
// MOSTRAR RESULTADOS
// ══════════════════════════════════════════════════════════
function mostrarResultados(data) {
  const container = document.getElementById("resultados");
  container.classList.remove("hidden");

  setTimeout(() => container.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  const addScore = data.addiction_score;
  const hapScore = data.happiness_score;
  const analisis = data.analisis || {};

  animarNumero("addictionScore", addScore, "/10");
  animarNumero("happinessScore", hapScore, "/10");

  setTimeout(() => {
    document.getElementById("addictionBar").style.width = (addScore / 10) * 100 + "%";
    document.getElementById("happinessBar").style.width = (hapScore / 10) * 100 + "%";
  }, 200);

  // Categoría adicción
  const catAdd = document.getElementById("addictionCategory");
  catAdd.textContent = data.riesgo.emoji + " " + data.riesgo.nivel;
  catAdd.style.color = data.riesgo.color;

  // Categoría bienestar
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

  // Glow cards
  const cardAdd = document.getElementById("cardAddiction");
  const cardHap = document.getElementById("cardHappiness");
  cardAdd.className = "result-card result-addiction " + glowClass(addScore, true);
  cardHap.className = "result-card result-happiness " + glowClass(hapScore, false);

  // Gauges
  dibujarGauge("gaugeAddiction", addScore, true);
  dibujarGauge("gaugeHappiness", hapScore, false);

  // ── Alerta crítica ──
  const alertaEl = document.getElementById("alertaCritica");
  if (analisis.alerta) {
    document.getElementById("alertaTitulo").textContent = analisis.alerta.titulo;
    document.getElementById("alertaMensaje").textContent = analisis.alerta.mensaje;
    alertaEl.classList.remove("hidden");
  } else {
    alertaEl.classList.add("hidden");
  }

  // ── Resumen general ──
  if (analisis.resumen) {
    const resumenCard = document.getElementById("resumenGeneral");
    document.getElementById("resumenEmoji").textContent = analisis.resumen.emoji;
    document.getElementById("resumenTitulo").textContent = analisis.resumen.titulo;
    document.getElementById("resumenMensaje").textContent = analisis.resumen.mensaje;
    resumenCard.className = "resumen-card tipo-" + analisis.resumen.tipo;
  }

  // ── Observaciones ──
  const obsContainer = document.getElementById("listaObservaciones");
  const obsSection = document.getElementById("seccionObservaciones");
  obsContainer.innerHTML = "";
  if (analisis.observaciones && analisis.observaciones.length > 0) {
    analisis.observaciones.forEach((obs, i) => {
      const div = document.createElement("div");
      div.className = "obs-item sev-" + obs.severidad;
      div.style.animationDelay = i * 0.1 + "s";
      div.innerHTML = `
        <span class="obs-icon">${obs.icono}</span>
        <div class="obs-body">
          <div class="obs-area">${obs.area}</div>
          <div class="obs-texto">${obs.texto}</div>
        </div>`;
      obsContainer.appendChild(div);
    });
    obsSection.classList.remove("hidden");
  } else {
    obsSection.classList.add("hidden");
  }

  // ── Consejos categorizados ──
  renderConsejos("seccionInmediatos", "listaInmediatos", analisis.consejos?.inmediatos);
  renderConsejos("seccionHabitos", "listaHabitos", analisis.consejos?.habitos);
  renderConsejos("seccionBienestar", "listaBienestar", analisis.consejos?.bienestar);

  // ── Recursos profesionales ──
  const recursosContainer = document.getElementById("listaRecursos");
  const recursosSection = document.getElementById("seccionRecursos");
  recursosContainer.innerHTML = "";
  if (analisis.recursos && analisis.recursos.length > 0) {
    analisis.recursos.forEach((rec, i) => {
      const div = document.createElement("div");
      div.className = "recurso-card";
      div.style.animationDelay = i * 0.08 + "s";

      const tipoLabels = { linea: "Línea de ayuda", terapia: "Terapia", recurso: "Recurso" };
      div.innerHTML = `
        <span class="recurso-icon">${rec.icono}</span>
        <div class="recurso-body">
          <span class="recurso-tipo tipo-${rec.tipo}">${tipoLabels[rec.tipo] || rec.tipo}</span>
          <div class="recurso-nombre">${rec.nombre}</div>
          <div class="recurso-detalle">${rec.detalle}</div>
        </div>`;
      recursosContainer.appendChild(div);
    });
    recursosSection.classList.remove("hidden");
  } else {
    recursosSection.classList.add("hidden");
  }
}

// ── Helper: Render lista de consejos en una sección ──────
function renderConsejos(sectionId, listaId, items) {
  const section = document.getElementById(sectionId);
  const lista = document.getElementById(listaId);
  lista.innerHTML = "";
  if (items && items.length > 0) {
    items.forEach((item, i) => {
      const li = document.createElement("li");
      li.style.animationDelay = i * 0.1 + "s";
      li.innerHTML = `<span class="rec-icon">${item.icono}</span><span>${item.texto}</span>`;
      lista.appendChild(li);
    });
    section.classList.remove("hidden");
  } else {
    section.classList.add("hidden");
  }
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

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0, false);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();

  // Gradient arc
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

  // Needle
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

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Value text
  ctx.fillStyle = "#eaeaf5";
  ctx.font = "bold 22px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(valor.toFixed(1), cx, cy - 22);
}
