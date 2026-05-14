use crate::modules::auth::keychain;
use crate::modules::auth::types::AuthToken;
use oauth2::basic::BasicClient;
use oauth2::{
    AuthUrl, ClientId, RedirectUrl, TokenUrl, TokenResponse, AuthorizationCode, PkceCodeChallenge, PkceCodeVerifier, Scope,
    EndpointSet, EndpointNotSet
};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct AuthState {
    pub pkce_verifier: Mutex<Option<PkceCodeVerifier>>,
    pub http_client: reqwest::Client,
}

impl AuthState {
    pub fn new() -> Self {
        Self {
            pkce_verifier: Mutex::new(None),
            http_client: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("Failed to create HTTP client"),
        }
    }
}

type TeraxOAuthClient = BasicClient<
    EndpointSet,     // Auth
    EndpointNotSet,  // Device
    EndpointNotSet,  // Introspection
    EndpointNotSet,  // Revocation
    EndpointSet,     // Token
>;

fn create_client() -> TeraxOAuthClient {
    let client_id = ClientId::new("764086051750-761d29909ba06578.apps.googleusercontent.com".to_string());
    let auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).expect("Invalid auth URL");
    let token_url = TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).expect("Invalid token URL");
    let redirect_url = RedirectUrl::new("terax://oauth/callback".to_string()).expect("Invalid redirect URL");

    BasicClient::new(client_id)
        .set_auth_uri(auth_url)
        .set_token_uri(token_url)
        .set_redirect_uri(redirect_url)
}

#[tauri::command]
pub async fn oauth_start_flow(state: State<'_, AuthState>) -> Result<String, String> {
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
    
    let client = create_client();
    let (auth_url, _csrf_token) = client
        .authorize_url(oauth2::CsrfToken::new_random)
        .add_scope(Scope::new("https://www.googleapis.com/auth/generative-language".to_string()))
        .add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.email".to_string()))
        .add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.profile".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    let mut verifier = state.pkce_verifier.lock().map_err(|e| e.to_string())?;
    *verifier = Some(pkce_verifier);

    // Open browser
    open::that(auth_url.as_str()).map_err(|e| e.to_string())?;

    Ok(auth_url.to_string())
}

#[tauri::command]
pub async fn oauth_handle_callback(
    _app: AppHandle,
    state: State<'_, AuthState>,
    code: String,
) -> Result<AuthToken, String> {
    let pkce_verifier = state.pkce_verifier.lock().map_err(|e| e.to_string())?
        .take()
        .ok_or("Missing PKCE verifier")?;

    let client = create_client();
    let token_result = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(pkce_verifier)
        .request_async(&state.http_client)
        .await
        .map_err(|e| e.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    let expires_in = token_result.expires_in().map(|d| d.as_secs()).unwrap_or(3600);

    let token = AuthToken {
        access_token: token_result.access_token().secret().to_string(),
        refresh_token: token_result.refresh_token().map(|t| t.secret().to_string()),
        expires_at: now + expires_in,
        scope: token_result.scopes().map(|s| s.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(" ")),
    };

    keychain::save_token(&token)?;

    Ok(token)
}

#[tauri::command]
pub async fn oauth_get_token(state: State<'_, AuthState>) -> Result<Option<AuthToken>, String> {
    let token = keychain::get_token()?;
    
    if let Some(mut t) = token {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();

        // Buffer of 5 minutes before expiry
        if t.expires_at < now + 300 {
            if let Some(refresh_token) = &t.refresh_token {
                let client = create_client();
                let token_result = client
                    .exchange_refresh_token(&oauth2::RefreshToken::new(refresh_token.clone()))
                    .request_async(&state.http_client)
                    .await
                    .map_err(|e| e.to_string())?;

                let expires_in = token_result.expires_in().map(|d| d.as_secs()).unwrap_or(3600);
                
                t.access_token = token_result.access_token().secret().to_string();
                if let Some(new_refresh) = token_result.refresh_token() {
                    t.refresh_token = Some(new_refresh.secret().to_string());
                }
                t.expires_at = now + expires_in;
                
                keychain::save_token(&t)?;
                return Ok(Some(t));
            } else {
                return Ok(None);
            }
        }
        return Ok(Some(t));
    }

    Ok(None)
}

#[tauri::command]
pub async fn oauth_clear() -> Result<(), String> {
    keychain::clear_token()
}
