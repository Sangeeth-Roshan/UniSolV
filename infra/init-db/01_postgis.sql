-- Init script: enable PostGIS on the unisolv database.
-- This file is mounted into /docker-entrypoint-initdb.d/ and runs automatically
-- on the very first container startup (after the database is created).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
