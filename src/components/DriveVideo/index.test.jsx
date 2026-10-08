import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ACTION_MEDIA_TIME, ACTION_MEDIA_DETACH, ACTION_PAUSE, ACTION_BUFFER_VIDEO } from '../../actions/types';
import { readMediaClock } from '../../timeline/mediaClock';
import { DriveVideo } from './index';

vi.mock('../../store', () => ({ default: { getState: vi.fn() } }));

const fake = vi.hoisted(() => ({ props: null, video: null, hls: null, seek: vi.fn() }));
vi.mock('react-player/file', async () => {
  const ReactModule = await import('react');
  return { default: ReactModule.forwardRef((props, ref) => {
    fake.props = props;
    ReactModule.useImperativeHandle(ref, () => ({
      getInternalPlayer: (name) => name === 'hls' ? fake.hls : fake.video,
      seekTo: fake.seek,
    }));
    return <div data-testid="player" />;
  }) };
});
vi.mock('../../api/backend', () => ({ api: { video: { getQcameraStreamUrl: (name) => `https://example.com/${name}.m3u8` } } }));
const route = { fullname: 'device|route', videoStartOffset: 1000 };
const defaults = { currentRoute: route, desiredPlaySpeed: 1, offset: 1000, seekRevision: 0,
  isBufferingVideo: false, dispatch: vi.fn(), isMuted: true };
beforeEach(() => {
  vi.clearAllMocks();
  fake.hls = null;
  fake.video = document.createElement('video');
  Object.defineProperties(fake.video, {
    readyState: { configurable: true, value: 4 }, paused: { configurable: true, value: false },
    seeking: { configurable: true, value: false },
  });
  fake.video.play = vi.fn().mockResolvedValue(undefined);
});
function ready() { act(() => fake.props.onReady()); }
it('reads the actual media clock and dispatches native time observations', () => {
  render(<DriveVideo {...defaults} />); ready();
  fake.video.currentTime = 4;
  expect(readMediaClock(route.fullname)).toBe(5000);
  act(() => fake.video.dispatchEvent(new Event('timeupdate')));
  expect(defaults.dispatch).toHaveBeenCalledWith({ type: ACTION_MEDIA_TIME, route: route.fullname, offset: 5000, buffering: false });
});
it('does not seek back to stale Redux offsets during normal playback', () => {
  const view = render(<DriveVideo {...defaults} />); ready(); fake.seek.mockClear();
  view.rerender(<DriveVideo {...defaults} offset={9000} />);
  expect(fake.seek).not.toHaveBeenCalled();
});
it('applies an explicit seek immediately without polling or rate nudges', () => {
  const view = render(<DriveVideo {...defaults} />); ready(); fake.seek.mockClear();
  view.rerender(<DriveVideo {...defaults} offset={6000} seekRevision={1} />);
  expect(fake.seek).toHaveBeenCalledWith(5, 'seconds');
  expect(fake.props.playbackRate).toBe(1);
});
it('cleans listeners and clock ownership on unmount', () => {
  const view = render(<DriveVideo {...defaults} />); ready(); view.unmount();
  expect(readMediaClock(route.fullname)).toBeNull();
  expect(defaults.dispatch).toHaveBeenCalledWith({ type: ACTION_MEDIA_DETACH, route: route.fullname });
  defaults.dispatch.mockClear();
  fake.video.dispatchEvent(new Event('timeupdate'));
  expect(defaults.dispatch).not.toHaveBeenCalled();
});
it('does not display recoverable HLS errors as terminal failures', () => {
  render(<DriveVideo {...defaults} />); ready();
  act(() => fake.props.onError('hlsError', { fatal: false, type: 'networkError' }));
  expect(screen.queryByText('Retry')).not.toBeInTheDocument();
});
it('shows a retry action for fatal errors and remounts the player', () => {
  render(<DriveVideo {...defaults} />); ready();
  act(() => fake.props.onError('hlsError', { fatal: true, response: { code: 404 } }));
  expect(screen.getByText('This video segment has not uploaded yet or has been deleted.')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Retry'));
  expect(screen.queryByText('Retry')).not.toBeInTheDocument();
});
it('handles blocked autoplay and starts playback directly inside the retry click', () => {
  render(<DriveVideo {...defaults} />); ready();
  act(() => fake.props.onError({ name: 'NotAllowedError' }));
  expect(defaults.dispatch).toHaveBeenCalledWith({ type: ACTION_PAUSE });
  fireEvent.click(screen.getByText('Retry'));
  expect(fake.video.play).toHaveBeenCalledOnce();
});

it('does not seek again when canplay fires repeatedly for the same video', () => {
  render(<DriveVideo {...defaults} />); ready(); fake.seek.mockClear(); ready();
  expect(fake.seek).not.toHaveBeenCalled();
});
it('loops at the actual media boundary, including a zero-start loop', () => {
  const ref = React.createRef();
  render(<DriveVideo {...defaults} ref={ref} loop={{ startTime: 0, duration: 10000 }} />);
  ready(); fake.seek.mockClear(); fake.video.currentTime = 10;
  act(() => ref.current.checkLoop());
  expect(fake.seek).toHaveBeenCalledWith(0, 'seconds');
});
it('observes seeking without changing the desired playback speed', () => {
  render(<DriveVideo {...defaults} desiredPlaySpeed={2} />); ready(); defaults.dispatch.mockClear();
  act(() => fake.video.dispatchEvent(new Event('seeking')));
  expect(defaults.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: ACTION_MEDIA_TIME, buffering: true }));
  expect(fake.props.playbackRate).toBe(2);
});

it('freezes the fallback clock after an attached video fails without losing play intent', () => {
  render(<DriveVideo {...defaults} desiredPlaySpeed={2} />); ready();
  defaults.dispatch.mockClear();
  act(() => fake.props.onError('hlsError', { fatal: true, type: 'networkError' }));
  const actions = defaults.dispatch.mock.calls.map(([action]) => action);
  expect(actions.findIndex(action => action.type === ACTION_BUFFER_VIDEO && action.buffering))
    .toBeGreaterThan(actions.findIndex(action => action.type === ACTION_MEDIA_DETACH));
  expect(actions.some(action => action.type === ACTION_PAUSE)).toBe(false);
  fireEvent.click(screen.getByText('Retry'));
  expect(fake.props.playbackRate).toBe(2);
});

it('releases the old media clock when credentials change for the same route', () => {
  const view = render(<DriveVideo {...defaults} />); ready();
  view.rerender(<DriveVideo {...defaults} currentRoute={{ ...route, share_sig: 'replacement' }} />);
  expect(readMediaClock(route.fullname)).toBeNull();
  expect(defaults.dispatch).toHaveBeenCalledWith({ type: ACTION_BUFFER_VIDEO, buffering: true });
  defaults.dispatch.mockClear();
  fake.video.dispatchEvent(new Event('timeupdate'));
  expect(defaults.dispatch).not.toHaveBeenCalled();
});

it('clears blocked-autoplay recovery state when changing routes', () => {
  const ref = React.createRef();
  const view = render(<DriveVideo {...defaults} ref={ref} />); ready();
  act(() => fake.props.onError({ name: 'NotAllowedError' }));
  expect(ref.current.state.autoplayBlocked).toBe(true);
  view.rerender(<DriveVideo {...defaults} ref={ref} currentRoute={{ ...route, fullname: 'another|route' }} />);
  expect(ref.current.state.autoplayBlocked).toBe(false);
  expect(ref.current.state.videoError).toBeNull();
});

it('detects HLS audio metadata discovered before onReady and releases its listener', () => {
  fake.hls = { audioTracks: [], levels: [{ audioCodec: 'mp4a.40.2' }], on: vi.fn(), off: vi.fn() };
  const onAudioStatusChange = vi.fn();
  const view = render(<DriveVideo {...defaults} onAudioStatusChange={onAudioStatusChange} />); ready();
  expect(onAudioStatusChange).toHaveBeenLastCalledWith(true);
  const [event, listener] = fake.hls.on.mock.calls[0];
  view.unmount();
  expect(fake.hls.off).toHaveBeenCalledWith(event, listener);
  expect(onAudioStatusChange).toHaveBeenLastCalledWith(false);
});
it('does not report audio for a video-only HLS stream', () => {
  fake.hls = { audioTracks: [], levels: [{ videoCodec: 'avc1.42e01e' }], on: vi.fn(), off: vi.fn() };
  const onAudioStatusChange = vi.fn();
  render(<DriveVideo {...defaults} onAudioStatusChange={onAudioStatusChange} />); ready();
  expect(onAudioStatusChange).toHaveBeenLastCalledWith(false);
});
