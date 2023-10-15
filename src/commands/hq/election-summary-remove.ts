import { ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";
import { ensureObserver } from "../../lib/permissions.js";
import { statements } from "./election-post-summary.js";

export const command = {
    type: ApplicationCommandType.Message,
    name: "Unmark Statement",
};

export default async function (cmd: MessageContextMenuCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await ensureObserver(cmd);

    const list = (statements[cmd.channelId] ?? []).filter((x) => x.id !== cmd.targetId);

    if (list) statements[cmd.channelId] = list;
    else delete statements[cmd.channelId];

    return `Removed ${cmd.targetMessage.url} from the summary. When ready, use \`/hq election post-summary\` to post the summary.`;
}
