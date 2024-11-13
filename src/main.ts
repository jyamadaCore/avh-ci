import * as core from '@actions/core';
import { exec } from '@actions/exec';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    validateInputsAndEnv();
    await installCorelliumCli();
    
    const deviceId = core.getInput('deviceId');
  }
  catch (error) {
    core.setFailed(`An error occurred: ${error instanceof Error ? error.message : error}`);
  }
}

async function installCorelliumCli(): Promise<void> {
  core.info('Installing Corellium-CLI...');
  await exec('npm install -g @corellium/corellium-cli@1.4.0');
  await execCmd(`corellium login --endpoint ${core.getInput('server')} --apitoken ${process.env.CORELLIUM_API_TOKEN
 }`);
}

async function setupDevice(): Promise<{ deviceId: string }> {
  const projectId = process.env.PROJECT;

  core.info('Creating device...');
  const resp = await execCmd(
    `corellium instance create ${core.getInput('deviceFlavor')} ${core.getInput('deviceOS')} ${projectId} --wait`,
  );
  const deviceId = resp?.toString().trim();
  return { deviceId };
}

function validateInputsAndEnv(): void {
  if (!process.env.CORELLIUM_API_TOKEN
  ) {
    throw new Error('Environment secret missing: CORELLIUM_API_TOKEN');
  }
  if (!process.env.PROJECT) {
    throw new Error('Environment secret missing: PROJECT');
  }

  // inputs from action file are not validated https://github.com/actions/runner/issues/1070
  const requiredInputs = ['deviceFlavor', 'deviceOS'];
  requiredInputs.forEach((input: string) => {
    const inputResp = core.getInput(input);
    if (!inputResp || typeof inputResp !== 'string' || inputResp === '') {
      throw new Error(`Input required and not supplied: ${input}`);
    }
  });
}

async function execCmd(cmd: string): Promise<string> {
  let err = '';
  let resp = '';

  await exec(cmd, [], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        resp += data;
      },
      stderr: (data: Buffer) => {
        err += data.toString();
      },
    },
  });
  if (err) {
    throw new Error(`Error occurred executing ${cmd}! err=${err}`);
  }
  return resp;
}


