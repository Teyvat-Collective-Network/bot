import { HasUser, getUserId } from "./extract.js";
import logger from "./logger.js";

export default async function (token: string | null | undefined, route: string, body?: any, options?: RequestInit) {
    let request = route.startsWith("!");
    if (request) route = route.slice(1);

    logger.info({ location: "2071881e-4dd0-4097-a31a-59b527825ffa", body }, `=> API: ${route}`);

    const [method, real] = route.split(/\s+/);

    options ??= {};
    options.method = method;

    if (token) {
        options.headers ??= {};

        if (Array.isArray(options.headers)) options.headers.push(["Authorization", `Bearer ${token}`]);
        else if (options.headers instanceof Headers) options.headers.append("Authorization", `Bearer ${token}`);
        else options.headers.Authorization = `Bearer ${token}`;
    }

    if (body) {
        options.headers ??= {};

        if (Array.isArray(options.headers)) options.headers.push(["Content-Type", "application/json"]);
        else if (options.headers instanceof Headers) options.headers.append("Content-Type", "application/json");
        else options.headers["Content-Type"] = "application/json";

        options.body = JSON.stringify(body);
    }

    const req = await fetch(`${Bun.env.API}${real}`, options);
    if (request) return req;

    if (!req.ok) {
        const res = await req.json();
        logger.error({ location: "bebe9b1d-8fbe-4394-8e5d-b8dbfc83f7a5", body: res }, route);
        throw res.message ?? JSON.stringify(res);
    }

    const text = await req.text();

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export async function getToken(object: HasUser) {
    const id = getUserId(object);
    return await (await fetch(`${Bun.env.INTERNAL_API}/login/${id}?internal=true`)).text();
}
