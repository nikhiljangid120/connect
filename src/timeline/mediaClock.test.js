import { attachMediaClock, readMediaClock } from './mediaClock';

describe('media clock ownership', () => {
  it('reads real media time without wall-clock extrapolation', () => {
    let time = 1000;
    const detach = attachMediaClock('route', () => time);
    expect(readMediaClock('route')).toBe(1000);
    time = 5200;
    expect(readMediaClock('route')).toBe(5200);
    expect(readMediaClock('other')).toBeNull();
    detach();
    expect(readMediaClock('route')).toBeNull();
  });
  it('does not let an old player detach the replacement clock', () => {
    const old = attachMediaClock('route', () => 1000);
    const latest = attachMediaClock('route', () => 2000);
    old();
    expect(readMediaClock('route')).toBe(2000);
    latest();
  });
  it('rejects invalid media times', () => {
    const detach = attachMediaClock('route', () => NaN);
    expect(readMediaClock('route')).toBeNull();
    detach();
  });
});
