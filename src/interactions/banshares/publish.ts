import { ButtonInteraction } from "discord.js";
import { ensureObserver } from "../../lib/permissions.js";
import { confirm } from "../../lib/responses.js";

export default async function (button: ButtonInteraction, variant?: string) {
    await ensureObserver(button);
    return confirm(`banshares/confirm-publish:${button.message.id}:${variant}`);
}
