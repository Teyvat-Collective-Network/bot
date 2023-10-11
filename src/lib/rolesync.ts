import { Guild, GuildMember } from "discord.js";
import api, { forgeToken } from "./api.js";
import bot from "./bot.js";
import logger from "./logger.js";
import { Rolesync, TCNUser } from "./types.js";

export default async function (data: { guild?: string; user?: string; entries?: (Rolesync & { guild: string })[] }) {
    const token = await forgeToken();
    const logs: any[][] = [];

    const _entries: (Rolesync & { guild: string })[] = data.guild
        ? [await api(token, `GET /guilds/${data.guild}/rolesync`)]
        : await api(token, `GET /guilds/all-rolesync`);

    const invoke = async (location: string, output: any[], fn: () => any) => {
        try {
            await fn();
            logs.push(output);
        } catch (error) {
            logger.error(error, location);
        }
    };

    const entries = Object.fromEntries(_entries.map((entry) => [entry.guild, entry]));
    const _guilds = (await Promise.all(_entries.map(({ guild }) => bot.guilds.fetch(guild).catch()).filter((x) => x))) as Guild[];
    const guilds = Object.fromEntries(_guilds.map((x) => [x.id, x]));

    const memberMap: Record<string, GuildMember[]> = {};
    for (const [id, guild] of Object.entries(guilds))
        if (data.user)
            try {
                memberMap[id] = [await guild.members.fetch(data.user)];
            } catch {}
        else memberMap[id] = [...(await guild.members.fetch()).values()];

    const users = Object.fromEntries(
        ((data.user ? [await api(null, `GET /users/${data.user}`)] : await api(null, `GET /users`)) as TCNUser[]).map((x) => [x.id, x]),
    );

    for (const [id, members] of Object.entries(memberMap))
        for (const member of members) {
            const staff = member.roles.cache.hasAny(...entries[id].roleToStaff);
            const userGuild = users[member.id]?.guilds[id];

            if (staff !== !!userGuild?.staff && !userGuild?.council)
                await invoke("9a1f8c5c-4f37-439f-a148-be998b1c786f", [`role-to-staff/${staff ? "promote" : "demote"}`, member.id, id], () =>
                    api(token, `PUT /users/${member.id}/staff/${id}`, { staff }, "rolesync: role => staff"),
                );
        }

    for (const [id, members] of Object.entries(memberMap)) {
        const roles = entries[id].staffToRole;

        for (const member of members) {
            const staff = users[member.id]?.guilds[id]?.staff;

            if (staff) {
                if (!member.roles.cache.hasAll(...roles))
                    await invoke(
                        "b592aa40-88a5-498c-a352-8ff48d7d037f",
                        ["staff-to-role/add", member.id, id, roles.filter((x) => !member.roles.cache.has(x))],
                        () => member.roles.add(roles, "rolesync: staff => role"),
                    );
            } else {
                if (member.roles.cache.hasAny(...roles))
                    await invoke(
                        "bdcacd76-ff25-448b-be2f-f18ee14710e0",
                        ["staff-to-role/remove", member.id, id, roles.filter((x) => member.roles.cache.has(x))],
                        () => member.roles.remove(roles, "rolesync: staff => role"),
                    );
            }
        }
    }

    for (const [id, members] of Object.entries(memberMap))
        for (const member of members) {
            let assign: string[] = [];
            let total: string[] = [];

            for (const [source, roles] of Object.entries(entries[id].roleToApi))
                if (member.roles.cache.has(source)) assign = assign.concat(...roles);
                else total = total.concat(...roles);

            const roles = users[member.id]?.guilds[id]?.roles ?? [];
            const add = assign.filter((x) => !roles.includes(x));
            const remove = total.filter((x) => roles.includes(x) && !assign.includes(x));

            if (add.length + remove.length > 0)
                await invoke("28d11549-e527-4898-9fce-53a2d50df6e4", ["role-to-api", member.id, id, add, remove], () =>
                    api(token, `PATCH /users/${member.id}/guild-roles/${id}`, { add, remove }),
                );
        }

    for (const [id, members] of Object.entries(memberMap))
        for (const member of members)
            if (users[member.id]) {
                let assign: string[] = [];
                let total: string[] = [];

                const userRoles = new Set([...users[member.id].roles, ...(users[member.id].guilds[id]?.roles ?? [])]);

                for (const { type, value, guild, roles } of entries[id].apiToRole) {
                    const obj = guild ? users[member.id].guilds[guild] : users[member.id];

                    if (type === "position" ? (obj as any)[value] : obj.roles.includes(value)) assign = assign.concat(...roles);
                    else total = total.concat(...roles);
                }

                const add = assign.filter((x) => !member.roles.cache.has(x));
                const remove = total.filter((x) => member.roles.cache.has(x) && !assign.includes(x));

                if (add.length + remove.length > 0) {
                    const set = [...member.roles.cache.keys()].filter((x) => !remove.includes(x)).concat(...add);

                    await invoke("29284edd-42b7-4cbf-a2a1-863940fac884", ["api-to-role", member.id, id, add, remove], () => member.roles.set(set));
                }
            }

    if (logs.length > 0)
        await fetch(`${Bun.env.INTERNAL_API}/push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: "rolesync", messages: logs }),
        });
}
