import { ButtonInteraction, ButtonStyle, ComponentType } from "discord.js";

export default async function (button: ButtonInteraction) {
    await button.update({
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    { type: ComponentType.Button, style: ButtonStyle.Danger, customId: "::secret-santa/confirm-block", label: "Confirm Blocking Approval" },
                    { type: ComponentType.Button, style: ButtonStyle.Secondary, customId: "::secret-santa/cancel-block", label: "Cancel" },
                ],
            },
        ],
    });
}
