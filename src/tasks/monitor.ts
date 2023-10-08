import api from "../lib/api.js";
import bot, { channels, hq } from "../lib/bot.js";
import cycle from "../lib/cycle.js";
import { TCNGuild, TCNUser } from "../lib/types.js";

cycle(async () => {
    const guilds: TCNGuild[] = await api(null, `GET /guilds`);
    const alerts: string[] = [];

    for (const guild of guilds)
        try {
            const invite = await bot.fetchInvite(guild.invite);
            if (!invite) throw 0;
        } catch {
            alerts.push(`Invite for ${guild.name} (\`${guild.id}\`) is invalid (\`${guild.invite}\`).`);
        }

    const expected = new Set<string>();

    for (const { owner, advisor } of guilds) {
        expected.add(owner);
        if (advisor) expected.add(advisor);
    }

    for (const [, member] of await hq.members.fetch()) {
        if (!member.user.bot && !expected.has(member.id))
            try {
                const user: TCNUser = await api(null, `GET /users/${member.id}`);
                if (!user.roles.includes("guest")) throw 0;
            } catch {
                alerts.push(`${member} is not authorized to be in HQ.`);
            }
    }

    const positions: Record<string, string[]> = {};

    for (const guild of guilds)
        for (const [id, role] of [
            [guild.owner, "server owner"],
            [guild.advisor, "council advisor"],
        ])
            if (id) {
                try {
                    (positions[id] ??= []).push(`${guild.name} (\`${guild.id}\`) ${role}`);
                } catch {}

                try {
                    const member = await hq.members.fetch(id);
                    if (!member) throw 0;
                } catch {
                    try {
                        const user = await bot.users.fetch(id);
                        alerts.push(`${user} (${role} for ${guild.name} \`${guild.id}\`) is missing from the server.`);
                    } catch {
                        alerts.push(`${role} for ${guild.name} (\`${guild.id}\`) corresponds to an invalid ID: \`${id}\`.`);
                    }
                }
            }

    for (const [id, list] of Object.entries(positions)) if (list.length > 1) alerts.push(`<@${id}> has multiple council positions: ${list.join(", ")}`);

    if (alerts.length === 0) return;

    let texts = ["### Server/API Issues Detected"];

    for (const line of alerts)
        if (texts.at(-1)!.length + line.length + 3 <= 2000) texts[texts.length - 1] += `\n- ${line}`;
        else texts.push(line);

    for (const text of texts) await channels.OBSERVER_CHANNEL.send(text);
}, 24 * 60 * 60 * 1000);
