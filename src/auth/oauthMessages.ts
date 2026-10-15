export const VITAFY_OAUTH_SUCCESS = 'VITAFY_OAUTH_SUCCESS' as const;
export const VITAFY_OAUTH_ERROR = 'VITAFY_OAUTH_ERROR' as const;

export type VitafyOAuthSuccessMessage = {
  type: typeof VITAFY_OAUTH_SUCCESS;
  code: string;
  state: string;
};

export type VitafyOAuthErrorMessage = {
  type: typeof VITAFY_OAUTH_ERROR;
  error: string;
  state: string | null;
};

export type VitafyOAuthPopupMessage = VitafyOAuthSuccessMessage | VitafyOAuthErrorMessage;

export function getPartnerOrigin(): string {
  return window.location.origin;
}
