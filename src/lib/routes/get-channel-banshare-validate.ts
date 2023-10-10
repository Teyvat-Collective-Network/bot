import { ChannelType } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import bot from "../bot.js";

export default (app: App) =>
    app.get(
        "/channels/:id/banshare-valid/:guild",
        async ({ params: { id, guild } }) => {
            const channel = await bot.channels.fetch(id).catch();
            if (!channel) return { error: `No channel exists with ID ${id}.` };

            return {
                error:
                    channel.type === ChannelType.GuildText || channel.type === ChannelType.PrivateThread || channel.type === ChannelType.PublicThread
                        ? channel.guildId === guild
                            ? null
                            : `That channel belongs to a different guild that the one specified (${guild} was specified, but ${channel.guildId} was found).`
                        : "That channel is not of a valid type (must be guild text channel, private thread, or public thread).",
            };
        },
        {
            params: t.Object({
                id: t.String(),
                guild: t.String(),
            }),
        },
    );
