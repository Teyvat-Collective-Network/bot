import { ButtonInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";

export default async function (button: ButtonInteraction, severity: string) {
    await button.deferReply({ ephemeral: true });

    const req = await api(await getToken(button), `!PATCH /banshares/${button.message.id}/severity/${severity}`);
    if (!req.ok) throw (await req.json()).message;

    return "The severity has been updated.";
}
