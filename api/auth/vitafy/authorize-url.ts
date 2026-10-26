import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildAuthorizeUrlResponse,
  createPartnerAuthContext,
  formatHandlerError,
  partnerAuthEnvFromProcess,
} from '../../../server/partnerAuthCore.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed');
    return;
  }

  try {
    const ctx = createPartnerAuthContext(partnerAuthEnvFromProcess());
    const state = String(req.query.state ?? '').trim();
    const codeChallenge = String(req.query.code_challenge ?? '').trim();
    if (!state || !codeChallenge) {
      res.status(400).end('state and code_challenge query params are required');
      return;
    }
    if (state.length > 512 || codeChallenge.length > 256) {
      res.status(400).end('state or code_challenge is too long');
      return;
    }

    const payload = await buildAuthorizeUrlResponse(ctx, { state, codeChallenge });
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(formatHandlerError(error));
  }
}
