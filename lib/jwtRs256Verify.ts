import crypto from 'crypto';

function decodePart(segment: string): Buffer {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export function verifyVitafyIntegrationJwt(
  token: string,
  publicKeyPem: string,
  options: { tenantId?: string; audience?: string; issuer?: string } = {}
): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodePart(headerB64).toString('utf8')) as { alg?: string };
  if (header.alg !== 'RS256') {
    throw new Error(`Unexpected JWT alg: ${header.alg}`);
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const pem = publicKeyPem.replace(/\\n/g, '\n').trim();
  const valid = verifier.verify(pem, signatureB64, 'base64url');
  if (!valid) {
    throw new Error('JWT signature verification failed');
  }

  const payload = JSON.parse(decodePart(payloadB64).toString('utf8')) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) {
    throw new Error('JWT expired');
  }
  if (options.issuer && payload.iss !== options.issuer) {
    throw new Error('JWT issuer mismatch');
  }
  if (options.audience && payload.aud !== options.audience) {
    throw new Error('JWT audience mismatch');
  }
  if (
    options.tenantId &&
    String(payload.tenant_id).toLowerCase() !== options.tenantId.toLowerCase()
  ) {
    throw new Error('JWT tenant_id mismatch');
  }
  return payload;
}
