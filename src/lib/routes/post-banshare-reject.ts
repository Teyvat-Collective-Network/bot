import { t } from "elysia";
import { App } from "../../index.js";
import api from "../api.js";
import { updateDashboard } from "../banshares.js";
import { channels } from "../bot.js";
import { greyButton } from "../responses.js";

export default (app: App) =>
    app.post(
        "/banshares/:message/reject",
        async ({ bearer, params: { message: id } }) => {
            const { rejecter }: { rejecter: string } = await api(bearer, `GET /banshares/${id}`);
            const message = await channels.BANSHARE_LOGS.messages.fetch(id);

            const embed = message.embeds[0].toJSON();
            embed.fields = embed.fields?.filter((field) => field.name !== "Severity");

            await channels.BOT_LOGS.send(`<@${rejecter}> rejected ${message.url}`);

            await message.edit({ embeds: [embed], components: greyButton("Rejected") });
            updateDashboard(bearer!);
        },
        {
            params: t.Object({
                message: t.String(),
            }),
        },
    );
