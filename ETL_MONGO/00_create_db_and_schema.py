# ==============================================
# 00_create_db_and_schema.py  (versión ampliada)
# Replica la estructura del dump (sin datos):
# - Tablas base + *.metadata + SequelizeMeta
# - Secuencias, PKs, FKs e índices básicos
# ==============================================
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

PG_HOST = "localhost"
PG_PORT = 5432
PG_SUPER_DB = "postgres"
PG_USER = "postgres"
PG_PASS = "0000"

TARGET_DB = "soportetecnicodev_db"
RESET_OBJECTS = False  # True => DROP & CREATE completo

def conn_db(dbname):
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=dbname,
        user=PG_USER, password=PG_PASS
    )

def ensure_database():
    con = psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=PG_SUPER_DB,
        user=PG_USER, password=PG_PASS
    )
    try:
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with con.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (TARGET_DB,))
            if cur.fetchone():
                print(f"[INFO] DB {TARGET_DB} ya existe. Continuando…")
                return
            print(f"[INFO] Creando DB {TARGET_DB} …")
            try:
                cur.execute(
                    f"CREATE DATABASE {TARGET_DB} "
                    "WITH TEMPLATE template0 ENCODING 'UTF8' "
                    "LC_COLLATE 'es_BO.UTF-8' LC_CTYPE 'es_BO.UTF-8'"
                )
            except psycopg2.Error as e:
                print(f"[WARN] No se pudo con es_BO.UTF-8: {e}")
                cur.execute(f"CREATE DATABASE {TARGET_DB} WITH TEMPLATE template0 ENCODING 'UTF8'")
    finally:
        con.close()

def run_ddl(cur, sql, title):
    if not sql.strip():
        return
    print(f"[DDL] {title}")
    cur.execute(sql)

# ---------- DDLs ----------
DDL_DROP = """
-- FKs (por si existen)
ALTER TABLE IF EXISTS public.tareas    DROP CONSTRAINT IF EXISTS fk_servicio;
ALTER TABLE IF EXISTS public.servicios DROP CONSTRAINT IF EXISTS fk_gestion;
ALTER TABLE IF EXISTS public.servicios DROP CONSTRAINT IF EXISTS fk_tecnicoregistro;
ALTER TABLE IF EXISTS public.servicios DROP CONSTRAINT IF EXISTS fk_tecnicoasignado;
ALTER TABLE IF EXISTS public.equipos   DROP CONSTRAINT IF EXISTS fk_tipo;
ALTER TABLE IF EXISTS public.equipos   DROP CONSTRAINT IF EXISTS fk_responsable;

-- Tablas con nombres con punto
DROP TABLE IF EXISTS public."system.indexes" CASCADE;
DROP TABLE IF EXISTS public."usuarios.metadata" CASCADE;
DROP TABLE IF EXISTS public."unidades.metadata" CASCADE;
DROP TABLE IF EXISTS public."tipos.metadata" CASCADE;
DROP TABLE IF EXISTS public."tareas.metadata" CASCADE;
DROP TABLE IF EXISTS public."sos.metadata" CASCADE;
DROP TABLE IF EXISTS public."servicios.metadata" CASCADE;
DROP TABLE IF EXISTS public."secuencias.metadata" CASCADE;
DROP TABLE IF EXISTS public."roles.metadata" CASCADE;
DROP TABLE IF EXISTS public."gestions.metadata" CASCADE;
DROP TABLE IF EXISTS public."equipos.metadata" CASCADE;
DROP TABLE IF EXISTS public."antivirus.metadata" CASCADE;

-- Resto de tablas
DROP TABLE IF EXISTS public."SequelizeMeta" CASCADE;
DROP TABLE IF EXISTS public.lecturas_rfid CASCADE;
DROP TABLE IF EXISTS public.tareas CASCADE;
DROP TABLE IF EXISTS public.servicios CASCADE;
DROP TABLE IF EXISTS public.equipos CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.unidades CASCADE;
DROP TABLE IF EXISTS public.tipos CASCADE;
DROP TABLE IF EXISTS public.sos CASCADE;
DROP TABLE IF EXISTS public.secuencias CASCADE;
DROP TABLE IF EXISTS public.gestions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Secuencias
DROP SEQUENCE IF EXISTS public."system.indexes_system.indexes_id_seq";
DROP SEQUENCE IF EXISTS public.lecturas_rfid_id_seq;
DROP SEQUENCE IF EXISTS public."usuarios.metadata_usuarios.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."unidades.metadata_unidades.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."tipos.metadata_tipos.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."tareas.metadata_tareas.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."sos.metadata_sos.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."servicios.metadata_servicios.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."secuencias.metadata_secuencias.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."roles.metadata_roles.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."gestions.metadata_gestions.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."equipos.metadata_equipos.metadata_id_seq";
DROP SEQUENCE IF EXISTS public."antivirus.metadata_antivirus.metadata_id_seq";

DROP SEQUENCE IF EXISTS public.tareas_tareas_id_seq;
DROP SEQUENCE IF EXISTS public.servicios_servicios_id_seq;
DROP SEQUENCE IF EXISTS public.equipos_equipos_id_seq;
DROP SEQUENCE IF EXISTS public.usuarios_usuarios_id_seq;
DROP SEQUENCE IF EXISTS public.unidades_unidades_id_seq;
DROP SEQUENCE IF EXISTS public.tipos_tipos_id_seq;
DROP SEQUENCE IF EXISTS public.sos_sos_id_seq;
DROP SEQUENCE IF EXISTS public.secuencias_secuencias_id_seq;
DROP SEQUENCE IF EXISTS public.gestions_gestions_id_seq;
DROP SEQUENCE IF EXISTS public.roles_roles_id_seq;
"""

DDL_CREATE = """
CREATE SCHEMA IF NOT EXISTS public;

-- ===== SECUENCIAS base =====
CREATE SEQUENCE IF NOT EXISTS public.roles_roles_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.gestions_gestions_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.secuencias_secuencias_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.sos_sos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.tipos_tipos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.unidades_unidades_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.usuarios_usuarios_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.equipos_equipos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.servicios_servicios_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.tareas_tareas_id_seq;

-- ===== SECUENCIAS extras (lecturas/system/*.metadata) =====
CREATE SEQUENCE IF NOT EXISTS public.lecturas_rfid_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."system.indexes_system.indexes_id_seq";

CREATE SEQUENCE IF NOT EXISTS public."antivirus.metadata_antivirus.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."equipos.metadata_equipos.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."gestions.metadata_gestions.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."roles.metadata_roles.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."secuencias.metadata_secuencias.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."servicios.metadata_servicios.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."sos.metadata_sos.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."tareas.metadata_tareas.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."tipos.metadata_tipos.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."unidades.metadata_unidades.metadata_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."usuarios.metadata_usuarios.metadata_id_seq";

-- ===== TABLAS utilitarias =====
CREATE TABLE IF NOT EXISTS public."SequelizeMeta" (
    name varchar(255) NOT NULL,
    CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name)
);

CREATE TABLE IF NOT EXISTS public.lecturas_rfid (
    id          integer NOT NULL DEFAULT nextval('public.lecturas_rfid_id_seq'::regclass),
    codigo      varchar(50)  NOT NULL,
    fecha_hora  timestamp without time zone NOT NULL,
    oficina     varchar(100) NOT NULL,
    accion      varchar(10),
    CONSTRAINT lecturas_rfid_pkey PRIMARY KEY (id)
);
ALTER SEQUENCE public.lecturas_rfid_id_seq OWNED BY public.lecturas_rfid.id;

CREATE TABLE IF NOT EXISTS public."system.indexes" (
    "system.indexes_id" integer NOT NULL DEFAULT nextval('public."system.indexes_system.indexes_id_seq"'::regclass),
    v integer,
    key text,
    name text,
    ns  text,
    CONSTRAINT "system.indexes_pkey" PRIMARY KEY ("system.indexes_id")
);
ALTER SEQUENCE public."system.indexes_system.indexes_id_seq" OWNED BY public."system.indexes"."system.indexes_id";

-- ===== TABLAS base =====
CREATE TABLE IF NOT EXISTS public.roles (
    roles_id    integer NOT NULL DEFAULT nextval('public.roles_roles_id_seq'::regclass),
    descripcion text,
    estado      integer,
    __v         integer,
    PRIMARY KEY (roles_id)
);

CREATE TABLE IF NOT EXISTS public.gestions (
    gestions_id integer NOT NULL DEFAULT nextval('public.gestions_gestions_id_seq'::regclass),
    numero      integer,
    anio        text,
    descripcion text,
    estado      integer,
    __v         integer,
    PRIMARY KEY (gestions_id)
);

CREATE TABLE IF NOT EXISTS public.secuencias (
    secuencias_id integer NOT NULL DEFAULT nextval('public.secuencias_secuencias_id_seq'::regclass),
    numero        integer,
    descripcion   text,
    estado        integer,
    __v           integer,
    PRIMARY KEY (secuencias_id)
);

CREATE TABLE IF NOT EXISTS public.sos (
    sos_id      integer NOT NULL DEFAULT nextval('public.sos_sos_id_seq'::regclass),
    descripcion text,
    estado      integer,
    __v         integer,
    PRIMARY KEY (sos_id)
);

CREATE TABLE IF NOT EXISTS public.tipos (
    tipos_id    integer NOT NULL DEFAULT nextval('public.tipos_tipos_id_seq'::regclass),
    descripcion text,
    formulario  text,
    estado      integer,
    __v         integer,
    PRIMARY KEY (tipos_id)
);

CREATE TABLE IF NOT EXISTS public.unidades (
    unidades_id integer NOT NULL DEFAULT nextval('public.unidades_unidades_id_seq'::regclass),
    nombre      text,
    interno     text,
    telefono    text,
    direccion   text,
    estado      integer,
    __v         integer,
    PRIMARY KEY (unidades_id)
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    usuarios_id integer NOT NULL DEFAULT nextval('public.usuarios_usuarios_id_seq'::regclass),
    nombres     text,
    apellidos   text,
    usuario     text,
    email       text,
    role        text,
    image       text,
    estado      integer,
    password    text,
    __v         integer,
    PRIMARY KEY (usuarios_id)
);

CREATE TABLE IF NOT EXISTS public.equipos (
    equipos_id          integer NOT NULL DEFAULT nextval('public.equipos_equipos_id_seq'::regclass),
    garantia            text,
    fecharegistro       text,
    tipo                integer,
    codigo              text,
    marca               text,
    modelo              text,
    serie               text,
    tarjetamadre        text,
    procesador          text,
    memoria             text,
    discoduro           text,
    tarjetavideo        text,
    lector              text,
    so                  text,
    antivirus           text,
    ip                  text,
    mac                 text,
    oficina             text,
    responsable         integer,
    funcionarioasignado text,
    funcionariousuario  text,
    __v                 integer,
    PRIMARY KEY (equipos_id)
);

CREATE TABLE IF NOT EXISTS public.servicios (
    servicios_id                integer NOT NULL DEFAULT nextval('public.servicios_servicios_id_seq'::regclass),
    numero                      integer,
    "fechaRegistro"             text,
    "fechaInicio"               text,
    "fechaTerminado"            text,
    "fechaEgreso"               text,
    gestion                     integer,
    equipo                      text,
    tipo                        text,
    "tecnicoRegistro"           integer,
    "ciSolicitante"             text,
    "nombreSolicitante"         text,
    "cargoSolicitante"          text,
    "telefonoSolicitante"       text,
    "tipoSolicitante"           text,
    "oficinaSolicitante"        text,
    "tecnicoAsignado"           integer,
    problema                    text,
    observaciones               text,
    informe                     text,
    "tecnicoEgreso"             text,
    "ciResponsableEgreso"       text,
    "nombreResponsableEgreso"   text,
    "cargoResponsableEgreso"    text,
    "telefonoResponsableEgreso" text,
    "tipoResponsableEgreso"     text,
    "oficinaResponsableEgreso"  text,
    estado                      text,
    __v                         integer,
    PRIMARY KEY (servicios_id)
);

CREATE TABLE IF NOT EXISTS public.tareas (
    tareas_id   integer NOT NULL DEFAULT nextval('public.tareas_tareas_id_seq'::regclass),
    fecha       text,
    servicio    integer,
    descripcion text,
    __v         integer,
    PRIMARY KEY (tareas_id)
);

-- ===== TABLAS *.metadata (como en el dump) =====
CREATE TABLE IF NOT EXISTS public."antivirus.metadata" (
    "antivirus.metadata_id" integer NOT NULL DEFAULT nextval('public."antivirus.metadata_antivirus.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "antivirus.metadata_pkey" PRIMARY KEY ("antivirus.metadata_id")
);
ALTER SEQUENCE public."antivirus.metadata_antivirus.metadata_id_seq" OWNED BY public."antivirus.metadata"."antivirus.metadata_id";

CREATE TABLE IF NOT EXISTS public."equipos.metadata" (
    "equipos.metadata_id" integer NOT NULL DEFAULT nextval('public."equipos.metadata_equipos.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "equipos.metadata_pkey" PRIMARY KEY ("equipos.metadata_id")
);
ALTER SEQUENCE public."equipos.metadata_equipos.metadata_id_seq" OWNED BY public."equipos.metadata"."equipos.metadata_id";

CREATE TABLE IF NOT EXISTS public."gestions.metadata" (
    "gestions.metadata_id" integer NOT NULL DEFAULT nextval('public."gestions.metadata_gestions.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "gestions.metadata_pkey" PRIMARY KEY ("gestions.metadata_id")
);
ALTER SEQUENCE public."gestions.metadata_gestions.metadata_id_seq" OWNED BY public."gestions.metadata"."gestions.metadata_id";

CREATE TABLE IF NOT EXISTS public."roles.metadata" (
    "roles.metadata_id" integer NOT NULL DEFAULT nextval('public."roles.metadata_roles.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "roles.metadata_pkey" PRIMARY KEY ("roles.metadata_id")
);
ALTER SEQUENCE public."roles.metadata_roles.metadata_id_seq" OWNED BY public."roles.metadata"."roles.metadata_id";

CREATE TABLE IF NOT EXISTS public."secuencias.metadata" (
    "secuencias.metadata_id" integer NOT NULL DEFAULT nextval('public."secuencias.metadata_secuencias.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "secuencias.metadata_pkey" PRIMARY KEY ("secuencias.metadata_id")
);
ALTER SEQUENCE public."secuencias.metadata_secuencias.metadata_id_seq" OWNED BY public."secuencias.metadata"."secuencias.metadata_id";

CREATE TABLE IF NOT EXISTS public."servicios.metadata" (
    "servicios.metadata_id" integer NOT NULL DEFAULT nextval('public."servicios.metadata_servicios.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "servicios.metadata_pkey" PRIMARY KEY ("servicios.metadata_id")
);
ALTER SEQUENCE public."servicios.metadata_servicios.metadata_id_seq" OWNED BY public."servicios.metadata"."servicios.metadata_id";

CREATE TABLE IF NOT EXISTS public."sos.metadata" (
    "sos.metadata_id" integer NOT NULL DEFAULT nextval('public."sos.metadata_sos.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "sos.metadata_pkey" PRIMARY KEY ("sos.metadata_id")
);
ALTER SEQUENCE public."sos.metadata_sos.metadata_id_seq" OWNED BY public."sos.metadata"."sos.metadata_id";

CREATE TABLE IF NOT EXISTS public."tareas.metadata" (
    "tareas.metadata_id" integer NOT NULL DEFAULT nextval('public."tareas.metadata_tareas.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "tareas.metadata_pkey" PRIMARY KEY ("tareas.metadata_id")
);
ALTER SEQUENCE public."tareas.metadata_tareas.metadata_id_seq" OWNED BY public."tareas.metadata"."tareas.metadata_id";

CREATE TABLE IF NOT EXISTS public."tipos.metadata" (
    "tipos.metadata_id" integer NOT NULL DEFAULT nextval('public."tipos.metadata_tipos.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "tipos.metadata_pkey" PRIMARY KEY ("tipos.metadata_id")
);
ALTER SEQUENCE public."tipos.metadata_tipos.metadata_id_seq" OWNED BY public."tipos.metadata"."tipos.metadata_id";

CREATE TABLE IF NOT EXISTS public."unidades.metadata" (
    "unidades.metadata_id" integer NOT NULL DEFAULT nextval('public."unidades.metadata_unidades.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "unidades.metadata_pkey" PRIMARY KEY ("unidades.metadata_id")
);
ALTER SEQUENCE public."unidades.metadata_unidades.metadata_id_seq" OWNED BY public."unidades.metadata"."unidades.metadata_id";

CREATE TABLE IF NOT EXISTS public."usuarios.metadata" (
    "usuarios.metadata_id" integer NOT NULL DEFAULT nextval('public."usuarios.metadata_usuarios.metadata_id_seq"'::regclass),
    options text,
    indexes text,
    CONSTRAINT "usuarios.metadata_pkey" PRIMARY KEY ("usuarios.metadata_id")
);
ALTER SEQUENCE public."usuarios.metadata_usuarios.metadata_id_seq" OWNED BY public."usuarios.metadata"."usuarios.metadata_id";

-- Propiedad de secuencias base
ALTER SEQUENCE public.roles_roles_id_seq           OWNED BY public.roles.roles_id;
ALTER SEQUENCE public.gestions_gestions_id_seq     OWNED BY public.gestions.gestions_id;
ALTER SEQUENCE public.secuencias_secuencias_id_seq OWNED BY public.secuencias.secuencias_id;
ALTER SEQUENCE public.sos_sos_id_seq               OWNED BY public.sos.sos_id;
ALTER SEQUENCE public.tipos_tipos_id_seq           OWNED BY public.tipos.tipos_id;
ALTER SEQUENCE public.unidades_unidades_id_seq     OWNED BY public.unidades.unidades_id;
ALTER SEQUENCE public.usuarios_usuarios_id_seq     OWNED BY public.usuarios.usuarios_id;
ALTER SEQUENCE public.equipos_equipos_id_seq       OWNED BY public.equipos.equipos_id;
ALTER SEQUENCE public.servicios_servicios_id_seq   OWNED BY public.servicios.servicios_id;
ALTER SEQUENCE public.tareas_tareas_id_seq         OWNED BY public.tareas.tareas_id;
"""

DDL_FKS = """
ALTER TABLE public.equipos
    ADD CONSTRAINT fk_tipo        FOREIGN KEY (tipo)        REFERENCES public.tipos(tipos_id)       ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT fk_responsable FOREIGN KEY (responsable) REFERENCES public.usuarios(usuarios_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.servicios
    ADD CONSTRAINT fk_gestion          FOREIGN KEY (gestion)           REFERENCES public.gestions(gestions_id) ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT fk_tecnicoregistro  FOREIGN KEY ("tecnicoRegistro") REFERENCES public.usuarios(usuarios_id) ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT fk_tecnicoasignado  FOREIGN KEY ("tecnicoAsignado") REFERENCES public.usuarios(usuarios_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.tareas
    ADD CONSTRAINT fk_servicio         FOREIGN KEY (servicio)          REFERENCES public.servicios(servicios_id) ON UPDATE CASCADE ON DELETE CASCADE;
"""

DDL_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower      ON public.usuarios (lower(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario_lower    ON public.usuarios (lower(usuario));
CREATE INDEX IF NOT EXISTS idx_tipos_descripcion_lower   ON public.tipos (lower(descripcion));
CREATE INDEX IF NOT EXISTS idx_servicios_estado          ON public.servicios (estado);
CREATE INDEX IF NOT EXISTS idx_servicios_fecha_registro  ON public.servicios ("fechaRegistro");
"""

# (Opcional) permisos estilo dump:
DDL_ACL = """
-- Estos permisos replican el dump (puedes omitir si no los necesitas)
COMMENT ON SCHEMA public IS 'standard public schema';
REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
"""

def main():
    ensure_database()
    with conn_db(TARGET_DB) as con:
        con.autocommit = False
        with con.cursor() as cur:
            if RESET_OBJECTS:
                run_ddl(cur, DDL_DROP,   "DROP objetos existentes")
            run_ddl(cur, DDL_CREATE,  "CREATE tablas + secuencias (incluye *.metadata, SequelizeMeta, lecturas_rfid, system.indexes)")
            run_ddl(cur, DDL_FKS,     "CREATE FKs")
            run_ddl(cur, DDL_INDEXES, "CREATE índices útiles")
            run_ddl(cur, DDL_ACL,     "ACL/Comentario de esquema (opcional)")
        con.commit()
    print("✅ Esquema creado/actualizado en", TARGET_DB)

if __name__ == "__main__":
    main()
