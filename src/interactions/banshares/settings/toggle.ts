import { ButtonInteraction } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import { displaySettings } from "../../../lib/banshares.js";

export default async function (button: ButtonInteraction, key: string, set: string) {
    await button.deferUpdate();
    return displaySettings(await api(await getToken(button), `PATCH /banshares/settings/${button.guildId}`, { [key]: set === "on" }));
}
