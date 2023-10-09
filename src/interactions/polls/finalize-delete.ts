import { ModalSubmitInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { success } from "../../lib/responses.js";

export default async function (modal: ModalSubmitInteraction, id: string) {
    await modal.deferUpdate();

    await api(await getToken(modal), `DELETE /polls/${id}`, undefined, modal.fields.getTextInputValue("reason"));
    return success("The poll has been deleted.");
}
