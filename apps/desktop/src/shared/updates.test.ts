import { describe, expect, it } from 'vitest';
import { friendlyUpdateError } from './updates';

describe('friendlyUpdateError', () => {
  it('explica os casos comuns sem detalhes técnicos', () => {
    expect(
      friendlyUpdateError(
        'Cannot find latest.yml in the latest release artifacts (HttpError: 404)',
      ),
    ).toMatch(/Ainda não há/);
    expect(friendlyUpdateError('net::ERR_INTERNET_DISCONNECTED')).toMatch(/Sem conexão/);
    expect(friendlyUpdateError('sha512 checksum mismatch')).toMatch(/corrompido/);
    expect(friendlyUpdateError('algo estranho')).toMatch(/Não foi possível/);
  });
});
