import api from "../lib/api.js";
import bot from "../lib/bot.js";

async function load() {
    for (const { id } of await api(null, `GET /users`)) await bot.users.fetch(id).catch(() => {});
}

load();
setInterval(load, 10 * 60 * 1000);
