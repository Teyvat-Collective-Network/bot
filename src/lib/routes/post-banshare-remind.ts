import { App } from "../../index.js";
import { channels } from "../bot.js";

export default (app: App) =>
    app.post("/banshares/remind", async () => {
        await channels.OBSERVER_CHANNEL.send({
            content: `<@&${Bun.env.URGENT_BANSHARE_PING_ROLE}> One or more banshares has exceeded the allowed pending time. Please check the list of all pending banshares in ${channels.BANSHARE_DASHBOARD}.`,
            allowedMentions: { roles: [Bun.env.URGENT_BANSHARE_PING_ROLE!] },
        });
    });
