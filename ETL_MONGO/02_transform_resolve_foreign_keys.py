# ==============================================
# 02_transform_json.py
# Normaliza JSONs desde json_raw → json_ready
# - Renombra unidads→unidades
# - Mapea usuarios.role a "1"/"2"/"3"
# - Convierte booleanos/strings a enteros donde el esquema lo pide
# - RESUELVE FKs a IDs numéricos:
#     * equipos.tipo            -> tipos.id_numerico
#     * equipos.responsable     -> usuarios.id_numerico
#     * servicios.gestion       -> gestions.id_numerico
#     * servicios.tecnico*      -> usuarios.id_numerico
#     * tareas.servicio         -> servicios.id_numerico
# ==============================================

import os, json
from pathlib import Path

# === RUTAS ===
BASE_DIR_IN  = r"C:\Users\barri\Downloads\ETL_SISTEMA_SOPORTE_TECNICO\26-09-2025\tecnico\json_raw"
BASE_DIR_OUT = r"C:\Users\barri\Downloads\ETL_SISTEMA_SOPORTE_TECNICO\26-09-2025\tecnico\json_ready"

Path(BASE_DIR_OUT).mkdir(parents=True, exist_ok=True)

# ------- utilidades -------
def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def norm_text(x):
    return (str(x).strip().lower() if x is not None else "")

def to_int_or_none(v):
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return 1 if v else 0
    try:
        return int(v)
    except Exception:
        # si viene como "true"/"false" en texto
        s = str(v).strip().lower()
        if s in ("true", "t", "yes", "y", "si", "sí", "1"):
            return 1
        if s in ("false", "f", "no", "n", "0"):
            return 0
        return None

def to_str_or_none(v):
    if v is None:
        return None
    return str(v)

# ------- mapeo de roles (texto → "1"/"2"/"3") -------
ROLE_MAP = {
    "role_superadmin": 1, "superadmin": 1, "super_admin": 1, "super admin": 1, "1": 1,
    "role_admin": 2,     "admin": 2,                                    "2": 2,
    "role_tecnico": 3,   "tecnico": 3, "técnico": 3,                    "3": 3,
    "role_consulta": 3,  "consulta": 3,
}
def map_role_to_code(v):
    key = norm_text(v).replace("-", "_")
    code = ROLE_MAP.get(key, 3)   # default técnico
    return str(code)              # 'role' es TEXT en la BD

# ------- nombres y renombrados -------
RENAMES = {
    "unidads": "unidades",  # ← así te queda 'unidades.json'
}

# Tablas esperadas en raw
RAW_TABLES = [
    "roles","gestions","secuencias","sos","tipos",
    "unidads","usuarios","equipos","servicios","tareas"
]

def main():
    print("[INFO] Transformando json_raw → json_ready ...")
    print(f"[INFO] IN:  {BASE_DIR_IN}")
    print(f"[INFO] OUT: {BASE_DIR_OUT}")

    # 1) Cargar todo lo necesario para construir mapas de IDs
    raw = {}
    for name in RAW_TABLES:
        src = os.path.join(BASE_DIR_IN, f"{name}.json")
        if os.path.exists(src):
            raw[name] = load_json(src)
        else:
            raw[name] = None

    # Mapas OID(string) -> id_numerico
    # (Paso 1 dejó "_id" como string y "id_numerico" como 1..N)
    usuarios_map   = {str(d.get("_id")): d.get("id_numerico") for d in (raw.get("usuarios") or [])}
    gestions_map   = {str(d.get("_id")): d.get("id_numerico") for d in (raw.get("gestions") or [])}
    tipos_map      = {str(d.get("_id")): d.get("id_numerico") for d in (raw.get("tipos") or [])}
    servicios_map  = {str(d.get("_id")): d.get("id_numerico") for d in (raw.get("servicios") or [])}

    # 2) Transformar cada tabla según su esquema destino

    # --- ROLES ---
    if raw.get("roles") is not None:
        out = []
        for d in raw["roles"]:
            dd = dict(d)
            dd["estado"] = to_int_or_none(dd.get("estado"))
            dd["__v"]    = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "roles.json"), out)
        print(f"[OK] roles.json ({len(out)})")

    # --- GESTIONS ---
    if raw.get("gestions") is not None:
        out = []
        for d in raw["gestions"]:
            dd = dict(d)
            dd["numero"] = to_int_or_none(dd.get("numero"))
            dd["anio"]   = to_str_or_none(dd.get("anio"))  # en BD es TEXT
            dd["estado"] = to_int_or_none(dd.get("estado"))
            dd["__v"]    = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "gestions.json"), out)
        print(f"[OK] gestions.json ({len(out)})")

    # --- SECUENCIAS ---
    if raw.get("secuencias") is not None:
        out = []
        for d in raw["secuencias"]:
            dd = dict(d)
            dd["numero"] = to_int_or_none(dd.get("numero"))
            dd["estado"] = to_int_or_none(dd.get("estado"))
            dd["__v"]    = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "secuencias.json"), out)
        print(f"[OK] secuencias.json ({len(out)})")

    # --- SOS ---
    if raw.get("sos") is not None:
        out = []
        for d in raw["sos"]:
            dd = dict(d)
            dd["estado"] = to_int_or_none(dd.get("estado"))
            dd["__v"]    = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "sos.json"), out)
        print(f"[OK] sos.json ({len(out)})")

    # --- TIPOS ---
    if raw.get("tipos") is not None:
        out = []
        for d in raw["tipos"]:
            dd = dict(d)
            dd["estado"] = to_int_or_none(dd.get("estado"))
            dd["__v"]    = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "tipos.json"), out)
        print(f"[OK] tipos.json ({len(out)})")

    # --- UNIDADES (renombrado desde unidads) ---
    src_name = "unidads"
    if raw.get(src_name) is not None:
        out = []
        for d in raw[src_name]:
            dd = dict(d)
            dd["estado"] = to_int_or_none(dd.get("estado"))
            dd["__v"]    = to_int_or_none(dd.get("__v"))
            out.append(dd)
        dst_name = RENAMES.get(src_name, src_name)
        save_json(os.path.join(BASE_DIR_OUT, f"{dst_name}.json"), out)
        print(f"[OK] {dst_name}.json ({len(out)})")

    # --- USUARIOS ---
    if raw.get("usuarios") is not None:
        out = []
        for d in raw["usuarios"]:
            dd = dict(d)
            dd["role"]  = map_role_to_code(dd.get("role"))
            dd["estado"]= to_int_or_none(dd.get("estado"))
            dd["__v"]   = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "usuarios.json"), out)
        print(f"[OK] usuarios.json ({len(out)})")

    # --- EQUIPOS (resolver FKs: tipo, responsable) ---
    if raw.get("equipos") is not None:
        out = []
        for d in raw["equipos"]:
            dd = dict(d)
            # tipo (FK a tipos)
            tipo_oid = dd.get("tipo")
            dd["tipo"] = to_int_or_none(tipos_map.get(str(tipo_oid))) if tipo_oid is not None else None
            # responsable (FK a usuarios)
            resp_oid = dd.get("responsable")
            dd["responsable"] = to_int_or_none(usuarios_map.get(str(resp_oid))) if resp_oid is not None else None
            # __v entero
            dd["__v"] = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "equipos.json"), out)
        print(f"[OK] equipos.json ({len(out)})")

    # --- SERVICIOS (resolver FKs: gestion, tecnicoRegistro, tecnicoAsignado) ---
    if raw.get("servicios") is not None:
        out = []
        for d in raw["servicios"]:
            dd = dict(d)
            # FK: gestion -> gestions
            g_oid = dd.get("gestion")
            dd["gestion"] = to_int_or_none(gestions_map.get(str(g_oid))) if g_oid is not None else None
            # FK: tecnicoRegistro / tecnicoAsignado -> usuarios
            tr_oid = dd.get("tecnicoRegistro") or dd.get("tecnicoRegistro".capitalize()) or dd.get("tecnicoRegistro".lower())
            ta_oid = dd.get("tecnicoAsignado") or dd.get("tecnicoAsignado".capitalize()) or dd.get("tecnicoAsignado".lower())
            dd["tecnicoRegistro"] = to_int_or_none(usuarios_map.get(str(tr_oid))) if tr_oid is not None else None
            dd["tecnicoAsignado"] = to_int_or_none(usuarios_map.get(str(ta_oid))) if ta_oid is not None else None
            # __v entero (estado en servicios es TEXT en tu esquema, no tocar)
            dd["__v"] = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "servicios.json"), out)
        print(f"[OK] servicios.json ({len(out)})")

    # --- TAREAS (resolver FK: servicio -> servicios.id_numerico) ---
    if raw.get("tareas") is not None:
        out = []
        for d in raw["tareas"]:
            dd = dict(d)
            serv_oid = dd.get("servicio")
            dd["servicio"] = to_int_or_none(servicios_map.get(str(serv_oid))) if serv_oid is not None else None
            dd["__v"] = to_int_or_none(dd.get("__v"))
            out.append(dd)
        save_json(os.path.join(BASE_DIR_OUT, "tareas.json"), out)
        print(f"[OK] tareas.json ({len(out)})")

    # 3) Resumen final
    print("\n✅ Transformación completada. Archivos en json_ready:")
    for fn in sorted(os.listdir(BASE_DIR_OUT)):
        if fn.endswith(".json"):
            fp = os.path.join(BASE_DIR_OUT, fn)
            try:
                n = len(load_json(fp))
            except Exception:
                n = "?"
            print(f"   - {fn}: {n} filas")

    print("\n👉 Ejecuta el 03 para insertar en PostgreSQL sin errores de tipos ni FKs.")

if __name__ == "__main__":
    main()
