import * as core from '@actions/core';
import { exec } from '@actions/exec';
import fetch from 'node-fetch';
import * as https from 'https';
import { Buffer } from 'buffer';

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

  return data.token;
}

/**
 * Function to create a device on Corellium via API.
 */
async function setupDevice(token: string): Promise<{ deviceId: string }> {
  const postData = JSON.stringify({
    project: process.env.PROJECT,
    name: core.getInput('deviceName'),
    flavor: core.getInput('deviceFlavor'),
    os: core.getInput('deviceOS'),
    fwpackage: "https://firmwares-us-east-1-avh-s3-arm-com.s3.amazonaws.com/dummy-image-ae096d74-a6cd-47f1-a9c3-cdb7d127cf80"
  });

  const options = {
    hostname: 'jedi.app.avh.corellium.com',
    path: '/api/v1/instances',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  return new Promise<{ deviceId: string }>((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []; // Explicit type for 'chunks'

      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const response = JSON.parse(body);
        if (response.id) {
          resolve({ deviceId: response.id });
        } else {
          reject(new Error('Failed to create device'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateInputsAndEnv(): void {
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
