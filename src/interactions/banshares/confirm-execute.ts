import { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { ensureTCN } from "../../lib/permissions.js";
import { failure, success } from "../../lib/responses.js";
import { crosspostComponents } from "../../lib/banshares.js";

export default async function (button: ButtonInteraction, banshare: string) {
    await button.deferUpdate();
    await ensureTCN(button);
    const token = await getToken(button);

    if (!button.memberPermissions?.has(PermissionFlagsBits.BanMembers)) throw "Permission denied (mods only).";

    await button.editReply(success("The banshare is being executed. You may dismiss this message, or keep it open to receive status updates."));

    const req = await api(token, `!POST /banshares/${banshare}/execute/${button.guildId}`);

    if (!req.ok) {
        const { message, code } = await req.json();
        await button.editReply(failure(message)).catch();

        if (code === 305) {
            // ban button feature disabled; delete the button
            const ref = await button.message.fetchReference().catch();
            await ref?.edit({ components: crosspostComponents(ref.id) }).catch();
        }

        return;
    }

    await button.editReply(success("The banshare has been executed successfully.")).catch();
}
