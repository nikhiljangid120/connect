import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { UrlSettings } from './UrlSettings';
vi.mock('./DeviceSettingsModal', () => ({ default: ({ dongleId, onClose }) => <button onClick={onClose}>Settings {dongleId}</button> }));
const id = '0000aaaa0000aaaa';
it('opens settings directly from a cold URL without a drawer', () => {
  const dispatch = vi.fn();
  dispatch.mockImplementation((action) => {
    if (typeof action === 'function') action(dispatch, () => ({ router: { location: { pathname: `/${id}`, search: `?settings=${id}`, hash: '' } } }));
  });
  render(<UrlSettings location={{ pathname: `/${id}`, search: `?settings=${id}`, hash: '' }}
    devices={[{ dongle_id: id, is_owner: true }]} dispatch={dispatch} />);
  fireEvent.click(screen.getByText(`Settings ${id}`));
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ method: 'push', args: [{ pathname: `/${id}`, search: '', hash: '' }] }) }));
});
it('does not expose settings for another user’s device', () => {
  const { container } = render(<UrlSettings location={{ search: `?settings=${id}` }} devices={[{ dongle_id: id, is_owner: false }]} />);
  expect(container).toBeEmptyDOMElement();
});


it('does not restore an old page after settings navigate to Prime', () => {
  const dispatch = vi.fn();
  dispatch.mockImplementation((action) => {
    if (typeof action === 'function') action(dispatch, () => ({ router: { location: { pathname: `/${id}/prime`, search: '', hash: '' } } }));
  });
  render(<UrlSettings location={{ pathname: `/${id}`, search: `?settings=${id}`, hash: '' }}
    devices={[{ dongle_id: id, is_owner: true }]} dispatch={dispatch} />);
  fireEvent.click(screen.getByText(`Settings ${id}`));
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(dispatch.mock.calls[0][0]).toBeTypeOf('function');
});
