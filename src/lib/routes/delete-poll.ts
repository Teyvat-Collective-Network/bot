import { t } from "elysia";
import { App } from "../../index.js";
import { channels } from "../bot.js";

export default (app: App) =>
    app.delete(
        "/poll/:message",
        async ({ params: { message: id } }) => {
            const message = await channels.VOTE_HERE.messages.fetch(id);
            await message.delete();
        },
        {
            params: t.Object({
                message: t.String(),
            }),
        },
    );
