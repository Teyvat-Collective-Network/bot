import { t } from "elysia";
import { App } from "../../index.js";
import { channels } from "../bot.js";

export default (app: App) =>
    app.post(
        "/log",
        async ({ body: { message } }) => {
            await channels.BOT_LOGS.send(message);
        },
        {
            body: t.Object({
                message: t.String(),
            }),
        },
    );
