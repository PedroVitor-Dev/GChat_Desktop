/**
 * Enquadramento do Chrome/Edge Native Messaging: cada mensagem é um JSON UTF-8
 * precedido por 4 bytes com o tamanho (ordem nativa; little-endian no Windows x64).
 * Usamos o mesmo formato no named pipe entre native-host e app para ter um só codec.
 */

/** Limite documentado para mensagens host → navegador. */
export const MAX_MESSAGE_BYTES = 1024 * 1024;

export function encodeFrame(message: unknown): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(message));
  if (json.byteLength > MAX_MESSAGE_BYTES) {
    throw new RangeError(`mensagem excede ${MAX_MESSAGE_BYTES} bytes`);
  }
  const frame = new Uint8Array(4 + json.byteLength);
  new DataView(frame.buffer).setUint32(0, json.byteLength, true);
  frame.set(json, 4);
  return frame;
}

/**
 * Decodificador incremental: recebe pedaços arbitrários do stream e emite as
 * mensagens completas. Lança erro em frame grande demais ou JSON inválido, e quem
 * chama deve encerrar a conexão nesse caso.
 */
export class FrameDecoder {
  private buffer = new Uint8Array(0);
  private readonly decoder = new TextDecoder('utf-8', { fatal: true });

  push(chunk: Uint8Array): unknown[] {
    const merged = new Uint8Array(this.buffer.byteLength + chunk.byteLength);
    merged.set(this.buffer, 0);
    merged.set(chunk, this.buffer.byteLength);
    this.buffer = merged;

    const out: unknown[] = [];
    while (this.buffer.byteLength >= 4) {
      const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, 4);
      const length = view.getUint32(0, true);
      if (length > MAX_MESSAGE_BYTES) {
        throw new RangeError(`frame de ${length} bytes excede o limite`);
      }
      if (this.buffer.byteLength < 4 + length) break;
      const payload = this.buffer.subarray(4, 4 + length);
      out.push(JSON.parse(this.decoder.decode(payload)));
      this.buffer = this.buffer.slice(4 + length);
    }
    return out;
  }
}
