const core = require('@actions/core');
const github = require('@actions/github');

try {
  core.setOutput('pass', true);
} catch (error) {
  core.setFailed(error.message);
}
