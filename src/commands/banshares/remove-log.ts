import { ApplicationCommandOptionType, Channel, ChannelType, ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    group: "logs",
    key: "remove",
    description: "remove a banshare logging channel",
    options: [
        {
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread],
            name: "channel",
            description: "the channel to add as a logging channel",
            required: true,
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, channel: Channel) {
    await cmd.deferReply({ ephemeral: true });

    await api(await getToken(cmd), `DELETE /banshares/settings/logs/${cmd.guildId}/${channel.id}`);
    return `${channel} is no longer a banshare logging channel.`;
}
