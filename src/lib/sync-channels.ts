import api from "./api.js";
import { channels } from "./bot.js";
import { TCNGuild } from "./types.js";

export default async function (members: boolean, votes: boolean) {
    const guilds: TCNGuild[] = await api(null, `GET /guilds`);

    if (members) await channels.STATS_MEMBERS.edit({ name: `Members: ${guilds.flatMap((x) => [x.owner, x.advisor]).filter((x) => x).length}` });

    if (votes) {
        const votes = guilds.length;

        await channels.STATS_VOTES.edit({ name: `Max Votes: ${votes}` });
        await channels.STATS_QUORUM.edit({ name: `60% Quorum: ${Math.ceil(votes * 0.6)} / ${votes}` });
        await channels.STATS_HIGHER_QUORUM.edit({ name: `75% Quorum: ${Math.ceil(votes * 0.75)} / ${votes}` });
    }
}
