import { ApplicationCommandOptionType, ChannelType, ChatInputCommandInteraction, TextChannel } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import logger from "../../lib/logger.js";
import { ensureOwnerOrAdvisor } from "../../lib/permissions.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    group: "channel",
    key: "set",
    description: "set the channel for the partner list",
    options: [
        {
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            name: "channel",
            description: "the channel, or leave empty to unset",
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, channel: TextChannel | null) {
    await cmd.deferReply({ ephemeral: true });

    await ensureOwnerOrAdvisor(cmd, cmd.guild!);
    await api(await getToken(cmd), `PATCH /autosync/${cmd.guildId}`, { channel: channel?.id ?? null });
    logger.info({ user: cmd.user.id, guild: cmd.guild!.id, channel: channel?.id }, "0c161003-6f7f-4024-b7c5-ca61b735cbb7 Autosync channel updated");
    return `The autosync channel has been ${channel ? `set to ${channel}` : "removed"}. Remember to delete the old partner list if desired.`;
}
