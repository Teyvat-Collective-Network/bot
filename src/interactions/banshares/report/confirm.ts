import { ModalMessageModalSubmitInteraction } from "discord.js";
import api, { getToken } from "../../../lib/api.js";
import { failure, greyButton, success } from "../../../lib/responses.js";

export default async function (modal: ModalMessageModalSubmitInteraction, id: string) {
    await modal.update({ components: greyButton("Reporting...") });

    const req = await api(await getToken(modal), `!POST /banshares/report/${id}`, { reason: modal.fields.getTextInputValue("reason") });

    if (!req.ok) {
        await modal.editReply(failure((await req.json()).message));
        return;
    }

    await modal.editReply(success("Your report has been submitted and will be reviewed as soon as possible."));
}
