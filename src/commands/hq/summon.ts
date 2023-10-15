import { ChannelType, ChatInputCommandInteraction } from "discord.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "summon",
    description: "summon all council members to the thread without pinging them",
};

export default async function (cmd: ChatInputCommandInteraction) {
    if (cmd.channel?.type !== ChannelType.PublicThread) throw "You can only use this command in public threads.";

    const message = await cmd.channel.send({ content: "..." });
    await message.edit({ content: `<@&${Bun.env.SERVER_OWNER_ROLE}>`, allowedMentions: { roles: [Bun.env.SERVER_OWNER_ROLE!] } });
    await message.edit({ content: `<@&${Bun.env.COUNCIL_ADVISOR_ROLE}>`, allowedMentions: { roles: [Bun.env.COUNCIL_ADVISOR_ROLE!] } });
    await message.delete();

    return "Done!";
}
