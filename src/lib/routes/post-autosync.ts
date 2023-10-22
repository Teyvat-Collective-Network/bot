import TDE from "@teyvat-collective-network/toml-discord-embeds";
import { ChannelType } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import api, { forgeToken } from "../api.js";
import bot, { channels } from "../bot.js";
import logger from "../logger.js";
import { Attribute, Autosync, Character, TCNGuild } from "../types.js";

const elements = ["pyro", "hydro", "anemo", "electro", "dendro", "cryo", "geo"];

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

        const sortAllFns: Record<string, (x: [string, TCNGuild[]], y: [string, TCNGuild[]]) => number> = {
            hoist(x: [string, TCNGuild[]], y: [string, TCNGuild[]]) {
                return x[1].some((k) => k.id === config.guild) ? -1 : y[1].some((k) => k.id === config.guild) ? 1 : 0;
            },
            size(x: [string, TCNGuild[]], y: [string, TCNGuild[]]) {
                return y[1].length - x[1].length;
            },
            "-size"(x: [string, TCNGuild[]], y: [string, TCNGuild[]]) {
                return x[1].length - y[1].length;
            },
            "a-z"(x: [string, TCNGuild[]], y: [string, TCNGuild[]]) {
                return x[0].localeCompare(y[0]);
            },
            "z-a"(x: [string, TCNGuild[]], y: [string, TCNGuild[]]) {
                return y[0].localeCompare(x[0]);
            },
            elements(x: [string, TCNGuild[]], y: [string, TCNGuild[]]) {
                return elements.indexOf(x[0]) - elements.indexOf(y[0]);
            },
        };

        const sortFns: Record<string, (x: TCNGuild, y: TCNGuild) => number> = {
            hoist(x: TCNGuild, y: TCNGuild) {
                return x.id === config.guild ? -1 : y.id === config.guild ? 1 : 0;
            },
            "a-z"(x: TCNGuild, y: TCNGuild) {
                return names[x.id].localeCompare(names[y.id]);
            },
            "z-a"(x: TCNGuild, y: TCNGuild) {
                return names[y.id].localeCompare(names[x.id]);
            },
        };

        const sources = {
            "tcn/partners"({
                group,
                sortall,
                sort,
                key,
                inline,
                pad,
            }: {
                group?: string;
                sortall?: string;
                sort?: string;
                key?: string;
                inline?: boolean;
                pad?: boolean;
            }) {
                group ??= "element";
                sortall ??= "size,a-z";
                sort ??= "a-z";
                key ??= "emoji";
                inline ??= true;
                pad ??= true;

                if (!["emoji", "id", "name"].includes(key)) throw new Error(`Invalid key ${key}.`);

                const innerSorters = sort.split(",").map((x) => {
                    if (!(x in sortFns)) throw new Error(`Invalid sorter ${x}.`);
                    return sortFns[x];
                });

                const outerSorters = sortall.split(",").map((x) => {
                    if (!(x in sortAllFns)) throw new Error(`Invalid sorter ${x}.`);
                    return sortAllFns[x];
                });

                const groups: Record<string, TCNGuild[]> = {};

                for (const guild of guilds) {
                    const mascot = characters[guild.mascot];
                    const value = mascot.attributes[group];
                    if (!value) throw new Error(`Invalid group ${group}: ${guild.name}'s mascot, ${mascot.name}, does not have this attribute.`);

                    (groups[value] ??= []).push(guild);
                }

                for (const group of Object.values(groups)) {
                    group.sort((x, y) => {
                        for (const sort of innerSorters) {
                            const c = sort(x, y);
                            if (c) return c;
                        }

                        return 0;
                    });
                }

                const fields = Object.entries(groups)
                    .sort((x, y) => {
                        for (const sort of outerSorters) {
                            const c = sort(x, y);
                            if (c) return c;
                        }

                        return 0;
                    })
                    .map(([attr, guilds]) => ({
                        name: attributes[group!][attr][key! as "emoji" | "id" | "name"],
                        value: guilds.map((x) => `- [${names[x.id]}](https://discord.gg/${x.invite})`).join("\n"),
                        inline,
                    }));

                if (pad && inline) while (fields.length % 3 > 0) fields.push({ name: "_ _", value: "_ _", inline: true });

                return fields;
            },
        };

        try {
            const post = TDE.parse(config.template, sources);

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
                await message?.delete()?.catch(() => {});

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
