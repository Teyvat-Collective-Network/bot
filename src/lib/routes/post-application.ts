import { t } from "elysia";
import { App } from "../../index.js";
import bot, { channels } from "../bot.js";

export default (app: App) =>
    app.post(
        "/apply",
        async ({ body: { code, id, name, mascot, role, roleother, ownerid, nsfw, experience, shortgoals, longgoals, history, additional, user } }) => {
            const invite = await bot.fetchInvite(code);

            const display = name.toLowerCase().includes(mascot.toLowerCase()) ? name : `${name} (${mascot} Mains)`;

            const submitter = `<@${user}>${role === "owner" ? "" : ` (on behalf of <@${ownerid}>)`}`;

            const thread = await channels.APPLICANTS_FORUM.threads.create({
                name: `${mascot} Mains`,
                message: {
                    embeds: [
                        {
                            title: "**New Application**",
                            description: `**${submitter}** applied for **${display}** (\`${id}\`). Their role in the server is: ${
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
                id: t.String(),
                name: t.String(),
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
