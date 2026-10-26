import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createPartnerAuthContext,
  exchangeAuthorizationCode,
  formatHandlerError,
  partnerAuthEnvFromProcess,
} from '../../../server/partnerAuthCore.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed');
    return;
  }

  try {
    const ctx = createPartnerAuthContext(partnerAuthEnvFromProcess());
    const body = (req.body ?? {}) as Record<string, string>;
    const code = body.code?.trim();
    const codeVerifier = body.code_verifier?.trim();
    if (!code || !codeVerifier) {
      res.status(400).end('code and code_verifier are required');
      return;
    }

    const text = await exchangeAuthorizationCode(ctx, { code, codeVerifier });
    res.status(200).setHeader('Content-Type', 'application/json');
    res.end(text);
  } catch (error) {
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 500;
    res
      .status(Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500)
      .setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(formatHandlerError(error));
  }
}
