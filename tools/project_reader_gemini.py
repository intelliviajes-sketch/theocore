import os
import json
import hashlib
from dotenv import load_dotenv
from google import genai  # Nueva librería oficial

# ======================================================
# CONFIGURACIÓN
# ======================================================
SRC_DIR = "src"
OUTPUT_FILE = "project-summary.md"

CACHE_DIR = ".cache"
CACHE_FILE = os.path.join(CACHE_DIR, "gemini_descriptions.json")

BATCH_SIZE = 8       
MAX_LINES = 180      
MODEL_NAME = "gemini-1.5-flash-latest"

# ======================================================
# INIT
# ======================================================
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY no encontrada en .env")

# Nueva forma de inicializar el cliente en 2026
client = genai.Client(api_key=API_KEY)

os.makedirs(CACHE_DIR, exist_ok=True)

# ======================================================
# CACHE
# ======================================================
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        CACHE = json.load(f)
else:
    CACHE = {}

def save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(CACHE, f, indent=2, ensure_ascii=False)

# ======================================================
# HELPERS
# ======================================================
def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def detect_type(path: str) -> str:
    path_lower = path.lower()
    if "/api/" in path_lower: return "API Route"
    if path_lower.endswith("page.tsx"): return "Next.js Page"
    if path_lower.endswith("layout.tsx"): return "Layout"
    if "middleware" in path_lower: return "Middleware"
    if "/components/" in path_lower: return "Component"
    if "/hooks/" in path_lower or os.path.basename(path).startswith("use"): return "Hook"
    if path_lower.endswith(".ts"): return "TypeScript Module"
    return "Module"

def extract_code(content: str) -> str:
    return "\n".join(content.splitlines()[:MAX_LINES])

# ======================================================
# WALK PROJECT
# ======================================================
def collect_files():
    files = []
    # Carpetas a ignorar para evitar ruido y errores
    exclude = {".next", "node_modules", "dist", ".git"}
    
    for root, dirs, filenames in os.walk(SRC_DIR):
        dirs[:] = [d for d in dirs if d not in exclude]
        for name in filenames:
            if name.endswith(".ts") or name.endswith(".tsx"):
                full = os.path.join(root, name)
                files.append(full.replace("\\", "/"))
    return files

# ======================================================
# GEMINI BATCH (ACTUALIZADO)
# ======================================================
def describe_batch(batch):
    prompt = (
        "Analiza los siguientes archivos de un proyecto Next.js.\n"
        "Devuelve exclusivamente UNA frase técnica por archivo describiendo su responsabilidad.\n"
        "No añadidas introducciones ni explicaciones extra.\n"
        "Usa el mismo orden que la lista proporcionada.\n\n"
    )

    for i, item in enumerate(batch, 1):
        prompt += f"Archivo {i} ({item['path']}):\n{item['code']}\n\n"

    try:
        # Nueva sintaxis de llamada a la API
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )
        
        # Limpieza de la respuesta
        lines = [l.strip("- ").strip() for l in response.text.split("\n") if l.strip()]
        
        # Si la IA devuelve más o menos líneas, rellenamos para no romper el zip()
        if len(lines) != len(batch):
            print(f"⚠️ Desajuste en batch: {len(lines)} descripciones para {len(batch)} archivos.")
            while len(lines) < len(batch): lines.append("Sin descripción disponible.")
            
        return lines[:len(batch)]
    except Exception as e:
        print(f"❌ Error en la API: {e}")
        return ["Error al generar descripción" for _ in batch]

# ======================================================
# MAIN
# ======================================================
def main():
    files = collect_files()
    summary = []
    pending = []

    print(f"🕷️ Archivos encontrados: {len(files)}")

    for path in files:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            continue

        h = hash_content(content)
        ftype = detect_type(path)

        if path in CACHE and CACHE[path]["hash"] == h:
            summary.append({
                "path": path,
                "type": ftype,
                "description": CACHE[path]["description"]
            })
        else:
            pending.append({
                "path": path,
                "hash": h,
                "type": ftype,
                "code": extract_code(content)
            })

    print(f"🤖 Archivos nuevos/modificados: {len(pending)}")

    for i in range(0, len(pending), BATCH_SIZE):
        batch = pending[i:i + BATCH_SIZE]
        print(f"🧠 Analizando batch {i // BATCH_SIZE + 1}...")

        descriptions = describe_batch(batch)

        for item, desc in zip(batch, descriptions):
            CACHE[item["path"]] = {
                "hash": item["hash"],
                "description": desc
            }
            summary.append({
                "path": item["path"],
                "type": item["type"],
                "description": desc
            })

        save_cache()

    # Generar el archivo Markdown final
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("# 📘 Project Structure Summary\n\n")
        f.write("Resumen automático de la estructura y responsabilidad de cada archivo.\n\n")

        # Tabla de resumen rápido
        f.write("| Archivo | Tipo | Descripción |\n")
        f.write("| :--- | :--- | :--- |\n")
        for item in sorted(summary, key=lambda x: x["path"]):
            f.write(f"| `{item['path']}` | {item['type']} | {item['description']} |\n")

    print(f"✅ Resumen generado con éxito en {OUTPUT_FILE}")

if __name__ == "__main__":
    main()