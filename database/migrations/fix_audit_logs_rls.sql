-- Quick fix for audit_logs RLS policy issue
-- This modifies the audit trigger function to use SECURITY DEFINER
-- which allows it to bypass RLS when inserting audit logs

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with elevated privileges to bypass RLS
SET search_path = public, auth
AS $$
DECLARE
    curr_user_id UUID;
BEGIN
    curr_user_id := auth.uid();
    
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
        VALUES (curr_user_id, 'DELETE', TG_TABLE_NAME, OLD.id::text, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (curr_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
        VALUES (curr_user_id, 'INSERT', TG_TABLE_NAME, NEW.id::text, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
