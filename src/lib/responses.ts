import { APIEmbed, ActionRowData, ButtonStyle, Colors, ComponentType, MessageActionRowComponentData } from "discord.js";
import { MessageLike } from "./types.js";

export function greyButton(label: string): ActionRowData<MessageActionRowComponentData>[] {
    return [
        { type: ComponentType.ActionRow, components: [{ type: ComponentType.Button, style: ButtonStyle.Secondary, customId: "-", label, disabled: true }] },
    ];
}

export function confirm(key: string): MessageLike {
    return {
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Success,
                        customId: `::${key}`,
                        label: "Confirm",
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Danger,
                        customId: `::globals/cancel`,
                        label: "Cancel",
                    },
                ],
            },
        ],
        ephemeral: true,
    };
}

export function embed(data: APIEmbed) {
    data.color ??= 0x2b2d31;
    return { embeds: [data], files: [], components: [] };
}

export function success(description: string) {
    return { embeds: [{ title: "OK", description, color: 0x2b2d31 }], components: [], files: [], ephemeral: true };
}

export function failure(description: string) {
    return { embeds: [{ title: "Error", description, color: Colors.Red }], components: [], files: [], ephemeral: true };
}
