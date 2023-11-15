import { ButtonInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";

export default async function (button: ButtonInteraction) {
    await api(await getToken(button), `POST /secret-santa/block-approval`);
    await button.update({ components: [] });
}
