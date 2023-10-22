import { t } from "elysia";
import { App } from "../../index.js";
import rolesync from "../rolesync.js";
import { Rolesync } from "../types.js";

export default (app: App) =>
    app.post(
        "/rolesync",
        async ({ body }) => {
            await rolesync(body as { user?: string; entries: (Rolesync & { guild: string })[] });
        },
        {
            body: t.Object({
                user: t.Optional(t.String()),
                entries: t.Array(
                    t.Object({
                        guild: t.String(),
                        roleToStaff: t.Array(t.String()),
                        staffToRole: t.Array(t.String()),
                        roleToApi: t.Object({}, { additionalProperties: t.Array(t.String()) }),
                        apiToRole: t.Array(t.Object({ type: t.String(), value: t.String(), guild: t.Nullable(t.String()), roles: t.Array(t.String()) })),
                    }),
                ),
            }),
        },
    );
