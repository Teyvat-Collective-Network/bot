import { t } from "elysia";
import { App } from "../../index.js";
import { components, severities } from "../banshares.js";
import { channels } from "../bot.js";

export default (app: App) =>
    app.patch(
        "/banshares/:message/severity/:severity",
        async ({ params: { message: id, severity } }) => {
            const message = await channels.BANSHARE_LOGS.messages.fetch(id);

            const embed = message.embeds[0].toJSON();
            for (const field of embed.fields ?? []) if (field.name === "Severity") field.value = severities[severity];

            await message.edit({ embeds: [embed], components: components(false, severity) });
        },
        {
            params: t.Object({
                message: t.String(),
                severity: t.String(),
            }),
        },
    );
