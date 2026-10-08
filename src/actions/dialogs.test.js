import { vi } from 'vitest';
import { openDialog, closeDialog } from './dialogs';
const id = '0000aaaa0000aaaa';
const route = '00000000--0000000003';
function run(action, search = '', pathname = `/${id}/${route}`) {
  const dispatch = vi.fn();
  action(dispatch, () => ({ router: { location: { pathname, search, hash: '#drive' } } }));
  return dispatch;
}
it('opens a dialog using the current route and preserves sharing arguments', () => {
  const dispatch = run(openDialog('files'), '?share_sig=test');
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: {
    method: 'push', args: [{ pathname: `/${id}/${route}`, search: '?share_sig=test&dialog=files', hash: '#drive' }],
  } }));
});
it('does not add duplicate history entries for an already open dialog', () => {
  expect(run(openDialog('files'), '?dialog=files')).not.toHaveBeenCalled();
});
it('does not open a drive dialog on the dashboard', () => {
  expect(run(openDialog('files'), '', `/${id}`)).not.toHaveBeenCalled();
});
it('ignores unsupported dialog names', () => {
  expect(run(openDialog('unknown'))).not.toHaveBeenCalled();
});
it('closes only the currently active dialog without changing the route', () => {
  const dispatch = run(closeDialog('files'), '?dialog=files&share_sig=test');
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: {
    method: 'push', args: [{ pathname: `/${id}/${route}`, search: '?share_sig=test', hash: '#drive' }],
  } }));
});
it('ignores stale close callbacks after another dialog opens', () => {
  expect(run(closeDialog('files'), '?dialog=uploads')).not.toHaveBeenCalled();
});
it('ignores stale close callbacks after route context changes', () => {
  expect(run(closeDialog('files'), '?dialog=files', `/${id}/prime`)).not.toHaveBeenCalled();
});
