/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tracks user activity state to determine when memory monitoring should be active
 */
export class ActivityDetector {
  private static _instance: ActivityDetector;
  private lastActivityTime: number = Date.now();
  private readonly idleThresholdMs: number;

  private constructor(idleThresholdMs: number = 30000) {
    this.idleThresholdMs = idleThresholdMs;
  }

  public static get instance(): ActivityDetector {
    if (!ActivityDetector._instance) {
      ActivityDetector._instance = new ActivityDetector();
    }
    return ActivityDetector._instance;
  }

  /**
   * Record user activity (called by CLI when user types, adds messages, etc.)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if user is currently active (activity within idle threshold)
   */
  isUserActive(): boolean {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    return timeSinceActivity < this.idleThresholdMs;
  }

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }
}

/**
 * Get global activity detector instance
 */
export function getActivityDetector(): ActivityDetector {
  return ActivityDetector.instance;
}

/**
 * Record user activity (convenience function for CLI to call)
 */
export function recordUserActivity(): void {
  ActivityDetector.instance.recordActivity();
}

/**
 * Check if user is currently active (convenience function)
 */
export function isUserActive(): boolean {
  return ActivityDetector.instance.isUserActive();
}
