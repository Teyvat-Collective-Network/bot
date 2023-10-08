import logger from "./logger.js";

export default function (fn: (...args: any[]) => any, length: number) {
    async function withLog() {
        try {
            await fn();
        } catch (error) {
            logger.error(error, `1f1ac986-323f-4465-b3e8-70c7df9d11b9 Error running cycle:`);
        }
    }

    setTimeout(() => (withLog(), setInterval(withLog, length)), length - (Date.now() % length));
}
