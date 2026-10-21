// Écritures partagées de l'équipe de classe (api/team.js et api/classroom.js) : un seul endroit où les points
// entrent dans le coffre, quelle que soit leur source.

const { getPool } = require('./db');
const T = require('./team');

// Ajoute `asked` points de la part d'un membre (source : 'path' = étoiles du Chemin, plafonnées par jour ;
// 'class' = bonnes réponses d'une séance supervisée, non plafonnées). Renvoie les points acceptés, l'état du
// coffre, et si le joueur a un compte (ses points lui restent alors acquis). Renvoie null si le joueur n'est
// pas membre de l'équipe.
async function creditTeam(code, playerId, asked, source) {
    const client = await getPool().connect();
    try {
        await client.query('begin');
        const team = (await client.query(
            'select code, progress, chest_index, cards from class_teams where code = $1 for update', [code]
        )).rows[0];
        const member = team && (await client.query(
            'select points, day_points, day from team_members where code = $1 and player_id = $2 for update',
            [code, playerId]
        )).rows[0];
        if (!member) { await client.query('rollback'); return null; }

        const today = new Date().toISOString().slice(0, 10); // jour UTC : le plafond se remet à zéro à minuit UTC
        const usedToday = member.day === today ? member.day_points : 0;
        const accepted = source === 'path'
            ? T.acceptPathPoints(asked, usedToday)
            : Math.max(0, Math.min(asked | 0, 200));
        const count = (await client.query('select count(*)::int as n from team_members where code = $1', [code])).rows[0].n;
        const next = T.addToChest({ progress: team.progress, chestIndex: team.chest_index }, accepted, count);
        const cardsOpened = countCards(team.chest_index, next.chestIndex);

        if (accepted > 0) {
            await client.query(
                `update team_members set points = points + $3,
                        day_points = case when day = $5 then day_points + $4 else $4 end,
                        day = $5
                  where code = $1 and player_id = $2`,
                [code, playerId, accepted, source === 'path' ? accepted : 0, today]
            );
            await client.query(
                `update class_teams set progress = $2, chest_index = $3, cards = cards + $4, last_activity_at = now()
                  where code = $1`,
                [code, next.progress, next.chestIndex, cardsOpened]
            );
        }
        const acct = (await client.query(
            `update players set team_points = team_points + $2
              where id = $1 and auth_user_id is not null and $2 > 0 returning 1`, [playerId, accepted]
        )).rows[0];
        await client.query('commit');
        return { accepted, account: !!acct, progress: next.progress, chestIndex: next.chestIndex, opened: next.opened };
    } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

function countCards(from, to) {
    let n = 0;
    for (let k = from + 1; k <= to; k++) if (T.chestHasCard(k)) n++;
    return n;
}

module.exports = { creditTeam };
