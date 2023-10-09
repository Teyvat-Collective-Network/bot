import { GuildMember } from "discord.js";
import rolesync from "../../lib/rolesync.js";

export default async function (before: GuildMember, member: GuildMember) {
    if (before.roles.cache.hasAll(...member.roles.cache.keys()) && member.roles.cache.hasAll(...before.roles.cache.keys())) return;

    await rolesync({ user: member.id });
}
