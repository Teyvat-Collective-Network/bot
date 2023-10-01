import bearer from "@elysiajs/bearer";
import { Elysia } from "elysia";
import logger from "./lib/logger.js";
import routes from "./lib/routes.js";

const app = new Elysia()
    .derive(() => ({ log: logger }))
    .use(bearer())
    .onBeforeHandle(({ bearer, log, path, request }) => {
        let id = "anon";

        if (bearer) {
            const [, payload] = bearer.split(".");
            id = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")).id;
        }

        log.info({ location: "fada92a0-b701-4491-ab62-9653cb40dc90" }, `${request.method} ${path} [${id}]`);
    })
    .onError(({ error }) => logger.error({ location: "3bb475ab-0531-4b96-83a3-8844ef15a3bf", error }));

export type App = typeof app;

app.use(routes).listen(Bun.env.PORT || 4002);

logger.info({ location: "482b00cd-d8a1-4ecd-94b6-02f006bd66a6" }, `TCN Bot is running at ${app.server?.hostname}:${app.server?.port}`);
