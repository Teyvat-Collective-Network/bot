import { App } from "../../index.js";
import rolesync from "../rolesync.js";

export default (app: App) =>
    app.post("/rolesync", async () => {
        rolesync();
    });
