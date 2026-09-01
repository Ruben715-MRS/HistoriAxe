-- =========================================================================
-- HistoriAxe — schéma Postgres du backend (classement mondial + sync cloud)
-- =========================================================================
-- Ce fichier est fourni pour référence / migration manuelle (psql, Neon SQL
-- editor, Supabase SQL editor...). Il n'est PAS exécuté automatiquement par
-- Vercel : les fonctions serverless (voir api/_lib/db.js, ensureSchema)
-- exécutent déjà ces mêmes `create table if not exists` au premier appel de
-- chaque déploiement, donc en pratique aucune étape manuelle n'est requise
-- après avoir renseigné DATABASE_URL. Garder ce fichier en phase avec
-- api/_lib/db.js si vous modifiez l'un des deux.

create table if not exists players (
    id            uuid primary key,
    device_id     text unique not null,
    pseudo        text not null default 'Anonyme',
    created_at    timestamptz not null default now(),
    last_seen_at  timestamptz not null default now()
);

create table if not exists daily_scores (
    id             bigserial primary key,
    player_id      uuid not null references players(id) on delete cascade,
    challenge_date date not null,
    lang           text not null,
    score          integer not null,
    time_seconds   numeric(6,1) not null default 0,
    rounds_played  smallint not null default 0,
    rounds_total   smallint not null default 0,
    won            boolean not null default false,
    suspicious     boolean not null default false,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    unique (player_id, challenge_date, lang)
);

create index if not exists idx_daily_scores_leaderboard
    on daily_scores (challenge_date, lang, score desc, time_seconds asc);

create index if not exists idx_daily_scores_player
    on daily_scores (player_id);

create table if not exists player_progress (
    player_id   uuid primary key references players(id) on delete cascade,
    data        jsonb not null default '{}'::jsonb,
    updated_at  timestamptz not null default now()
);

-- Ligues hebdomadaires (voir api/league.js) : un total d'XP hebdo par joueur
-- et par semaine ISO ('2026-W36'). Le regroupement en ligues n'est PAS
-- persisté : il est recalculé à la volée par hash déterministe
-- (player_id + semaine ISO), pour ne dépendre d'aucune tâche planifiée. Avec
-- peu de joueurs actifs, certains groupes seront petits/vides en début de
-- vie du produit — limite connue et acceptée pour ce premier jet.
create table if not exists weekly_xp (
    player_id   uuid not null references players(id) on delete cascade,
    iso_week    text not null,
    xp          integer not null default 0,
    updated_at  timestamptz not null default now(),
    primary key (player_id, iso_week)
);

create index if not exists idx_weekly_xp_week_xp
    on weekly_xp (iso_week, xp desc);

-- Duels asynchrones entre amis (voir api/duels.js) : un lien/code partageable
-- pointant vers le score du créateur sur le Défi du jour d'une date donnée ;
-- le score de l'adversaire est lu directement dans daily_scores (même
-- joueur/date/lang), pas dupliqué ici.
create table if not exists duels (
    id                  text primary key,
    creator_player_id   uuid not null references players(id) on delete cascade,
    opponent_player_id  uuid references players(id) on delete set null,
    challenge_date      date not null,
    lang                text not null,
    created_at          timestamptz not null default now(),
    opened_at           timestamptz,
    notified            boolean not null default false
);

create index if not exists idx_duels_creator
    on duels (creator_player_id);
