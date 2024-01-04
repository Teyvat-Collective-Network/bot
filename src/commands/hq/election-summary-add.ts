import { ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";
import logger from "../../lib/logger.js";
import { ensureObserver } from "../../lib/permissions.js";
import { statements } from "./election-post-summary.js";

export const command = {
    type: ApplicationCommandType.Message,
    name: "Mark Statement",
};

export default async function (cmd: MessageContextMenuCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await ensureObserver(cmd);

    (statements[cmd.channelId] ??= []).push(cmd.targetMessage);
    logger.info({ user: cmd.user.id, message: cmd.targetMessage.id }, "f1fa2f34-55f7-43b5-905a-1d57e99331d4 Message added to election summary");
    return `Added ${cmd.targetMessage.url} to the summary. When ready, use \`/hq election post-summary\` to post the summary.`;
}
