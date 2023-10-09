import { t } from "elysia";
import { App } from "../../index.js";
import bot from "../bot.js";

export default (app: App) =>
    app.get(
        "/guilds/:id/roles",
        async ({ params: { id } }) => {
            try {
                const guild = await bot.guilds.fetch(id);
                const roles = [...(await guild.roles.fetch()).values()].sort((x, y) => y.comparePositionTo(x));

                return Object.fromEntries(
                    roles.map((role) => [
                        role.id,
                        {
                            name: role.name,
                            color: role.color,
                            manageable: !role.managed && role.id !== guild.roles.everyone.id && role.comparePositionTo(guild.members.me!.roles.highest) < 0,
                        },
                    ]),
                );
            } catch {
                return {};
            }
        },
        {
            params: t.Object({
                id: t.String(),
            }),
        },
    );
