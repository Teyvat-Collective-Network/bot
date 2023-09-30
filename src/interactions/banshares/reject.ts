import { ButtonInteraction } from "discord.js";
import { ensureObserver } from "../../lib/permissions.js";
import { confirm } from "../../lib/responses.js";

export default async function (button: ButtonInteraction) {
    await ensureObserver(button);
    return confirm(`banshares/confirm-reject:${button.message.id}`);
}
