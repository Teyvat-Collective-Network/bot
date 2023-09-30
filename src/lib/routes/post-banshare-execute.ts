import { User } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import api from "../api.js";
import { execute } from "../banshares.js";
import bot from "../bot.js";

export default (app: App) =>
    app.post(
        "/banshares/:message/execute/:guild",
        async ({ bearer, params: { message: id, guild: guildId } }) => {
            const { idList, reason }: { idList: string[]; reason: string } = await api(bearer, `GET /banshares/${id}`);
            const settings = await api(bearer, `GET /banshares/settings/${guildId}`);
            const { channel: channelId, message: messageId } = await api(bearer, `GET /banshares/${id}/crossposts/${guildId}`);

            const guild = await bot.guilds.fetch(guildId).catch(() => {});
            if (!guild) return new Response(JSON.stringify(`No guild found with ID ${guild}.`), { status: 404 });

            const crosspostChannel = await bot.channels.fetch(channelId).catch(() => {});
            if (!crosspostChannel?.isTextBased()) return new Response(JSON.stringify("Could not fetch crosspost channel or its type is invalid."));

            const crosspost = await crosspostChannel.messages.fetch(messageId).catch(() => {});
            if (!crosspost) return new Response(JSON.stringify("Could not fetch crosspost."));

            const users: Record<string, User | null> = {};

            for (const id of idList)
                try {
                    users[id] = await bot.users.fetch(id);
                } catch {
                    users[id] = null;
                }

            await execute(guild, settings.logs, id, settings.daedalus, crosspost, reason, users);
        },
        {
            params: t.Object({
                message: t.String(),
                guild: t.String(),
            }),
        },
    );
