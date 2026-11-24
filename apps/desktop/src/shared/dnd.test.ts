import { describe, expect, it } from 'vitest';
import { describeDnd, dndUntil, resolveDnd } from './dnd';

const at = (h: number, m = 0) => new Date(2026, 10, 23, h, m, 0, 0);

describe('dndUntil', () => {
  it('soma o tempo escolhido', () => {
    expect(dndUntil('30m', at(14))).toBe(at(14, 30).getTime());
    expect(dndUntil('1h', at(14))).toBe(at(15).getTime());
    expect(dndUntil('8h', at(14))).toBe(at(22).getTime());
    expect(dndUntil('forever', at(14))).toBeNull();
  });

  it('"até amanhã" termina às 8:00 da próxima manhã', () => {
    expect(dndUntil('tomorrow', at(14))).toBe(new Date(2026, 10, 24, 8).getTime());
    expect(dndUntil('tomorrow', at(23, 50))).toBe(new Date(2026, 10, 24, 8).getTime());
    // De madrugada, "amanhã" é a manhã de hoje.
    expect(dndUntil('tomorrow', at(2))).toBe(at(8).getTime());
  });
});

describe('resolveDnd', () => {
  const now = at(14).getTime();
  it('pausa com prazo, sem prazo e expirada', () => {
    expect(resolveDnd({ enabled: true, pausedUntil: null }, now).active).toBe(false);
    expect(resolveDnd({ enabled: true, pausedUntil: at(15).getTime() }, now)).toEqual({
      active: true,
      until: at(15).getTime(),
    });
    expect(resolveDnd({ enabled: true, pausedUntil: at(13).getTime() }, now).active).toBe(false);
    expect(resolveDnd({ enabled: false, pausedUntil: null }, now)).toEqual({
      active: true,
      until: null,
    });
  });
});

describe('describeDnd', () => {
  it('descreve até quando', () => {
    expect(describeDnd({ active: true, until: at(14, 30).getTime() }, at(14))).toBe('até 14:30');
    expect(describeDnd({ active: true, until: new Date(2026, 10, 24, 8).getTime() }, at(14))).toBe(
      'até amanhã às 08:00',
    );
    expect(describeDnd({ active: true, until: null }, at(14))).toBe('até eu reativar');
    expect(describeDnd({ active: false, until: null }, at(14))).toBe('');
  });
});
