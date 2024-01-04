import { APIWebhook, ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import logger from "../../lib/logger.js";
import { ensureOwnerOrAdvisor } from "../../lib/permissions.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    group: "webhook",
    key: "set",
    description: "set the webhook to use for partner lists (overrides the channel)",
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "webhook",
            description: "the webhook, or leave empty to unset",
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, url: string | null) {
    await cmd.deferReply({ ephemeral: true });

    await ensureOwnerOrAdvisor(cmd, cmd.guild!);

    let webhook: APIWebhook;

    if (url) {
        const req = await fetch(url);
        if (!req.ok) throw `Invalid webhook URL (could not fetch your webhook).`;

        webhook = await req.json();
    }

    await api(await getToken(cmd), `PATCH /autosync/${cmd.guildId}`, { webhook: url });
    logger.info({ user: cmd.user.id, guild: cmd.guild!.id, url }, "42127d7c-c8fa-4817-be02-e6e4361fb823 Autosync webhook updated");
    return `The webhook for partner lists has been ${url ? `set to ${webhook!.name}` : "unset"}.`;
}
