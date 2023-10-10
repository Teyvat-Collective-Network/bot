import { ButtonInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { channels } from "../../lib/bot.js";
import { failure, success } from "../../lib/responses.js";

export default async function (button: ButtonInteraction, message: string) {
    await button.update(success("The banshare is being published. You may dismiss this message."));

    const req = await api(await getToken(button), `!POST /banshares/${message}/publish`);

    if (!req.ok) {
        const { message } = await req.json();

        await channels.BOT_LOGS.send({
            content: `${button.user} an error occurred while publishing that banshare: ${message}`,
            allowedMentions: { users: [button.user.id] },
        });

        await button.editReply(failure(message)).catch();

        return;
    }

    await button.editReply(success("The banshare has been published successfully.")).catch();
}
