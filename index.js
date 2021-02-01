import core from '@actions/core';
import github from '@actions/github';
import {Toolkit, ToolkitOptions} from 'actions-toolkit';

const octokit = new github.Github(process.env.GITHUB_TOKEN)

const findRepositoryInformation = (gitHubEventPath, log, exit) => {
  const payload = require(gitHubEventPath);
  if (payload.number === undefined) {
    exit.neutral('Action not triggered by a PullRequest action. PR ID is missing')
  }
  log.info(`Checking files list for PR#${payload.number}`);
  return {
    issue_number: payload.number,
    owner: payload.repository.owner.login,
    repo: payload.repository.name
  };
};


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
  const patterns = core.getInput('files', { required: true });
  toolkit.log.info(" files to check: ", patterns);

  if (!process.env.GITHUB_EVENT_PATH) {
    toolkit.exit.failure('Process env GITHUB_EVENT_PATH is undefined');
  } else {
    const { owner, issue_number, repo } = findRepositoryInformation(process.env.GITHUB_EVENT_PATH, toolkit.log, toolkit.exit);
    const { pulls: { listFiles }, issues } = toolkit.github;

    const params = {owner, pull_number, repo};

    await fetchAllFiles(listFiles, toolkit.log, params, 100, 1)
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

        core.setOutput('pass', true)
        toolkit.exit.success('Current Pull Request doesn\'t contain files match the rule.')
        return false; // TODO: 确认下是否要删除？
      })
      .then(async matched => {
        // 检查PR发起者的权限
        if (matched) { // TODO: 可能就不需要了
            const perms = ["none", "read", "write", "admin"];
            const actorName = github.context.actor;
            const response = await octokit.repos.getCollaboratorPermissionLevel({
              owner,
              repo,
              username: actorName
            });

            let permission = response.data.permission; // Permission level of actual user
            let argPerm = core.getInput("permission", { required: true }); // Permission level passed in through args

            let yourPermIdx = perms.indexOf(permission);
            let requiredPermIdx = perms.indexOf(argPerm);

            core.debug(`[Action] User Permission: ${permission}`);
            core.debug(`[Action] Minimum Action Permission: ${argPerm}`);

            core.setOutput('pass', yourPermIdx >= requiredPermIdx)
        }
      })
      .catch(reason => {
        core.setOutput('pass', false);
        toolkit.exit.failure(reason)
      })
    toolkit.exit.success('check finished!')
  }
})
