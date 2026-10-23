-- ════════════════════════════════════════════════════════════════
--  acces-demandes.sql — demandes d'accès validées depuis /admin (8.1.0)
--
--  À lancer APRÈS acces.sql et acces-niveaux.sql, une fois, dans
--  Supabase → SQL Editor → New query → Run. Le relancer ne casse rien.
--
--  Un appareil sans clé demande l'accès (pseudo, niveau, message) ;
--  les appareils administrateurs reçoivent une notification ; /admin
--  accepte (une clé est créée, déjà activée pour cet appareil) ou
--  refuse. Une demande sans réponse expire au bout de 7 jours.
--
--  Les clés existantes ne sont pas touchées.
--
--  Personne ne lit ces tables directement : tout passe par la fonction
--  acces_demande, réservée aux fonctions Netlify (jeton ACCES_JETON,
--  dont seule l'empreinte figure ici, comme dans acces-niveaux.sql).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.acces_demandes (
  id           uuid primary key default gen_random_uuid(),
  pseudo       text not null,
  niveau       text not null check (niveau in ('licence', 'm1', 'm2')),
  message      text,
  appareil     text,
  cle_actuelle uuid,                          -- l'appareil avait déjà une clé (autre niveau)
  statut       text not null default 'attente' check (statut in ('attente', 'acceptee', 'refusee')),
  cree         timestamptz not null default now(),
  traitee      timestamptz,
  cle_id       uuid,                          -- clé créée à l'acceptation
  recuperee    timestamptz                    -- l'appareil a reçu son accès
);
alter table public.acces_demandes enable row level security;
revoke all on public.acces_demandes from anon, authenticated;

-- Appareils administrateurs qui reçoivent les notifications de demande.
create table if not exists public.acces_admin_push (
  endpoint text primary key,
  p256dh   text not null,
  auth     text not null,
  cle_id   uuid not null,                     -- la clé admin de l'appareil
  cree     timestamptz not null default now()
);
alter table public.acces_admin_push enable row level security;
revoke all on public.acces_admin_push from anon, authenticated;

create or replace function public.acces_demande(p_jeton text, p_action text, p_donnees jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  r jsonb; d public.acces_demandes; v_id uuid;
  v_ident uuid := nullif(p_donnees->>'id', '')::uuid;
begin
  if encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     <> '07a0ba5dad1748f64ced608ffdeb388456b29ed38d1957df767ce10665949537' then
    raise exception 'refusé' using errcode = '42501';
  end if;

  if p_action = 'creer' then
    insert into public.acces_demandes (pseudo, niveau, message, appareil, cle_actuelle)
    values (left(btrim(p_donnees->>'pseudo'), 24), p_donnees->>'niveau', nullif(left(btrim(coalesce(p_donnees->>'message', '')), 200), ''),
            left(coalesce(p_donnees->>'appareil', ''), 80), nullif(p_donnees->>'cle_actuelle', '')::uuid)
    returning id into v_id;
    -- ménage : demandes de plus de 30 jours
    delete from public.acces_demandes where cree < now() - interval '30 days';
    return jsonb_build_object('id', v_id);

  elsif p_action = 'etat' then
    select * into d from public.acces_demandes where id = v_ident;
    if not found then return jsonb_build_object('statut', 'inconnue'); end if;
    return jsonb_build_object(
      'statut', case when d.statut = 'attente' and d.cree < now() - interval '7 days' then 'expiree' else d.statut end,
      'pseudo', d.pseudo, 'niveau', d.niveau, 'cree', d.cree, 'traitee', d.traitee,
      'refus_jour', (d.traitee at time zone 'Europe/Paris')::date,
      'recuperee', d.recuperee is not null,
      'cle_id', d.cle_id,
      'annee', (select annee from public.acces_cles where id = d.cle_id));

  elsif p_action = 'recuperer' then
    -- une seule fois : l'appareil reçoit son cookie d'accès
    update public.acces_demandes set recuperee = now()
     where id = v_ident and statut = 'acceptee' and recuperee is null
    returning * into d;
    if not found then return jsonb_build_object('ok', false); end if;
    return jsonb_build_object('ok', true, 'cle_id', d.cle_id);

  elsif p_action = 'liste' then
    select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'pseudo', x.pseudo, 'niveau', x.niveau, 'message', x.message,
             'appareil', x.appareil, 'cree', x.cree, 'traitee', x.traitee, 'recuperee', x.recuperee,
             'statut', case when x.statut = 'attente' and x.cree < now() - interval '7 days' then 'expiree' else x.statut end,
             'cle_actuelle', (select jsonb_build_object('niveau', c.niveau, 'pseudo', c.pseudo) from public.acces_cles c where c.id = x.cle_actuelle))
             order by x.cree desc), '[]'::jsonb) into r
      from public.acces_demandes x
     where x.cree > now() - interval '14 days';
    return r;

  elsif p_action = 'accepter' then
    select * into d from public.acces_demandes where id = v_ident for update;
    if not found or d.statut <> 'attente' or d.cree < now() - interval '7 days' then
      return jsonb_build_object('ok', false);
    end if;
    insert into public.acces_cles (cle_hash, nom, suffixe, utilisee, appareil, pseudo, niveau, annee)
    values (p_donnees->>'hash', left('Demande · '||d.pseudo, 60), p_donnees->>'suffixe', now(), d.appareil, d.pseudo,
            coalesce(p_donnees->>'niveau', d.niveau), coalesce(p_donnees->>'annee', '2026-2027'))
    returning id into v_id;
    update public.acces_demandes set statut = 'acceptee', traitee = now(), cle_id = v_id,
           niveau = coalesce(p_donnees->>'niveau', d.niveau)
     where id = d.id;
    return jsonb_build_object('ok', true, 'cle_id', v_id);

  elsif p_action = 'refuser' then
    update public.acces_demandes set statut = 'refusee', traitee = now()
     where id = v_ident and statut = 'attente';
    return jsonb_build_object('ok', found);

  elsif p_action = 'push_abonner' then
    insert into public.acces_admin_push (endpoint, p256dh, auth, cle_id)
    values (p_donnees->>'endpoint', p_donnees->>'p256dh', p_donnees->>'auth', (p_donnees->>'cle_id')::uuid)
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, cle_id = excluded.cle_id, cree = now();
    return jsonb_build_object('ok', true);

  elsif p_action = 'push_retirer' then
    delete from public.acces_admin_push where endpoint = p_donnees->>'endpoint';
    return jsonb_build_object('ok', true);

  elsif p_action = 'push_liste' then
    -- seulement les appareils dont la clé est TOUJOURS admin et non révoquée
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth, 'cle_id', p.cle_id)), '[]'::jsonb) into r
      from public.acces_admin_push p join public.acces_cles c on c.id = p.cle_id
     where c.admin and not c.revoquee;
    return r;
  end if;
  raise exception 'action inconnue';
end $$;

revoke all on function public.acces_demande(text, text, jsonb) from public;
grant execute on function public.acces_demande(text, text, jsonb) to anon;
