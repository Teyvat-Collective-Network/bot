import { ModalSubmitInteraction } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import bot from "../../../lib/bot.js";
import { submitVote } from "../../../lib/polls.js";
import { Poll } from "../../../lib/types.js";

export default async function (modal: ModalSubmitInteraction, id: string) {
    await modal.deferReply({ ephemeral: true });

    const poll: Poll = await api(await getToken(modal), `GET /polls/${id}`);
    if (poll.mode !== "election") throw "?";

    const input = modal.fields.getTextInputValue("input");

    const map = Object.fromEntries(
        poll.candidates.flatMap((id) => [
            [bot.users.cache.get(id)?.tag ?? id, id],
            [id, id],
        ]),
    );

    const vote: Record<string, number> = {};

    for (const line of input
        .trim()
        .split(/\n+/)
        .map((x) => x.trim())) {
        const match = line.match(/^(.+)\s*:\s*(-1|\d+)$/);
        if (!match) throw "One or more lines did not match the required format of `tag: vote`.";

        const id = map[match[1]];
        if (!id) throw `Did not recognize \`${match[1]}\` as a candidate.`;
        if (id in vote) throw `You ranked \`${match[1]}\` twice.`;

        vote[id] = parseInt(match[2]);
    }

    return await submitVote(modal, id, { mode: "election", candidates: vote });
}
