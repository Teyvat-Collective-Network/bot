import { ApplicationCommandOptionType, Channel, ChannelType, ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { CommandData } from "../../lib/types.js";
import logger from "../../lib/logger.js";

export const command: CommandData = {
    group: "output",
    key: "set",
    description: "set or remove the output channel for banshares",
    options: [
        {
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread],
            name: "channel",
            description: "the channel to which banshares will be posted (leave empty to stop sending banshares)",
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, channel?: Channel) {
    await cmd.deferReply({ ephemeral: true });

    await api(await getToken(cmd), `PATCH /banshares/settings/${cmd.guildId}`, { channel: channel?.id || null });
    logger.info({ user: cmd.user.id, guild: cmd.guild!.id, channel: channel?.id }, "447ac4e0-e0ed-49eb-a06d-e77d16fb1c16 Banshare output channel updated");
    return channel ? `Banshares will now be posted to ${channel}.` : "Banshares will no longer be posted to this server.";
}
