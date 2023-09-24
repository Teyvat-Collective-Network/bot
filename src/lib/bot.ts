import { Client, Events, IntentsBitField } from "discord.js";

const bot = new Client({ intents: IntentsBitField.Flags.Guilds });
await bot.login(Bun.env.DISCORD_TOKEN);

await new Promise((r) => bot.on(Events.ClientReady, r));

export default bot;
