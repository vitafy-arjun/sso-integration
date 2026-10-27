import crypto from 'crypto';

const ENVELOPE_VERSION = 'v1';
const MAX_PAYLOAD_AGE_SECONDS = 10 * 60;

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, '\n').trim();
}

function assertPayloadShape(payload: {
  tenant_id?: string;
  state?: string;
  code_challenge?: string;
  iat?: number;
  exp?: number;
}): void {
  if (!payload.tenant_id?.trim()) {
    throw new Error('authorize_envelope: tenant_id is required');
  }
  if (!payload.state?.trim()) {
    throw new Error('authorize_envelope: state is required');
  }
  if (!payload.code_challenge?.trim()) {
    throw new Error('authorize_envelope: code_challenge is required');
  }
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) {
    throw new Error('authorize_envelope: iat and exp are required');
  }
  if (payload.exp! < now) {
    throw new Error('authorize_envelope: expired');
  }
  if (payload.exp! - payload.iat! > MAX_PAYLOAD_AGE_SECONDS) {
    throw new Error('authorize_envelope: exp - iat exceeds maximum window');
  }
  if (payload.iat! > now + 60) {
    throw new Error('authorize_envelope: iat is in the future');
  }
}

export function buildEncryptedAuthorizeParams(input: {
  tenantId: string;
  jwtPublicKeyPem: string;
  state: string;
  codeChallenge: string;
}): { tenant_id: string; authorize_envelope: string } {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    tenant_id: input.tenantId,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
    response_type: 'code',
    iat: now,
    exp: now + 300,
  };
  assertPayloadShape(payload);
  const publicKey = normalizePem(input.jwtPublicKeyPem);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedAesKey = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  );
  const authorize_envelope = [
    ENVELOPE_VERSION,
    encryptedAesKey.toString('base64url'),
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    authTag.toString('base64url'),
  ].join('.');
  return { tenant_id: input.tenantId, authorize_envelope };
}
