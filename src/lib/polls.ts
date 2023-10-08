import { ActionRowData, ButtonComponentData, ButtonStyle, ComponentType, InteractionReplyOptions, MessageCreateOptions, MessageEditOptions } from "discord.js";
import api, { getToken } from "./api.js";
import { HasUser } from "./extract.js";
import { embed, greyButton } from "./responses.js";
import { Poll, PollResults, PollVote } from "./types.js";

export async function render(poll: Poll): Promise<MessageCreateOptions & MessageEditOptions> {
    const results: PollResults = poll.message
        ? await api(await getToken("111111111111111111"), `GET /polls/${poll.id}/results`)
        : {
              mode: poll.mode,
              abstains: 0,
              ballots: 0,
              turnout: 0,
              yes: 0,
              no: 0,
              induct: 0,
              preinduct: 0,
              reject: 0,
              extend: 0,
              winners: [],
              tied: poll.mode === "election" ? poll.candidates : [],
              scores: poll.mode === "selection" ? Object.fromEntries(poll.options.map((x) => [x, 0])) : {},
          };

    return {
        embeds: [
            {
                title: `${results.turnout.toFixed(2)}% Turnout Reached`,
                description:
                    poll.mode === "proposal" || poll.mode === "selection"
                        ? poll.question
                        : poll.mode === "induction"
                        ? `Induct ${poll.server}?`
                        : poll.mode === "election"
                        ? `Please vote in the Wave ${poll.wave} Election.`
                        : "?",
                fields: [
                    ...(poll.mode === "election"
                        ? [{ name: "Candidates", value: `In no particular order: ${poll.candidates.map((x) => `<@${x}>`).join(", ")}` }]
                        : poll.mode === "selection"
                        ? [{ name: "Options", value: poll.options.map((x, i) => `- \`${"ABCDEFGHIJ"[i]}\`: ${x}`).join("\n") }]
                        : []),
                    {
                        name: "Results",
                        value:
                            poll.live || (poll.closed && results.turnout >= poll.quorum)
                                ? poll.mode === "proposal"
                                    ? `${results.yes} :arrow_up: ${
                                          results.yes || results.no
                                              ? ((green) => `${":green_square:".repeat(green)}${":red_square:".repeat(10 - green)}`)(
                                                    (results.yes * 10) / results.votes,
                                                )
                                              : ":white_large_square:".repeat(10)
                                      } :arrow_down: ${results.no}\n\n${((ratio) =>
                                          ratio > 0.4 && ratio < 0.6
                                              ? "This vote has resulted in a tie."
                                              : ratio > 0.5
                                              ? "The motion has passed."
                                              : "The motion has been rejected.")(results.votes > 0 ? results.yes / results.votes : 0.5)}`
                                    : poll.mode === "induction"
                                    ? `- Induct${poll.preinduct ? " Now" : ""}: ${results.induct}${
                                          poll.preinduct ? `\n- Induct Later: ${results.preinduct}` : ""
                                      }\n- Reject: ${results.reject}\n- Extend: ${results.extend}\n\n${((ratio) =>
                                          ratio > 0.4 && ratio < 0.6
                                              ? "Approval and disapproval are tied. A full re-vote is required."
                                              : ratio > 0.5
                                              ? ((sub) =>
                                                    sub > 0.4 && sub < 0.6
                                                        ? `${poll.server} was approved but a re-vote is required to determine if they are inducted now or at a later date.`
                                                        : sub > 0.5
                                                        ? `${poll.server} was approved for induction!`
                                                        : `${poll.server} was pre-approved to be inducted at a later date.`)(
                                                    results.induct / (results.induct + results.preinduct),
                                                )
                                              : ((sub) =>
                                                    sub > 0.4 && sub < 0.6
                                                        ? `${poll.server} was rejected but a re-vote is required to determine if they will be rejected or re-observed.`
                                                        : sub > 0.5
                                                        ? `${poll.server} was rejected.`
                                                        : `The verdict is to re-observe ${poll.server}. A different observer will carry out another 28 days of observation.`)(
                                                    results.reject / (results.reject + results.extend),
                                                ))(results.votes > 0 ? (results.induct + results.preinduct) / results.votes : 0.5)}`
                                    : poll.mode === "election"
                                    ? `Elected candidates in arbitrary order: ${results.winners
                                          .sort()
                                          .map((x) => `<@${x}>`)
                                          .join(" ")}${
                                          results.tied.length > 0
                                              ? `\n\nThere was a tie between the following candidates for the remaining ${
                                                    poll.seats - results.winners.length
                                                } seat${poll.seats === results.winners.length + 1 ? "" : "s"} (in arbitrary order): ${results.tied
                                                    .sort()
                                                    .map((x) => `<@${x}>`)
                                                    .join(" ")}`
                                              : ""
                                      }`
                                    : poll.mode === "selection"
                                    ? poll.options
                                          .map(
                                              (x, i) =>
                                                  `\`${"ABCDEFGHIJ"[i]}\` ${"█".repeat((results.scores[x] * 20) / (results.votes || 1)).padEnd(20, "░")} (${(
                                                      (results.scores[x] * 100) /
                                                      (results.votes || 1)
                                                  ).toFixed(2)}%)`,
                                          )
                                          .join("\n")
                                    : "..."
                                : `Results are hidden ${
                                      poll.closed ? "because this poll failed to reach quorum. An observer needs to restart it." : "until this poll concludes."
                                  }`,
                    },
                    {
                        name: "Deadline",
                        value: `<t:${Math.floor(poll.close / 1000)}:F>`,
                    },
                ],
                footer:
                    poll.live || (poll.closed && results.turnout >= poll.quorum)
                        ? { text: `${results.abstains} voter${results.abstains === 1 ? "" : "s"} abstained.` }
                        : undefined,
            },
        ],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        customId: `::polls/vote/abstain:${poll.id}`,
                        label: "Abstain",
                        disabled: poll.closed,
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        customId: `::polls/vote/view:${poll.id}`,
                        label: "View Your Vote",
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Link,
                        url: `${Bun.env.WEBSITE}/vote`,
                        label: "Dashboard",
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Danger,
                        customId: `::polls/delete:${poll.id}`,
                        label: "Delete",
                    },
                ],
            },
            poll.mode === "proposal"
                ? {
                      type: ComponentType.ActionRow,
                      components: [
                          {
                              type: ComponentType.Button,
                              style: ButtonStyle.Success,
                              customId: `::polls/vote/proposal:${poll.id}:yes`,
                              emoji: "⬆",
                              disabled: poll.closed,
                          },
                          {
                              type: ComponentType.Button,
                              style: ButtonStyle.Danger,
                              customId: `::polls/vote/proposal:${poll.id}:no`,
                              emoji: "⬇",
                              disabled: poll.closed,
                          },
                      ],
                  }
                : poll.mode === "induction"
                ? {
                      type: ComponentType.ActionRow,
                      components: [
                          {
                              type: ComponentType.StringSelect,
                              customId: `::polls/vote/induction:${poll.id}`,
                              options: [
                                  { value: "induct", label: `Induct${poll.preinduct ? " Now" : ""}`, emoji: "🟩" },
                                  ...(poll.preinduct ? [{ value: "preinduct", label: "Induct Later", emoji: "🟨" }] : []),
                                  { value: "reject", label: "Reject", emoji: "🟥" },
                                  { value: "extend", label: "Extend Observation", emoji: "🟪" },
                              ],
                              disabled: poll.closed,
                          },
                      ],
                  }
                : poll.mode === "election"
                ? {
                      type: ComponentType.ActionRow,
                      components: [
                          {
                              type: ComponentType.Button,
                              customId: `::polls/vote/election:${poll.id}`,
                              style: ButtonStyle.Success,
                              label: "Open Voting Modal",
                              disabled: poll.closed,
                          },
                      ],
                  }
                : poll.mode === "selection"
                ? {
                      type: ComponentType.ActionRow,
                      components: [
                          {
                              type: ComponentType.StringSelect,
                              customId: `::polls/vote/selection:${poll.id}`,
                              options: poll.options.map((x, i) => ({
                                  value: x,
                                  label: x,
                                  emoji: ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯"][i],
                              })),
                              minValues: poll.min,
                              maxValues: poll.max,
                              disabled: poll.closed,
                          },
                      ],
                  }
                : greyButton("?")[0],
            ...(poll.mode === "selection" && poll.min === 0
                ? [
                      {
                          type: ComponentType.ActionRow,
                          components: [
                              {
                                  type: ComponentType.Button,
                                  style: ButtonStyle.Danger,
                                  customId: `::polls/vote/clear-selection:${poll.id}`,
                                  label: "Vote Against All Options",
                              },
                          ],
                      } satisfies ActionRowData<ButtonComponentData>,
                  ]
                : []),
        ],
    };
}

export async function submitVote(object: HasUser, id: string, vote: Partial<PollVote>) {
    vote.abstain ??= false;
    await api(await getToken(object), `PUT /polls/${id}/vote`, { ...vote, mode: undefined });
    return renderVote(vote);
}

export function renderVote(vote: Partial<PollVote>): InteractionReplyOptions {
    if (vote.abstain) return embed({ title: "Abstain", description: "You have abstained on this poll." });

    if (vote.mode === "proposal")
        return embed({
            title: `Voted in ${vote.yes ? "support" : "opposition"}`,
            description: `You have voted ${vote.yes ? "in favor of" : "again"} the motion.`,
        });

    if (vote.mode === "induction")
        return embed({
            title: `Verdict: ${{ induct: "Induct", preinduct: "Induct Later", reject: "Reject", extend: "Extend Observation" }[vote.verdict!]}`,
            description: `You have voted to ${
                { induct: "induct", preinduct: "induct", reject: "reject", extend: "extend" }[vote.verdict!]
            } the applicant server${{ induct: "", preinduct: " at a later date", reject: "", extend: "'s observation" }[vote.verdict!]}.`,
        });

    if (vote.mode === "election") {
        const ranked: [string, number][] = [];
        const counter: string[] = [];
        const abstain: string[] = [];

        for (const [id, rank] of Object.entries(vote.candidates!))
            if (rank === -1) counter.push(id);
            else if (rank === 0) abstain.push(id);
            else ranked.push([id, rank]);

        return embed({
            title: "Election Ballot",
            description: [
                ranked.length > 0 &&
                    `Ranked:\n${ranked
                        .sort(([, x], [, y]) => x - y)
                        .map(([x], i) => `- ${i + 1}. <@${x}>`)
                        .join("\n")}`,
                counter.length > 0 && `Voted against: ${counter.map((x) => `<@${x}>`).join(", ")}`,
                abstain.length > 0 && `Abstained for: ${abstain.map((x) => `<@${x}>`).join(", ")}`,
            ]
                .filter((x) => x)
                .join("\n"),
        });
    }

    if (vote.mode === "selection")
        return embed({
            title: "Selection Ballot",
            description: vote.selected!.length > 0 ? vote.selected!.map((x) => `- ${x}`).join("\n") : "You voted against all options.",
        });

    throw `Poll type not recognized: \`${vote.mode}\`.`;
}
