import { ChatInputCommandInteraction } from "discord.js";
import api, { getToken } from "../../lib/api.js";
import { ensureObserver } from "../../lib/permissions.js";
import { success } from "../../lib/responses.js";
import { Attribute, Character, CommandData, TCNGuild } from "../../lib/types.js";

export const command: CommandData = {
    key: "partner-list",
    description: "generate the long-form partner list",
};

export default async function (cmd: ChatInputCommandInteraction) {
    await cmd.reply(success("Generating, please be patient..."));
    await ensureObserver(cmd);

    const token = await getToken(cmd);

    const guilds: TCNGuild[] = await api(token, `GET /guilds`);
    const characters: Record<string, Character> = Object.fromEntries((await api(token, `GET /characters`)).map((x: Character) => [x.id, x]));
    const attributes: Record<string, Record<string, Attribute>> = await api(token, `GET /attributes`);

    while (guilds.length > 0)
        await cmd.channel!.send({
            embeds: guilds.splice(0, 10).map((guild) => ({
                title: guild.name,
                description: `${["element", "weapon", "region"]
                    .map((x) => attributes[x][characters[guild.mascot].attributes[x] ?? ""])
                    .filter((x) => x)
                    .join(" ")} ${characters[guild.mascot].name}${
                    characters[guild.mascot].short ? ` (${characters[guild.mascot].short})` : ""
                }\n\n**Owner:** <@${guild.owner}>${guild.advisor ? `\n**Advisor**: <@${guild.advisor}>` : ""}`,
                color: 0x2b2d31,
                thumbnail: { url: `${Bun.env.WEBSITE}/files/${guild.mascot}.png` },
                footer: { text: guild.id },
            })),
        });

    await cmd.channel!.send(`**Autosync Guide: ${Bun.env.WEBSITE}/info/partner-list#autosync`);

    return "The long-form partner list has been generated.";
}
