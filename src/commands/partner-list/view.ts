import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import api, { forgeToken } from "../../lib/api.js";
import { renderPartnerList } from "../../lib/partner-list.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "view",
    description: "view the TCN partner list",
    options: [
        {
            type: ApplicationCommandOptionType.Boolean,
            name: "public",
            description: "if true, post so others can see it as well",
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, isPublic?: boolean) {
    await cmd.deferReply({ ephemeral: !isPublic });

    return await renderPartnerList(await api(await forgeToken(), `GET /autosync/${cmd.guildId}`));
}
