Object.defineProperty(Array.prototype, 'chunk', {
    value: function(chunkSize) {
        let res = [];
        for (let i = 0; i < this.length; i += chunkSize) res.push(this.slice(i, i + chunkSize));
        return res;
    }
});

const log = s => document.getElementById('root').innerText = s;

let fulltext = '';

const slice = (prev) => {
    let sep = '==[ Payload ]===============================================';
    fulltext += prev.substr(0, prev.indexOf(sep));
    return decodeASCII85(prev.substr( prev.indexOf('<~', prev.indexOf(sep)), prev.lastIndexOf('~>') + 2));
}

const cmpArr = (a, b) => a.length == b.length && a.every((v, i) => v === b[i]);
const bytesToString = (bytes) => String.fromCharCode(...bytes);
const toHex = (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('');

const decodeASCII85 = (source) => {
    const text = source.trim();

    if (!text.startsWith("<~") || !text.endsWith("~>")) {
        throw new Error("Invalid ASCII85 string: missing <~ ~> delimiters");
    }

    // Remove delimiters and whitespace, then expand 'z' shortcut.
    let body = text
        .slice(2, -2)
        .replace(/\s+/g, "")
        .replace(/z/g, "!!!!!");

    // Pad to a multiple of 5 chars.
    const padding = "uuuuu".slice(body.length % 5 || 5);
    body += padding;

    const bytes = [];

    for (let i = 0; i < body.length; i += 5) {
        const value =
            (body.charCodeAt(i) - 33) * 85 ** 4 +
            (body.charCodeAt(i + 1) - 33) * 85 ** 3 +
            (body.charCodeAt(i + 2) - 33) * 85 ** 2 +
            (body.charCodeAt(i + 3) - 33) * 85 +
            (body.charCodeAt(i + 4) - 33);

        bytes.push(
            (value >>> 24) & 0xff,
            (value >>> 16) & 0xff,
            (value >>> 8) & 0xff,
            value & 0xff
        );
    }

    // Remove bytes that came from padding.
    bytes.length -= padding.length;

    return bytes.map(v => String.fromCharCode(v)).join('');
}

const rotateLeft = (str, d = 1) => {
    let ans = str.substring(d, str.length) +
        str.substring(0, d);
    return ans;
}

const rotateRight = (str, d = 1) => rotateLeft(str, str.length - d);