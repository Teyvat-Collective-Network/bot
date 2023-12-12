import { ApplicationCommandOptionType, ChatInputCommandInteraction, TimestampStyles } from "discord.js";
import { channels } from "../../lib/bot.js";
import { ensureObserver } from "../../lib/permissions.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    group: "election",
    key: "start",
    description: "start an election",
    options: [
        {
            type: ApplicationCommandOptionType.Integer,
            name: "wave",
            description: "the election index",
            required: true,
            minValue: 1,
        },
        {
            type: ApplicationCommandOptionType.Integer,
            name: "seats",
            description: "the number of seats available",
            required: true,
            minValue: 1,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: "short-reason",
            description: "the short reason that goes in the forum post summary",
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: "long-reason",
            description: "the long reason that goes in the forum post follow-up / ping",
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Number,
            name: "nomination-window",
            description: "the number of days for which nomination will be open (default & min: 7)",
            minValue: 7,
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, wave: number, seats: number, shortReason: string, longReason: string, window: number | null) {
    await cmd.deferReply({ ephemeral: true });
    await ensureObserver(cmd);

    const now = Date.now();
    const start = `<t:${Math.floor(now / 1000)}:${TimestampStyles.LongDateTime}>`;
    const end = `<t:${Math.floor(now / 1000 + (window ?? 7) * 24 * 60 * 60)}:${TimestampStyles.LongDateTime}>`;

    const thread = await channels.ELECTIONS.threads.create({
        name: `Wave ${wave} Election`,
        message: {
            content: `# Election Information\n**Wave:** ${wave}\n**Seats:** ${seats}\n**Reason:** ${shortReason}\n**Window:** Nominations are scheduled for ${start} to ${end}`,
        },
    });

    await thread.send(
        `Another wave of election is upon us! ${longReason}\n\nPlease nominate people who you would like to be candidates for the upcoming election. Please try to avoid repeating nominations to avoid clutter. Additionally, you are welcome to nominate yourself.\n\nNominations and statements will be open until ${end}. If you are nominated, please indicate whether or not you are accepting. If you accept your nomination, please prepare a statement (there's no required format, just something to advertise yourself as a candidate) and post it here.\n\n**Important:** To discuss things related to the election or elections in general that isn't a nomination or response, please use the pinned discussion post (${channels.ELECTION_DISCUSSIONS}).\n\nThank you!`,
    );

    await thread.send({ content: `<@&${Bun.env.SERVER_OWNER_ROLE}>`, allowedMentions: { roles: [Bun.env.SERVER_OWNER_ROLE!] } });

    await thread.send({
        content: `<@&${Bun.env.COUNCIL_ADVISOR_ROLE}> (you are welcome to nominate others and yourself and will be expected to vote during the election)`,
        allowedMentions: { roles: [Bun.env.COUNCIL_ADVISOR_ROLE!] },
    });

    return `${thread}`;
}
