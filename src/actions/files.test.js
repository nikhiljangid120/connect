import { vi } from 'vitest';
import { fetchFiles } from './files';
import { api } from '../api/backend';
import { ACTION_FILES_URLS } from './types';
vi.mock('../api', () => ({ athena: {} }));
vi.mock('../api/backend', () => ({ api: { routes: { getRouteFiles: vi.fn() } } }));
vi.mock('.', () => ({ updateDeviceOnline: vi.fn(), fetchDeviceNetworkStatus: vi.fn() }));
const route = 'deadbeefdeadbeef|00000000--0000000003';
async function fetch(files) {
  api.routes.getRouteFiles.mockResolvedValue(files);
  const dispatch = vi.fn();
  await fetchFiles(route)(dispatch);
  return dispatch.mock.calls[0][0];
}
it('indexes public demo assets by segment without requiring a synthetic route in their URLs', async () => {
  const url = 'https://cdn.example.com/actual-device/actual-route/2/qcamera.ts?sig=test';
  expect(await fetch({ qcameras: [url] })).toEqual({ type: ACTION_FILES_URLS, dongleId: 'deadbeefdeadbeef',
    urls: { [`${route}--2/qcameras`]: { url } } });
});
it('preserves segment zero and signed URLs for ordinary route-shaped assets', async () => {
  const url = `https://cdn.example.com/${route.replace('|', '/')}/0/qlog.zst?sig=test`;
  const action = await fetch({ qlogs: [url] });
  expect(action.urls).toEqual({ [`${route}--0/qlogs`]: { url } });
});
it.each(['not a URL', 'https://cdn.example.com/r/not-a-segment/qcamera.ts',
  'https://cdn.example.com/r/-1/qcamera.ts', 'https://cdn.example.com/r/999999999999999999/qcamera.ts'])
('ignores malformed segment URLs without throwing: %s', async (url) => {
  expect((await fetch({ qcameras: [url] })).urls).toEqual({});
});
it.each([null, {}, { qcameras: 'not an array' }])('handles missing or invalid file lists: %j', async (files) => {
  expect((await fetch(files)).urls).toEqual({});
});
