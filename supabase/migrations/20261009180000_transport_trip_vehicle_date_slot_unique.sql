-- Enforce one live trip per vehicle + service date + slot (morning/evening).
-- Soft-deleted rows (deleted_at IS NOT NULL) are excluded so history can be retained.
--
-- Deployment prerequisite:
--   If this migration raises, resolve live duplicates explicitly (do not auto-merge).
--   Typical remediation: soft-delete unintended extras, keep the authoritative trip
--   (prefer active/non-finalized, else newest started_at / created_at), then re-apply.
-- Do not run destructive remediation against production from CI without review.

DO $$
DECLARE
  dup_groups integer;
BEGIN
  SELECT COUNT(*) INTO dup_groups
  FROM (
    SELECT vehicle_id, trip_date, slot
    FROM public.transport_trip
    WHERE deleted_at IS NULL
    GROUP BY vehicle_id, trip_date, slot
    HAVING COUNT(*) > 1
  ) d;

  IF dup_groups > 0 THEN
    RAISE EXCEPTION
      'transport_trip_vehicle_date_slot_live_uidx blocked: % live vehicle/date/slot group(s) have duplicates. Soft-delete unintended extras, then re-run this migration.',
      dup_groups;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS transport_trip_vehicle_date_slot_live_uidx
  ON public.transport_trip (vehicle_id, trip_date, slot)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX public.transport_trip_vehicle_date_slot_live_uidx IS
  'Business rule: at most one non-deleted trip per vehicle + trip_date + slot (Pickup vs Drop).';
