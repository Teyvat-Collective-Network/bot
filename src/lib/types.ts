import {
    ApplicationCommandOptionData,
    ApplicationCommandSubCommandData,
    ApplicationCommandSubGroupData,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    MessageCreateOptions,
    MessageEditOptions,
} from "discord.js";

export type MessageLike = InteractionReplyOptions & InteractionEditReplyOptions & MessageCreateOptions & MessageEditOptions;

export type CommandData = {
    group?: string;
    key: string;
    description: string;
    options?: Exclude<ApplicationCommandOptionData, ApplicationCommandSubCommandData | ApplicationCommandSubGroupData>[];
};

export type TCNUser = {
    id: string;
    guilds: Record<string, { owner: boolean; advisor: boolean; voter: boolean; council: boolean; staff: boolean; roles: string[] }>;
    roles: string[];
    observer: boolean;
    owner: boolean;
    advisor: boolean;
    voter: boolean;
    council: boolean;
    staff: boolean;
    observerSince: number;
};

export type TCNGuild = {
    id: string;
    name: string;
    mascot: string;
    invite: string;
    owner: string;
    advisor?: string | null;
    voter: string;
    delegated: boolean;
    users: Record<string, { staff: boolean; roles: string[] }>;
};

export type Poll = {
    id: number;
    message?: string;
    close: number;
    closed: boolean;
    live: boolean;
    restricted: boolean;
    quorum: number;
} & (
    | { mode: "proposal"; question: string }
    | { mode: "induction"; preinduct: boolean; server: string }
    | { mode: "election"; wave: number; seats: number; candidates: string[] }
    | { mode: "selection"; question: string; min: number; max: number; options: string[] }
);

export type PollVote = {
    poll: number;
    user: string;
    mode: string;
    abstain: boolean;
    yes: boolean;
    verdict: string;
    candidates: Record<string, number>;
    selected: string[];
};

export type PollResults = {
    mode: string;
    abstains: number;
    votes: number;
    ballots: number;
    turnout: number;
    yes: number;
    no: number;
    induct: number;
    preinduct: number;
    reject: number;
    extend: number;
    winners: string[];
    tied: string[];
    scores: Record<string, number>;
};

export type Rolesync = {
    roleToStaff: string[];
    staffToRole: string[];
    roleToApi: Record<string, string[]>;
    apiToRole: { type: "position" | "role"; value: string; guild?: string; roles: string[] }[];
};
