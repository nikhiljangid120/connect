import { vi } from 'vitest';
vi.mock('../store', () => ({ default: { getState: vi.fn() } }));
import { reducer, seek } from './playback';
import { currentOffset } from '.';
import { ACTION_MEDIA_TIME, ACTION_MEDIA_DETACH } from '../actions/types';
const route = 'device|route';
const initial = { currentRoute: { fullname: route }, offset: 0, startTime: Date.now() - 10000,
  desiredPlaySpeed: 1, isBufferingVideo: false };
it('uses reported media time rather than advancing a separate clock', () => {
  const state = reducer(initial, { type: ACTION_MEDIA_TIME, route, offset: 2500, buffering: false });
  expect(currentOffset(state)).toBe(2500);
  expect(state.mediaDriven).toBe(true);
});
it('ignores callbacks from a stale route', () => {
  const state = reducer(initial, { type: ACTION_MEDIA_TIME, route: 'old', offset: 12345 });
  expect(state.offset).toBe(0);
});
it('records each explicit seek separately, including identical seek targets', () => {
  let state = reducer(initial, seek(1000));
  state = reducer(state, seek(1000));
  expect(state.seekRevision).toBe(2);
});
it('releases media ownership for map-only/error fallback', () => {
  let state = reducer(initial, { type: ACTION_MEDIA_TIME, route, offset: 2500, buffering: false });
  state = reducer(state, { type: ACTION_MEDIA_DETACH, route });
  expect(state.mediaDriven).toBe(false);
  expect(state.offset).toBe(2500);
});
