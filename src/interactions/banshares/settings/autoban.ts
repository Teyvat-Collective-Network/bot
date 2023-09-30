import { StringSelectMenuInteraction } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import { displaySettings } from "../../../lib/banshares.js";

export default async function (menu: StringSelectMenuInteraction) {
    await menu.deferUpdate();

    return displaySettings(
        await api(await getToken(menu), `PATCH /banshares/settings/${menu.guildId}`, {
            autoban: menu.values.map((x) => parseInt(x)).reduce((x, y) => x + y, 0),
        }),
    );
}
