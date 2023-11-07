import { t } from "elysia";
import { App } from "../../index.js";
import syncChannels from "../sync-channels.js";

export default (app: App) =>
    app.post(
        "/update-channels",
        async ({ query: { members, votes } }) => {
            await syncChannels(members === "true", votes === "true");
        },
        {
            query: t.Object({
                members: t.Optional(t.String()),
                votes: t.Optional(t.String()),
            }),
        },
    );
