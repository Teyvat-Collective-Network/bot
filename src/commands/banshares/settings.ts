import { ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { displaySettings } from "../../lib/banshares.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "settings",
    description: "view and modify this server's banshare settings",
};

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });
    return displaySettings(await api(await getToken(cmd), `GET /banshares/settings/${cmd.guildId}`));
}
