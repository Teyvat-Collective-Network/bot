import cycle from "../lib/cycle.js";
import rolesync from "../lib/rolesync.js";

cycle(() => rolesync({}), 3 * 60 * 60 * 1000);
await rolesync({});
