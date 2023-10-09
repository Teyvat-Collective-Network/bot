import { t } from "elysia";
import { App } from "../../index.js";
import rolesync from "../rolesync.js";

export default (app: App) =>
    app.post(
        "/rolesync",
        async ({ body }) => {
            await rolesync(body);
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
                        apiToRole: t.Object({}, { additionalProperties: t.Array(t.String()) }),
                    }),
                ),
            }),
        },
    );
