import { StringSelectMenuInteraction } from "discord.js";
import { submitVote } from "../../../lib/polls.js";

export default async function (menu: StringSelectMenuInteraction, id: string) {
    await menu.deferReply({ ephemeral: true });
    return await submitVote(menu, id, { mode: "induction", verdict: menu.values[0] });
}
