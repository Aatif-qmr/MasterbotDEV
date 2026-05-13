/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';

/**
 * Options for headless mode detection.
 */
export interface HeadlessModeOptions {
  /** Explicit prompt string or flag. */
  prompt?: string | boolean;
  /** Initial query positional argument. */
  query?: string | boolean;
  /** Explicit yolo flag to disable headless mode. */
  yolo?: boolean;
}

/**
 * Detects if the CLI is running in a "headless" (non-interactive) mode.
 *
 * Headless mode is triggered by:
 * 1. process.env.CI being set to 'true'.
 * 2. process.stdout not being a TTY.
 * 3. Presence of an explicit prompt flag.
 *
 * @param options - Optional flags and arguments from the CLI.
 * @returns true if the environment is considered headless.
 */
export function isHeadlessMode(options?: HeadlessModeOptions): boolean {
  // If yolo is explicitly set, then we're not in headless mode.
  if (options?.yolo) {
    return false;
  }

  // Fallback: check process.argv for flags that imply yolo mode.
  if (process.argv.some((arg) => arg === '-y' || arg === '--yolo')) {
    return false;
  }

  if (process.env['GEMINI_CLI_INTEGRATION_TEST'] !== 'true') {
    const isCI =
      process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true';
    if (isCI) {
      return true;
    }
  }

  const isNotTTY =
    (!!process.stdin && !process.stdin.isTTY) ||
    (!!process.stdout && !process.stdout.isTTY);

  if (isNotTTY || !!options?.prompt || !!options?.query) {
    return true;
  }

  // Fallback: check process.argv for flags that imply headless mode.
  return process.argv.some((arg) => arg === '-p' || arg === '--prompt');
}
