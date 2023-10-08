import { escapeHTML } from "bun";
import { escapeMarkdown } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import { compare, components, severities, updateDashboard } from "../banshares.js";
import bot, { channels } from "../bot.js";
import { createGist } from "../gists.js";

export default (app: App) =>
    app.post(
        "/banshares",
        async ({ bearer, body: { author, ids, idList, reason, evidence, severity, urgent, skipValidation, serverName }, log }) => {
            const tags: string[] = [];

            if (!skipValidation) {
                for (const id of idList)
                    try {
                        tags.push((await bot.users.fetch(id)).tag);
                    } catch {
                        return new Response(JSON.stringify({ message: `Invalid ID: <code>${escapeHTML(id)}</code> did not correspond to a valid user.` }), {
                            status: 400,
                        });
                    }

                ids = idList.sort(compare).join(" ");
            }

            const user = await bot.users.fetch(author);

            const format = (ids: string, tags: string) => ({
                embeds: [
                    {
                        title: "**Banshare**",
                        color: 0x2b2d31,
                        fields: [
                            { name: "ID(s)", value: ids },
                            ...(tags.length > 0 ? [{ name: "Username(s)", value: tags }] : []),
                            { name: "Reason", value: reason },
                            { name: "Evidence", value: evidence },
                            { name: "Submitted by", value: `${user} (${escapeMarkdown(user.tag)}) from ${serverName}` },
                            { name: "Severity", value: severities[severity] },
                        ],
                    },
                ],
            });

            let sendData = format(ids, escapeMarkdown(tags.join(" ")));

            if (
                sendData.embeds[0].title.length + sendData.embeds[0].fields.map((field) => field.name.length + field.value.length).reduce((x, y) => x + y) >
                    6000 ||
                sendData.embeds[0].fields.some((field) => field.value.length > 1024)
            ) {
                const iso = new Date().toISOString();
                sendData = format(`<${await createGist(`banshare-ids-${iso}`, `IDs for the banshare on ${iso}`, ids)}>`, "");
            }

            try {
                const post = await channels.BANSHARE_LOGS.send({ ...sendData, components: components(false, severity) });

                channels.OBSERVER_CHANNEL.send(
                    `<@&${urgent ? Bun.env.URGENT_BANSHARE_PING_ROLE : Bun.env.NON_URGENT_BANSHARE_PING_ROLE}> A banshare was just posted in ${
                        channels.BANSHARE_LOGS
                    } for review${
                        urgent ? " (**urgent**)" : ""
                    }. If you wish to alter the severity, do so with the buttons below the banshare **before** publishing.`,
                );

                updateDashboard(bearer!);

                return { message: post.id };
            } catch (error) {
                log.error(error, "5ccc5b4d-71cf-46a4-bf78-c88cc5f10a9e");
                return new Response('{"message":null}', { status: 500 });
            }
        },
        {
            body: t.Object({
                author: t.String(),
                ids: t.String(),
                idList: t.Array(t.String()),
                reason: t.String(),
                evidence: t.String(),
                severity: t.String(),
                urgent: t.Boolean(),
                skipValidation: t.Boolean(),
                serverName: t.String(),
            }),
        },
    );
