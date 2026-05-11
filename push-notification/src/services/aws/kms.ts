import {
    KmsKeyringNode,
    buildClient,
    CommitmentPolicy,
} from '@aws-crypto/client-node';
import { ENVIRONMENT } from '../../config/environment';

export class KmsDecryptionService {
    private decrypt: any;
    private keyring: KmsKeyringNode | null;

    constructor() {
        const { decrypt } = buildClient(
            CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT
        );
        this.decrypt = decrypt;

        const keyId = ENVIRONMENT.KMS_KEY_ARN || ENVIRONMENT.KMS_KEY_ID;
        if (keyId) {
            this.keyring = new KmsKeyringNode({ keyIds: [keyId] });
        } else {
            this.keyring = null;
            console.warn(
                '⚠️ KMS_KEY_ARN / KMS_KEY_ID not set — KMS keyring skipped (OK for local push-only; Cognito CustomSMSSender needs KMS).'
            );
        }
    }

    async decryptCode(encryptedCode: string): Promise<string> {
        if (!this.keyring) {
            throw new Error(
                'KMS is not configured: set KMS_KEY_ARN or KMS_KEY_ID to decrypt CustomSMSSender codes.'
            );
        }
        try {
            const cipherBytes = Buffer.from(encryptedCode, 'base64');
            const { plaintext } = await this.decrypt(this.keyring, cipherBytes);
            // Plain‑text returned may include HTML escapes for < and > in passwords
            return Buffer.from(plaintext)
                .toString('utf8')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        } catch (err) {
            console.error('❌ KMS/EncryptionSDK decryption failed:', err);
            throw err;
        }
    }
}
