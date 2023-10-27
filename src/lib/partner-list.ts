import { parse } from "@iarna/toml";
import TDE from "@teyvat-collective-network/toml-discord-embeds";
import api from "./api.js";
import { Attribute, Autosync, Character, TCNGuild } from "./types.js";

export async function renderPartnerList(
    config: Autosync,
    data?: {
        attributes?: Record<string, Record<string, Attribute>>;
        guilds?: TCNGuild[];
        names?: Record<string, string>;
        characters?: Record<string, Character>;
    },
) {
    const attributes = data?.attributes ?? (await api(null, `GET /attributes`));
    const elements = Object.keys(attributes.elements ?? {});
    const names = data?.names ?? {};
    const characters = data?.characters ?? Object.fromEntries(((await api(null, `GET /characters`)) as Character[]).map((x) => [x.id, x]));
    const guilds: TCNGuild[] = data?.guilds ?? (await api(null, `GET /guilds`));

    if (!data?.names) {
        const first = new Set<string>();
        const second = new Set<string>();

        for (const guild of guilds) {
            if (first.has(guild.mascot)) second.add(guild.mascot);
            else first.add(guild.mascot);
        }

        for (const guild of guilds) names[guild.id] = second.has(guild.mascot) ? guild.name : characters[guild.mascot].short ?? characters[guild.mascot].name;
    }

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
            bullet,
        }: {
            group?: string;
            sortall?: string;
            sort?: string;
            key?: string;
            inline?: boolean;
            pad?: boolean;
            bullet?: string;
        }) {
            group ??= "element";
            sortall ??= "size,a-z";
            sort ??= "a-z";
            key ??= "emoji";
            inline ??= true;
            pad ??= true;
            bullet ??= "-";

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
                    value: guilds.map((x) => `${bullet} [${names[x.id]}](https://discord.gg/${x.invite})`).join("\n"),
                    inline,
                }));

            if (pad && inline) while (fields.length % 3 > 0) fields.push({ name: "_ _", value: "_ _", inline: true });

            return fields;
        },
    };

    return TDE.convert(parse(config.template), sources);
}
