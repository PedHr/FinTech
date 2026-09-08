-- Execute como o proprietário do schema, substituindo fincontrol_app pelo papel de runtime.
GRANT CONNECT ON DATABASE fincontrol TO fincontrol_app;
GRANT USAGE ON SCHEMA public TO fincontrol_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fincontrol_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fincontrol_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fincontrol_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fincontrol_app;
