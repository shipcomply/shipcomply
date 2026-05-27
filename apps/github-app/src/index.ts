import { Probot } from "probot";
import { handlePullRequest } from "./handlers/pr-opened";
import { handleInstallation } from "./handlers/installation";

export default (app: Probot) => {
  app.on("pull_request.opened", handlePullRequest);
  app.on("pull_request.synchronize", handlePullRequest);
  app.on("installation.created", handleInstallation);

  app.log.info("ShipComply GitHub App ready");
};
