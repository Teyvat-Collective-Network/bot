import {
    ApplicationCommandData,
    ApplicationCommandOptionData,
    ApplicationCommandOptionType,
    ApplicationCommandSubCommandData,
    ApplicationCommandSubGroupData,
    ApplicationCommandType,
    AutocompleteInteraction,
    Channel,
    ChatInputCommandInteraction,
    Client,
    Colors,
    Events,
    ForumChannel,
    IntentsBitField,
    TextChannel,
} from "discord.js";
import { readdirSync } from "node:fs";
import logger from "./logger.js";
import { failure, success } from "./responses.js";
import { reply } from "./utils.js";

const bot = new Client({ allowedMentions: { parse: [] }, intents: IntentsBitField.Flags.Guilds });
await bot.login(Bun.env.DISCORD_TOKEN);

await new Promise((r) => bot.on(Events.ClientReady, r));

const handlerCache: Record<string, any> = {};

const commands: ApplicationCommandData[] = [];
const internalCommands: ApplicationCommandData[] = [];

const commandHandlers: Record<number, Record<string, any>> = {};

const commandDir = "./src/commands";

for (const module of readdirSync("./src/commands")) {
    const handlers: Record<string, any> = {};
    const options: ApplicationCommandOptionData[] = [];
    const groups: Record<string, ApplicationCommandSubCommandData[]> = {};

    for (const name of readdirSync(`./src/commands/${module}`)) {
        const data = await import(`../commands/${module}/${name}`);
        const { command } = data;
        command.options ??= [];

        if (command.key) {
            if (command.group) {
                (groups[command.group] ??= []).push({
                    type: ApplicationCommandOptionType.Subcommand,
                    name: command.key,
                    description: command.description,
                    options: command.options,
                });

                handlers[`${command.group} ${command.key}`] = data;
            } else {
                options.push({
                    type: ApplicationCommandOptionType.Subcommand,
                    name: command.key,
                    description: command.description,
                    options: command.options,
                });

                handlers[command.key] = data;
            }
        } else {
            commands.push(command);
            (commandHandlers[command.type] ??= {})[command.name] = data;
        }
    }

    const data = {
        type: ApplicationCommandType.ChatInput,
        name: module,
        description: `commands in the ${module} module`,
        options: [
            ...Object.entries(groups).map(
                ([group, options]): ApplicationCommandSubGroupData => ({
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    name: group,
                    description: `commands in the ${group} group in the ${module} module`,
                    options,
                }),
            ),
            ...options,
        ],
    };

    if (["internals"].includes(module)) internalCommands.push(data);
    else commands.push(data);

    (commandHandlers[ApplicationCommandType.ChatInput] ??= {})[module] = {
        async default(cmd: ChatInputCommandInteraction, ...args: any[]) {
            const group = cmd.options.getSubcommandGroup(false);
            const key = `${group ? `${group} ` : ""}${cmd.options.getSubcommand()}`;
            if (!handlers[key]?.default) throw "This command has not been implemented yet.";
            return await handlers[key].default(cmd, ...args);
        },
        async autocomplete(cmd: AutocompleteInteraction, ...args: any[]) {
            const group = cmd.options.getSubcommandGroup(false);
            const key = `${group ? `${group} ` : ""}${cmd.options.getSubcommand()}`;
            if (!handlers[key]?.autocomplete) return [];
            return await handlers[key].autocomplete(cmd, ...args);
        },
    };
}

export const hq = await bot.guilds.fetch(Bun.env.HQ!);

await bot.application!.commands.set(commands);
await hq.commands.set(internalCommands);

bot.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isCommand() || interaction.isAutocomplete()) {
            const handler = commandHandlers[interaction.commandType]?.[interaction.commandName];
            if (!handler) throw "This command has not been implemented yet.";

            const values: any[] = interaction.isUserContextMenuCommand()
                ? [interaction.targetUser]
                : interaction.isMessageContextMenuCommand()
                ? [interaction.targetMessage]
                : interaction.isAutocomplete()
                ? [interaction.options.getFocused()]
                : [];

            const required: { type: number; name: string }[] = [];

            if (interaction.isChatInputCommand()) {
                for (const option of interaction.command!.options) {
                    if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
                        if (option.name === interaction.options.getSubcommandGroup(false))
                            for (const suboption of option.options ?? [])
                                if (suboption.name === interaction.options.getSubcommand(false))
                                    for (const leaf of suboption.options ?? []) required.push(leaf);
                    } else if (option.type === ApplicationCommandOptionType.Subcommand) {
                        if (option.name === interaction.options.getSubcommand(false)) for (const leaf of option.options ?? []) required.push(leaf);
                    } else required.push(option);
                }

                for (const option of required)
                    switch (option.type) {
                        case ApplicationCommandOptionType.Attachment:
                            values.push(interaction.options.getAttachment(option.name));
                            break;
                        case ApplicationCommandOptionType.Boolean:
                        case ApplicationCommandOptionType.Number:
                        case ApplicationCommandOptionType.Integer:
                        case ApplicationCommandOptionType.String:
                            values.push(interaction.options.get(option.name)?.value);
                            break;
                        case ApplicationCommandOptionType.Channel:
                            values.push(interaction.options.getChannel(option.name));
                            break;
                        case ApplicationCommandOptionType.Role:
                            values.push(interaction.options.getRole(option.name));
                            break;
                        case ApplicationCommandOptionType.User:
                            values.push(interaction.options.getUser(option.name));
                            break;
                        case ApplicationCommandOptionType.Mentionable:
                            values.push(interaction.options.getMentionable(option.name));
                            break;
                        default:
                            values.push(null);

                            logger.error(
                                { location: "3a52f612-3ddd-458e-b1bf-8af7ae6fcdc5", details: `${option.name} (type ${option.type})` },
                                "Unrecognized option type:",
                            );
                    }
            }

            if (interaction.isCommand()) {
                let response = await handler.default(interaction, ...values);
                if (!response) return;

                if (typeof response === "string") response = success(response);

                response.ephemeral ??= true;

                await reply(interaction, response);
            } else {
                let response = await handler.autocomplete(interaction, ...values);
                if (!response) return;
                if (!Array.isArray(response)) response = [response];

                response = response.slice(0, 25).map((x: any) => (typeof x === "object" && "name" in x ? x : { name: `${x}`, value: x }));

                await interaction.respond(response);
            }
        } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            const id = interaction.customId;
            if (!id.startsWith(":")) return;

            let user = "",
                path: string,
                args: string[];

            if (interaction.isMessageComponent())
                if (id.match(/^:([1-9][0-9]{16,19})?:/)) [, user, path, ...args] = id.split(":");
                else return;
            else [, path, ...args] = id.split(":");

            if (user && interaction.user.id !== user) return;
            if (!path) return;

            try {
                if (!(handlerCache[path] ??= (await import(`../interactions/${path}.js`)).default)) throw 0;
            } catch {
                throw `This component has not been implemented yet (\`${path}\`).`;
            }

            let response = await handlerCache[path](interaction, ...args);
            if (!response) return;

            if (typeof response === "string") response = success(response);
            response.ephemeral ??= true;

            await reply(interaction, response);
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(
                { location: "f93aad73-bb0c-4e26-8950-774ae5b77d20", error },
                `Error handling interaction ${
                    interaction.isCommand() || interaction.isAutocomplete()
                        ? `/${interaction.commandName}${interaction.isAutocomplete() ? " [autocomplete]" : ""}`
                        : interaction.isMessageComponent()
                        ? `[${interaction.customId}]`
                        : "{unidentified}"
                }`,
            );

            await reply(interaction, {
                embeds: [
                    {
                        title: "Unexpected Error",
                        description: "An unexpected error occurred. If this issue persists, please contact a developer.",
                        color: Colors.Red,
                    },
                ],
                components: [],
                files: [],
                ephemeral: true,
            });
        } else if (typeof error === "string") await reply(interaction, failure(error));
        else if (typeof error === "object") await reply(interaction, { embeds: [{ title: "Error", color: Colors.Red, ...error }], ephemeral: true });
    }
});

export default bot;

async function get<T extends Channel>(id: string) {
    return (await bot.channels.fetch(id)) as T;
}

export const channels = {
    APPLICANTS_FORUM: await get<ForumChannel>(Bun.env.APPLICANTS_FORUM!),
    OBSERVER_CHANNEL: await get<TextChannel>(Bun.env.OBSERVER_CHANNEL!),
    OFFICIAL_BUSINESS: await get<TextChannel>(Bun.env.OFFICIAL_BUSINESS!),
    BANSHARE_DASHBOARD: await get<TextChannel>(Bun.env.BANSHARE_DASHBOARD!),
    BANSHARE_LOGS: await get<TextChannel>(Bun.env.BANSHARE_LOGS!),
    BOT_LOGS: await get<TextChannel>(Bun.env.BOT_LOGS!),
};
