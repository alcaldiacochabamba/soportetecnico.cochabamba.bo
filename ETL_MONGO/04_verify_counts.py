# ==============================================
# 04_verify_counts.py
# Verifica que los conteos de registros entre los JSON y la base PostgreSQL coincidan
# ==============================================

import os, json, psycopg2

PG_HOST = "localhost"
PG_PORT = 5432
PG_DB   = "soportetecnicodev_db"
PG_USER = "postgres"
PG_PASS = "0000"

BASE_DIR = r"C:\Users\barri\Downloads\ETL_SISTEMA_SOPORTE_TECNICO\26-09-2025\tecnico\json_ready"

TABLES = [
    "roles",
    "gestions",
    "secuencias",
    "sos",
    "tipos",
    "unidades",
    "usuarios",
    "equipos",
    "servicios",
    "tareas"
]

# ============ FUNCIONES ============

def connect():
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=PG_DB,
        user=PG_USER, password=PG_PASS
    )

def count_json_records(json_path):
    """Cuenta registros en el archivo JSON."""
    if not os.path.exists(json_path):
        return 0
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return len(data)
    except Exception as e:
        print(f"[ERROR] No se pudo leer {json_path}: {e}")
        return 0

def count_pg_records(cur, table):
    """Cuenta registros en la tabla PostgreSQL."""
    try:
        cur.execute(f"SELECT COUNT(*) FROM public.{table}")
        return cur.fetchone()[0]
    except Exception as e:
        print(f"[ERROR] No se pudo contar {table} en DB: {e}")
        return -1

# ============ PROCESO PRINCIPAL ============

def main():
    print("[INFO] Verificando conteos entre JSONs y base de datos...")

    with connect() as conn:
        cur = conn.cursor()

        resumen = []
        for t in TABLES:
            json_path = os.path.join(BASE_DIR, f"{t}.json")
            json_count = count_json_records(json_path)
            db_count = count_pg_records(cur, t)

            match = "✅ OK" if json_count == db_count else "⚠️ DIF"
            resumen.append((t, json_count, db_count, match))
            print(f"{t:<12} | JSON: {json_count:>6} | DB: {db_count:>6} | {match}")

        print("\n📊 RESUMEN FINAL:")
        print("-" * 50)
        for t, j, d, m in resumen:
            print(f"{t:<12}  JSON={j:<6}  DB={d:<6}  →  {m}")
        print("-" * 50)

        cur.close()
        print("\n✅ Verificación completada.")

if __name__ == "__main__":
    main()