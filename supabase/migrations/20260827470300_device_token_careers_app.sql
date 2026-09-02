-- Allow careers standalone app to register push device tokens.
ALTER TABLE public.device_token
  DROP CONSTRAINT IF EXISTS device_token_app_check;

ALTER TABLE public.device_token
  ADD CONSTRAINT device_token_app_check CHECK (
    app IN ('connect', 'admin', 'transport', 'nexus', 'careers')
  );
