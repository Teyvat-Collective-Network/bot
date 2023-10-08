import { t } from "elysia";
import { App } from "../../index.js";
import { channels } from "../bot.js";
import logger from "../logger.js";
import { render } from "../polls.js";

export default (app: App) =>
    app.put(
        "/poll",
        async ({ body }) => {
            const data = await render(body).catch((error) => {
                logger.error(error, "66ae822c-a809-42ee-a828-c6428098b723");
                throw error;
            });

            if (body.message)
                try {
                    const message = await channels.VOTE_HERE.messages.fetch(body.message);
                    await message.edit(data);
                    return { message: message.id };
                } catch {}

            const { id } = await channels.VOTE_HERE.send(data);
            return { message: id };
        },
        {
            body: t.Intersect([
                t.Object({
                    id: t.Integer(),
                    message: t.Optional(t.String()),
                    close: t.Integer(),
                    closed: t.Boolean(),
                    live: t.Boolean(),
                    restricted: t.Boolean(),
                    quorum: t.Integer(),
                }),
                t.Union([
                    t.Object({ mode: t.Enum({ mode: "proposal" }), question: t.String() }),
                    t.Object({ mode: t.Enum({ mode: "induction" }), preinduct: t.Boolean(), server: t.String() }),
                    t.Object({ mode: t.Enum({ mode: "election" }), wave: t.Integer(), seats: t.Integer(), candidates: t.Array(t.String()) }),
                    t.Object({ mode: t.Enum({ mode: "selection" }), question: t.String(), min: t.Integer(), max: t.Integer(), options: t.Array(t.String()) }),
                ]),
            ]),
        },
    );
