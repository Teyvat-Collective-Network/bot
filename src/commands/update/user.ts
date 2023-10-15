import { ApplicationCommandOptionType, ChatInputCommandInteraction, User } from "discord.js";
import { success } from "../../lib/responses.js";
import rolesync from "../../lib/rolesync.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "user",
    description: "invoke automatic role synchronization on a user",
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "the user to update",
            required: true,
        },
    ],
};

export default async function (cmd: ChatInputCommandInteraction, user: User) {
    await cmd.reply(success(`Updating ${user}...`));
    await rolesync({ user: user.id });
    await cmd.editReply(success(`Updated ${user}!`));
}
