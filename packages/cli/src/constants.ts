/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/naming-convention */

import { RESPONSE_ERROR_MESSAGES as CORE_RESPONSE_ERROR_MESSAGES } from 'n8n-core';

export const NODE_PACKAGE_PREFIX = 'n8n-nodes-';

export const RESPONSE_ERROR_MESSAGES = {
	NO_CREDENTIAL: 'Credential not found',
	NO_ENCRYPTION_KEY: CORE_RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY,
	PACKAGE_NAME_NOT_PROVIDED: 'Package name is required',
	PACKAGE_NAME_NOT_VALID: `Package name is not valid - it must start with "${NODE_PACKAGE_PREFIX}"`,
	PACKAGE_NOT_INSTALLED: 'This package is not installed - you must install it first',
	PACKAGE_NOT_FOUND: 'Failed installing package: package was not found',
	PACKAGE_VERSION_NOT_FOUND: 'The specified package version was not found',
	PACKAGE_DOES_NOT_CONTAIN_NODES: 'The specified package does not contain any nodes',
};

export const AUTH_COOKIE_NAME = 'n8n-auth';

export const NPM_COMMAND_TOKENS = {
	NPM_PACKAGE_NOT_FOUND_ERROR: '404 Not Found',
	NPM_PACKAGE_VERSION_NOT_FOUND_ERROR: 'No matching version found for',
};

export const NPM_PACKAGE_STATUS_GOOD = 'OK';
