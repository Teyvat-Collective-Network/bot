import { ChannelType, PermissionFlagsBits, User } from "discord.js";
import { t } from "elysia";
import { App } from "../../index.js";
import api from "../api.js";
import { banButton, components, crosspostComponents, execute, updateDashboard } from "../banshares.js";
import bot, { channels } from "../bot.js";
import { greyButton } from "../responses.js";

export default (app: App) =>
    app.post(
        "/banshares/:message/publish",
        async ({ bearer, log, params: { message: id } }) => {
            const { idList, reason, severity, publisher }: { idList: string[]; reason: string; severity: string; publisher: string } = await api(
                bearer,
                `GET /banshares/${id}`,
            );

            const guilds: { guild: string; channel?: string; logs: string[]; blockdms: boolean; daedalus: boolean; nobutton: boolean; autoban: number }[] =
                await api(bearer, `GET /banshares/guilds`);

            const message = await channels.BANSHARE_LOGS.messages.fetch(id);
            const embeds = message.embeds.map((x) => x.toJSON());
            await channels.BOT_LOGS.send(`<@${publisher}> published ${message.url}`);

            const users: Record<string, User | null> = {};
            const crossposts: { guild: string; channel: string; message: string }[] = [];

            const severityIndex = ["P0", "P1", "P2", "DM"].indexOf(severity);

            await Promise.all(
                guilds.map(async ({ guild, channel: channelId, logs, blockdms, daedalus, nobutton, autoban }) => {
                    if (!channelId) return;
                    if (blockdms && severity === "DM") return;

                    try {
                        const channel = await bot.channels.fetch(channelId).catch(() => {
                            throw "could not fetch";
                        });

                        if (!channel || !("guild" in channel)) throw "could not fetch";
                        const me = channel.guild.members.me!;

                        switch (channel.type) {
                            case ChannelType.GuildText:
                                if (!channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks))
                                    throw "missing permissions";
                                break;
                            case ChannelType.PrivateThread:
                            case ChannelType.PublicThread:
                                if (!channel.permissionsFor(me).has(PermissionFlagsBits.SendMessagesInThreads | PermissionFlagsBits.EmbedLinks))
                                    throw "missing permissions";
                                break;
                            default:
                                throw "invalid channel type";
                        }

                        const maybeAutoban = idList.length > 0 && autoban && !!(autoban & ((1 << severityIndex) | (1 << (severityIndex + 4))));

                        const crosspost = await channel.send({
                            embeds,
                            components: [...(maybeAutoban ? greyButton("Autobanning...") : nobutton ? [] : banButton(id)), ...crosspostComponents(id)],
                        });

                        crossposts.push({ guild, channel: channelId, message: crosspost.id });

                        if (!maybeAutoban) return;

                        let skippable = !(autoban & (1 << (severityIndex + 4)));
                        let skip = false;

                        for (const id of idList)
                            try {
                                if (!(id in users)) users[id] = await bot.users.fetch(id);

                                if (skippable)
                                    try {
                                        await channel.guild.members.fetch(id);
                                        skip = true;
                                        break;
                                    } catch {}
                            } catch {
                                users[id] = null;
                            }

                        if (skip) {
                            await crosspost.edit({ components: [...(nobutton ? [] : banButton(id)), ...crosspostComponents(id)] });
                            return;
                        }

                        await api(bearer, `POST /banshares/${id}/execute/${guild}?auto=true`);
                        await execute(channel.guild, logs, id, daedalus, crosspost, reason, users);
                    } catch (error) {
                        if (typeof error !== "string") log.error({ location: "b3aaa4b3-e724-4f0f-ba42-c50e1711b36e", error });

                        const obj = await api(bearer, `GET /guilds/${guild}`).catch(() => {});

                        await channels.BOT_LOGS.send(
                            `Failed to publish ${message.url} to <#${channelId}> in [\`${obj?.name ?? guild}\`](<https://discord.com/channels/${guild}>): ${
                                typeof error === "string" ? error : "(unknown, check console)"
                            }`,
                        ).catch((error) => log.error({ location: "3e769ffc-1760-489a-b8a5-0f8dece9eaec", error }));
                    }
                }),
            );

            await api(bearer, `PUT /banshares/${id}/crossposts`, { crossposts });
            await message.edit({ components: components(true, severity) });

            updateDashboard(bearer!);
        },
        {
            params: t.Object({
                message: t.String(),
            }),
        },
    );
