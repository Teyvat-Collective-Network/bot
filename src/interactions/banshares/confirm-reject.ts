import { ButtonInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";

export default async function (button: ButtonInteraction, message: string) {
    await button.deferUpdate();

    const req = await api(await getToken(button), `!POST /banshares/${message}/reject`);
    if (!req.ok) throw (await req.json()).message;

    return "The banshare has been rejected.";
}
