import { t } from "elysia";
import { App } from "../../index.js";
import { channels } from "../bot.js";

export default (app: App) =>
    app.post(
        "/banshares/:message/report",
        async ({ body: { user, reason }, params: { message } }) => {
            await channels.OBSERVER_CHANNEL.send({
                content: `<@&${Bun.env.URGENT_BANSHARE_PING_ROLE}> ${channels.BANSHARE_LOGS.url}/${message} was reported by <@${user}>:\n\n>>> ${reason}`,
                allowedMentions:{roles:[Bun.env.URGENT_BANSHARE_PING_ROLE!]}
            });
        },
        {
            body: t.Object({
                user: t.String(),
                reason: t.String(),
            }),
            params: t.Object({
                message: t.String(),
            }),
        },
    );
