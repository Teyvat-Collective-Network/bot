import { t } from "elysia";
import { App } from "../../index.js";
import bot from "../bot.js";

export default (app: App) =>
    app.get(
        "/invites/:code",
        async ({ params: { code } }) => {
            try {
                const invite = await bot.fetchInvite(code);

                return {
                    code: invite.code,
                    guild: invite.guild,
                    vanity: invite.guild?.vanityURLCode === invite.code,
                    expires: invite.expiresTimestamp,
                    members: invite.memberCount,
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
