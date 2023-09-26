import { logger } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";
import PinoPretty from "pino-pretty";
import routes from "./lib/routes/index.js";

const app = new Elysia()
    .use(
        logger({
            name: "BOT",
            level: Bun.env.LOG_LEVEL || (Bun.env.PRODUCTION ? "info" : "trace"),
            stream: PinoPretty({ colorize: true, ignore: "hostname,pid" }),
        }),
    )
    .onBeforeHandle(({ log, path, request }) => log.info(`${request.method} ${path}`))
    .onError(({ error }) => console.error(error));

export type App = typeof app;

app.use(routes).listen(Bun.env.PORT || 4002);

console.log(`TCN Bot is running at ${app.server?.hostname}:${app.server?.port}`);
