import { StringSelectMenuInteraction } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import { failure, greyButton, success } from "../../../lib/responses.js";

export default async function (menu: StringSelectMenuInteraction, id: string) {
    await menu.update({ components: greyButton("Reporting...") });

    const req = await api(await getToken(menu), `!POST /banshares/report/${id}`, { reason: menu.values.join(" ") });

    if (!req.ok) {
        await menu.editReply(failure((await req.json()).message));
        return;
    }

    await menu.editReply(success("Your report has been submitted and will be reviewed as soon as possible."));
}
