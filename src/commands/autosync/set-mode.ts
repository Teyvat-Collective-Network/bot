import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import logger from "../../lib/logger.js";
import { ensureOwnerOrAdvisor } from "../../lib/permissions.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    group: "mode",
    key: "set",
    description: "set the update mode for partner lists",
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "mode",
            description: "the update mode",
            required: true,
            choices: [
                { name: "Repost (delete old message)", value: "repost" },
                { name: "Edit (edit old message if possible)", value: "edit" },
            ],
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, mode: string) {
    await cmd.deferReply({ ephemeral: true });

    await ensureOwnerOrAdvisor(cmd, cmd.guild!);
    await api(await getToken(cmd), `PATCH /autosync/${cmd.guildId}`, { repost: mode === "repost" });
    logger.info({ user: cmd.user.id, guild: cmd.guild!.id, mode }, "78a82496-aeba-47d5-bb38-ce52b6ba1b5d Autosync mode updated");
    return `The update mode has been set to \`${mode}\`.`;
}
