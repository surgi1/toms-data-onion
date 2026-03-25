const isByteArray = value =>
    Array.isArray(value) && value.every(v => Number.isInteger(v) && v >= 0 && v <= 255);

const readUint16BE = (bytes, offset) => ((bytes[offset] & 0xff) << 8) | (bytes[offset + 1] & 0xff);

const foldChecksum = sum => {
    sum = (sum & 0xffff) + (sum >>> 16);
    sum = (sum & 0xffff) + (sum >>> 16);
    return sum;
};

const addWord16 = (sum, word) => {
    sum += word & 0xffff;
    return (sum & 0xffff) + (sum >>> 16);
};

const addByteArray16 = (sum, bytes) => {
    for (let i = 0; i < bytes.length; i += 2) {
        const hi = bytes[i] & 0xff;
        const lo = (i + 1 < bytes.length) ? (bytes[i + 1] & 0xff) : 0;
        sum = addWord16(sum, (hi << 8) | lo);
    }
    return sum;
};

export const headerChecksum = header => {
    if (!isByteArray(header)) {
        throw new Error("header must be an array of bytes");
    }
    if (header.length % 2 !== 0) {
        throw new Error("header length must be even");
    }

    let sum = 0;
    const data = header.slice();
    data[10] = 0; // checksum
    data[11] = 0; // checksum

    for (let i = 0; i < data.length; i += 2) {
        const word = ((data[i] & 0xff) << 8) | (data[i + 1] & 0xff);
        sum += word;
        sum = (sum & 0xffff) + (sum >>> 16);
    }

    sum = foldChecksum(sum);

    return (~sum) & 0xffff;
};

export const udpChecksum = (srcIp, dstIp, udpPacket) => {
    if (!isByteArray(srcIp) || srcIp.length !== 4) {
        throw new Error("srcIp must be an array of 4 bytes");
    }
    if (!isByteArray(dstIp) || dstIp.length !== 4) {
        throw new Error("dstIp must be an array of 4 bytes");
    }
    if (!isByteArray(udpPacket) || udpPacket.length < 8) {
        throw new Error("udpPacket must be an array of at least 8 bytes");
    }

    const udpLength = udpPacket.length;
    let sum = 0;

    // IPv4 pseudo-header
    sum = addByteArray16(sum, srcIp);
    sum = addByteArray16(sum, dstIp);
    sum = addWord16(sum, 0x0011);   // zero byte + UDP protocol number
    sum = addWord16(sum, udpLength);

    // UDP header + payload, with checksum field cleared
    const data = udpPacket.slice();
    data[6] = 0;
    data[7] = 0;
    sum = addByteArray16(sum, data);

    sum = foldChecksum(sum);

    const checksum = (~sum) & 0xffff;

    // For UDP over IPv4, computed zero is transmitted as 0xffff
    return checksum === 0 ? 0xffff : checksum;
};

export const parse = _data => {
    if (typeof _data !== "string") {
        throw new Error("parse expects a string");
    }

    let data = _data.split("").map(v => v.charCodeAt(0) & 0xff);
    const packets = [];

    while (data.length > 0) {
        if (data.length < 28) {
            throw new Error("truncated packet");
        }

        const packet = {
            ipHeaderRaw: data.slice(0, 20),
            udpHeaderRaw: data.slice(20, 28),
            data: [],
        };

        packet.length = readUint16BE(packet.ipHeaderRaw, 2);
        packet.sourceAddr = packet.ipHeaderRaw.slice(12, 16);
        packet.destinationAddr = packet.ipHeaderRaw.slice(16, 20);
        packet.ipChecksum = readUint16BE(packet.ipHeaderRaw, 10);

        packet.sourcePort = readUint16BE(packet.udpHeaderRaw, 0);
        packet.destinationPort = readUint16BE(packet.udpHeaderRaw, 2);
        packet.udpLength = readUint16BE(packet.udpHeaderRaw, 4);
        packet.udpChecksum = readUint16BE(packet.udpHeaderRaw, 6);

        if (packet.udpLength + 20 !== packet.length) {
            throw new Error("packet length mismatch ip vs udp");
        }

        if (data.length < packet.length) {
            throw new Error("truncated packet payload");
        }

        packet.data = data.slice(28, 20 + packet.udpLength);

        packets.push(packet);
        data = data.slice(packet.length);
    }

    return packets;
};
