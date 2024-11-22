import * as core from '@actions/core';
import fetch from 'node-fetch';

/**
 * The main function for the GitHub Action.
 */
export async function run(): Promise<void> {
  try {
    validateInputsAndEnv();
    
    const token = await loginToCorellium();
    core.info(`Successfully authenticated with Corellium`);

    const { deviceId } = await setupDevice(token);
    await delay(120000);

  } catch (error) {
    core.setFailed(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Function to authenticate with Corellium.
 */
export async function loginToCorellium(): Promise<string> {
  const domain = process.env.CORELLIUM_SERVER
  const url = `${domain}/v1/auth/login`;
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

  return data.token;
}

/**
 * Function to create a device on Corellium via API using node-fetch.
 */
export async function setupDevice(token: string): Promise<{ deviceId: string }> {
  const domain = process.env.CORELLIUM_SERVER
  const url = `${domain}/v1/instances`;
  const postData = {
    project: process.env.PROJECT,
    name: core.getInput('deviceName'),
    flavor: core.getInput('deviceFlavor'),
    os: core.getInput('deviceOS'),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create device: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || !data.id) {
    throw new Error('Failed to retrieve device ID from Corellium');
  }

  return { deviceId: data.id }; // Return the device ID for further processing
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function validateInputsAndEnv(): void {
  if (!process.env.CORELLIUM_API_TOKEN || !process.env.PROJECT) {
    throw new Error('Missing environment secrets');
  }

  const requiredInputs = ['deviceFlavor', 'deviceOS', 'deviceName'];
  requiredInputs.forEach(input => {
    if (!core.getInput(input)) {
      throw new Error(`Input required and not supplied: ${input}`);
    }
  });
}
