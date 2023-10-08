import { ButtonInteraction, ComponentType, TextInputStyle } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import bot from "../../../lib/bot.js";
import { Poll, PollVote } from "../../../lib/types.js";

export default async function (button: ButtonInteraction, id: string) {
    const [poll, vote]: [Poll, PollVote] = await Promise.all([
        api(await getToken(button), `GET /polls/${id}`),
        api(await getToken(button), `GET /polls/${id}/vote`).catch(() => {}),
    ]);

    if (poll.mode !== "election") throw "?";

    await button.showModal({
        title: "Election Ballot",
        customId: `:polls/vote/submit-election:${id}`,
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.TextInput,
                        style: TextInputStyle.Paragraph,
                        customId: "input",
                        label: `Rank: 1 = highest, ${poll.candidates.length} = lowest`,
                        value: poll.candidates
                            .filter((id) => id !== button.user.id)
                            .map((id) => `${bot.users.cache.get(id)?.tag ?? id}: ${vote?.candidates?.[id] ?? ""}`)
                            .join("\n"),
                    },
                ],
            },
        ],
    });
}
