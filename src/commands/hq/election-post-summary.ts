import { ChatInputCommandInteraction, Message } from "discord.js";
import { ensureObserver } from "../../lib/permissions.js";
import { CommandData } from "../../lib/types.js";

export const statements: Record<string, Message[]> = {};

export const command: CommandData = {
    group: "election",
    key: "post-summary",
    description: "post the election summary",
};

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    await ensureObserver(cmd);

    const list = statements[cmd.channelId];
    if (!list?.length) throw "There are no statements marked in this channel. Right click / long press a message and use `Apps > Mark Statement`.";

    await cmd.channel!.send({
        embeds: [{ title: "Election Candidate Statements", description: `In arbitrary order:\n${list.map((x) => `- ${x.author}: ${x.url}`).join("\n")}` }],
    });

    delete statements[cmd.channelId];

    return "Your election summary has been posted.";
}
