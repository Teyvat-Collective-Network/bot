import { t } from "elysia";
import { App } from "../../index.js";
import bot, { channels } from "../bot.js";
import logger from "../logger.js";

export default (app: App) =>
    app.post(
        "/poll-remind/:id",
        async ({ body: { message, waiting }, params: { id } }) => {
            const failed: string[] = [];
            const url = `<${channels.VOTE_HERE.url}/${message}>`;

            for (const userId of waiting)
                try {
                    const user = await bot.users.fetch(userId);
                    await user.send(`Hello,\n\nYou have not voted on [TCN poll #${id}](${url}) yet. Please do so here within 24 hours.\n\nThank you.`);

                    await channels.BOT_LOGS.send(`Sent DM reminder to ${user} regarding [TCN poll #${id}](${url}).`).catch((error) =>
                        logger.error(error, "4c9cfda3-7023-427b-89d0-d55ed7d0ab9c"),
                    );
                } catch {
                    failed.push(userId);

                    await channels.BOT_LOGS.send(`Failed to send DM reminder to <@${userId}> regarding [TCN poll #${id}](${url}).`).catch((error) =>
                        logger.error(error, "bf4ed479-7c5e-4105-97bc-e41b5edbf797"),
                    );
                }

            if (failed.length > 0)
                await channels.VOTE_HERE.send({
                    content: `${failed
                        .map((x) => `<@${x}>`)
                        .join(" ")} You have not voted on [TCN poll #${id}](${url}) yet. Please do so within 24 hours. Thank you.`,
                    allowedMentions: { users: failed },
                });
        },
        {
            body: t.Object({
                message: t.String(),
                waiting: t.Array(t.String()),
            }),
            params: t.Object({
                id: t.Numeric(),
            }),
        },
    );
