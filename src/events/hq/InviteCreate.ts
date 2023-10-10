import { Invite } from "discord.js";
import { channels } from "../../lib/bot.js";

export default async function (invite: Invite) {
    if (invite.guild?.id === Bun.env.HQ && invite.inviterId !== invite.client.user.id) {
        await invite.delete().catch();

        await channels.BOT_LOGS.send({
            content: `${invite.inviter} Please do not create invites to HQ manually. Use the \`/invite\` command.`,
            allowedMentions: invite.inviterId ? { users: [invite.inviterId] } : {},
        });
    }
}
