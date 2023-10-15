import { ChatInputCommandInteraction } from "discord.js";
import { success } from "../../lib/responses.js";
import rolesync from "../../lib/rolesync.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "all",
    description: "invoke automatic role synchronization on all users",
};

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.reply(success("Updating all users..."));
    const length = await rolesync({});
    await cmd.editReply(success(`Updated all users (made ${length} update${length === 1 ? "" : "s"})!`));
}
