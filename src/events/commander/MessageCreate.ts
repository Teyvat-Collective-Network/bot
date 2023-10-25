import { execSync } from "child_process";
import { Message } from "discord.js";
import shlex from "shlex";
import api, { getToken } from "../../lib/api.js";
import bot from "../../lib/bot.js";
import logger from "../../lib/logger.js";
import { ensureObserver } from "../../lib/permissions.js";

const re = { id: /^[a-z-]{1,32}$/, snowflake: /^[1-9][0-9]{16,19}$/ };

export default async function (message: Message) {
    if (!message.content.match(/^(\? )?(```tcn\n(.*\n)+```|`tcn .+`)$/i)) return;

    const dry = message.content.startsWith("?");
    const content = message.content.slice(dry ? 2 : 0);

    const lines = content.match(/^`tcn/i)
        ? [content.slice(5, -1)]
        : [...content.slice(7, -4).matchAll(/(\\\n|.)+/g)].map(([x]) => x.split(/\\\n/).join(" ")).filter((x) => x);
    if (lines.length === 0) return;

    const responses: string[] = [];
    let errors = 0;

    for (const line of lines) {
        try {
            const real: string[] = [];
            const items = shlex.split(line);
            let current = commands;
            let amap = aliases;

            while (!current.run) {
                if (items.length === 0) throw `incomplete command; you specified the start of a command but did not provide enough terms`;

                let key = items.shift()!.toLowerCase();
                if (typeof amap === "object" && typeof amap[key] === "string") key = amap[key] as string;

                current = current[key];
                amap = typeof amap === "string" ? amap : amap?.[key];

                if (!current) throw real.length > 0 ? `command not found (${real.join(" ")} is fine, but ${key} = ??)` : `command not found, ${key} = ??`;
                real.push(key);
            }

            const keys = Object.keys(current.args ?? []);

            const args: Record<string, any> = Object.fromEntries(Object.entries(current.flags ?? {}).map(([k, v]) => [v.mapto ?? k, v.default]));

            const flagged = new Set<string>();

            while (items.length > 0) {
                const item = items.shift()!;

                if (item.startsWith("-")) {
                    let flag = item.slice(1).toLowerCase();
                    flag = current.aliases?.[flag] ?? flag;

                    const data = current.flags?.[flag];

                    if (!data) throw `no such flag: ${flag} (quote it and put a space before to use it as a literal string)`;
                    if (flagged.has(flag)) throw `flag ${flag} was already set`;
                    flagged.add(flag);

                    const [k, { default: v }] = [data.mapto ?? flag, data];
                    args[k] = !v;
                } else if (item.endsWith(":")) {
                    let key = item.slice(0, -1).toLowerCase();
                    key = current.aliases?.[key] ?? key;

                    let rest = false;

                    let data = current.args?.[key] ?? current.kwargs?.[key];
                    if (!data) {
                        data = current.kwrest;
                        rest = true;
                    }

                    if (!data) throw `no such argument: ${key} (quote it and put a space after to use it as a literal string)`;
                    if (items.length === 0) throw `no argument provided after argument indicator ${key}`;
                    if (args[key]) throw `argument ${key} specified multiple times`;

                    const arg = items.shift()!;
                    (rest ? (args._kwrest ??= {}) : args)[key] = parse(key, data, arg);
                } else if (keys.length > 0) {
                    const key = keys.shift()!;
                    if (args[key])
                        throw `argument ${key} specified multiple times; you may wish to avoid using positional arguments after explicitly specifying positional arguments by key`;

                    args[key] = parse(key, current.args![key], item);
                } else if (current.rest) {
                    (args._rest ??= []).push(parse("[rest args]", current.rest, item));
                } else throw `too many arguments provided`;
            }

            for (const [k, v] of Object.entries({ ...(current.args ?? {}), ...(current.kwargs ?? {}) })) args[k] ??= v.default;
            for (const [k, v] of Object.entries({ ...(current.args ?? {}), ...(current.kwargs ?? {}) }))
                if (!v.optional && args[k] === undefined) throw `required option ${k} not specified`;

            const res = dry
                ? `[${real.join(" ")}] ${JSON.stringify(args, undefined, 4)}`
                : await current.run(
                      args,
                      async (route: string, body?: any, reason?: string) => await api(await getToken(message, false), route, body, reason),
                      message,
                  );

            if (typeof res === "string") responses.push(res);
            else responses.push(JSON.stringify(res, undefined, 4));
        } catch (error: any) {
            errors++;
            responses.push(`[error] ${error}`);

            if (typeof error !== "string") logger.error(error, "cf59e6e9-a448-43e2-92ef-8f45504ae98e");
        }
    }

    const output = responses.map((x) => `\`\`\`\n${x}\n\`\`\``).join("");

    if (output.length < 2000) await message.reply(output);
    else if (responses.length <= 10)
        await message.reply({ files: responses.map((x, i) => ({ name: `segment-${i}.txt`, attachment: Buffer.from(x, "utf-8") })) });
    else await message.reply({ files: [{ name: "responses.txt", attachment: Buffer.from(responses.join(`\n${"-".repeat(24)}\n`), "utf-8") }] });

    await message.react(errors === responses.length ? "❌" : errors === 0 ? "✅" : "🟨");
}

function parse(key: string, arg: Arg, input: string): any {
    if (arg.type === "json") {
        try {
            return JSON.parse(input);
        } catch {
            throw `argument ${key} must be valid JSON`;
        }
    } else if (arg.type === "boolean") {
        if (["true", "t", "yes", "y"].includes(input.toLowerCase())) return true;
        if (["false", "f", "no", "n"].includes(input.toLowerCase())) return false;

        throw `argument ${key} must be boolean`;
    } else if (arg.type === "number") {
        const n = parseFloat(input);

        if (arg.int && n % 1 !== 0) throw `argument ${key} must be integral`;
        if (arg.min !== undefined && n < arg.min) throw `argument ${key} must be >= ${arg.min}`;
        if (arg.max !== undefined && n > arg.max) throw `argument ${key} must be <= ${arg.max}`;

        return n;
    } else if (arg.type === "number[]") {
        const segments = input
            .split(arg.separator ?? ",")
            .map((x) => x.trim())
            .filter((x) => x);

        if (arg.minitems !== undefined && segments.length < arg.minitems) throw `argument ${key} must have length >= ${arg.minitems}`;
        if (arg.maxitems !== undefined && segments.length > arg.maxitems) throw `argument ${key} must have length <= ${arg.maxitems}`;

        return segments.map((x, i) => parse(`${key}[i]`, { description: "", type: "number", min: arg.min, max: arg.max, int: arg.int }, x));
    } else if (arg.type === "string[]") {
        const segments = input
            .split(arg.separator ?? ",")
            .map((x) => x.trim())
            .filter((x) => x);

        if (arg.minitems !== undefined && segments.length < arg.minitems) throw `argument ${key} must have length >= ${arg.minitems}`;
        if (arg.maxitems !== undefined && segments.length > arg.maxitems) throw `argument ${key} must have length <= ${arg.maxitems}`;

        return segments.map((x, i) => parse(`${key}[i]`, { description: "", type: "string", minlen: arg.minlen, maxlen: arg.maxlen, regex: arg.regex }, x));
    } else if (arg.type === "string") {
        if (input.match(/^ +-/)) input = input.slice(1);
        if (input.match(/: +$/)) input = input.slice(0, -1);

        if (arg.minlen !== undefined && input.length < arg.minlen) throw `argument ${key} must have length >= ${arg.minlen}`;
        if (arg.maxlen !== undefined && input.length > arg.maxlen) throw `argument ${key} must have length <= ${arg.maxlen}`;
        if (arg.regex && !input.match(arg.regex)) throw `argument ${key} must match ${arg.regex}`;

        return input;
    }
}

type Arg = { description: string; optional?: boolean } & (
    | { type: "json"; default?: any }
    | { type: "boolean"; default?: boolean }
    | { type: "number"; default?: number; min?: number; max?: number; int?: boolean }
    | { type: "number[]"; default?: number[]; separator?: string; minitems?: number; maxitems?: number; min?: number; max?: number; int?: boolean }
    | { type: "string[]"; default?: string[]; separator?: string; minitems?: number; maxitems?: number; minlen?: number; maxlen?: number; regex?: RegExp }
    | { type?: "string"; default?: string; minlen?: number; maxlen?: number; regex?: RegExp }
);

type ArgsData = Record<string, Arg> & { _rest?: never };

type Command =
    | {
          description: string;
          args?: ArgsData;
          kwargs?: ArgsData;
          rest?: Arg;
          kwrest?: Arg;
          flags?: Record<string, { description: string; default: boolean; mapto?: string }>;
          aliases?: Record<string, string>;
          run: (args: any, api: (route: string, body?: any, reason?: string) => Promise<any>, message: Message) => any;
      }
    | ({ [k: string]: Command } & { run?: never });

const reason = { description: "the audit log reason", optional: true, minlen: 1, maxlen: 256 };

const commands: Command = {
    get: {
        attributes: {
            description: "get all attributes, attributes of a specific type/ID, or one attribute",
            args: {
                type: { description: "if set, only returns attributes of this type", type: "string", optional: true, regex: re.id },
                id: { description: "if set, only returns attributes with this ID", type: "string", optional: true, regex: re.id },
            },
            aliases: { t: "type", i: "id" },
            async run({ type, id }, api) {
                if (type && id) {
                    const x = await api(`GET /attributes/${type}/${id}`);
                    return `attribute ${type}:${id} = "${x.name}" (emoji: ${x.emoji})`;
                } else {
                    const x = await api(`GET /attributes`);

                    return Object.entries(x)
                        .filter(([x]) => !type || type === x)
                        .flatMap(([x, y]) => [
                            `${x}:`,
                            ...Object.entries(y as any)
                                .filter(([x]) => !id || id === x)
                                .map(([x, y]: [string, any]) => `    ${x}: "${y.name}" (emoji: ${y.emoji})`),
                        ])
                        .join("\n");
                }
            },
        },
        autosync: {
            description: "get a guild's autosync configuration",
            args: { guild: { description: "the ID of the guild", type: "string", regex: re.snowflake } },
            flags: { "show-webhook": { description: "unredact the webhook (dangerous)", default: false, mapto: "showWebhook" } },
            async run({ guild, showWebhook }, api) {
                const x = await api(`GET /autosync/${guild}`);

                return `ch: ${x.channel}\nwh: ${showWebhook ? x.webhook : "[redacted - use -show-webhook to unhide]"}\nms: ${x.message}\nmode: ${
                    x.repost ? "repost" : "edit"
                }\n\nTemplate:\n\n${x.template}`;
            },
        },
        characters: {
            description: "get all characters / a character",
            args: { id: { description: "the ID of the character", type: "string", optional: true, regex: re.id } },
            async run({ id }, api) {
                const x = await api(`GET /characters${id ? `/${id}` : ""}`);
                const xs = Array.isArray(x) ? x : [x];

                const maxlen = Math.max(
                    ...xs.flatMap((x) => [...Object.keys(x).filter((k) => k !== "attributes"), ...Object.keys(x.attributes)]).map((x) => x.length),
                );

                return xs
                    .map(
                        (x) =>
                            `${id ? "" : `${x.id}:\n`}${id ? "" : "    "}name:${" ".repeat(maxlen - 4)} ${x.name}\n${
                                x.short ? `${id ? "" : "    "}short:${" ".repeat(maxlen - 5)} ${x.short}\n` : ""
                            }${Object.entries(x.attributes)
                                .map(([k, v]: any) => `${id ? "" : "    "}${k}:${" ".repeat(maxlen - k.length)} ${v}`)
                                .join("\n")}`,
                    )
                    .join("\n");
            },
        },
        "global-filter": {
            description: "get the global filter / a specific filter entry",
            args: {
                id: { description: "the ID of the filter item", type: "number", optional: true, min: 1, int: true },
                sort: { description: "how to sort the entries (id, recent, a-z)", type: "string", optional: true, regex: /^(id|recent|a-z)$/ },
            },
            async run({ id, sort }, api) {
                const xs: any[] = await api(`GET /global/filter`);

                if (id) {
                    const x = xs.find((k) => k.id === id);
                    if (!x) throw `No global filter entry exists with ID ${id}.`;

                    return `${x.match}\ncreated @ ${new Date(x.created).toISOString()}\nupdated @ ${new Date(x.lastUpdated).toISOString()}\n       by ${
                        x.user
                    }`;
                } else {
                    const maxlen = Math.max(0, ...xs.map((x) => x.id.toString().length));

                    if (sort)
                        xs.sort(
                            sort === "id"
                                ? (x, y) => x.id - y.id
                                : sort === "recent"
                                ? (x, y) => y.lastUpdated - x.lastUpdated
                                : sort === "a-z"
                                ? (x, y) => x.match.localeCompare(y.match)
                                : (x, y) => 0,
                        );
                    return xs.map((x) => `- ${`${x.id}:`.padEnd(maxlen + 1)} ${x.match}`).join("\n") || "(none)";
                }
            },
        },
        guilds: {
            description: "get all guilds / a specific guild",
            args: { id: { description: "the ID of the guild", type: "string", optional: true, regex: re.snowflake } },
            flags: { users: { description: "also return the staff and users with roles", default: false } },
            aliases: { u: "users" },
            async run({ id, users }, api) {
                const guilds: any[] = id ? [await api(`GET /guilds/${id}`)] : await api(`GET /guilds`);

                return guilds
                    .map(
                        (x) =>
                            `${x.name} (${x.id})\n    char:    ${x.mascot}\n    invite:  ${x.invite}\n    owner:   ${x.owner}\n    advisor: ${
                                x.advisor
                            }\n    voter:   ${x.delegated ? "advisor" : "owner"}${
                                users
                                    ? `\n    users:\n${Object.entries(x.users)
                                          .map(
                                              ([id, user]: any) =>
                                                  `        ${id}:${user.staff ? " [staff]" : ""}${user.roles.length > 0 ? ` ${user.roles.join(", ")}` : ""}`,
                                          )
                                          .join("\n")}`
                                    : ""
                            }\n`,
                    )
                    .join("\n");
            },
        },
        users: {
            description: "get all users / a specific user",
            args: { id: { description: "the ID of the user", type: "string", optional: true, regex: /^(me|[1-9][0-9]{16,19})$/ } },
            flags: {
                observers: { description: "only return TCN Observers", default: false },
                council: { description: "only return TCN Council Members", default: false },
                voters: { description: "only return designated voters", default: false },
                guilds: { description: "also return the guilds this user is involved in", default: false },
            },
            aliases: { o: "observers", c: "council", v: "voters", g: "guilds" },
            async run({ id, observers, council, voters, guilds }, api, message) {
                if (id === "me") id = message.author.id;

                const users: any[] = id ? [await api(`GET /users/${id}`)] : await api(`GET /users?${new URLSearchParams({ observers, council, voters })}`);

                const displays = users.map(
                    (user) =>
                        `${
                            user.observer ? `- observer since ${new Date(user.observerSince).toISOString()} (last term start, not initial election date)\n` : ""
                        }- positions: ${["owner", "advisor", "voter", "council", "staff"].filter((x) => user[x]).join(", ") || "(none)"}\n- roles: ${
                            user.roles.join(", ") || "(none)"
                        }${
                            guilds
                                ? `\n- guilds:\n${Object.entries(user.guilds)
                                      .map(
                                          ([k, v]: any) =>
                                              `    ${k}:\n        positions: ${
                                                  ["owner", "advisor", "voter", "council", "staff"].filter((x) => v[x]).join(", ") || "(none)"
                                              }\n        roles: ${v.roles.join(", ") || "(none)"}`,
                                      )
                                      .join("\n")}`
                                : ""
                        }`,
                );

                if (id) {
                    const realUser = await bot.users.fetch(id).catch(() => null);
                    return `${realUser?.displayName ?? "Missing User"} (${id}: ${realUser?.tag})\n${displays[0]}`;
                } else {
                    return users.map((x, i) => `${x.id}:\n${displays[i]}`).join("\n\n");
                }
            },
        },
    },
    post: {
        attributes: {
            description: "create a new attribute",
            args: {
                type: { description: "the type of the attribute to create", type: "string", regex: re.id },
                id: { description: "the ID of the attribute to create", type: "string", regex: re.id },
                name: { description: "the name of the attribute to create", type: "string", minlen: 1, maxlen: 64 },
                emoji: { description: "the emoji of the attribute to create", type: "string", minlen: 1, maxlen: 64 },
            },
            kwargs: { reason },
            aliases: { t: "type", i: "id", n: "name", e: "emoji" },
            async run({ type, id, name, emoji, reason }, api) {
                await api(`POST /attributes/${type}/${id}`, { name, emoji }, reason);
                return `[+] attribute ${type}:${id} = "${name}" (emoji: ${emoji})`;
            },
        },
        banshares: {
            description: "post a new banshare",
            args: {
                severity: { description: "the severity of the banshare", type: "string", regex: /^(P[012]|DM)$/ },
                ids: { description: "the list of IDs to banshare", type: "string" },
                reason: { description: "the reason for the banshare", type: "string", minlen: 1, maxlen: 498 },
                evidence: { description: "the evidence for the banshare", type: "string", minlen: 1, maxlen: 1000 },
                server: {
                    description: "the ID of the server from which to submit the banshare (leave blank to submit from this server)",
                    type: "string",
                    optional: true,
                    regex: re.snowflake,
                },
            },
            flags: {
                urgent: { description: "if true, ping all observers immediately and urge more frequently while the banshare is pending", default: false },
                "skip-validation": {
                    description: "do not validate that the IDs correspond to valid users (use to save time on large banshares)",
                    default: false,
                    mapto: "skipValidation",
                },
                "skip-checks": {
                    description: "do not check the ID list at all, allowing for invalid formats and preventing autoban from working",
                    default: false,
                    mapto: "skipChecks",
                },
            },
            aliases: { sev: "severity", i: "ids", r: "reason", e: "evidence", s: "server", g: "server" },
            async run({ severity, ids, reason, evidence, server, urgent, skipValidation, skipChecks }, api, message) {
                if (!server)
                    if (!message.guild) throw "to run without the server argument, you must be in a server";
                    else server = message.guildId;

                const { message: id } = await api(`POST /banshares`, {
                    ids,
                    reason,
                    evidence,
                    server,
                    severity,
                    urgent: !!urgent,
                    skipValidation: !!skipValidation,
                    skipChecks: !!skipChecks,
                });

                return `[+] your banshare was posted @ ${id}`;
            },
        },
        characters: {
            description: "create a character",
            args: {
                id: { description: "the ID of the new character", type: "string", regex: re.id },
                name: { description: "the full name of the new character", type: "string", minlen: 1, maxlen: 64 },
                short: {
                    description: "the short name of the new character (if different from the full name)",
                    type: "string",
                    optional: true,
                    minlen: 1,
                    maxlen: 64,
                },
            },
            kwargs: { reason },
            kwrest: { description: "an attribute, where the key is the type and the value is the ID", type: "string", regex: re.id },
            aliases: { n: "name", s: "short" },
            async run({ id, name, short, _kwrest: attributes, reason }, api) {
                await api(`POST /characters/${id}`, { name, short, attributes }, reason);
                return `[+] character ${id} "${name}"`;
            },
        },
        "global-filter": {
            description: "add a match to the global filter",
            args: { match: { description: "the regex to match", type: "string" } },
            async run({ match }, api) {
                const { id } = await api(`POST /global/filter`, match);
                return `[+] global filter #${id}: ${match}`;
            },
        },
        guilds: {
            description: "add a guild to the TCN",
            args: {
                id: { description: "the ID of the guild", type: "string", regex: re.snowflake },
                name: { description: "the name of the guild", type: "string", minlen: 1, maxlen: 64 },
                mascot: { description: "the ID of the guild's mascot character", type: "string", regex: re.id },
                invite: { description: "a permanent, non-vanity invite code to the guild", type: "string" },
                owner: { description: "the ID of the guild's owner", type: "string", regex: re.snowflake },
                advisor: { description: "the ID of the guild's advisor if it has one", type: "string", optional: true, regex: re.snowflake },
            },
            kwargs: { reason },
            flags: { delegated: { description: "set the voter to the advisor", default: false } },
            aliases: {
                n: "name",
                m: "mascot",
                char: "mascot",
                ch: "mascot",
                inv: "invite",
                i: "invite",
                so: "owner",
                o: "owner",
                ca: "advisor",
                a: "advisor",
                delegate: "delegated",
                defer: "delegated",
                d: "delegated",
            },
            async run({ id, name, mascot, invite, owner, advisor, delegated, reason }, api) {
                await api(`POST /guilds/${id}`, { name, mascot, invite, owner, advisor: advisor ?? null, delegated: !!delegated }, reason);
                return `[+] guild "${name}" (${id})`;
            },
        },
    },
    edit: {
        attributes: {
            description: "edit an attribute",
            args: {
                type: { description: "the type of the attribute to edit", type: "string", regex: re.id },
                id: { description: "the current ID of the attribute to edit", type: "string", regex: re.id },
            },
            kwargs: {
                name: { description: "if set, the new name of the attribute", type: "string", optional: true, maxlen: 64 },
                emoji: { description: "if set, the new emoji of the attribute", type: "string", optional: true, maxlen: 64 },
                "set-id": { description: "if set, change the ID of the attribute", type: "string", optional: true, regex: re.id },
                reason,
            },
            aliases: { t: "type", i: "id", n: "name", e: "emoji", s: "set-id" },
            async run({ type, id, name, emoji, "set-id": s, reason }, api) {
                await api(
                    `PATCH /attributes/${type}/${id}`,
                    Object.fromEntries(
                        [
                            ["name", name],
                            ["emoji", emoji],
                            ["id", s],
                        ].filter(([, y]) => y),
                    ),
                    reason,
                );

                return `[*] edited attribute ${type}:${id}`;
            },
        },
        banshares: {
            description: "edit a banshare",
            args: { message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake } },
            kwargs: { severity: { description: "if set, the new severity of the banshare", type: "string", regex: /^(P[012]|DM)$/ } },
            aliases: { id: "message", sev: "severity" },
            async run({ message, severity }, api) {
                await api(`PATCH /banshares/${message}/severity/${severity}`);
                return `[*] set severity of banshare ${message} to ${severity}`;
            },
        },
        characters: {
            description: "edit a character",
            args: { id: { description: "the ID of the character", type: "string", regex: re.id } },
            kwargs: {
                "set-id": { description: "if set, the new ID of the character", type: "string", optional: true, regex: re.id },
                name: { description: "if set, the new full name of the character", type: "string", optional: true, minlen: 1, maxlen: 64 },
                short: {
                    description: "if set, the new short name of the character (if different from the full name) (set to empty string to null)",
                    type: "string",
                    optional: true,
                    maxlen: 64,
                },
                reason,
            },
            kwrest: {
                description: "an attribute, where the key is the type and the value is the ID (set to empty string to null)",
                type: "string",
                regex: /^[a-z-]{0,32}$/,
            },
            aliases: { n: "name", s: "short" },
            async run({ id, "set-id": s, name, short, _kwrest: attributes, reason }, api) {
                await api(
                    `PATCH /characters/${id}`,
                    {
                        ...Object.fromEntries(
                            [
                                ["id", s],
                                ["name", name],
                                ["short", short],
                            ]
                                .filter(([, y]) => y !== undefined)
                                .map(([x, y]) => [x, y || null]),
                        ),
                        attributes: Object.fromEntries(Object.entries(attributes).map(([x, y]) => [x, y || null])),
                    },
                    reason,
                );

                return `[*] edited character ${id}${s ? ` => ${s}` : ""}`;
            },
        },
        "global-filter": {
            description: "edit a global filter entry",
            args: {
                id: { description: "the ID of the global filter entry", type: "number", min: 1, int: true },
                match: { description: "the regex to match", type: "string" },
            },
            async run({ id, match }, api) {
                await api(`PATCH /global/filter/${id}`, match);
                return `[*] edited global filter #${id} => ${match}`;
            },
        },
        guilds: {
            description: "edit a guild",
            args: {
                id: { description: "the ID of the guild", type: "string", regex: re.snowflake },
            },
            kwargs: {
                name: { description: "if set, the new name of the guild", type: "string", optional: true, minlen: 1, maxlen: 64 },
                mascot: { description: "if set, the ID of the guild's new mascot character", type: "string", optional: true, regex: re.id },
                invite: { description: "if set, a new permanent, non-vanity invite code to the guild", type: "string", optional: true },
                owner: { description: "if set, the ID of the guild's new owner", type: "string", optional: true, regex: re.snowflake },
                advisor: {
                    description: "if set, the ID of the guild's new advisor (set to empty string to null)",
                    type: "string",
                    optional: true,
                    regex: /^([1-9][0-9]{16,19})?$/,
                },
                delegated: { description: "whether the voter is the advisor", type: "boolean", optional: true },
                reason,
            },
            aliases: {
                n: "name",
                m: "mascot",
                char: "mascot",
                ch: "mascot",
                inv: "invite",
                i: "invite",
                so: "owner",
                o: "owner",
                ca: "advisor",
                a: "advisor",
                delegate: "delegated",
                defer: "delegated",
                d: "delegated",
            },
            async run({ id, reason, ...data }, api) {
                await api(
                    `PATCH /guilds/${id}`,
                    Object.fromEntries(
                        Object.entries(data)
                            .filter(([, y]) => y !== undefined)
                            .map(([x, y]) => [x, y === "" ? null : y]),
                    ),
                    reason,
                );

                return `[*] edited guild ${id}`;
            },
        },
    },
    delete: {
        attributes: {
            description: "delete an attribute",
            args: {
                type: { description: "the type of the attribute to delete", type: "string", regex: re.id },
                id: { description: "the ID of the attribute to delete", type: "string", regex: re.id },
            },
            kwargs: { reason },
            async run({ type, id, reason }, api) {
                await api(`DELETE /attributes/${type}/${id}`, undefined, reason);
                return `[-] deleted attribute ${type}:${id}`;
            },
        },
        characters: {
            description: "delete a character",
            args: { id: { description: "the ID of the character to delete", type: "string", regex: re.id } },
            kwargs: { reason },
            async run({ id, reason }, api) {
                await api(`DELETE /characters/${id}`, undefined, reason);
                return `[-] deleted character ${id}`;
            },
        },
        "global-filter": {
            description: "delete a global filter entry",
            args: { id: { description: "the ID of the global filter entry", type: "number", min: 1, int: true } },
            async run({ id }, api) {
                await api(`DELETE /global/filter/${id}`);
                return `[-] deleted global filter #${id}`;
            },
        },
        guilds: {
            description: "remove a guild from the TCN",
            args: {
                id: { description: "the ID of the guild to remove", type: "string", regex: re.snowflake },
                mascot: { description: "the mascot of the guild (set to avoid mistakes)", type: "string", regex: re.id },
            },
            kwargs: { reason },
            async run({ id, mascot, reason }, api) {
                const guild = await api(`GET /guilds/${id}`);

                if (guild.mascot !== mascot)
                    throw `mascot mismatch: you specified ${mascot} but ${guild.name}'s mascot is ${guild.mascot}; ensure the match to avoid mistakes`;

                await api(`DELETE /guilds/${id}`, undefined, reason);
                return `[-] removed guild "${guild.name}" (${id})`;
            },
        },
    },
    invalidate: {
        description:
            "invalidate a user's tokens (or your own), which logs them out everywhere and permanently stops all of their current API tokens from working",
        args: {
            user: { description: "the ID of the user to invalidate (or leave blank to target yourself)", type: "string", optional: true, regex: re.snowflake },
            tag: { description: "the tag of the user (to avoid mistakes)", type: "string" },
            reason: { description: "the audit log reason (required for invalidating other users)", type: "string", optional: true, maxlen: 256 },
        },
        flags: { confirm: { description: "must be set to confirm this destructive action", default: false } },
        aliases: { u: "user" },
        async run({ user, tag, reason, confirm }, api, message) {
            user ??= message.author.id;

            const realUser = await bot.users.fetch(user).catch(() => {
                throw `could not fetch user ${user}`;
            });

            const self = user === message.author.id;

            if (realUser.tag !== tag)
                throw `tag mismatch: you specified ${tag} but ${self ? "you are" : `user ${user} is`} ${
                    realUser.tag
                }; please make sure these match to avoid mistakes`;

            if (!confirm)
                throw `this invalidates all of ${self ? "your" : `${tag}'s`} tokens which logs ${
                    self ? "you" : "them"
                } out everywhere and permanently stops all of ${
                    self ? "your" : "their"
                } current API tokens from working; if you understand and are sure, specify the "-confirm" flag`;

            if (!self) throw "you must specify a reason for invalidating others' tokens";

            await api(`POST /auth/invalidate${self ? "" : `/${user}`}`, undefined, reason);
            return `[!] invalidated tokens for ${realUser.displayName} (${user}: ${tag}))`;
        },
    },
    banshares: {
        blame: {
            description: "identify the observers who processed a banshare",
            args: { message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake } },
            aliases: { id: "message" },
            async run({ message: id }, api, message) {
                await ensureObserver(message);

                const { rejecter, publisher, rescinder } = await api(`GET /banshares/${id}`);
                const fetch = async (id: string) => `${(await bot.users.fetch(id).catch(() => null))?.tag ?? "missing user"} (${id})`;

                return [
                    rejecter && `rejected by ${await fetch(rejecter)}`,
                    publisher && `published by ${await fetch(publisher)}`,
                    rescinder && `rescinded by ${await fetch(rescinder)}`,
                ]
                    .filter((x) => x)
                    .join("\n");
            },
        },
        reject: {
            description: "reject a banshare",
            args: { message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake } },
            aliases: { id: "message" },
            async run({ message }, api) {
                await api(`POST /banshares/${message}/reject`);
                return `[!] rejected banshare ${message}`;
            },
        },
        publish: {
            description: "publish a banshare",
            args: { message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake } },
            aliases: { id: "message" },
            async run({ message }, api) {
                await api(`POST /banshares/${message}/publish`);
                return `[!] published banshare ${message}`;
            },
        },
        rescind: {
            description: "rescind a banshare",
            args: {
                message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake },
                explanation: { description: "the explanation for why the banshare is being rescinded", type: "string", minlen: 1, maxlen: 1800 },
            },
            aliases: { id: "message", expl: "explanation", xp: "explanation", e: "explanation", reason: "explanation" },
            async run({ message, explanation }, api) {
                await api(`POST /banshares/${message}/rescind`, { explanation });
                return `[!] rescinded banshare ${message}`;
            },
        },
        execute: {
            description: "execute a banshare",
            args: {
                message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake },
                guild: {
                    description: "the ID of the guild in which to execute the banshare (leave blank to submit from this server)",
                    type: "string",
                    optional: true,
                    regex: re.snowflake,
                },
            },
            aliases: { id: "message", g: "guild" },
            async run({ message: id, guild }, api, message) {
                if (!guild)
                    if (!message.guild) throw "to run without the server argument, you must be in a server";
                    else guild = message.guildId;

                await api(`POST /banshares/${id}/execute/${guild}`);

                const apiGuild = await api(`GET /guilds/${guild}`).catch(() => {});
                return `[!] executed banshare ${id} in ${apiGuild?.name ?? guild}`;
            },
        },
        settings: {
            description: "get a guild's banshare settings",
            args: { guild: { description: "the ID of the guild (leave blank to check this server)", type: "string", optional: true, regex: re.snowflake } },
            aliases: { g: "guild", id: "guild" },
            async run({ guild }, api, message) {
                if (!guild)
                    if (!message.guild) throw "to run without the server argument, you must be in a server";
                    else guild = message.guildId;

                const x = await api(`GET /banshares/settings/${guild}`);

                return `ch:  ${x.channel}\nlog: ${x.logs.join(", ") || "-"}\n${x.blockdms ? "block DM scam banshares" : "allow DM scam banshares"}\n${
                    x.nobutton ? "no button" : "show button"
                }\n${x.daedalus ? "daedalus integration on" : "daedalus integration off"}\nautoban = ${x.autoban.toString(2)}`;
            },
        },
        report: {
            description: "report a banshare",
            args: {
                message: { description: "the message ID of the banshare post", type: "string", regex: re.snowflake },
                reason: { description: "the reason you are reporting this banshare", type: "string", minlen: 1, maxlen: 1800 },
            },
            aliases: { id: "message" },
            async run({ message, reason }, api) {
                await api(`POST /banshares/report/${message}`, { reason });
                return `[!] reported banshare ${message}`;
            },
        },
    },
    "global-filter": {
        test: {
            description: "test the global filter against a string",
            args: { string: { description: "the string to test", type: "string" } },
            async run({ string }, api) {
                const filter: { id: number; match: string }[] = await api(`GET /global/filter`);
                const matches: { id: number; match: string }[] = [];

                for (const { id, match } of filter) if (string.match(new RegExp(match))) matches.push({ id, match });

                const maxlen = Math.max(0, ...matches.map(({ id }) => id.toString().length));
                return matches.map(({ id, match }) => `- ${`${id}:`.padEnd(maxlen + 1)} ${match}`).join("\n") || "would not be filtered";
            },
        },
    },
    stats: {
        description: "get API stats",
        async run(_, api) {
            const stats = await api("GET /stats");
            return `started @ ${new Date(stats.startup).toISOString()}\nuptime:   ${stats.uptime}\nusers:    ${stats.users}\nguilds:   ${stats.guilds}`;
        },
    },
    shorten: {
        description: "shorten a URL",
        args: {
            link: { description: "the link to shorten", type: "string", regex: /^https?:\/\// },
            id: { description: "the ID to use (leave blank for a random one)", type: "string", optional: true },
        },
        async run({ link, id: wanted }, api) {
            const { id } = await api(`POST /short-links${wanted ? `?id=${encodeURIComponent(wanted)}` : ""}`, link);
            return `${Bun.env.WEBSITE}/link/${id}`;
        },
    },
    users: {
        promote: {
            description: "promote a user to observer",
            args: {
                id: { description: "the user to promote", type: "string", regex: re.snowflake },
                reason: { description: "the reason (required)", type: "string", minlen: 1, maxlen: 256 },
            },
            async run({ id, reason }, api) {
                await api(`PATCH /users/${id}`, { observer: true }, reason);
                return `[!] promoted ${id} to observer`;
            },
        },
        demote: {
            description: "demote a user from observer",
            args: {
                id: { description: "the user to demote", type: "string", regex: re.snowflake },
                reason: { description: "the reason (required)", type: "string", minlen: 1, maxlen: 256 },
            },
            async run({ id, reason }, api) {
                await api(`PATCH /users/${id}`, { observer: false }, reason);
                return `[!] demoted ${id} from observer`;
            },
        },
        refresh: {
            description: "refresh a user's observer term",
            args: {
                id: { description: "the user to refresh", type: "string", regex: re.snowflake },
                reason: { description: "the reason (required)", type: "string", minlen: 1, maxlen: 256 },
            },
            async run({ id, reason }, api) {
                await api(`POST /users/${id}/refresh`, undefined, reason);
                return `[!] refreshed ${id}'s observership`;
            },
        },
        roles: {
            add: {
                description: "add a role to a user",
                args: {
                    id: { description: "the user to modify", type: "string", regex: re.snowflake },
                    role: { description: "the role to add", type: "string", regex: re.id },
                    guild: {
                        description: "the guild (leave blank for global or set to - to use this guild)",
                        type: "string",
                        optional: true,
                        regex: /^(-|[1-9][0-9]{16,19})$/,
                    },
                },
                kwargs: { reason },
                async run({ id, role, guild, reason }, api, message) {
                    if (guild === "-")
                        if (!message.guild) throw "you must be in a guild to use guild = -";
                        else guild = message.guildId;

                    await api(`PUT /users/${id}/roles/${role}${guild ? `/${guild}` : ""}`, undefined, reason);
                    return `[+] added role ${role} to user ${id} ${guild ? `in guild ${guild}` : "globally"}`;
                },
            },
            remove: {
                description: "remove a role from a user",
                args: {
                    id: { description: "the user to modify", type: "string", regex: re.snowflake },
                    role: { description: "the role to remove", type: "string", regex: re.id },
                    guild: {
                        description: "the guild (leave blank for global or set to - to use this guild)",
                        type: "string",
                        optional: true,
                        regex: /^(-|[1-9][0-9]{16,19})$/,
                    },
                },
                kwargs: { reason },
                async run({ id, role, guild, reason }, api, message) {
                    if (guild === "-")
                        if (!message.guild) throw "you must be in a guild to use guild = -";
                        else guild = message.guildId;

                    await api(`DELETE /users/${id}/roles/${role}${guild ? `/${guild}` : ""}`, undefined, reason);
                    return `[-] removed role ${role} from user ${id} ${guild ? `in guild ${guild}` : "globally"}`;
                },
            },
        },
        staff: {
            description: "add a user as staff to a guild",
            args: {
                id: { description: "the user to add", type: "string", regex: re.snowflake },
                guild: { description: "the guild to which to add the user", type: "string", regex: re.snowflake },
            },
            kwargs: { reason },
            async run({ id, guild, reason }, api) {
                await api(`PUT /users/${id}/staff/${guild}`, { staff: true }, reason);
                return `[+] added user ${id} as staff to guild ${guild}`;
            },
        },
        unstaff: {
            description: "remove a user as staff from a guild",
            args: {
                id: { description: "the user to remove", type: "string", regex: re.snowflake },
                guild: { description: "the guild from which to remove the user", type: "string", regex: re.snowflake },
            },
            kwargs: { reason },
            async run({ id, guild, reason }, api) {
                await api(`PUT /users/${id}/staff/${guild}`, { staff: false }, reason);
                return `[-] removed user ${id} as staff from guild ${guild}`;
            },
        },
    },
    exec: {
        description: "execute a shell command",
        rest: { description: "a component of the command", type: "string" },
        kwargs: { cwd: { description: "the CWD to use", type: "string", optional: true } },
        async run({ _rest, cwd }, _, message) {
            if (message.author.id !== Bun.env.ADMIN) throw "only the technical administrator may run this command";
            return execSync(shlex.join(_rest ?? []), { encoding: "utf-8", cwd });
        },
    },
    help: {
        description: "get command help",
        rest: { description: "a component of the command", type: "string" },
        async run({ _rest }) {
            let current = commands;
            let amap = aliases;
            const real: string[] = [];
            const items = _rest ?? [];

            while (!current.run) {
                if (items.length === 0) break;

                let key = items.shift()!.toLowerCase();
                if (typeof amap === "object" && typeof amap[key] === "string") key = amap[key] as string;

                current = current[key];
                amap = typeof amap === "string" ? amap : amap?.[key];

                if (!current) throw real.length > 0 ? `command not found (${real.join(" ")} is fine, but ${key} = ??)` : `command not found, ${key} = ??`;
                real.push(key);
            }

            if (current.run)
                return `[${real.join(" ")}]:${
                    current.args
                        ? `\n- positional arguments:\n${Object.entries(current.args)
                              .map(([k, v]) => `    - ${k}: ${v.description}`)
                              .join("\n")}`
                        : ""
                }${
                    current.kwargs
                        ? `\n- keyword arguments:\n${Object.entries(current.kwargs)
                              .map(([k, v]) => `    - ${k}: ${v.description}`)
                              .join("\n")}`
                        : ""
                }${current.rest ? `\n- rest arguments: ${current.rest.description}` : ""}${
                    current.kwrest ? `\n- additional keyword arguments: ${current.kwrest.description}` : ""
                }${current.flags ? `\n- flags:\n${Object.entries(current.flags).map(([k, v]) => `    - ${k}: ${v.description}`)}` : ""}${
                    current.aliases
                        ? `\n- argument / flag name aliases:\n${Object.entries(current.aliases)
                              .map(([k, v]) => `    - ${k} => ${v}`)
                              .join("\n")}`
                        : ""
                }`;
            else
                return `[${real.join(" ")}]:\n${Object.keys(current)
                    .map(
                        (key) =>
                            [
                                key,
                                Object.entries(amap)
                                    .filter(([, y]) => y === key)
                                    .map(([x]) => x),
                            ] satisfies [string, string[]],
                    )
                    .map(([key, aliases]) => `- ${key}${aliases.length > 0 ? ` (a.k.a. ${aliases.join(", ")})` : ""}`)
                    .join("\n")}`;
        },
    },
};

type Alias = string | { [k: string]: Alias };

const aliases: Alias = {
    g: "get",
    "+": "post",
    e: "edit",
    "-": "delete",
    del: "delete",
    banshare: "banshares",
    bs: "banshares",
    gf: "global-filter",
    user: "users",
    u: "users",
    x: "exec",
    "?": "help",
    get: {
        attribute: "attributes",
        attrs: "attributes",
        attr: "attributes",
        character: "characters",
        chars: "characters",
        char: "characters",
        ch: "characters",
        gf: "global-filter",
        guild: "guilds",
        g: "guilds",
        user: "users",
        u: "users",
    },
    post: {
        attribute: "attributes",
        attrs: "attributes",
        attr: "attributes",
        banshare: "banshares",
        bs: "banshares",
        character: "characters",
        chars: "characters",
        char: "characters",
        ch: "characters",
        gf: "global-filter",
        guild: "guilds",
        g: "guilds",
    },
    edit: {
        attribute: "attributes",
        attrs: "attributes",
        attr: "attributes",
        banshare: "banshares",
        bs: "banshares",
        character: "characters",
        chars: "characters",
        char: "characters",
        ch: "characters",
        gf: "global-filter",
        guild: "guilds",
        g: "guilds",
    },
    delete: {
        attribute: "attributes",
        attrs: "attributes",
        attr: "attributes",
        character: "characters",
        chars: "characters",
        char: "characters",
        ch: "characters",
        gf: "global-filter",
        guild: "guilds",
        g: "guilds",
    },
    banshares: {
        pub: "publish",
        ac: "publish",
        rej: "reject",
        deny: "reject",
        "-": "rescind",
        exec: "execute",
        x: "execute",
        cfg: "settings",
    },
    users: {
        p: "promote",
        d: "demote",
        role: "roles",
        r: "roles",
        roles: {
            "+": "add",
            rm: "remove",
            "-": "remove",
        },
    },
};
