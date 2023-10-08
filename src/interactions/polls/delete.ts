import { ButtonInteraction } from "discord.js";
import { confirm } from "../../lib/responses.js";

export default async function (button: ButtonInteraction, id: string) {
    return confirm(`polls/confirm-delete:${id}`);
}
