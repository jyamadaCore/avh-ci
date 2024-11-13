import * as core from '@actions/core';
import { exec } from '@actions/exec';
import fetch from 'node-fetch';  // Use static import for compatibility

/**
 * The main function for the GitHub Action.
 * This function orchestrates the setup, installation, and retrieval of device information.
 *
 * @returns {Promise<void>} Resolves when the action completes successfully, or sets the action to failed if an error occurs.
 */
export async function run(): Promise<void> {
  try {
    validateInputsAndEnv(); // Validate necessary environment variables and inputs
    
    const token = await loginToCorellium(); // Authenticate and get the bearer token
    core.info(`Successfully authenticated with Corellium`);

    await installCorelliumCli(); // Install the Corellium CLI

    const { deviceId } = await setupDevice(); // Create a device on Corellium
    const wifiIp = await getDeviceWifiIp(deviceId, token); // Retrieve the device's WiFi IP via API with token

    core.info(`Device created with ID: ${deviceId} and WiFi IP: ${wifiIp}`);
  } catch (error) {
    core.setFailed(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Function to authenticate with Corellium and retrieve a bearer token.
 */
async function loginToCorellium(): Promise<string> {
  const url = 'https://jedi.app.avh.corellium.com/api/v1/auth/login';
  const apiToken = process.env.CORELLIUM_API_TOKEN;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify({ apiToken })
  });

  if (!response.ok) {
    throw new Error(`Failed to authenticate with Corellium: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || !data.token) {
    throw new Error('No token received from Corellium authentication');
  }

  return data.token;  // Return the token for use in subsequent requests
}

async function installCorelliumCli(): Promise<void> {
  core.info('Installing Corellium-CLI...');
  await exec('npm install -g @corellium/corellium-cli@1.3.8');
  await execCmd(`corellium login --endpoint ${process.env.SERVER} --apitoken ${process.env.CORELLIUM_API_TOKEN}`);
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupDevice(): Promise<{ deviceId: string }> {
  const projectId = process.env.PROJECT;

  core.info('Creating device...');
  const resp = await execCmd(
    `corellium instance create ${core.getInput('deviceFlavor')} ${core.getInput('deviceOS')} ${projectId}`,
  );

  await delay(60000); // Introduce a 5-second delay
  
  const deviceId = resp?.toString().trim();
  return { deviceId };
}

async function getDeviceWifiIp(deviceId: string, token: string): Promise<string> {
  core.info(`Fetching WiFi IP for device ID: ${deviceId} via API...`);

  const endpoint = `${process.env.SERVER}/api/v1/instances`;
  const params = new URLSearchParams({
    name: core.getInput('deviceName'),
    returnAttr: 'wifiIp',
  });
  const url = `${endpoint}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,  // Use the token received from login
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch WiFi IP: ${response.statusText}`);
  }

  const data = (await response.json()) as { wifiIp?: string };
  const wifiIp = data?.wifiIp;

  if (!wifiIp) {
    throw new Error('WiFi IP not found in response');
  }

  return wifiIp;
}

function validateInputsAndEnv(): void {
  if (!process.env.CORELLIUM_API_TOKEN) {
    throw new Error('Environment secret missing: CORELLIUM_API_TOKEN');
  }
  if (!process.env.PROJECT) {
    throw new Error('Environment secret missing: PROJECT');
  }

  const requiredInputs = ['deviceFlavor', 'deviceOS', 'deviceName'];
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
        resp += data.toString();
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

function tryJsonParse(jsonStr: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    core.warning('Failed to parse JSON response');
    return undefined;
  }
}
