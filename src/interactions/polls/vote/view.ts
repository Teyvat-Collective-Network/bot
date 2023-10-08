import { ButtonInteraction } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import { renderVote } from "../../../lib/polls.js";
import { PollVote } from "../../../lib/types.js";

export default async function (button: ButtonInteraction, id: string) {
    await button.deferReply({ ephemeral: true });

    const vote: PollVote = await api(await getToken(button), `GET /polls/${id}/vote`);
    return renderVote(vote);
}
