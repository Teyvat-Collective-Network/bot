import { ChatInputCommandInteraction } from "discord.js";
import { channels, hq } from "../../lib/bot.js";
import logger from "../../lib/logger.js";
import { ensureObserver } from "../../lib/permissions.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "invite",
    description: "Create a new invite to HQ.",
    options: [],
};

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await ensureObserver(cmd);

    const invite = await hq.invites.create(channels.INFO_AND_RULES, { maxAge: 7 * 24 * 60 * 60, maxUses: 1, unique: true });
    await channels.BOT_LOGS.send(`${cmd.user} created a 1-use 1-week invite.`).catch(() => {});

    logger.info({ user: cmd.user.id, invite: invite.code }, "b3ca7a69-d6a8-49c4-9f80-bb9e0ce5a3ae One-time invite created");
    return { content: invite.url };
}
