/**
 * Decrypts an encrypted string using AES-256-GCM
 * The encrypted string should be in the format: iv:tag:ciphertext (base64 encoded)
 * @param encryptedData - The encrypted data to decrypt
 * @param encryptionKey - The encryption key (hex string). If not provided or empty, returns data as-is (for development)
 */
export async function decrypt(encryptedData: string, encryptionKey?: string | null): Promise<string> {
  try {
    // If no encryption key is set, assume the data is stored in plain text
    // This allows the app to work during development
    if (!encryptionKey || encryptionKey === "") {
      return encryptedData;
    }

    // Parse the encrypted data format: iv:tag:ciphertext
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      // If format doesn't match, assume it's plain text (for backward compatibility)
      return encryptedData;
    }

    const [ivBase64, tagBase64, ciphertextBase64] = parts;
    
    // Convert base64 strings to buffers
    const iv = Buffer.from(ivBase64, "base64");
    const tag = Buffer.from(tagBase64, "base64");
    const ciphertext = Buffer.from(ciphertextBase64, "base64");
    const key = Buffer.from(encryptionKey, "hex");

    // Use Node.js crypto module for decryption
    const crypto = await import("crypto");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails, return the original data (for backward compatibility)
    // In production, you might want to log this error
    return encryptedData;
  }
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns the encrypted string in format: iv:tag:ciphertext (base64 encoded)
 * @param plaintext - The text to encrypt
 * @param encryptionKey - The encryption key (hex string). If not provided or empty, returns plaintext (for development)
 */
export async function encrypt(plaintext: string, encryptionKey?: string | null): Promise<string> {
  try {
    if (!encryptionKey || encryptionKey === "") {
      // If no encryption key, return plain text (for development)
      return plaintext;
    }

    const key = Buffer.from(encryptionKey, "hex");
    const crypto = await import("crypto");
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    // Encrypt
    let ciphertext = cipher.update(plaintext, "utf8");
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Return format: iv:tag:ciphertext (all base64 encoded)
    return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
