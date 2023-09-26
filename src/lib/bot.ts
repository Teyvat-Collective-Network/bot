import { Channel, Client, Events, ForumChannel, IntentsBitField, TextChannel } from "discord.js";

const bot = new Client({ intents: IntentsBitField.Flags.Guilds });
await bot.login(Bun.env.DISCORD_TOKEN);

await new Promise((r) => bot.on(Events.ClientReady, r));

export default bot;

async function get<T extends Channel>(id: string) {
    return (await bot.channels.fetch(id)) as T;
}

export const channels = {
    APPLICANTS_FORUM: await get<ForumChannel>(Bun.env.APPLICANTS_FORUM!),
    OBSERVER_CHANNEL: await get<TextChannel>(Bun.env.OBSERVER_CHANNEL!),
    OFFICIAL_BUSINESS: await get<TextChannel>(Bun.env.OFFICIAL_BUSINESS!),
};
