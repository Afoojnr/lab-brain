import { describe, expect, it } from 'vitest';

import { isPrivateAddress } from './is-private-address';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fd12:3456::1',
    'fe80::1',
    '::ffff:10.0.0.1',
    '::ffff:127.0.0.1'
  ])('refuses %s', address => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '93.184.216.34',
    '172.15.0.1',
    '172.32.0.1',
    '2606:4700::1111'
  ])('allows the public address %s', address => {
    expect(isPrivateAddress(address)).toBe(false);
  });

  it('refuses anything that is not an IP address, so nothing unknown gets through', () => {
    expect(isPrivateAddress('localhost')).toBe(true);
    expect(isPrivateAddress('')).toBe(true);
    expect(isPrivateAddress('10.0.0')).toBe(true);
  });
});
