import { t } from "elysia";
import { App } from "../../index.js";
import bot from "../bot.js";

export default (app: App) =>
    app.get(
        "/users/:id/tag",
        async ({ params: { id } }) => {
            try {
                const user = await bot.users.fetch(id);
                return JSON.stringify(user.tag);
            } catch {
                return new Response("User not found.", { status: 404 });
            }
        },
        {
            params: t.Object({ id: t.String({ pattern: "^[1-9][0-9]{16,19}$", default: "1012321234321232101" }) }),
        },
    );
