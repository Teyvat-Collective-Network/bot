import { ButtonInteraction } from "discord.js";
import { submitVote } from "../../../lib/polls.js";

export default async function (button: ButtonInteraction, id: string, vote: string) {
    await button.deferReply({ ephemeral: true });
    return await submitVote(button, id, { mode: "proposal", yes: vote === "yes" });
}
