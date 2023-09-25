import { t } from "elysia";
import { App } from "../../index.js";
import bot from "../bot.js";

export default (app: App) =>
    app
        .get(
            "/invite/:code",
            async ({ params: { code } }) => {
                try {
                    const invite = await bot.fetchInvite(code);

                    return {
                        code: invite.code,
                        guild: invite.guild,
                        vanity: invite.guild?.vanityURLCode === invite.code,
                        target: !!(invite.targetApplication || invite.targetUser),
                    };
                } catch {
                    return new Response("Invite not found.", { status: 404 });
                }
            },
            {
                params: t.Object({ code: t.String() }),
            },
        )
        .get(
            "/tag/:id",
            async ({ params: { id } }) => {
                try {
                    const user = await bot.users.fetch(id);
                    return JSON.stringify(user.tag);
                } catch {
                    return new Response("User not found.", { status: 404 });
                }
            },
            {
                params: t.Object({ id: t.String({ pattern: "^\\d{17,20}$", default: "1234567890987654321" }) }),
            },
        );
