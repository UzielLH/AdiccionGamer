"""
🧠 IA Predictora de Riesgo de Adicción Gamer — Backend Flask
Permite cargar un modelo .keras y su configuración .pkl desde la
interfaz web, y ofrece predicciones vía API REST.
"""

import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

# ── TensorFlow / Keras (silenciar logs informativos) ──────────────
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf
try:
    import keras
except ImportError:
    import tensorflow.keras as keras

# ══════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE RUTAS
# ══════════════════════════════════════════════════════════════════
APP_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ══════════════════════════════════════════════════════════════════
# COLUMNAS DE FEATURES (orden exacto del entrenamiento)
# ══════════════════════════════════════════════════════════════════
FEATURE_COLUMNS = [
    # --- Hábitos de Juego ---
    "daily_gaming_hours", "weekly_sessions", "years_gaming",
    "multiplayer_ratio", "night_gaming_ratio", "weekend_gaming_hours",
    "mobile_gaming_ratio", "violent_games_ratio", "toxic_exposure",
    "streaming_hours", "esports_interest", "microtransactions_spending",
    "competitive_rank",
    # --- Sueño y Salud Física ---
    "sleep_hours", "caffeine_intake", "exercise_hours",
    "bmi", "screen_time_total", "eye_strain_score", "back_pain_score",
    # --- Interacción Social ---
    "social_interaction_score", "relationship_satisfaction",
    "friends_gaming_count", "online_friends", "loneliness_score",
    # --- Salud Mental ---
    "stress_level", "anxiety_score", "depression_score", "aggression_score",
    # --- Demográficos ---
    "age", "gender_encoded", "income",
    # --- Otros ---
    "academic_performance", "work_productivity",
    "parental_supervision", "headset_usage", "internet_quality",
]

# ══════════════════════════════════════════════════════════════════
# ESTADO GLOBAL DEL MODELO
# ══════════════════════════════════════════════════════════════════
modelo = None
scaler = None
modelo_nombre = None


def _intentar_carga_inicial():
    """Intenta cargar modelo y config si existen en uploads/ o en la raíz."""
    global modelo, scaler, modelo_nombre

    # Buscar en uploads/ primero, luego en la raíz del proyecto
    rutas_modelo = [
        os.path.join(UPLOAD_FOLDER, "modelo_gamer_risk.keras"),
        os.path.join(APP_DIR, "modelo_gamer_risk.keras"),
    ]
    rutas_config = [
        os.path.join(UPLOAD_FOLDER, "modelo_gamer_config.pkl"),
        os.path.join(APP_DIR, "modelo_gamer_config.pkl"),
    ]

    ruta_modelo_found = None
    ruta_config_found = None

    for ruta in rutas_modelo:
        if os.path.isfile(ruta):
            ruta_modelo_found = ruta
            break

    for ruta in rutas_config:
        if os.path.isfile(ruta):
            ruta_config_found = ruta
            break

    if ruta_modelo_found:
        try:
            modelo = keras.models.load_model(ruta_modelo_found)
            modelo_nombre = os.path.basename(ruta_modelo_found)
            print(f"✅ Modelo cargado: {ruta_modelo_found}")
        except Exception as e:
            print(f"⚠️  No se pudo cargar el modelo: {e}")

    if ruta_config_found:
        try:
            with open(ruta_config_found, "rb") as f:
                config = pickle.load(f)
            scaler = config.get("scaler", None)
            print(f"✅ Configuración cargada: {ruta_config_found}")
        except Exception as e:
            print(f"⚠️  No se pudo cargar la configuración: {e}")


_intentar_carga_inicial()

# ══════════════════════════════════════════════════════════════════
# FLASK APP
# ══════════════════════════════════════════════════════════════════
app = Flask(
    __name__,
    template_folder=os.path.join(APP_DIR, "templates"),
    static_folder=os.path.join(APP_DIR, "static"),
)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB max


# ── Helpers ───────────────────────────────────────────────────────
def clasificar_riesgo(score: float) -> dict:
    """Clasifica un score de adicción en categoría + color."""
    if score < 2.5:
        return {"nivel": "Bajo", "emoji": "🟢", "color": "#2ecc71", "clase": "bajo"}
    elif score < 5.0:
        return {"nivel": "Moderado", "emoji": "🟡", "color": "#f1c40f", "clase": "moderado"}
    elif score < 7.5:
        return {"nivel": "Alto", "emoji": "🟠", "color": "#e67e22", "clase": "alto"}
    else:
        return {"nivel": "Crítico", "emoji": "🔴", "color": "#e74c3c", "clase": "critico"}


def clasificar_bienestar(score: float) -> dict:
    """Clasifica un score de bienestar en categoría + color."""
    if score >= 7:
        return {"nivel": "Saludable", "emoji": "🟢", "color": "#00b894", "clase": "saludable"}
    elif score >= 5:
        return {"nivel": "Aceptable", "emoji": "🟡", "color": "#fdcb6e", "clase": "aceptable"}
    elif score >= 3:
        return {"nivel": "En riesgo", "emoji": "🟠", "color": "#e17055", "clase": "en-riesgo"}
    else:
        return {"nivel": "Preocupante", "emoji": "🔴", "color": "#d63031", "clase": "preocupante"}


def generar_respuesta_completa(addiction: float, happiness: float, datos: dict) -> dict:
    """
    Genera una respuesta completa con análisis detallado, consejos categorizados,
    observaciones basadas en los inputs, y recursos profesionales si aplica.
    """

    # ── 1. Resumen general ────────────────────────────────────────
    if addiction <= 3 and happiness >= 7:
        resumen = {
            "titulo": "Perfil Saludable",
            "emoji": "🌟",
            "mensaje": "Tu relación con los videojuegos parece equilibrada y saludable. "
                       "Tus indicadores de bienestar son positivos. ¡Sigue así!",
            "tipo": "positivo",
        }
    elif addiction <= 5 and happiness >= 5:
        resumen = {
            "titulo": "Perfil Moderado",
            "emoji": "👍",
            "mensaje": "Tu nivel de gaming está dentro de un rango aceptable, pero hay algunas áreas "
                       "donde podrías mejorar. Revisa las observaciones y consejos abajo.",
            "tipo": "moderado",
        }
    elif addiction <= 7.5:
        resumen = {
            "titulo": "Perfil de Riesgo",
            "emoji": "⚠️",
            "mensaje": "Se detectaron patrones que sugieren un riesgo elevado de adicción. "
                       "Es importante que tomes acciones para equilibrar tu vida digital y personal.",
            "tipo": "riesgo",
        }
    else:
        resumen = {
            "titulo": "Perfil Crítico — Atención Necesaria",
            "emoji": "🚨",
            "mensaje": "Los indicadores muestran un nivel crítico de riesgo de adicción. "
                       "Se recomienda encarecidamente buscar apoyo profesional. "
                       "Más abajo encontrarás recursos de ayuda.",
            "tipo": "critico",
        }

    # ── 2. Observaciones basadas en los datos de entrada ──────────
    observaciones = []

    # Horas de juego
    horas = datos.get("daily_gaming_hours", 3)
    if horas >= 8:
        observaciones.append({
            "icono": "🎮", "area": "Tiempo de Juego",
            "texto": f"Juegas {horas:.0f} horas diarias, muy por encima del promedio saludable (2-3h). "
                     "Esto impacta directamente tu sueño, productividad y salud social.",
            "severidad": "alta",
        })
    elif horas >= 5:
        observaciones.append({
            "icono": "🎮", "area": "Tiempo de Juego",
            "texto": f"Tus {horas:.0f} horas diarias de juego son considerables. Considera reducirlas gradualmente.",
            "severidad": "media",
        })

    # Sueño
    sueno = datos.get("sleep_hours", 7)
    if sueno < 5:
        observaciones.append({
            "icono": "😴", "area": "Sueño",
            "texto": f"Solo duermes {sueno:.1f} horas. La privación crónica de sueño afecta la concentración, "
                     "la salud mental y aumenta la irritabilidad. El mínimo recomendado son 7 horas.",
            "severidad": "alta",
        })
    elif sueno < 6.5:
        observaciones.append({
            "icono": "😴", "area": "Sueño",
            "texto": f"Con {sueno:.1f} horas de sueño, estás por debajo del rango saludable (7-9h). "
                     "Intenta acostarte más temprano.",
            "severidad": "media",
        })

    # Juego nocturno
    noche = datos.get("night_gaming_ratio", 0.3)
    if noche >= 0.7:
        observaciones.append({
            "icono": "🌙", "area": "Gaming Nocturno",
            "texto": f"El {noche*100:.0f}% de tu juego es nocturno. Esto altera el ritmo circadiano "
                     "y la calidad del sueño, generando un ciclo de fatiga y dependencia.",
            "severidad": "alta",
        })

    # Ejercicio
    ejercicio = datos.get("exercise_hours", 2)
    if ejercicio < 1:
        observaciones.append({
            "icono": "💪", "area": "Actividad Física",
            "texto": f"Solo realizas {ejercicio:.1f}h de ejercicio semanal. La OMS recomienda al menos 2.5h. "
                     "El sedentarismo aumenta riesgos de salud física y mental.",
            "severidad": "alta",
        })
    elif ejercicio < 2:
        observaciones.append({
            "icono": "💪", "area": "Actividad Física",
            "texto": "Tu nivel de ejercicio está algo bajo. Intenta incorporar más actividad en tu rutina.",
            "severidad": "media",
        })

    # Social
    social = datos.get("social_interaction_score", 5)
    loneliness = datos.get("loneliness_score", 4)
    if social <= 3 or loneliness >= 7:
        observaciones.append({
            "icono": "👥", "area": "Vida Social",
            "texto": "Tu interacción social presencial es muy baja y tu nivel de soledad es alto. "
                     "El aislamiento social es un factor de riesgo importante para la depresión.",
            "severidad": "alta",
        })
    elif social <= 5 and loneliness >= 5:
        observaciones.append({
            "icono": "👥", "area": "Vida Social",
            "texto": "Podrías beneficiarte de más tiempo con amigos y familia fuera del mundo digital.",
            "severidad": "media",
        })

    # Estrés / Ansiedad / Depresión
    estres = datos.get("stress_level", 5)
    ansiedad = datos.get("anxiety_score", 4)
    depresion = datos.get("depression_score", 3)

    if depresion >= 7:
        observaciones.append({
            "icono": "🧠", "area": "Salud Mental",
            "texto": f"Tu puntuación de depresión ({depresion:.1f}/10) es preocupante. "
                     "Esto puede estar relacionado o agravado por hábitos de gaming excesivo. "
                     "Considera hablar con un profesional de salud mental.",
            "severidad": "alta",
        })
    elif depresion >= 5:
        observaciones.append({
            "icono": "🧠", "area": "Salud Mental",
            "texto": f"Tu nivel de depresión ({depresion:.1f}/10) merece atención. "
                     "Practicar actividades fuera del gaming puede ayudar.",
            "severidad": "media",
        })

    if ansiedad >= 7:
        observaciones.append({
            "icono": "😰", "area": "Ansiedad",
            "texto": f"Tu ansiedad es alta ({ansiedad:.1f}/10). Técnicas de respiración, meditación "
                     "y ejercicio regular pueden ayudar a reducirla.",
            "severidad": "alta",
        })

    if estres >= 7:
        observaciones.append({
            "icono": "🔥", "area": "Estrés",
            "texto": f"Tu nivel de estrés ({estres:.1f}/10) es elevado. Identifica las fuentes principales "
                     "de estrés y busca formas de gestionarlas.",
            "severidad": "media",
        })

    # Gasto
    gasto = datos.get("microtransactions_spending", 300)
    if gasto >= 1000:
        observaciones.append({
            "icono": "💸", "area": "Gasto en Gaming",
            "texto": f"Gastas ${gasto:.0f} en microtransacciones, lo cual es un gasto significativo. "
                     "Establece un presupuesto mensual fijo y revísalo.",
            "severidad": "alta",
        })
    elif gasto >= 500:
        observaciones.append({
            "icono": "💸", "area": "Gasto en Gaming",
            "texto": f"Con ${gasto:.0f} en microtransacciones, controla que no afecte tu economía personal.",
            "severidad": "media",
        })

    # Cafeína
    cafeina = datos.get("caffeine_intake", 2)
    if cafeina >= 5:
        observaciones.append({
            "icono": "☕", "area": "Cafeína",
            "texto": f"Consumes {cafeina:.0f} bebidas con cafeína al día. Esto puede alterar tu sueño "
                     "y aumentar la ansiedad. Intenta reducir gradualmente.",
            "severidad": "media",
        })

    # Dolor de espalda / Fatiga visual
    espalda = datos.get("back_pain_score", 4)
    ojos = datos.get("eye_strain_score", 5)
    if espalda >= 7 or ojos >= 7:
        observaciones.append({
            "icono": "🩺", "area": "Salud Física",
            "texto": "Presentas molestias físicas importantes (espalda y/o ojos). "
                     "Toma descansos cada 45 min, ajusta tu postura y la iluminación.",
            "severidad": "media",
        })

    # ── 3. Consejos categorizados ─────────────────────────────────
    consejos_inmediatos = []
    consejos_habitos = []
    consejos_bienestar = []

    # Inmediatos (cosas que se pueden hacer hoy)
    if horas >= 5:
        consejos_inmediatos.append({
            "icono": "⏱️",
            "texto": "Configura una alarma para limitar tus sesiones de juego a máximo 2 horas seguidas.",
        })
    if noche >= 0.5:
        consejos_inmediatos.append({
            "icono": "🌅",
            "texto": "Establece una hora límite (ej: 10 PM) para dejar de jugar y prepararte para dormir.",
        })
    if sueno < 7:
        consejos_inmediatos.append({
            "icono": "📱",
            "texto": "Activa el modo «No molestar» en tus dispositivos 1 hora antes de dormir.",
        })
    if ejercicio < 2:
        consejos_inmediatos.append({
            "icono": "🚶",
            "texto": "Sal a caminar 20 minutos hoy. Pequeños pasos generan grandes cambios.",
        })
    if cafeina >= 4:
        consejos_inmediatos.append({
            "icono": "🍵",
            "texto": "Sustituye una de tus bebidas con cafeína por agua o té sin cafeína.",
        })

    # Hábitos a largo plazo
    if addiction > 5:
        consejos_habitos.append({
            "icono": "📋",
            "texto": "Lleva un diario de tiempo de juego semanal y fija metas de reducción graduales (10% por semana).",
        })
        consejos_habitos.append({
            "icono": "🎨",
            "texto": "Busca un hobby alternativo que disfrutes (deporte, arte, música, lectura) para reemplazar horas de gaming.",
        })
    if social <= 5:
        consejos_habitos.append({
            "icono": "📅",
            "texto": "Agenda al menos 2 actividades sociales presenciales por semana (comidas, paseos, deporte).",
        })
    if estres >= 5 or ansiedad >= 5:
        consejos_habitos.append({
            "icono": "🧘",
            "texto": "Incorpora 10 minutos diarios de meditación o respiración consciente. Apps como Calm o Headspace pueden ayudar.",
        })
    if ejercicio < 2.5:
        consejos_habitos.append({
            "icono": "🏃",
            "texto": "Haz ejercicio moderado al menos 150 minutos por semana (caminar, nadar, bicicleta).",
        })
    consejos_habitos.append({
        "icono": "🍎",
        "texto": "Mantén una alimentación balanceada y horarios regulares de comida — tu cerebro lo agradecerá.",
    })
    if horas >= 5:
        consejos_habitos.append({
            "icono": "📵",
            "texto": "Designa «días sin gaming» (1-2 por semana) para reconectar con otras actividades.",
        })

    # Bienestar emocional
    if happiness < 5:
        consejos_bienestar.append({
            "icono": "📝",
            "texto": "Escribe cada noche 3 cosas positivas que te pasaron en el día. Esto entrena la mente hacia lo positivo.",
        })
        consejos_bienestar.append({
            "icono": "🌿",
            "texto": "Pasa tiempo en la naturaleza. Estudios muestran que 20 minutos al aire libre reducen el cortisol.",
        })
    if depresion >= 5 or ansiedad >= 5:
        consejos_bienestar.append({
            "icono": "🗣️",
            "texto": "Habla de cómo te sientes con alguien de confianza. Expresar emociones es el primer paso para gestionarlas.",
        })
    if loneliness >= 6:
        consejos_bienestar.append({
            "icono": "🤝",
            "texto": "Busca comunidades o grupos de interés en tu localidad. Pertenecer a un grupo reduce la soledad.",
        })
    consejos_bienestar.append({
        "icono": "💤",
        "texto": "Respeta tu ciclo de sueño. Dormir 7-9 horas es la base del bienestar emocional.",
    })

    # Si perfil saludable, dar refuerzo positivo
    if addiction <= 3 and happiness >= 7:
        consejos_inmediatos = [
            {"icono": "✅", "texto": "¡Tus hábitos actuales son excelentes! Mantén tu rutina de sueño y ejercicio."},
            {"icono": "🎉", "texto": "Tienes un gran equilibrio entre gaming y vida personal. Comparte tu experiencia con otros."},
        ]
        consejos_habitos = [
            {"icono": "📈", "texto": "Sigue monitoreando tus hábitos de forma periódica para mantener el equilibrio."},
        ]
        consejos_bienestar = [
            {"icono": "🌟", "texto": "Tu bienestar mental es positivo. Valora y cuida lo que tienes."},
        ]

    # ── 4. Recursos profesionales (solo si riesgo alto/crítico) ───
    recursos = []
    if addiction >= 6 or happiness < 3 or depresion >= 7 or ansiedad >= 7:
        recursos = [
            {
                "tipo": "linea",
                "nombre": "Línea de la Vida (México)",
                "detalle": "800 911 2000 — Atención gratuita 24/7 en crisis emocionales",
                "icono": "📞",
            },
            {
                "tipo": "linea",
                "nombre": "SAPTEL (México)",
                "detalle": "55 5259 8121 — Servicio de apoyo psicológico por teléfono",
                "icono": "📞",
            },
            {
                "tipo": "terapia",
                "nombre": "Terapia Cognitivo-Conductual (TCC)",
                "detalle": "Especialmente eficaz para adicciones conductuales y gaming. "
                           "Ayuda a identificar patrones de pensamiento y cambiar comportamientos.",
                "icono": "🧠",
            },
            {
                "tipo": "terapia",
                "nombre": "Terapia Familiar",
                "detalle": "Recomendada cuando el gaming afecta las relaciones familiares. "
                           "Involucrar a la familia mejora significativamente los resultados.",
                "icono": "👨‍👩‍👦",
            },
            {
                "tipo": "recurso",
                "nombre": "IMJUVE — Instituto Mexicano de la Juventud",
                "detalle": "Ofrece programas de orientación y apoyo para jóvenes. gob.mx/imjuve",
                "icono": "🏛️",
            },
            {
                "tipo": "recurso",
                "nombre": "Grupos de apoyo en línea",
                "detalle": "Comunidades como r/StopGaming y Game Quitters ofrecen apoyo entre pares "
                           "y programas estructurados de reducción.",
                "icono": "🌐",
            },
            {
                "tipo": "recurso",
                "nombre": "Centros de Integración Juvenil (CIJ)",
                "detalle": "Más de 120 centros en México con tratamiento ambulatorio especializado "
                           "en adicciones. cij.gob.mx",
                "icono": "🏥",
            },
        ]

    # ── 5. Alerta especial si es caso crítico ────────────────────
    alerta = None
    if addiction >= 7.5 or depresion >= 8:
        alerta = {
            "titulo": "⚠️ Se recomienda atención profesional",
            "mensaje": "Los resultados indican un nivel que puede requerir intervención profesional. "
                       "No dudes en contactar a un especialista en salud mental. "
                       "Pedir ayuda es un acto de valentía, no de debilidad.",
        }

    return {
        "resumen": resumen,
        "observaciones": observaciones,
        "consejos": {
            "inmediatos": consejos_inmediatos,
            "habitos": consejos_habitos,
            "bienestar": consejos_bienestar,
        },
        "recursos": recursos,
        "alerta": alerta,
    }


# ── Rutas ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Página principal."""
    return render_template("index.html")


@app.route("/api/estado", methods=["GET"])
def estado():
    """Devuelve el estado actual del modelo cargado."""
    return jsonify({
        "ok": True,
        "modelo_cargado": modelo is not None,
        "scaler_cargado": scaler is not None,
        "modelo_nombre": modelo_nombre or "Ninguno",
    })


@app.route("/api/cargar-modelo", methods=["POST"])
def cargar_modelo():
    """
    Recibe un archivo .keras (modelo) y opcionalmente un .pkl (config/scaler).
    Los guarda en uploads/ y los carga en memoria.
    """
    global modelo, scaler, modelo_nombre

    if "modelo" not in request.files:
        return jsonify({"ok": False, "error": "No se envió ningún archivo de modelo (.keras)"}), 400

    archivo_modelo = request.files["modelo"]
    if archivo_modelo.filename == "":
        return jsonify({"ok": False, "error": "Nombre de archivo vacío."}), 400

    nombre_modelo = secure_filename(archivo_modelo.filename)
    if not nombre_modelo.endswith(".keras"):
        return jsonify({"ok": False, "error": "El modelo debe ser un archivo .keras"}), 400

    # Guardar archivo del modelo
    ruta_modelo = os.path.join(UPLOAD_FOLDER, nombre_modelo)
    archivo_modelo.save(ruta_modelo)

    # Intentar cargar el modelo
    try:
        nuevo_modelo = keras.models.load_model(ruta_modelo)
    except Exception as e:
        os.remove(ruta_modelo)
        return jsonify({"ok": False, "error": f"Error al cargar el modelo: {str(e)}"}), 400

    modelo = nuevo_modelo
    modelo_nombre = nombre_modelo
    msg = f"Modelo '{nombre_modelo}' cargado correctamente."

    # Si se envió también un archivo .pkl de configuración
    if "config" in request.files:
        archivo_config = request.files["config"]
        if archivo_config.filename != "":
            nombre_config = secure_filename(archivo_config.filename)
            if nombre_config.endswith(".pkl"):
                ruta_config = os.path.join(UPLOAD_FOLDER, nombre_config)
                archivo_config.save(ruta_config)
                try:
                    with open(ruta_config, "rb") as f:
                        config = pickle.load(f)
                    scaler = config.get("scaler", None)
                    msg += " Configuración (.pkl) cargada."
                except Exception as e:
                    msg += f" Advertencia: no se pudo cargar la configuración: {str(e)}"

    return jsonify({
        "ok": True,
        "message": msg,
        "modelo_nombre": modelo_nombre,
        "scaler_cargado": scaler is not None,
    })


@app.route("/api/predecir", methods=["POST"])
def predecir():
    """
    Recibe JSON con los datos del formulario, completa los campos
    faltantes con valores promedio, normaliza y predice.
    """
    global modelo, scaler

    if modelo is None:
        return jsonify({
            "ok": False,
            "error": "No hay modelo cargado. Por favor sube un archivo .keras primero."
        }), 400

    try:
        datos = request.get_json(force=True)

        # Construir diccionario completo con defaults razonables
        datos_completos = {
            "daily_gaming_hours": float(datos.get("daily_gaming_hours", 3)),
            "weekly_sessions": float(datos.get("weekly_sessions", 15)),
            "years_gaming": float(datos.get("years_gaming", 5)),
            "multiplayer_ratio": float(datos.get("multiplayer_ratio", 0.5)),
            "night_gaming_ratio": float(datos.get("night_gaming_ratio", 0.3)),
            "weekend_gaming_hours": float(datos.get("weekend_gaming_hours", 5)),
            "mobile_gaming_ratio": float(datos.get("mobile_gaming_ratio", 0.3)),
            "violent_games_ratio": float(datos.get("violent_games_ratio", 0.4)),
            "toxic_exposure": float(datos.get("toxic_exposure", 0.3)),
            "streaming_hours": float(datos.get("streaming_hours", 2.0)),
            "esports_interest": float(datos.get("esports_interest", 5)),
            "microtransactions_spending": float(datos.get("microtransactions_spending", 300)),
            "competitive_rank": float(datos.get("competitive_rank", 50)),
            "sleep_hours": float(datos.get("sleep_hours", 7)),
            "caffeine_intake": float(datos.get("caffeine_intake", 2)),
            "exercise_hours": float(datos.get("exercise_hours", 2)),
            "bmi": float(datos.get("bmi", 24)),
            "screen_time_total": float(datos.get("screen_time_total", 7)),
            "eye_strain_score": float(datos.get("eye_strain_score", 5)),
            "back_pain_score": float(datos.get("back_pain_score", 4)),
            "social_interaction_score": float(datos.get("social_interaction_score", 5)),
            "relationship_satisfaction": float(datos.get("relationship_satisfaction", 6)),
            "friends_gaming_count": float(datos.get("friends_gaming_count", 15)),
            "online_friends": float(datos.get("online_friends", 100)),
            "loneliness_score": float(datos.get("loneliness_score", 4)),
            "stress_level": float(datos.get("stress_level", 5)),
            "anxiety_score": float(datos.get("anxiety_score", 4)),
            "depression_score": float(datos.get("depression_score", 3)),
            "aggression_score": float(datos.get("aggression_score", 3)),
            "age": float(datos.get("age", 22)),
            "gender_encoded": float(datos.get("gender_encoded", 1)),
            "income": float(datos.get("income", 50000)),
            "academic_performance": float(datos.get("academic_performance", 70)),
            "work_productivity": float(datos.get("work_productivity", 70)),
            "parental_supervision": float(datos.get("parental_supervision", 5)),
            "headset_usage": float(datos.get("headset_usage", 1)),
            "internet_quality": float(datos.get("internet_quality", 6)),
        }

        # Crear DataFrame con el orden exacto de columnas del entrenamiento
        df_input = pd.DataFrame([datos_completos], columns=FEATURE_COLUMNS)
        X_input = df_input.values

        # Normalizar si hay scaler disponible
        if scaler is not None:
            X_input = scaler.transform(X_input)

        # Predicción
        pred_addiction, pred_happiness = modelo.predict(X_input, verbose=0)
        addiction_score = float(np.clip(pred_addiction[0, 0], 0, 10))
        happiness_score = float(np.clip(pred_happiness[0, 0], 0, 10))

        riesgo = clasificar_riesgo(addiction_score)
        bienestar = clasificar_bienestar(happiness_score)
        analisis = generar_respuesta_completa(addiction_score, happiness_score, datos_completos)

        return jsonify({
            "ok": True,
            "addiction_score": round(addiction_score, 2),
            "happiness_score": round(happiness_score, 2),
            "riesgo": riesgo,
            "bienestar": bienestar,
            "analisis": analisis,
            "scaler_usado": scaler is not None,
        })

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/presets/<nombre>")
def preset(nombre):
    """Devuelve datos precargados para perfiles ejemplo."""
    presets = {
        "casual": {
            "daily_gaming_hours": 1.5, "weekly_sessions": 5, "years_gaming": 3,
            "night_gaming_ratio": 0.1, "weekend_gaming_hours": 3,
            "multiplayer_ratio": 0.3, "violent_games_ratio": 0.2,
            "microtransactions_spending": 20, "sleep_hours": 8,
            "exercise_hours": 4, "caffeine_intake": 1, "bmi": 23,
            "screen_time_total": 4, "social_interaction_score": 8,
            "relationship_satisfaction": 8, "loneliness_score": 2,
            "online_friends": 20, "friends_gaming_count": 5,
            "stress_level": 3, "anxiety_score": 2, "depression_score": 1,
            "aggression_score": 1, "age": 25, "gender_encoded": 1,
            "income": 50000,
        },
        "moderado": {
            "daily_gaming_hours": 4, "weekly_sessions": 15, "years_gaming": 6,
            "night_gaming_ratio": 0.4, "weekend_gaming_hours": 7,
            "multiplayer_ratio": 0.5, "violent_games_ratio": 0.4,
            "microtransactions_spending": 400, "sleep_hours": 6.5,
            "exercise_hours": 2, "caffeine_intake": 3, "bmi": 25,
            "screen_time_total": 8, "social_interaction_score": 5,
            "relationship_satisfaction": 5, "loneliness_score": 5,
            "online_friends": 120, "friends_gaming_count": 20,
            "stress_level": 6, "anxiety_score": 5, "depression_score": 4,
            "aggression_score": 4, "age": 21, "gender_encoded": 1,
            "income": 35000,
        },
        "hardcore": {
            "daily_gaming_hours": 10, "weekly_sessions": 35, "years_gaming": 12,
            "night_gaming_ratio": 0.9, "weekend_gaming_hours": 16,
            "multiplayer_ratio": 0.8, "violent_games_ratio": 0.7,
            "microtransactions_spending": 1500, "sleep_hours": 4.5,
            "exercise_hours": 0.5, "caffeine_intake": 5, "bmi": 29,
            "screen_time_total": 14, "social_interaction_score": 2,
            "relationship_satisfaction": 3, "loneliness_score": 8,
            "online_friends": 300, "friends_gaming_count": 40,
            "stress_level": 8, "anxiety_score": 7, "depression_score": 7,
            "aggression_score": 6, "age": 22, "gender_encoded": 1,
            "income": 25000,
        },
    }

    if nombre not in presets:
        return jsonify({"ok": False, "error": "Preset no encontrado"}), 404

    return jsonify({"ok": True, "datos": presets[nombre]})


# ══════════════════════════════════════════════════════════════════
# ARRANQUE
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    estado = "✅ Modelo listo" if modelo else "⚠️  Sin modelo — sube uno desde la interfaz"
    print(f"\n{'='*60}")
    print(f"  🧠 IA Predictora de Riesgo de Adicción Gamer")
    print(f"  Estado: {estado}")
    print(f"  🚀 http://127.0.0.1:5000")
    print(f"{'='*60}\n")
    app.run(debug=True, host="127.0.0.1", port=5000)
