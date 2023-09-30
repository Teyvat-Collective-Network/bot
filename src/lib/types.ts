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
