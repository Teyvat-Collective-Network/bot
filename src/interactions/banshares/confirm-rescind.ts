import { ModalMessageModalSubmitInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { channels } from "../../lib/bot.js";
import { failure, success } from "../../lib/responses.js";

export default async function (modal: ModalMessageModalSubmitInteraction, message: string) {
    await modal.reply(success("The banshare is being rescinded. You may dismiss this message."));

    const req = await api(await getToken(modal), `!POST /banshares/${message}/rescind`, { explanation: modal.fields.getTextInputValue("explanation") });

    if (!req.ok) {
        const { message } = await req.json();

        await channels.BOT_LOGS.send({
            content: `${modal.user} an error occurred while rescinding that banshare: ${message}`,
            allowedMentions: { users: [modal.user.id] },
        });

        await modal.editReply(failure(message)).catch();

        return;
    }

    await modal.editReply(success("The banshare has been rescinded successfully.")).catch();
}
