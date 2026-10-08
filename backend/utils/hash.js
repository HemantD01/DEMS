const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const hashFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

const hashBuffer = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const verifyFileIntegrity = async (filePath, expectedHash) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { verified: false, reason: 'File not found on server' };
    }
    const currentHash = await hashFile(filePath);
    if (currentHash === expectedHash) {
      return { verified: true, currentHash, expectedHash };
    }
    return {
      verified: false,
      reason: 'Hash mismatch — file may have been tampered with',
      currentHash,
      expectedHash,
    };
  } catch (err) {
    return { verified: false, reason: `Verification error: ${err.message}` };
  }
};

module.exports = { hashFile, hashBuffer, verifyFileIntegrity };
