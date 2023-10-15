import { ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";
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
    return `Added ${cmd.targetMessage.url} to the summary. When ready, use \`/hq election post-summary\` to post the summary.`;
}
