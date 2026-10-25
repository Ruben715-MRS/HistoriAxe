// =========================================================================
// === HISTORIAXE API — CONNEXION POSTGRES (Neon / Supabase / Vercel PG) ===
// =========================================================================
// Nécessite la variable d'environnement DATABASE_URL (chaîne de connexion
// Postgres standard, ex: postgres://user:pass@host/db?sslmode=require).
// Voir README.md pour la configuration côté Vercel.

const { Pool } = require('pg');

let pool = null;
let schemaReady = null;

function getPool() {
    if (pool) return pool;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        const err = new Error(
            "DATABASE_URL n'est pas configuré. Ajoutez cette variable d'environnement " +
            '(Vercel → Project Settings → Environment Variables) avec la chaîne de connexion ' +
            "de votre base Postgres (Neon, Supabase, ou Vercel Postgres)."
        );
        err.statusCode = 500;
        throw err;
    }
    // Les providers hébergés (Neon, Supabase, Vercel Postgres) exigent TLS ;
    // leur certificat n'est pas toujours dans la chaîne de confiance par
    // défaut du runtime Node de la lambda, d'où rejectUnauthorized: false
    // (chiffrement actif, on ne valide juste pas la CA — acceptable ici, la
    // chaîne de connexion elle-même est un secret gardé côté serveur).
    const needsSsl = /sslmode=require|neon\.tech|supabase\.co|vercel-storage\.com/i.test(connectionString);
    pool = new Pool({
        connectionString,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
        max: 3,
        idleTimeoutMillis: 10000,
    });
    return pool;
}

async function query(text, params) {
    const p = getPool();
    return p.query(text, params);
}

// Auto-migration idempotente : crée les tables si elles n'existent pas
// encore. Exécutée une seule fois par instance de fonction "chaude" (le
// résultat de la promesse est mis en cache), pour éviter de refaire ces
// `create table if not exists` à chaque requête.
async function ensureSchema() {
    if (schemaReady) return schemaReady;
    schemaReady = (async () => {
        await query(`
            create table if not exists players (
                id            uuid primary key,
                device_id     text unique not null,
                pseudo        text not null default 'Anonyme',
                created_at    timestamptz not null default now(),
                last_seen_at  timestamptz not null default now()
            );
        `);
        // Comptes (voir api/account.js) : identifiant Supabase Auth du joueur connecté. Nul pour
        // un joueur sans compte ; un même compte partage un seul joueur sur tous ses appareils.
        await query(`alter table players add column if not exists auth_user_id uuid unique;`);
        await query(`
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
        `);
        await query(`
            create index if not exists idx_daily_scores_leaderboard
                on daily_scores (challenge_date, lang, score desc, time_seconds asc);
        `);
        await query(`
            create index if not exists idx_daily_scores_player
                on daily_scores (player_id);
        `);
        // Défi hebdomadaire (voir api/weeklyScores.js, api/weeklyLeaderboard.js) :
        // même structure que daily_scores ci-dessus, une ligne par joueur/
        // semaine ISO/langue — nommée "weekly_challenge_scores" (et non
        // "weekly_scores") pour ne pas se confondre avec weekly_xp
        // (ligue hebdomadaire par XP cumulé, table différente, feature
        // différente) plus bas.
        await query(`
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
        `);
        await query(`
            create index if not exists idx_weekly_challenge_scores_leaderboard
                on weekly_challenge_scores (challenge_week, lang, score desc, time_seconds asc);
        `);
        await query(`
            create index if not exists idx_weekly_challenge_scores_player
                on weekly_challenge_scores (player_id);
        `);
        await query(`
            create table if not exists player_progress (
                player_id   uuid primary key references players(id) on delete cascade,
                data        jsonb not null default '{}'::jsonb,
                updated_at  timestamptz not null default now()
            );
        `);
        // Ligues hebdomadaires (voir api/league.js) : un total d'XP hebdo par
        // joueur et par semaine ISO. Le regroupement en ligues lui-même n'est
        // PAS stocké ici — il est recalculé à la volée par hash déterministe
        // (voir api/league.js) pour éviter toute tâche planifiée.
        await query(`
            create table if not exists weekly_xp (
                player_id   uuid not null references players(id) on delete cascade,
                iso_week    text not null,
                xp          integer not null default 0,
                updated_at  timestamptz not null default now(),
                primary key (player_id, iso_week)
            );
        `);
        await query(`
            create index if not exists idx_weekly_xp_week_xp
                on weekly_xp (iso_week, xp desc);
        `);
        // Duels asynchrones entre amis (voir api/duels.js).
        await query(`
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
        `);
        await query(`
            create index if not exists idx_duels_creator
                on duels (creator_player_id);
        `);
        // Mode Classe (voir api/classroom.js) : une séance (code de 6 caractères), ses élèves et, par élève,
        // le résultat de chaque carte jouée. Rien n'est gardé au-delà de deux jours (purge à la création).
        await query(`
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
        `);
        await query(`
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
        `);
        // Équipe de classe (voir api/team.js) : le coffre commun d'une classe, ses membres, et le point de
        // départ des points cumulés des élèves qui ont un compte (players.team_points).
        await query(`alter table players add column if not exists team_points integer not null default 0;`);
        await query(`
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
        `);
        await query(`
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
        `);
        // Une séance de Mode Classe peut nourrir le coffre de l'équipe (class_sessions.team_code) ; `credited`
        // est le nombre de bonnes réponses déjà versées, pour ne verser que la différence à chaque envoi.
        // Écusson de l'équipe (js/teamBadge.js) : quatre petits entiers « fond.motif.couleur.bordure ».
        await query(`alter table class_teams add column if not exists badge text not null default '0.2.1.0';`);
        // Profil de l'équipe (description, pays, langue), niveau des membres, points cumulés et défis entre équipes
        // (api/team.js).
        await query(`alter table class_teams add column if not exists description text not null default '';`);
        await query(`alter table class_teams add column if not exists country text not null default '';`);
        await query(`alter table class_teams add column if not exists lang text not null default '';`);
        await query(`alter table class_teams add column if not exists leader_level smallint not null default 1;`);
        await query(`alter table class_teams add column if not exists points_total integer not null default 0;`);
        // Les équipes d'avant existaient déjà, trouvables par leur nom : elles restent listées ; les nouvelles ne le sont que si
        // leur créateur le choisit.
        await query(`alter table class_teams add column if not exists listed boolean not null default true;`);
        await query(`alter table team_members add column if not exists level smallint not null default 1;`);
        await query(`create table if not exists team_challenges (
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
);`);
        // Amis (api/friends.js) : identifiant d'ami généré, sans lien avec l'e-mail ; niveau affiché ; liens d'amitié.
        await query(`alter table players add column if not exists friend_code text unique;`);
        await query(`alter table players add column if not exists friend_requests boolean not null default true;`);
        await query(`alter table players add column if not exists level smallint not null default 1;`);
        await query(`
            create table if not exists friendships (
                id           bigserial primary key,
                requester_id uuid not null references players(id) on delete cascade,
                addressee_id uuid not null references players(id) on delete cascade,
                status       text not null default 'pending',
                created_at   timestamptz not null default now(),
                unique (requester_id, addressee_id)
            );
        `);
        await query(`alter table class_sessions add column if not exists team_code text;`);
        // Les modes enchaînés pendant la séance, dans l'ordre de jeu (js/classModes.js).
        await query(`alter table class_sessions add column if not exists modes jsonb not null default '["frise"]'::jsonb;`);
        await query(`alter table class_players add column if not exists credited smallint not null default 0;`);
        // Historique des parties d'un compte (voir api/account.js, api/_lib/history.js). Une ligne par partie ;
        // client_id (fourni par l'appareil) rend l'envoi idempotent : renvoyer un lot ne crée pas de doublon.
        await query(`
            create table if not exists game_history (
                id               bigserial primary key,
                player_id        uuid not null references players(id) on delete cascade,
                client_id        text not null,
                mode             text not null,
                theme_id         text,
                theme_name       text,
                lang             text,
                score            integer not null,
                won              boolean not null default false,
                rounds           smallint not null default 0,
                mistakes         smallint not null default 0,
                duration_seconds numeric(8,1) not null default 0,
                played_at        timestamptz not null,
                created_at       timestamptz not null default now(),
                unique (player_id, client_id)
            );
        `);
        await query(`
            create index if not exists idx_game_history_player_played
                on game_history (player_id, played_at desc);
        `);
    })().catch((err) => {
        // En cas d'échec (permissions restreintes, base non joignable...),
        // on ne met pas le résultat en cache : la prochaine requête réessaiera.
        schemaReady = null;
        throw err;
    });
    return schemaReady;
}

module.exports = { getPool, query, ensureSchema };
