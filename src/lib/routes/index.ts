import { t } from "elysia";
import { App } from "../../index.js";
import bot from "../bot.js";

export default (app: App) =>
    app.get(
        "/invite/:code",
        async ({ params: { code } }) => {
            try {
                const invite = await bot.fetchInvite(code);

                return {
                    code: invite.code,
                    id: invite.guild?.id,
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
    );
