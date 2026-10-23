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

-- Comptes (voir api/account.js) : identifiant Supabase Auth du joueur connecté.
alter table players add column if not exists auth_user_id uuid unique;

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

-- Défi hebdomadaire (voir api/weeklyScores.js, api/weeklyLeaderboard.js) :
-- même structure que daily_scores ci-dessus, une ligne par joueur/semaine
-- ISO/langue — nommée "weekly_challenge_scores" (et non "weekly_scores")
-- pour ne pas se confondre avec weekly_xp (ligue hebdomadaire par XP
-- cumulé, table différente, feature différente) plus bas.
create table if not exists weekly_challenge_scores (
    id             bigserial primary key,
    player_id      uuid not null references players(id) on delete cascade,
    challenge_week text not null,
    lang           text not null,
    score          integer not null,
    time_seconds   numeric(7,1) not null default 0,
    rounds_played  smallint not null default 0,
    rounds_total   smallint not null default 0,
    won            boolean not null default false,
    suspicious     boolean not null default false,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    unique (player_id, challenge_week, lang)
);

create index if not exists idx_weekly_challenge_scores_leaderboard
    on weekly_challenge_scores (challenge_week, lang, score desc, time_seconds asc);

create index if not exists idx_weekly_challenge_scores_player
    on weekly_challenge_scores (player_id);

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

-- Mode Classe (voir api/classroom.js) : une séance, ses élèves, le résultat de chaque carte.
create table if not exists class_sessions (
    code        text primary key,
    teacher_id  uuid not null references players(id) on delete cascade,
    lang        text not null,
    theme_name  text not null,
    event_ids   jsonb not null,
    status      text not null default 'lobby',
    created_at  timestamptz not null default now(),
    started_at  timestamptz,
    ended_at    timestamptz
);

create table if not exists class_players (
    code        text not null references class_sessions(code) on delete cascade,
    player_id   uuid not null references players(id) on delete cascade,
    name        text not null,
    score       integer not null default 0,
    answered    smallint not null default 0,
    correct     smallint not null default 0,
    finished    boolean not null default false,
    results     jsonb not null default '[]'::jsonb,
    joined_at   timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    primary key (code, player_id)
);

-- Équipe de classe (voir api/team.js) : coffre commun, membres, points cumulés des joueurs avec compte.
alter table players add column if not exists team_points integer not null default 0;

create table if not exists class_teams (
    code             text primary key,
    teacher_id       uuid not null references players(id) on delete cascade,
    name             text not null,
    progress         integer not null default 0,
    chest_index      integer not null default 0,
    cards            integer not null default 0,
    created_at       timestamptz not null default now(),
    last_activity_at timestamptz not null default now()
);

create table if not exists team_members (
    code        text not null references class_teams(code) on delete cascade,
    player_id   uuid not null references players(id) on delete cascade,
    name        text not null,
    points      integer not null default 0,
    day         text not null default '',
    day_points  integer not null default 0,
    claimed     integer not null default 0,
    joined_at   timestamptz not null default now(),
    primary key (code, player_id)
);

alter table class_teams add column if not exists badge text not null default '0.2.1.0';
alter table class_teams add column if not exists description text not null default '';
alter table class_teams add column if not exists country text not null default '';
alter table class_teams add column if not exists lang text not null default '';
alter table class_teams add column if not exists leader_level smallint not null default 1;
alter table class_teams add column if not exists points_total integer not null default 0;
alter table class_teams add column if not exists listed boolean not null default true;
alter table team_members add column if not exists level smallint not null default 1;

create table if not exists team_challenges (
    id         bigserial primary key,
    from_code  text not null references class_teams(code) on delete cascade,
    to_code    text not null references class_teams(code) on delete cascade,
    status     text not null default 'pending',
    created_at timestamptz not null default now(),
    ends_at    timestamptz,
    from_base  integer not null default 0,
    to_base    integer not null default 0,
    from_score integer,
    to_score   integer
);

-- Amis (api/friends.js) : identifiant d'ami généré (sans lien avec l'e-mail), niveau affiché, demandes acceptées ou non.
alter table players add column if not exists friend_code text unique;
alter table players add column if not exists friend_requests boolean not null default true;
alter table players add column if not exists level smallint not null default 1;

create table if not exists friendships (
    id           bigserial primary key,
    requester_id uuid not null references players(id) on delete cascade,
    addressee_id uuid not null references players(id) on delete cascade,
    status       text not null default 'pending',
    created_at   timestamptz not null default now(),
    unique (requester_id, addressee_id)
);

alter table class_sessions add column if not exists team_code text;
-- Les modes enchaînés pendant la séance, dans l'ordre de jeu (js/classModes.js).
alter table class_sessions add column if not exists modes jsonb not null default '["frise"]'::jsonb;
alter table class_players add column if not exists credited smallint not null default 0;
