import {Toolkit, ToolkitOptions} from 'actions-toolKit';


const fetchAllFiles = (listFiles, log, params, per_page, page) => {
  log.info(`Listing files (page: ${page} | per_page: ${per_page})...`);
  return listFiles({per_page, page, ...params})
    .then((response) => {
      log.info(`Loaded ${response.data.length} files`);
      let pullsListFilesResponseItems = response.data;
      if (pullsListFilesResponseItems.length >= per_page) {
        return fetchAllFiles(listFiles, log, params, per_page, page + 1).then(value => value.concat(pullsListFilesResponseItems));
      }
      return pullsListFilesResponseItems;
    });
};


Toolkit.run(async function (toolKit) {
  const patterns = toolKit.inputs.files.split('\n');
  toolKit.log.info(" files to check: ", patterns);

  if (!process.env.GITHUB_EVENT_PATH) {
    toolKit.exit.failure('Process env GITHUB_EVENT_PATH is undefined');
  } else {
    const { owner, pull_number, repo } = toolKit.context.pullRequest
    const { pulls: { listFiles } } = toolKit.github;

    const params = {owner, pull_number, repo};

    await fetchAllFiles(listFiles, toolKit.log, params, 100, 1)
      .then(files => {
        // 改动文件是否命中规则？
        let matchedFiles = [];
        patterns.forEach(pattern => {
          const reg = new RegExp(pattern);
          files.forEach(file => {
            if (reg.test(file.filename)) {
              matchedFiles.push(file.filename);
            }
          })
        })
        toolKit.log.debug("matched files: ", matchedFiles);
        if (matchedFiles.length > 0) return true;

        toolKit.outputs.pass = true
        toolKit.exit.success('Current Pull Request doesn\'t contain files match the rule.')
      })
      .then(async matched => {
        // 检查PR发起者的权限
        const perms = ["none", "read", "write", "admin"];
        const actorName = toolKit.context.actor;
        const response = await toolKit.github.repos.getCollaboratorPermissionLevel({
          owner,
          repo,
          username: actorName
        });

        let permission = response.data.permission; // Permission level of actual user
        let argPerm = toolKit.inputs.permission; // Permission level passed in through args

        let yourPermIdx = perms.indexOf(permission);
        let requiredPermIdx = perms.indexOf(argPerm);

        toolKit.log.debug(`[Action] User Permission: ${permission}`);
        toolKit.log.debug(`[Action] Minimum Action Permission: ${argPerm}`);

        toolKit.outputs.pass = yourPermIdx >= requiredPermIdx
      })
      .catch(reason => {
        toolKit.outputs.pass = false
        toolKit.exit.failure(reason)
      })
    toolKit.exit.success('check finished!')
  }
})
