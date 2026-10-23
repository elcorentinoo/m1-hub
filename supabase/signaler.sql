-- ════════════════════════════════════════════════════════════════
--  signaler.sql — « Signaler une erreur » (A3)
--
--  Chaque signalement envoyé depuis le site (lien discret sous les
--  questions) est gardé ici, en plus de l'e-mail envoyé à Corentin :
--  rien n'est perdu si l'e-mail n'arrive pas. La table sert aussi à
--  limiter les envois par appareil (5 par heure, 20 par jour).
--
--  Personne ne lit la table directement (aucun droit pour anon) : tout
--  passe par la fonction signaler_enregistrer, appelée par la fonction
--  Netlify « signaler » après vérification du cookie de clé.
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run.
--  Le relancer ne casse rien. Sans ce fichier, le signalement marche
--  quand même (e-mail seul, limite gardée en mémoire par Netlify).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.signalements (
  id        bigint generated always as identity primary key,
  cle_id    uuid not null,
  pseudo    text,
  cree      timestamptz not null default now(),
  donnees   jsonb not null default '{}'::jsonb,   -- page, matière, leçon, question, message…
  traite    boolean not null default false
);
create index if not exists signalements_cle_cree on public.signalements (cle_id, cree desc);

alter table public.signalements enable row level security;
revoke all on public.signalements from anon, authenticated;

-- Enregistre un signalement si l'appareil n'a pas dépassé sa limite.
-- Renvoie {ok, pseudo} (pseudo connu de la clé) ou {ok:false, raison}.
create or replace function public.signaler_enregistrer(p_id uuid, p_donnees jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pseudo text;
  v_heure int;
  v_jour int;
begin
  select pseudo into v_pseudo from public.acces_cles
   where id = p_id and not revoquee and utilisee is not null;
  if not found then return jsonb_build_object('ok', false, 'raison', 'cle'); end if;
  select count(*) filter (where cree > now() - interval '1 hour'), count(*)
    into v_heure, v_jour
    from public.signalements where cle_id = p_id and cree > now() - interval '1 day';
  if v_heure >= 5 or v_jour >= 20 then return jsonb_build_object('ok', false, 'raison', 'limite'); end if;
  insert into public.signalements (cle_id, pseudo, donnees)
       values (p_id, v_pseudo, coalesce(p_donnees, '{}'::jsonb));
  -- on ne garde qu'un an de signalements
  delete from public.signalements where cree < now() - interval '1 year';
  return jsonb_build_object('ok', true, 'pseudo', v_pseudo);
end $$;

revoke all on function public.signaler_enregistrer(uuid, jsonb) from public;
grant execute on function public.signaler_enregistrer(uuid, jsonb) to anon, authenticated;
