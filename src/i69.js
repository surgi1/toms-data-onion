const regs = {
    // 8-bit
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    f: 0,
    // 32-bit
    la: 0,
    lb: 0,
    lc: 0,
    ld: 0,
    ptr: 0,
    pc: 0,
}

let memory = []; // bytecode
let output = [];

const init = () => {
    Object.keys(regs).forEach(k => regs[k] = 0);
    memory = [];
    output = [];
}

const getReg8 = n => {
    switch (n) {
        case 1: return regs.a;
        case 2: return regs.b;
        case 3: return regs.c;
        case 4: return regs.d;
        case 5: return regs.e;
        case 6: return regs.f;
        case 7: return memory[regs.ptr + regs.c];
    }
}

const setReg8 = (n, v) => {
    switch (n) {
        case 1: regs.a = v % 256; break;
        case 2: regs.b = v % 256; break;
        case 3: regs.c = v % 256; break;
        case 4: regs.d = v % 256; break;
        case 5: regs.e = v % 256; break;
        case 6: regs.f = v % 256; break;
        case 7: memory[regs.ptr + regs.c] = v % 256; break;
    }
}

const getReg32 = n => {
    switch (n) {
        case 1: return regs.la;
        case 2: return regs.lb;
        case 3: return regs.lc;
        case 4: return regs.ld;
        case 5: return regs.ptr;
        case 6: return regs.pc;
    }
}

const setReg32 = (n, v) => {
    switch (n) {
        case 1: regs.la = v; break;
        case 2: regs.lb = v; break;
        case 3: regs.lc = v; break;
        case 4: regs.ld = v; break;
        case 5: regs.ptr = v; break;
        case 6: regs.pc = v; break;
    }
}

const memToInt32 = (ptr) => Number('0x'+toHex(memory.slice(ptr, ptr+4).reverse()));

export const run = data => {
    init();
    memory = Array.isArray(data) ? data.slice() : data.split('').map(v => v.charCodeAt(0) & 0xff);
    let exit = false;
    
    while (!exit) {
        let opcode = memory[regs.pc];
        let opc = regs.pc;

        switch (opcode) {
            case 0xC2: regs.pc += 1; regs.a = (regs.a + regs.b) % 256;    break;  // ADD a <- b
            case 0xE1: regs.pc += 2; regs.ptr = regs.ptr + memory[opc+1]; break;  // APTR imm8
            case 0xC1: regs.pc += 1; regs.f = regs.a === regs.b ? 0 : 1;  break;  // CMP
            case 0x01: regs.pc += 1; exit = true; break;                          // HALT
            case 0x21: regs.pc += 5; if (regs.f === 0) regs.pc = memToInt32(opc+1); break; // JEZ imm32
            case 0x22: regs.pc += 5; if (regs.f !== 0) regs.pc = memToInt32(opc+1); break; // JNZ imm32
            case 0x02: regs.pc += 1; output.push(regs.a); break;                  // OUT a
            case 0xC3: regs.pc += 1; regs.a = regs.a - regs.b; while (regs.a < 0) regs.a += 256; break; // SUB a <- b
            case 0xC4: regs.pc += 1; regs.a = regs.a ^ regs.b; break;             // XOR a <- b

            default:
                let tmp = opcode.toString(2).padStart(8, '0').split('');
                let [code, dest, src] = [tmp.slice(0, 2), tmp.slice(2, 5), tmp.slice(5)].map(arr => Number('0b' + arr.join('')));

                if (code == 1) {
                    if (src === 0) {
                        regs.pc += 2;
                        setReg8(dest, memory[opc+1]); // MVI {dest} <- imm8
                    } else {
                        regs.pc += 1;
                        setReg8(dest, getReg8(src));  // MV {dest} <- {src}
                    }
                } else if (code === 2) {
                    if (src === 0) {
                        regs.pc += 5;
                        setReg32(dest, memToInt32(opc+1)); // MVI32 {dest} <- imm32
                    } else {
                        regs.pc += 1;
                        setReg32(dest, getReg32(src));  // MV32 {dest} <- {src}
                    }
                } else {
                    console.log('encountered unknown opcode, halting', opcode); exit = true;
                }
        }
    }

    return output.map(n => String.fromCharCode(n)).join('');
};
