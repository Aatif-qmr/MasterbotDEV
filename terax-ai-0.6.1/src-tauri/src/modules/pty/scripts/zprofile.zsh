# cipher-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  _cipher_user_zdotdir="${TERAX_USER_ZDOTDIR:-$HOME}"
  [ -f "$_cipher_user_zdotdir/.zprofile" ] && source "$_cipher_user_zdotdir/.zprofile"
  unset _cipher_user_zdotdir
}
:
