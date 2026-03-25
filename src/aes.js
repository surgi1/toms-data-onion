export const keyUnwrapRFC3394 = (kekBytes, expectedIV, wrappedBytes) => {
    if (wrappedBytes.length % 8 !== 0 || wrappedBytes.length < 16) {
        throw new Error('Wrapped key must be at least 16 bytes and a multiple of 8 bytes');
    }

    const n = (wrappedBytes.length / 8) - 1;

    let A = wrappedBytes.slice(0, 8);
    const R = [];

    for (let i = 0; i < n; i++) {
        R[i] = wrappedBytes.slice(8 + i * 8, 16 + i * 8);
    }

    for (let j = 5; j >= 0; j--) {
        for (let i = n - 1; i >= 0; i--) {
            const t = n * j + (i + 1);
            const aXorT = xor64WithInt(A, t);
            const block = aXorT.concat(R[i]);
            const B = ecbDecryptBlock(kekBytes, block);

            A = B.slice(0, 8);
            R[i] = B.slice(8, 16);
        }
    }

    if (!cmpArr(A, expectedIV)) {
        throw new Error(
            `Key unwrap integrity check failed. Expected IV ${toHex(expectedIV)}, got ${toHex(A)}`
        );
    }

    return R.flat();
}

const ecbDecryptBlock = (keyBytes, blockBytes) => {
    const keyWA = bytesToWordArray(keyBytes);
    const blockWA = bytesToWordArray(blockBytes);

    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: blockWA },
        keyWA,
        {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        }
    );

    return wordArrayToBytes(decrypted);
}

export const ctrDecrypt = (keyBytes, ivBytes, ciphertextBytes) => {
    const keyWA = bytesToWordArray(keyBytes);
    const ivWA = bytesToWordArray(ivBytes);
    const ctWA = bytesToWordArray(ciphertextBytes);

    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ctWA },
        keyWA,
        {
            mode: CryptoJS.mode.CTR,
            iv: ivWA,
            padding: CryptoJS.pad.NoPadding
        }
    );

    return wordArrayToBytes(decrypted).slice(0, ciphertextBytes.length);
}

const xor64WithInt = (aBytes, t) => {
    const out = aBytes.slice();
    let x = t >>> 0;

    for (let k = 7; k >= 0 && x > 0; k--) {
        out[k] ^= (x & 0xff);
        x >>>= 8;
    }

    return out;
}

const bytesToWordArray = bytes => {
    const words = [];

    for (let i = 0; i < bytes.length; i++) {
        words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }

    return CryptoJS.lib.WordArray.create(words, bytes.length);
}

const wordArrayToBytes = wordArray => {
    const { words, sigBytes } = wordArray;
    const bytes = [];

    for (let i = 0; i < sigBytes; i++) {
        bytes.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
    }

    return bytes;
}
