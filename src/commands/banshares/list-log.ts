import { Channel, ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    group: "logs",
    key: "list",
    description: "list banshare logging channels",
};

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.deferReply({ ephemeral: true });

    return (
        (await api(await getToken(cmd), `GET /banshares/settings/logs/${cmd.guildId}`))
            .map((id: string) => cmd.guild!.channels.cache.get(id))
            .filter((x?: Channel) => x)
            .join(" ") || "This server has no logging channels."
    );
}
