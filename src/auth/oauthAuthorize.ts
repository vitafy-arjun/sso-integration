export async function buildOAuthAuthorizeUrl(pkce: {
  codeChallenge: string;
  state: string;
}): Promise<string> {
  const params = new URLSearchParams({
    state: pkce.state,
    code_challenge: pkce.codeChallenge,
  });

  const response = await fetch(`/auth/vitafy/authorize-url?${params.toString()}`);
  if (!response.ok) {
    const text = (await response.text()).trim();
    throw new Error(
      text || `Partner validation or authorize URL failed (${response.status})`
    );
  }

  const body = (await response.json()) as { authorizeUrl?: string };
  if (!body.authorizeUrl) {
    throw new Error('authorize-url response missing authorizeUrl');
  }
  return body.authorizeUrl;
}
