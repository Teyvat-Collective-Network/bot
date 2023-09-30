import { App } from "../index.js";
import getChannelBanshareValidate from "./routes/get-channel-banshare-validate.js";
import getInvite from "./routes/get-invite.js";
import getUserTag from "./routes/get-user-tag.js";
import patchBanshareSeverity from "./routes/patch-banshare-severity.js";
import postApplication from "./routes/post-application.js";
import postBanshareExecute from "./routes/post-banshare-execute.js";
import postBansharePublish from "./routes/post-banshare-publish.js";
import postBanshareReject from "./routes/post-banshare-reject.js";
import postBanshareRemind from "./routes/post-banshare-remind.js";
import postBanshareReport from "./routes/post-banshare-report.js";
import postBanshareRescind from "./routes/post-banshare-rescind.js";
import postBanshare from "./routes/post-banshare.js";

export default (app: App) =>
    app
        .use(getChannelBanshareValidate)
        .use(getInvite)
        .use(getUserTag)
        .use(patchBanshareSeverity)
        .use(postApplication)
        .use(postBanshareExecute)
        .use(postBansharePublish)
        .use(postBanshareReject)
        .use(postBanshareRemind)
        .use(postBanshareReport)
        .use(postBanshareRescind)
        .use(postBanshare);
