import api from "./api.js";
import { HasGuild, HasUser, MightHaveGuild, getGuildId, getGuildIdOrNull, getUserId } from "./extract.js";

export async function ensureObserver(object: HasUser) {
    const id = getUserId(object);
    const user = await api(null, `GET /users/${id}`);

    if (!user.observer) throw "Permission denied (observers only).";
}

export async function ensureOwner(object: HasUser, guildObject?: HasGuild) {
    const id = getUserId(object);
    const user = await api(null, `GET /users/${id}`);

    if (user.observer) return;
    if (!guildObject && user.owner) return;
    if (guildObject && user.guilds[getGuildId(guildObject)]?.owner) return;

    throw "Permission denied (owner only).";
}

export async function ensureTCN(object: MightHaveGuild) {
    const id = getGuildIdOrNull(object);
    if (id === Bun.env.HQ || id === Bun.env.HUB) return;
    if (!id || (await api(null, `!GET /guilds/${id}`)).status === 404) throw "Permission denied (TCN servers only).";
}
