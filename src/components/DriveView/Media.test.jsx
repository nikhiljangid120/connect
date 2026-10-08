import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Media } from './Media';
vi.mock('../../store', () => ({ default: { getState: vi.fn(() => ({ offset: 0, startTime: Date.now(), desiredPlaySpeed: 0, isBufferingVideo: false })) } }));
vi.mock('./ClipMenu', () => ({ default: ({ open, onClose }) => open ? <button onClick={onClose}>Clip dialog</button> : null }));
vi.mock('../Files/UploadQueue', () => ({ default: ({ open, onClose }) => open ? <button onClick={onClose}>Upload dialog</button> : null }));
const id = 'deadbeefdeadbeef';
const path = `/${id}/00000000--0000000003`;
const props = { location: { pathname: path, search: '' }, device: { dongle_id: id, shared: true },
  currentRoute: { fullname: `${id}|00000000--0000000003` }, classes: {}, dispatch: vi.fn(), files: null };
function instance(dialog) {
  return new Media({ ...props, location: { pathname: path, search: `?dialog=${dialog}` } });
}
it.each(['clips', 'uploads'])('opens %s from a cold URL without a clicked anchor', (dialog) => {
  const media = instance(dialog);
  render(media.renderMenus());
  expect(screen.getByText(dialog === 'clips' ? 'Clip dialog' : 'Upload dialog')).toBeInTheDocument();
});
it('closes uploads through URL navigation, not local visibility state', () => {
  const media = instance('uploads');
  render(media.renderMenus());
  fireEvent.click(screen.getByText('Upload dialog'));
  expect(props.dispatch).toHaveBeenCalledWith(expect.any(Function));
  expect(media.state).not.toHaveProperty('uploadModal');
});
it('derives files and info menus from the URL', () => {
  for (const [dialog, menuId] of [['files', 'menu-download'], ['info', 'menu-info']]) {
    const children = React.Children.toArray(instance(dialog).renderMenus().props.children);
    const target = children.find(child => child.props.id === menuId);
    expect(target.props.open).toBe(true);
  }
});
it('does not retain a dialog on a different page', () => {
  const media = new Media({ ...props, location: { pathname: `/${id}`, search: '?dialog=uploads' } });
  render(media.renderMenus());
  expect(screen.queryByText('Upload dialog')).not.toBeInTheDocument();
});
