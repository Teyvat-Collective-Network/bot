import rolesync from "../../lib/rolesync.js";
import { CommandData } from "../../lib/types.js";

export const command: CommandData = {
    key: "all",
    description: "invoke automatic role synchronization on all users",
};

export default async function (_: unknown) {
    rolesync();
    return "A rolesync update has been queued.";
}
