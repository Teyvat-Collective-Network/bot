import { ButtonStyle, ComponentType } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import bot, { channels } from "../bot.js";

export default (app: App) =>
    app.post(
        "/secret-santa-alert",
        async ({ body: { target } }) => {
            await channels.SECRET_SANTA_LOGS.send(
                `<@&${Bun.env.SECRET_SANTA_REVIEWER_ROLE}> A user has just submitted proof of their gift. Please review it at ${Bun.env.WEBSITE}/secret-santa/admin.`,
            );

            try {
                const user = await bot.users.fetch(target);

                await user.send({
                    content: `Hey there! Your secret santa just submitted proof of a gift given to you. Please check your wishlists / accounts. If you believe you have not received anything, please let us know immediately. You can find our contact information [here](${Bun.env.WEBSITE}/contact). If you see your gift, feel free to contact us as well to speed up the approval process! Thank you for participating!\n\nYou can also use the button below to block approval. This prevents staff from approving the submission unless they manually unlock it. You can use this to buy yourself some time to gather details and reach out to staff if you would like to report that you did not receive any gift.`,
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                { type: ComponentType.Button, style: ButtonStyle.Danger, customId: "::secret-santa/block-approval", label: "Block Approval" },
                            ],
                        },
                    ],
                });
            } catch {}
        },
        {
            body: t.Object({ target: t.String() }),
        },
    );
