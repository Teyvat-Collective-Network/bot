import { t } from "elysia";
import { App } from "../../index.js";
import bot, { channels } from "../bot.js";

export default (app: App) =>
    app
        .get(
            "/invite/:code",
            async ({ params: { code } }) => {
                try {
                    const invite = await bot.fetchInvite(code);

                    return {
                        code: invite.code,
                        guild: invite.guild,
                        vanity: invite.guild?.vanityURLCode === invite.code,
                        expires: invite.expiresTimestamp,
                        members: invite.memberCount,
                        target: !!(invite.targetApplication || invite.targetUser),
                    };
                } catch {
                    return new Response("Invite not found.", { status: 404 });
                }
            },
            {
                params: t.Object({ code: t.String() }),
            },
        )
        .get(
            "/tag/:id",
            async ({ params: { id } }) => {
                try {
                    const user = await bot.users.fetch(id);
                    return JSON.stringify(user.tag);
                } catch {
                    return new Response("User not found.", { status: 404 });
                }
            },
            {
                params: t.Object({ id: t.String({ pattern: "^\\d{17,20}$", default: "1234567890987654321" }) }),
            },
        )
        .post(
            "/apply",
            async ({ body: { code, mascot, role, roleother, ownerid, nsfw, experience, shortgoals, longgoals, history, additional, user } }) => {
                const invite = await bot.fetchInvite(code);

                const display = invite.guild!.name.toLowerCase().includes(mascot.toLowerCase())
                    ? invite.guild!.name
                    : `${invite.guild!.name} (${mascot} Mains)`;

                const submitter = `<@${user}>${role === "owner" ? "" : ` (on behalf of <@${ownerid}>)`}`;

                const thread = await channels.APPLICANTS_FORUM.threads.create({
                    name: `${mascot} Mains`,
                    message: {
                        embeds: [
                            {
                                title: "**New Application**",
                                description: `**${submitter}** applied for **${display}**. Their role in the server is: ${
                                    role !== "other" ? role : roleother
                                }. The server has ${invite.memberCount} members and was created at <t:${Math.floor(invite.guild!.createdTimestamp / 1000)}:f>.`,
                                color: 0x2b2d31,
                                fields: [
                                    { name: "Invite", value: invite.url },
                                    {
                                        name: "NSFW",
                                        value: { no: "None", private: "Yes, hidden from regular users behind a role", public: "Yes, visible to regular users" }[
                                            nsfw
                                        ]!,
                                    },
                                ],
                            },
                        ],
                    },
                    appliedTags: [Bun.env.NEW_APPLICANT_TAG!],
                });

                await thread.send({
                    embeds: [
                        {
                            color: 0x2b2d31,
                            fields: [
                                experience && { name: "Prior Experience", value: experience },
                                { name: "Short-Term Server Goals", value: shortgoals },
                                { name: "Long-Term Server Goals", value: longgoals },
                                { name: "Server History", value: history },
                                additional && { name: "Additional Questions/Comments", value: additional },
                            ].filter((x): x is { name: string; value: string } => !!x),
                        },
                    ],
                });

                await channels.OFFICIAL_BUSINESS.send(
                    `<@&${Bun.env.NEW_APPLICANT_ALERT_ROLE}> **${submitter}** applied for **${display}**. Please check out the application in ${channels.APPLICANTS_FORUM} here: ${thread.url}`,
                );
            },
            {
                body: t.Object({
                    code: t.String(),
                    mascot: t.String(),
                    role: t.String(),
                    roleother: t.Optional(t.String()),
                    ownerid: t.Optional(t.String()),
                    nsfw: t.String(),
                    experience: t.String(),
                    shortgoals: t.String(),
                    longgoals: t.String(),
                    history: t.String(),
                    additional: t.String(),
                    user: t.String(),
                }),
            },
        );
