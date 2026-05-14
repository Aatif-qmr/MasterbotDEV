import { invoke } from '@tauri-apps/api/core';

export interface AuthToken {
  access_token: String;
  refresh_token?: String;
  expires_at: number;
  scope?: String;
}

export class GoogleOAuthClient {
  /**
   * Start the OAuth flow by opening the system browser.
   */
  async login(): Promise<void> {
    try {
      await invoke('oauth_start_flow');
    } catch (err) {
      console.error('Failed to start OAuth flow:', err);
      throw err;
    }
  }

  /**
   * Retrieve a valid access token from the secure Keychain.
   * Auto-refreshes if the token is near expiry.
   */
  async getToken(): Promise<AuthToken | null> {
    try {
      const token = await invoke<AuthToken | null>('oauth_get_token');
      return token;
    } catch (err) {
      console.error('Failed to get auth token:', err);
      return null;
    }
  }

  /**
   * Handle the OAuth callback code and exchange it for tokens.
   */
  async handleCallback(code: string): Promise<AuthToken> {
    try {
      const token = await invoke<AuthToken>('oauth_handle_callback', { code });
      return token;
    } catch (err) {
      console.error('Failed to handle OAuth callback:', err);
      throw err;
    }
  }

  /**
   * Clear credentials from the secure Keychain.
   */
  async logout(): Promise<void> {
    try {
      await invoke('oauth_clear');
    } catch (err) {
      console.error('Failed to clear auth token:', err);
    }
  }
}

export const auth = new GoogleOAuthClient();
