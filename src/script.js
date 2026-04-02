import * as i69 from './i69.js';
import * as ipv4 from './ipv4.js';
import * as aes from './aes.js';

async function load(file) {
    const response = await fetch(file);
    const text = await response.text();
    return text;
}

let input = await load("./res/input.txt");

let res1 = slice(input);

let data2 = slice(res1);

const part2Decode = data => data.split('').map(char => char.charCodeAt(0))
        .map(n => (n ^ 0b01010101).toString(2).padStart(8, '0'))
        .map(s => rotateRight(s))
        .map(s => parseInt(s, 2))
        .map(n => String.fromCharCode(n))
        .join('');


let res2 = part2Decode(data2);
let data3 = slice(res2);

const part3Decode = data => data.split('').map(char => char.charCodeAt(0))
        .map(n => {
            let tmp = n.toString(2).padStart(8, '0').split('').map(Number);
            let parityBit = tmp.pop();
            return {correct: tmp.filter(v => v === 1).length % 2 === parityBit, data: tmp}
        })
        .filter(o => o.correct).map(o => o.data).flat().chunk(8)
        .map(chunk => String.fromCharCode(Number('0b' + chunk.join('')) ))
        .join('')

let res3 = part3Decode(data3);
let data4 = slice(res3);

// solved by semi-manual XORing from `==[ Layer 4/6:                 ]============================` base
const part4Decode = _data => {
    let data = _data.split('').map(v => v.charCodeAt(0));
    let key = '==[ Layer 4/6: Network Traffic ]'.split('').map(v => v.charCodeAt(0)).map((n, i) => data[i] ^ n);
    return data.map((n, i) => n ^ key[i % 32]).map(n => String.fromCharCode(n)).join('');
}

let res4 = part4Decode(data4);
let data5 = slice(res4);

const part5Decode = data => ipv4.parse(data).filter(packet => {
    if (packet.sourceAddr.join('.') !== '10.1.1.10') return false;
    if (packet.destinationAddr.join('.') !== '10.1.1.200') return false;
    if (packet.destinationPort !== 42069) return false;

    let ipChecksum = ipv4.headerChecksum(packet.ipHeaderRaw);

    let udpChecksum = ipv4.udpChecksum(packet.sourceAddr, packet.destinationAddr, [
        ...packet.udpHeaderRaw,
        ...packet.data
    ])

    if (packet.ipChecksum !== ipChecksum) return false;
    if (packet.udpChecksum !== udpChecksum) return false;

    return true;
}).map(packet => packet.data.map(n => String.fromCharCode(n)).join('')).join('')

let res5 = part5Decode(data5);
let data6 = slice(res5);

const part6Decode = (_data) => {
    const data = Array.from(_data, ch => ch.charCodeAt(0) & 0xff);

    const kek = data.slice(0, 32);         // 32 bytes
    const iv1 = data.slice(32, 40);        // 8 bytes
    const encryptedKey = data.slice(40, 80); // 40 bytes
    const iv2 = data.slice(80, 96);        // 16 bytes
    const payload = data.slice(96);        // remaining bytes

    const key = aes.keyUnwrapRFC3394(kek, iv1, encryptedKey);
    const plaintextBytes = aes.ctrDecrypt(key, iv2, payload);

    return String.fromCharCode(...plaintextBytes);
};

let res6 = part6Decode(data6);
let data7 = slice(res6);

let testProgram = '50 48 C2 02 A8 4D 00 00 00 4F 02 50 09 C4 02 02 E1 01 4F 02 C1 22 1D 00 00 00 48 30 02 58 03 4F 02 B0 29 00 00 00 48 31 02 50 0C C3 02 AA 57 48 02 C1 21 3A 00 00 00 48 32 02 48 77 02 48 6F 02 48 72 02 48 6C 02 48 64 02 48 21 02 01 65 6F 33 34 2C'.split(' ').map(s => Number('0x'+s))
console.log(i69.run(testProgram));

let res7 = i69.run(data7);
log(fulltext + res7);
