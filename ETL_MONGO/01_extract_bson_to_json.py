# ==============================================
# 01_extract_bson_to_json.py
# Convierte archivos BSON de Mongo → JSON estándar
# + IDs secuenciales por tabla (id_numerico = 1..N)
# + Mapeo de usuarios.role a códigos: 1=super admin, 2=admin, 3=tecnico (incluye "consulta")
# ==============================================

import os, json, re
from bson import BSON
from bson.objectid import ObjectId
from datetime import datetime

# === CONFIGURACIÓN ===
DATA_DIR = r"C:\Users\barri\Downloads\ETL_SISTEMA_SOPORTE_TECNICO\26-09-2025\tecnico"
# ⬇️ salida en json_raw para encadenar con 02_transform_json.py
OUT_DIR  = os.path.join(DATA_DIR, "json_raw")

# Archivos BSON esperados
BSON_FILES = [
    "roles.bson", "gestions.bson", "secuencias.bson", "sos.bson", "tipos.bson",
    "unidads.bson", "usuarios.bson", "equipos.bson", "servicios.bson", "tareas.bson"
]

# === HELPERS ===

def bson_iter(path):
    """Itera sobre documentos BSON"""
    with open(path, "rb") as f:
        while True:
            hdr = f.read(4)
            if not hdr:
                return
            size = int.from_bytes(hdr, "little")
            body = hdr + f.read(size - 4)
            yield BSON(body).decode()

def bson_to_json_serializable(obj):
    """Convierte tipos BSON especiales a JSON estándar"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: bson_to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [bson_to_json_serializable(v) for v in obj]
    else:
        return obj

# ---------- Normalización de roles ----------
_ROLE_SUPER_PAT = re.compile(r"\b(role_)?super[_\s-]?admin\b", re.IGNORECASE)
_ROLE_ADMIN_PAT = re.compile(r"\b(role_)?admin\b", re.IGNORECASE)
_ROLE_TECNICO_PAT = re.compile(r"\b(role_)?t[eé]cnico\b", re.IGNORECASE)
_ROLE_CONSULTA_PAT = re.compile(r"\b(role_)?consulta\b", re.IGNORECASE)

def normalize_user_role_to_code(value) -> str | None:
    """
    Devuelve "1" (super admin), "2" (admin) o "3" (tecnico),
    o None si no puede mapear.
    """
    if value is None:
        return None
    s = str(value).strip().lower()

    # super admin primero
    if _ROLE_SUPER_PAT.search(s):
        return "1"
    # admin
    if _ROLE_ADMIN_PAT.search(s):
        return "2"
    # tecnico o consulta -> 3
    if _ROLE_TECNICO_PAT.search(s) or _ROLE_CONSULTA_PAT.search(s):
        return "3"

    # alias comunes
    if s in {"superadmin", "super admin", "super-admin"}:
        return "1"
    if s in {"admin"}:
        return "2"
    if s in {"tecnico", "técnico", "consulta"}:
        return "3"

    return None

# === PROCESO ===

def export_bson_to_json():
    """Convierte todos los archivos BSON en JSON + id_numerico + mapeo de role en usuarios"""
    os.makedirs(OUT_DIR, exist_ok=True)
    total_docs = 0

    print(f"[INFO] Leyendo BSON desde: {DATA_DIR}")
    print(f"[INFO] Escribiendo JSON en: {OUT_DIR}")

    for fname in BSON_FILES:
        fpath = os.path.join(DATA_DIR, fname)
        if not os.path.exists(fpath):
            print(f"[WARN] No se encontró: {fname}")
            continue

        docs = []
        for doc in bson_iter(fpath):
            doc = bson_to_json_serializable(doc)

            # Ajustes por tabla
            if fname == "usuarios.bson":
                # Mapea role → "1"/"2"/"3"
                role_original = doc.get("role")
                code = normalize_user_role_to_code(role_original)
                if code is not None:
                    doc["role_original"] = role_original  # trazabilidad
                    doc["role"] = code                     # valor final numérico como string
                else:
                    doc["role_original"] = role_original
                    doc["role"] = "3"  # default técnico
                doc["role_code"] = doc["role"]

            docs.append(doc)

        if not docs:
            print(f"[INFO] {fname}: vacío, se omite.")
            continue

        # IDs secuenciales por archivo/tabla
        for i, d in enumerate(docs, start=1):
            d["id_numerico"] = i

        out_path = os.path.join(OUT_DIR, fname.replace(".bson", ".json"))
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, indent=2)

        total_docs += len(docs)
        print(f"[OK] {fname} → {out_path} ({len(docs)} documentos)")

    print(f"\n✅ Exportación completada. Total documentos: {total_docs}")
    print(f"📁 Archivos generados en: {OUT_DIR}")

# === MAIN ===
if __name__ == "__main__":
    export_bson_to_json()
