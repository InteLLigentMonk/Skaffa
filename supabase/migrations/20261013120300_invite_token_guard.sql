-- ----------------------------------------------------------------------------
-- Token och giltighetstid bestäms av servern, aldrig av klienten.
--
-- tokens_insert och tokens_update kontrollerar bara att anroparen äger hemmet.
-- Kolumnernas defaults gäller bara när klienten låter bli att skicka värdet, så
-- en ägare kunde via API:t:
--   * sätta token = '1' — gissningsbar, och peek_invite/redeem_invite tar emot
--     den som vilken token som helst
--   * sätta expires_at år 9999, eller förlänga en gammal inbjudan
--   * sätta revoked = false på en inbjudan som redan återkallats
--
-- Appen skickar bara home_id och created_by (createInvite i home/api.ts), så
-- inget i klienten ändras av det här.
--
-- extensions i search_path: pgcrypto är installerat där på Supabase, och
-- gen_random_bytes hittas annars inte.
-- ----------------------------------------------------------------------------

create function guard_invite_token()
returns trigger language plpgsql
set search_path = public, extensions as $$
begin
  if tg_op = 'INSERT' then
    -- Samma värden som kolumnernas defaults i baseline.
    new.token      := encode(gen_random_bytes(18), 'hex');
    new.expires_at := now() + interval '7 days';
    new.revoked    := false;
    new.created_at := now();
    return new;
  end if;

  -- UPDATE: det enda som får ändras är att inbjudan återkallas.
  if new.token      <> old.token
     or new.expires_at <> old.expires_at
     or new.home_id    <> old.home_id
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception 'En inbjudan kan bara återkallas, inte ändras';
  end if;

  if old.revoked and not new.revoked then
    raise exception 'En återkallad inbjudan kan inte återaktiveras';
  end if;

  return new;
end;
$$;

create trigger trg_invite_token_guard
  before insert or update on invite_tokens
  for each row execute function guard_invite_token();
