/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType, type ContentGenerator } from '../core/contentGenerator.js';
import { getOauthClient } from './oauth2.js';
import { setupUser } from './setup.js';
import { CodeAssistServer, type HttpOptions } from './server.js';
import type { Config } from '../config/config.js';
import { LoggingContentGenerator } from '../core/loggingContentGenerator.js';

export async function createCodeAssistServer(
  httpOptions: HttpOptions,
  authType: AuthType,
  config: Config,
  sessionId?: string,
): Promise<CodeAssistServer | undefined> {
  const tryCreateServer = async (
    currentAuthType: AuthType,
  ): Promise<CodeAssistServer | undefined> => {
    try {
      const authClient = await getOauthClient(currentAuthType, config);
      const userData = await setupUser(authClient, config, httpOptions);
      return new CodeAssistServer(
        authClient,
        userData.projectId,
        httpOptions,
        sessionId,
        userData.userTier,
        userData.userTierName,
        userData.paidTier,
        config,
      );
    } catch (e) {
      if (currentAuthType === AuthType.COMPUTE_ADC) {
        // If COMPUTE_ADC fails, we've exhausted options for AUTO
        return undefined;
      }
      throw e; // Re-throw other errors
    }
  };

  switch (authType) {
    case AuthType.LOGIN_WITH_GOOGLE:
    case AuthType.COMPUTE_ADC:
      return tryCreateServer(authType);
    case AuthType.AUTO:
      try {
        return await tryCreateServer(AuthType.LOGIN_WITH_GOOGLE);
      } catch (e) {
        // If LOGIN_WITH_GOOGLE fails, try COMPUTE_ADC
        return await tryCreateServer(AuthType.COMPUTE_ADC);
      }
    case AuthType.NONE:
      return undefined;
    default:
      throw new Error(`Unsupported authType: ${authType}`);
  }
}

export function getCodeAssistServer(
  config: Config,
): CodeAssistServer | undefined {
  let server = config.getContentGenerator();

  // Unwrap LoggingContentGenerator if present
  if (server instanceof LoggingContentGenerator) {
    server = server.getWrapped();
  }

  if (!(server instanceof CodeAssistServer)) {
    return undefined;
  }
  return server;
}
