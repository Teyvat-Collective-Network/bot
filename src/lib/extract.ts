import { APIGuild, Guild, GuildMember, OAuth2Guild, User } from "discord.js";

export type HasUser = string | User | GuildMember | { author: User } | { user: User };
export type HasGuild = string | Guild | OAuth2Guild | { guild: Guild | APIGuild | OAuth2Guild };
export type MightHaveGuild = string | Guild | OAuth2Guild | { guild?: Guild | APIGuild | OAuth2Guild } | {};

export const getUserId = (object: HasUser) =>
    typeof object === "string"
        ? object
        : object instanceof User || object instanceof GuildMember
        ? object.id
        : "author" in object
        ? object.author.id
        : object.user.id;

export const getGuildId = (object: HasGuild) =>
    typeof object === "string" ? object : object instanceof Guild || object instanceof OAuth2Guild ? object.id : object.guild.id;

export const getGuildIdOrNull = (object: MightHaveGuild) =>
    typeof object === "string"
        ? object
        : object instanceof Guild || object instanceof OAuth2Guild
        ? object.id
        : "guild" in object
        ? object.guild?.id ?? null
        : null;
