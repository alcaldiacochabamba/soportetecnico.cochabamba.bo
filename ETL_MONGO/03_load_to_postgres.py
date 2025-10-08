# ==============================================
# 03_load_to_postgres.py  (para soportetecnicodev_db)
# Carga JSONs → PostgreSQL ajustado al esquema del dump que compartiste.
# - usuarios.role -> "1"/"2"/"3"
# - equipos.tipo -> tipos.tipos_id
# - equipos.responsable -> usuarios.usuarios_id
# - servicios.gestion -> gestions.gestions_id
# - servicios."tecnicoRegistro" y "tecnicoAsignado" -> usuarios.usuarios_id
# - tareas.servicio -> servicios.servicios_id
# - Columnas con Mayúsculas/mixtas se citan con comillas ("fechaRegistro", etc.)
# - Normaliza servicios.estado: INICIAL→SIN ASIGNAR, EN PROCESO→EN PROGRESO
# - Si fechaInicio/fechaTerminado/fechaEgreso o tecnicoEgreso son None, inserta ""
# - servicios.equipo: si viene OID, se convierte al id numérico del equipo
# - bump_sequences() al final para sincronizar secuencias
# ==============================================

import os, json, psycopg2, re
from psycopg2.extras import execute_values

# === CONEXIÓN ===
PG_HOST = "localhost"
PG_PORT = 5432
PG_DB   = "soportetecnicodev_db"   # <- usa tu DB objetivo
PG_USER = "postgres"
PG_PASS = "0000"

BASE_DIR = r"C:\Users\barri\Downloads\ETL_SISTEMA_SOPORTE_TECNICO\26-09-2025\tecnico\json_ready"

# ---------- utilidades ----------
def connect():
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=PG_DB,
        user=PG_USER, password=PG_PASS
    )

def normalize_value(v):
    """Convierte tipos Python→PostgreSQL compatibles (bool→int, etc.)"""
    if isinstance(v, bool):
        return 1 if v else 0
    return v

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def qident(name: str) -> str:
    """Cita un identificador SQL (columna) tal como está en tu schema."""
    return '"' + str(name).replace('"', '""') + '"'

def upsert(cur, table, cols, rows, pk):
    if not rows:
        return 0
    norm_rows = [tuple(normalize_value(v) for v in r) for r in rows]
    cols_sql = ", ".join(qident(c) for c in cols)
    updates  = ", ".join(f'{qident(c)}=EXCLUDED.{qident(c)}' for c in cols if c != pk)
    sql = f'INSERT INTO public.{table} ({cols_sql}) VALUES %s ON CONFLICT ({qident(pk)}) DO UPDATE SET {updates}'
    execute_values(cur, sql, norm_rows)
    return len(rows)

# ---------- normalización de roles ----------
ROLE_MAP = {
    "role_superadmin": "1", "superadmin": "1", "super": "1", "1": "1",
    "role_admin": "2",     "admin": "2",                "2": "2",
    "role_tecnico": "3",   "tecnico": "3", "técnico": "3", "3": "3",
    "role_consulta": "3",  "consulta": "3",
}
def _norm(x): return (str(x).strip().lower() if x is not None else "")
def map_role_to_text_number(v):
    key = _norm(v).replace("-", "_")
    return ROLE_MAP.get(key, "3")

# ---------- helpers FKs ----------
_HEX24 = re.compile(r"^[0-9a-f]{24}$", re.IGNORECASE)

def extract_oid_str(v):
    """Devuelve string 24-hex del ObjectId si se puede extraer de v (str/dict/DBRef)."""
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        return s if _HEX24.match(s) else None
    if isinstance(v, dict):
        for k in ("$oid", "_id", "$id"):
            if k in v:
                sub = v[k]
                if isinstance(sub, str) and _HEX24.match(sub.strip()):
                    return sub.strip()
                if isinstance(sub, dict) and "$oid" in sub and isinstance(sub["$oid"], str) and _HEX24.match(sub["$oid"].strip()):
                    return sub["$oid"].strip()
        for k in ("servicio", "gestion", "usuario", "tipo", "equipo"):
            if k in v:
                return extract_oid_str(v[k])
    return None

def build_oid_to_seqid_map(data, id_key="id_numerico", oid_key="_id"):
    """Mapea str(ObjectId) -> id_numerico para resolver FKs."""
    m = {}
    for d in data or []:
        sid = d.get(id_key)
        if sid is None:
            continue
        oid = d.get(oid_key)
        s = extract_oid_str(oid) if isinstance(oid, dict) else (str(oid).strip() if isinstance(oid, str) and _HEX24.match(oid.strip()) else None)
        if s:
            m[s] = int(sid)
    return m

def resolve_fk(value, oid_map):
    """
    Intenta resolver 'value':
      - Si es OID (o dict/DBRef) usa oid_map
      - Si ya es número o string de dígitos, devuelve int
      - Si no se puede, None
    """
    s = extract_oid_str(value)
    if s and s in oid_map:
        return oid_map[s]
    try:
        if value is None:
            return None
        sv = str(value).strip()
        if sv.lstrip("-").isdigit():
            return int(sv.lstrip("-"))
    except Exception:
        pass
    return None

# ---------- normalización de 'estado' en servicios ----------
_SPACE = re.compile(r"\s+")
def normalize_estado_servicio(v):
    """
    Mapea:
      - 'INICIAL' -> 'SIN ASIGNAR'
      - 'EN PROCESO' -> 'EN PROGRESO'
    Sin tocar otros valores. Soporta mayúsculas/minúsculas y espacios múltiples.
    """
    if v is None:
        return None
    s = _SPACE.sub(" ", str(v).strip()).upper()
    if s == "INICIAL":
        return "SIN ASIGNAR"
    if s == "EN PROCESO":
        return "EN PROGRESO"
    return v

def empty_if_none(v):
    """Devuelve '' si v es None; en otro caso devuelve v tal cual."""
    return "" if v is None else v

# ---------- sincronización de secuencias ----------
def bump_sequences(cur):
    """
    Ajusta cada secuencia 'public.<seq>' al máximo valor presente en su tabla + 1.
    Usa is_called = false para que el siguiente nextval devuelva ese valor.
    """
    pairs = [
        ("roles",      "roles_id",      "roles_roles_id_seq"),
        ("gestions",   "gestions_id",   "gestions_gestions_id_seq"),
        ("secuencias", "secuencias_id", "secuencias_secuencias_id_seq"),
        ("sos",        "sos_id",        "sos_sos_id_seq"),
        ("tipos",      "tipos_id",      "tipos_tipos_id_seq"),
        ("unidades",   "unidades_id",   "unidades_unidades_id_seq"),
        ("usuarios",   "usuarios_id",   "usuarios_usuarios_id_seq"),
        ("equipos",    "equipos_id",    "equipos_equipos_id_seq"),
        ("servicios",  "servicios_id",  "servicios_servicios_id_seq"),
        ("tareas",     "tareas_id",     "tareas_tareas_id_seq"),
    ]
    for table, col, seq in pairs:
        cur.execute(f'SELECT COALESCE(MAX({qident(col)}), 0) FROM public.{qident(table)}')
        (mx,) = cur.fetchone()
        cur.execute(f"SELECT setval('public.{seq}', %s + 1, false)", (mx,))

# ---------- principal ----------
def main():
    print("[INFO] Cargando JSONs a PostgreSQL (soportetecnicodev_db)...")

    # Carga de JSONs
    def j(name):
        return os.path.join(BASE_DIR, f"{name}.json")

    data_roles      = load_json(j("roles"))      if os.path.exists(j("roles"))      else []
    data_gestions   = load_json(j("gestions"))   if os.path.exists(j("gestions"))   else []
    data_secuencias = load_json(j("secuencias")) if os.path.exists(j("secuencias")) else []
    data_sos        = load_json(j("sos"))        if os.path.exists(j("sos"))        else []
    data_tipos      = load_json(j("tipos"))      if os.path.exists(j("tipos"))      else []
    data_unidades   = load_json(j("unidades"))   if os.path.exists(j("unidades"))   else []
    data_usuarios   = load_json(j("usuarios"))   if os.path.exists(j("usuarios"))   else []
    data_equipos    = load_json(j("equipos"))    if os.path.exists(j("equipos"))    else []
    data_servicios  = load_json(j("servicios"))  if os.path.exists(j("servicios"))  else []
    data_tareas     = load_json(j("tareas"))     if os.path.exists(j("tareas"))     else []

    # Mapas OID -> id_numerico para FKs
    oid2tipos_id     = build_oid_to_seqid_map(data_tipos)      # equipos.tipo
    oid2usuarios_id  = build_oid_to_seqid_map(data_usuarios)   # equipos.responsable, servicios técnicos
    oid2gestions_id  = build_oid_to_seqid_map(data_gestions)   # servicios.gestion
    oid2servicios_id = build_oid_to_seqid_map(data_servicios)  # tareas.servicio
    oid2equipos_id   = build_oid_to_seqid_map(data_equipos)    # servicios.equipo (nuevo)

    with connect() as conn:
        conn.autocommit = False
        cur = conn.cursor()

        # ---- padres
        if data_roles:
            print(f"[INFO] Insertando roles ({len(data_roles)})")
            cols = ["roles_id","descripcion","estado","__v"]
            rows = [(d.get("id_numerico"), d.get("descripcion"), d.get("estado"), d.get("__v")) for d in data_roles]
            upsert(cur, "roles", cols, rows, "roles_id")

        if data_gestions:
            print(f"[INFO] Insertando gestions ({len(data_gestions)})")
            cols = ["gestions_id","numero","anio","descripcion","estado","__v"]
            rows = [(d.get("id_numerico"), d.get("numero"), d.get("anio"), d.get("descripcion"), d.get("estado"), d.get("__v")) for d in data_gestions]
            upsert(cur, "gestions", cols, rows, "gestions_id")

        if data_secuencias:
            print(f"[INFO] Insertando secuencias ({len(data_secuencias)})")
            cols = ["secuencias_id","numero","descripcion","estado","__v"]
            rows = [(d.get("id_numerico"), d.get("numero"), d.get("descripcion"), d.get("estado"), d.get("__v")) for d in data_secuencias]
            upsert(cur, "secuencias", cols, rows, "secuencias_id")

        if data_sos:
            print(f"[INFO] Insertando sos ({len(data_sos)})")
            cols = ["sos_id","descripcion","estado","__v"]
            rows = [(d.get("id_numerico"), d.get("descripcion"), d.get("estado"), d.get("__v")) for d in data_sos]
            upsert(cur, "sos", cols, rows, "sos_id")

        if data_tipos:
            print(f"[INFO] Insertando tipos ({len(data_tipos)})")
            cols = ["tipos_id","descripcion","formulario","estado","__v"]
            rows = [(d.get("id_numerico"), d.get("descripcion"), d.get("formulario"), d.get("estado"), d.get("__v")) for d in data_tipos]
            upsert(cur, "tipos", cols, rows, "tipos_id")

        if data_unidades:
            print(f"[INFO] Insertando unidades ({len(data_unidades)})")
            cols = ["unidades_id","nombre","interno","telefono","direccion","estado","__v"]
            rows = [(d.get("id_numerico"), d.get("nombre"), d.get("interno"), d.get("telefono"), d.get("direccion"), d.get("estado"), d.get("__v")) for d in data_unidades]
            upsert(cur, "unidades", cols, rows, "unidades_id")

        if data_usuarios:
            print(f"[INFO] Insertando usuarios ({len(data_usuarios)})")
            cols = ["usuarios_id","nombres","apellidos","usuario","email","role","image","estado","password","__v"]
            rows = []
            for d in data_usuarios:
                rows.append((
                    d.get("id_numerico"),
                    d.get("nombres"),
                    d.get("apellidos"),
                    d.get("usuario"),
                    d.get("email"),
                    map_role_to_text_number(d.get("role")),   # "1"/"2"/"3"
                    d.get("image"),
                    d.get("estado"),
                    d.get("password"),
                    d.get("__v"),
                ))
            upsert(cur, "usuarios", cols, rows, "usuarios_id")

        # ---- equipos (FK: tipo, responsable)
        if data_equipos:
            print(f"[INFO] Insertando equipos ({len(data_equipos)})")
            cols = [
                "equipos_id","garantia","fecharegistro","tipo","codigo","marca","modelo","serie",
                "tarjetamadre","procesador","memoria","discoduro","tarjetavideo","lector","so",
                "antivirus","ip","mac","oficina","responsable","funcionarioasignado",
                "funcionariousuario","__v"
            ]
            rows = []
            for d in data_equipos:
                tipo_fk = resolve_fk(d.get("tipo"), oid2tipos_id)
                resp_fk = resolve_fk(d.get("responsable"), oid2usuarios_id)
                rows.append((
                    d.get("id_numerico"),
                    d.get("garantia"),
                    d.get("fecharegistro"),   # text en tu schema
                    tipo_fk,                  # integer FK tipos.tipos_id
                    d.get("codigo"),
                    d.get("marca"),
                    d.get("modelo"),
                    d.get("serie"),
                    d.get("tarjetamadre"),
                    d.get("procesador"),
                    d.get("memoria"),
                    d.get("discoduro"),
                    d.get("tarjetavideo"),
                    d.get("lector"),
                    d.get("so"),
                    d.get("antivirus"),
                    d.get("ip"),
                    d.get("mac"),
                    d.get("oficina"),
                    resp_fk,                  # integer FK usuarios.usuarios_id
                    d.get("funcionarioasignado"),
                    d.get("funcionariousuario"),
                    d.get("__v"),
                ))
            upsert(cur, "equipos", cols, rows, "equipos_id")

        # ---- servicios (con columnas CamelCase y FKs a usuarios/gestions)
        if data_servicios:
            print(f"[INFO] Insertando servicios ({len(data_servicios)})")
            cols = [
                "servicios_id","numero","fechaRegistro","fechaInicio","fechaTerminado","fechaEgreso",
                "gestion","equipo","tipo","tecnicoRegistro","ciSolicitante","nombreSolicitante",
                "cargoSolicitante","telefonoSolicitante","tipoSolicitante","oficinaSolicitante",
                "tecnicoAsignado","problema","observaciones","informe","tecnicoEgreso",
                "ciResponsableEgreso","nombreResponsableEgreso","cargoResponsableEgreso",
                "telefonoResponsableEgreso","tipoResponsableEgreso","oficinaResponsableEgreso",
                "estado","__v"
            ]
            rows = []
            for d in data_servicios:
                gestion_fk  = resolve_fk(d.get("gestion"), oid2gestions_id)
                tReg_fk     = resolve_fk(d.get("tecnicoRegistro"), oid2usuarios_id)
                tAsig_fk    = resolve_fk(d.get("tecnicoAsignado"),  oid2usuarios_id)

                # "equipo" en tu schema es TEXT (no FK).
                # Si llega objeto, prueba campos legibles; si no, usa OID→id_numérico; si no hay, deja como está.
                eq_val = d.get("equipo")
                if isinstance(eq_val, dict):
                    for k in ("codigo", "serie"):
                        if k in eq_val and isinstance(eq_val[k], str) and eq_val[k].strip():
                            eq_val = eq_val[k].strip()
                            break
                    else:
                        s = extract_oid_str(eq_val)
                        eq_val = str(oid2equipos_id[s]) if s and s in oid2equipos_id else (s or "")
                elif isinstance(eq_val, str):
                    s = extract_oid_str(eq_val)
                    eq_val = str(oid2equipos_id[s]) if s and s in oid2equipos_id else eq_val

                # Normaliza estado
                estado_norm = normalize_estado_servicio(d.get("estado"))

                # Fechas vacías si vienen None (son TEXT en el esquema)
                fecha_inicio    = empty_if_none(d.get("fechaInicio"))
                fecha_terminado = empty_if_none(d.get("fechaTerminado"))
                fecha_egreso    = empty_if_none(d.get("fechaEgreso"))

                # Tecnico de egreso vacío si viene None
                tecnico_egreso = empty_if_none(d.get("tecnicoEgreso"))

                rows.append((
                    d.get("id_numerico"),
                    d.get("numero"),
                    d.get("fechaRegistro"),  # se deja como viene
                    fecha_inicio,            # "" si None
                    fecha_terminado,         # "" si None
                    fecha_egreso,            # "" si None
                    gestion_fk,              # integer
                    eq_val,                  # text (id numérico si venía OID)
                    d.get("tipo"),
                    tReg_fk,                 # integer
                    d.get("ciSolicitante"),
                    d.get("nombreSolicitante"),
                    d.get("cargoSolicitante"),
                    d.get("telefonoSolicitante"),
                    d.get("tipoSolicitante"),
                    d.get("oficinaSolicitante"),
                    tAsig_fk,                # integer
                    d.get("problema"),
                    d.get("observaciones"),
                    d.get("informe"),
                    tecnico_egreso,          # "" si None
                    d.get("ciResponsableEgreso"),
                    d.get("nombreResponsableEgreso"),
                    d.get("cargoResponsableEgreso"),
                    d.get("telefonoResponsableEgreso"),
                    d.get("tipoResponsableEgreso"),
                    d.get("oficinaResponsableEgreso"),
                    estado_norm,
                    d.get("__v"),
                ))
            upsert(cur, "servicios", cols, rows, "servicios_id")

        # ---- tareas (insert + FK servicio)
        if data_tareas:
            print(f"[INFO] Insertando tareas ({len(data_tareas)})")
            cols_ins = ["tareas_id","fecha","servicio","descripcion","__v"]
            rows_ins = []
            for d in data_tareas:
                serv_fk = resolve_fk(d.get("servicio"), oid2servicios_id)
                rows_ins.append((
                    d.get("id_numerico"),
                    d.get("fecha"),   # text en tu schema
                    serv_fk,
                    d.get("descripcion"),
                    d.get("__v"),
                ))
            upsert(cur, "tareas", cols_ins, rows_ins, "tareas_id")

        # ---- sincroniza secuencias al final
        bump_sequences(cur)

        conn.commit()
        cur.close()
        print("\n✅ Carga completada contra 'soportetecnicodev_db' y secuencias sincronizadas.")

if __name__ == "__main__":
    main()
