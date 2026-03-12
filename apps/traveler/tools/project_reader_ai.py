import os
import json
import time
import hashlib
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError

# =========================
# CONFIG
# =========================
SRC_DIR = "src"
OUTPUT_FILE = "project-summary.md"
CACHE_DIR = ".cache"
CACHE_FILE = os.path.join(CACHE_DIR, "ai_descriptions.json")

BATCH_SIZE = 3          # archivos por llamada
WAIT_ON_RATE_LIMIT = 75 # segundos
MAX_LINES = 200         # líneas de código por archivo
MODEL = "gpt-4.1-mini"

# =========================
# INIT
# =========================
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("❌ OPENAI_API_KEY no encontrada")

os.makedirs(CACHE_DIR, exist_ok=True)

# =========================
# CACHE
# =========================
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        CACHE = json.load(f)
else:
    CACHE = {}

def save_cache():
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(CACHE, f, indent=2)

# =========================
# HELPERS
# =========================
def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def detect_type(path: str) -> str:
    if "/api/" in path:
        return "API Route"
    if path.endswith("page.tsx"):
        return "Next.js Page"
    if path.endswith("layout.tsx"):
        return "Layout"
    if "middleware" in path:
        return "Middleware"
    if "/components/" in path:
        return "Component"
    if "/hooks/" in path or os.path.basename(path).startswith("use"):
        return "Hook"
    return "Module"

def extract_code(content: str) -> str:
    return "\n".join(content.splitlines()[:MAX_LINES])

# =========================
# WALK PROJECT
# =========================
def collect_files():
    files = []
    for root, _, filenames in os.walk(SRC_DIR):
        for name in filenames:
            if name.endswith(".ts") or name.endswith(".tsx"):
                full = os.path.join(root, name)
                rel = full.replace("\\", "/")
                files.append(rel)
    return files

# =========================
# AI BATCH DESCRIPTION
# =========================
def describe_batch(batch):
    prompt = "Describe brevemente (1 frase técnica) qué hace cada archivo. No inventes.\n\n"

    for i, item in enumerate(batch, 1):
        prompt += f"Archivo {i}: {item['path']}\n"
        prompt += item["code"] + "\n\n"

    while True:
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            text = response.choices[0].message.content.strip()
            return text.split("\n")
        except RateLimitError:
            print(f"⏳ Rate limit → esperando {WAIT_ON_RATE_LIMIT}s")
            time.sleep(WAIT_ON_RATE_LIMIT)

# =========================
# MAIN
# =========================
def main():
    files = collect_files()
    summary = []
    pending = []

    print(f"🕷️ Archivos encontrados: {len(files)}")

    for path in files:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

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

    # Procesar en batches
    for i in range(0, len(pending), BATCH_SIZE):
        batch = pending[i:i + BATCH_SIZE]
        print(f"🧠 Analizando batch {i//BATCH_SIZE + 1}")

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

    # Escribir resumen final
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("# 📘 Project Structure Summary\n\n")
        for item in sorted(summary, key=lambda x: x["path"]):
            f.write(f"## {item['path']}\n")
            f.write(f"- Tipo: {item['type']}\n")
            f.write(f"- Descripción: {item['description']}\n\n")

    print(f"✅ Resumen generado en {OUTPUT_FILE}")

# =========================
if __name__ == "__main__":
    main()

