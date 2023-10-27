import { ChannelType } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import api, { forgeToken } from "../api.js";
import bot, { channels } from "../bot.js";
import logger from "../logger.js";
import { renderPartnerList } from "../partner-list.js";
import { Attribute, Autosync, Character, TCNGuild } from "../types.js";

async function autosync(configs: Autosync[]) {
    const guilds: TCNGuild[] = await api(null, `GET /guilds`);
    const characters: Record<string, Character> = Object.fromEntries(((await api(null, `GET /characters`)) as Character[]).map((x) => [x.id, x]));
    const attributes: Record<string, Record<string, Attribute>> = await api(null, `GET /attributes`);

    const first = new Set<string>();
    const second = new Set<string>();

    for (const guild of guilds) {
        if (first.has(guild.mascot)) second.add(guild.mascot);
        else first.add(guild.mascot);
    }

    const names: Record<string, string> = {};

    for (const guild of guilds) names[guild.id] = second.has(guild.mascot) ? guild.name : characters[guild.mascot].short ?? characters[guild.mascot].name;

    for (const config of configs) {
        if (!config.channel && !config.webhook) continue;

        try {
            const post = await renderPartnerList(config, { attributes, characters, guilds, names });

            if (config.webhook) {
                if (!config.repost && config.message) {
                    const req = await fetch(`${config.webhook}/messages/${config.message}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(post),
                    });

                    if (req.ok) continue;
                }

                const req = await fetch(`${config.webhook}?wait=true`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(post),
                });

                const res = await req.json();

                if (!req.ok) throw res;

                const delreq = await fetch(`${config.webhook}/messages/${config.message}`, { method: "DELETE" }).catch(() => {});

                if (!delreq?.ok)
                    logger.error(await delreq?.json(), `db3b1c47-da09-408b-bfd9-e8ffd1ea6e18 Error deleting previous autosync for ${config.guild}`);

                await api(await forgeToken(), `PATCH /autosync/${config.guild}`, { message: res.id });
            } else if (config.channel) {
                const channel = await bot.channels.fetch(config.channel);
                if (channel?.type !== ChannelType.GuildText) throw `The channel type of ${channel} is invalid (required: guild text channel).`;

                let message = config.message === null ? null : await channel.messages.fetch(config.message).catch(() => {});

                if (message && !config.repost) {
                    await message.edit({ ...post, flags: undefined });
                    continue;
                }

                const { id } = await channel.send(post);

                await message
                    ?.delete()
                    ?.catch((error) => logger.error(error, `39f130f3-0ac2-40b5-b015-a84a3722c997 Error deleting previous autosync for ${config.guild}`));

                await api(await forgeToken(), `PATCH /autosync/${config.guild}`, { message: id });
            }
        } catch (error: any) {
            logger.error(error, `b1119732-22cb-4132-8937-1946d01b1bf7 Error in autosync for ${config.guild}`);
            await channels.BOT_LOGS.send(`Error in autosync for ${config.guild}: ${error.message ?? error}`).catch(() => {});
        }
    }
}

export default (app: App) =>
    app
        .post(
            "/autosync/:guild",
            async ({ bearer, params: { guild } }) => {
                const config: Autosync = await api(bearer, `GET /autosync/${guild}`);
                await autosync([config]);
            },
            {
                params: t.Object({
                    guild: t.String(),
                }),
            },
        )
        .post(
            "/autosync",
            async ({ bearer }) => {
                const configs: Autosync[] = await api(bearer, `GET /autosync`);
                await autosync(configs);
            },
            {},
        );
