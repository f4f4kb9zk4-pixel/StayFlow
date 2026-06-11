-- ============================================================================
-- StayFlow — Arrivals: PMS "Arrivals: Detailed" report import
-- Adds the extra reservation fields carried by Opera-style PMS arrival
-- reports so the Arrival & VIP Board can be enriched via PDF import,
-- without losing any data already captured manually.
-- ============================================================================

alter table arrivals
  add column if not exists departure_date date,
  add column if not exists room_type text,            -- e.g. "LXOCK" (PMS room type code)
  add column if not exists confirmation_number text,  -- PMS "Conf. No." — used to dedupe re-imports
  add column if not exists nights int,
  add column if not exists adults int,
  add column if not exists pms_notes text;            -- combined Reservation/Profile/General notes + traces

-- Re-importing the same report should update existing rows rather than
-- create duplicates, scoped per hotel.
create unique index if not exists arrivals_hotel_confirmation_number_key
  on arrivals (hotel_id, confirmation_number)
  where confirmation_number is not null;
