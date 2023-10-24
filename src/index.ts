import bearer from "@elysiajs/bearer";
import { Elysia } from "elysia";
import { readdir } from "node:fs/promises";
import logger from "./lib/logger.js";
import routes from "./lib/routes.js";

const app = new Elysia()
    .use(bearer())
    .onBeforeHandle(({ bearer, path, request }) => {
        let id = "anon";

        if (bearer) {
            const [, payload] = bearer.split(".");
            id = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")).id;
        }

        logger.info({ location: "fada92a0-b701-4491-ab62-9653cb40dc90" }, `${request.method} ${path} [${id}]`);
    })

    .onError(({ code, error, path, request, set }) => {
        if (code !== "NOT_FOUND") logger.error(error, `1015dd13-ed4a-4722-afc5-14861d40006e Error in ${request.method} ${path}`);

        switch (code) {
            case "INTERNAL_SERVER_ERROR":
            case "UNKNOWN":
                set.status = 500;
                return { message: "Unexpected internal error." };
            case "NOT_FOUND":
                logger.error(`9ef3c28a-781b-4752-9c9e-ed7db72317da [404] ${request.method} ${path}`);
                set.status = 404;
                return { message: "Route not found." };
            case "PARSE":
                set.status = 400;
                return { message: "Could not parse input body." };
            case "VALIDATION":
                set.status = 400;
                return { message: error.message };
        }
    });

export type App = typeof app;

app.use(routes).listen(Bun.env.PORT || 4003);

logger.info({ location: "482b00cd-d8a1-4ecd-94b6-02f006bd66a6" }, `TCN Bot is running at ${app.server?.hostname}:${app.server?.port}`);

for (const task of await readdir("./src/tasks")) await import(`./tasks/${task}`);
