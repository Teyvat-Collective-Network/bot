import { Message } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import api from "../api.js";
import bot, { channels } from "../bot.js";
import { greyButton } from "../responses.js";

export default (app: App) =>
    app.post(
        "/banshares/:message/rescind",
        async ({ bearer, params: { message: id } }) => {
            const { explanation }: { rescinder: string; explanation: string } = await api(bearer, `GET /banshares/${id}`);
            const guilds: { guild: string; channel?: string }[] = await api(bearer, `GET /banshares/guilds`);
            const crosspostsArray: { guild: string; channel: string; message: string }[] = await api(bearer, `GET /banshares/${id}/crossposts`);

            const crossposts: Record<string, { guild: string; channel: string; message: string }> = crosspostsArray.reduce(
                (o, x) => ({ ...o, [x.guild]: x }),
                {},
            );

            let message: Message | null = null;

            try {
                message = await channels.BANSHARE_LOGS.messages.fetch(id);
                await message.edit({ components: greyButton("Rescinding...") });
            } catch {}

            await Promise.all(
                guilds.map(async ({ guild, channel: channelId }) => {
                    if (!channelId) return;

                    const crosspost = crossposts[guild];
                    if (!crosspost) return;

                    const channel = await bot.channels.fetch(channelId).catch(() => {});
                    if (!channel?.isTextBased()) return;

                    const alert = await channel
                        .send(
                            `https://discord.com/channels/${guild}/${crosspost.channel}/${crosspost.message} was rescinded by an observer. The following explanation was given:\n\n>>> ${explanation}`,
                        )
                        .catch(() => {});

                    if (!alert) return;

                    try {
                        const crosspostChannel = await bot.channels.fetch(crosspost.channel);
                        if (!crosspostChannel?.isTextBased()) throw 0;

                        const message = await crosspostChannel.messages.fetch(crosspost.message);
                        const embeds = [message.embeds[0].toJSON()];
                        embeds[0].title = "Banshare (**Rescinded**)";
                        embeds[0].fields!.push({ name: "Rescinded", value: `This banshare has been rescinded. See ${alert.url} for context.` });

                        await message.edit({ embeds, components: [] });
                    } catch {}
                }),
            );

            try {
                if (message) await message.edit({ components: greyButton("Rescinded") });
            } catch {}
        },
        {
            params: t.Object({
                message: t.String(),
            }),
        },
    );
