import { App } from "../index.js";
import deletePoll from "./routes/delete-poll.js";
import getChannelBanshareValidate from "./routes/get-channel-banshare-validate.js";
import getInvite from "./routes/get-invite.js";
import getRoles from "./routes/get-roles.js";
import getUserTag from "./routes/get-user-tag.js";
import patchBanshareSeverity from "./routes/patch-banshare-severity.js";
import postApplication from "./routes/post-application.js";
import postAutosync from "./routes/post-autosync.js";
import postBanshareExecute from "./routes/post-banshare-execute.js";
import postBansharePublish from "./routes/post-banshare-publish.js";
import postBanshareReject from "./routes/post-banshare-reject.js";
import postBanshareRemind from "./routes/post-banshare-remind.js";
import postBanshareReport from "./routes/post-banshare-report.js";
import postBanshareRescind from "./routes/post-banshare-rescind.js";
import postBanshare from "./routes/post-banshare.js";
import postLog from "./routes/post-log.js";
import postOrEditPoll from "./routes/post-or-edit-poll.js";
import postPollRemind from "./routes/post-poll-remind.js";
import postRolesync from "./routes/post-rolesync.js";
import postSecretSantaAlert from "./routes/post-secret-santa-alert.js";
import updateChannels from "./routes/update-channels.js";

export default (app: App) =>
    app
        .use(deletePoll)
        .use(getChannelBanshareValidate)
        .use(getInvite)
        .use(getRoles)
        .use(getUserTag)
        .use(patchBanshareSeverity)
        .use(postApplication)
        .use(postAutosync)
        .use(postBanshareExecute)
        .use(postBansharePublish)
        .use(postBanshareReject)
        .use(postBanshareRemind)
        .use(postBanshareReport)
        .use(postBanshareRescind)
        .use(postBanshare)
        .use(postLog)
        .use(postOrEditPoll)
        .use(postPollRemind)
        .use(postRolesync)
        .use(postSecretSantaAlert)
        .use(updateChannels);
