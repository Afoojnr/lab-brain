import { isIP } from 'node:net';

const ipv4Parts = (address: string) => address.split('.').map(Number);

const isPrivateIpv4 = (address: string): boolean => {
  const [a, b] = ipv4Parts(address);

  return (
    a === 0 || // "this" network
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, including cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0) || // reserved and documentation
    a >= 224 // multicast and reserved
  );
};

/**
 * Whether an IP address points inside a private network, to the computer
 * itself, or to a reserved range. A link to such an address is never fetched,
 * so a pasted link cannot make the server read its own network (for example a
 * cloud metadata service or a router page). Anything that is not an IP address
 * counts as private, so nothing unknown gets through.
 *
 * @param address - An IPv4 or IPv6 address.
 */
export const isPrivateAddress = (address: string): boolean => {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version !== 6) return true;

  const lower = address.toLowerCase();
  // An IPv4 address written inside IPv6 (::ffff:10.0.0.1) is judged as IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isPrivateIpv4(mapped[1]);

  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') || // unique local fc00::/7
    lower.startsWith('fd') ||
    /^fe[89ab]/.test(lower) || // link-local fe80::/10
    lower.startsWith('ff') // multicast
  );
};
