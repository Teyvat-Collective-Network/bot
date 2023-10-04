import {
    ApplicationCommandOptionData,
    ApplicationCommandSubCommandData,
    ApplicationCommandSubGroupData,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    MessageCreateOptions,
    MessageEditOptions,
} from "discord.js";

export type MessageLike = InteractionReplyOptions & InteractionEditReplyOptions & MessageCreateOptions & MessageEditOptions;

export type CommandData = {
    group?: string;
    key: string;
    description: string;
    options?: Exclude<ApplicationCommandOptionData, ApplicationCommandSubCommandData | ApplicationCommandSubGroupData>[];
};

export type TCNUser = {
    id: string;
    guilds: Record<string, { owner: boolean; advisor: boolean; voter: boolean; council: boolean; staff: boolean; roles: string[] }>;
    roles: string[];
    observer: boolean;
    owner: boolean;
    advisor: boolean;
    voter: boolean;
    council: boolean;
    staff: boolean;
    observerSince: number;
};

export type TCNGuild = {
    id: string;
    name: string;
    mascot: string;
    invite: string;
    owner: string;
    advisor?: string | null;
    voter: string;
    delegated: boolean;
    users: Record<string, { staff: boolean; roles: string[] }>;
};
