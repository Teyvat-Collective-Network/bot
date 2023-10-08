import { ButtonInteraction, ComponentType, TextInputStyle } from "discord.js";

export default async function (button: ButtonInteraction, id: string) {
    await button.showModal({
        title: `Deleting Poll ${id}`,
        customId: `:polls/finalize-delete:${id}`,
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.TextInput,
                        style: TextInputStyle.Short,
                        customId: "reason",
                        label: "Deletion Reason",
                        placeholder: "Please enter a reason explaining why this poll is being deleted.",
                        required: true,
                        maxLength: 256,
                    },
                ],
            },
        ],
    });
}
