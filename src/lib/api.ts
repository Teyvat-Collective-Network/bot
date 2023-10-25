import { HasUser, getUserId } from "./extract.js";
import logger from "./logger.js";

export default async function (token: string | null | undefined, route: string, body?: any, reason?: string) {
    let request = route.startsWith("!");
    if (request) route = route.slice(1);

    logger.info({ location: "2071881e-4dd0-4097-a31a-59b527825ffa", body }, `=> API: ${route}`);

    const [method, real] = route.split(/\s+/);

    const options: { method: string; headers: Record<string, string>; body?: string } = { method, headers: {} };
    options.method = method;

    if (token) options.headers.Authorization = `Bearer ${token}`;

    if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    if (reason) options.headers["X-Audit-Log-Reason"] = reason;

    const req = await fetch(`${Bun.env.API}${real}`, options);
    if (request) return req;

    if (!req.ok) {
        const res = await req.json();
        logger.error({ body: res }, `bebe9b1d-8fbe-4394-8e5d-b8dbfc83f7a5 ${route}`);
        throw res.message ?? JSON.stringify(res);
    }

    const text = await req.text();

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export async function getToken(object: HasUser, internal?: boolean) {
    const id = getUserId(object);
    return await (await fetch(`${Bun.env.INTERNAL_API}/login/${id}?internal=${internal ?? true}`)).text();
}

export async function forgeToken() {
    return await getToken("1".repeat(18));
}
