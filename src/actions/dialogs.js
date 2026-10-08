import { push } from 'connected-react-router';
import { dialogForLocation, dialogLocation } from '../url';

export const openDialog = (dialog) => (dispatch, getState) => {
  const location = getState().router.location;
  const target = dialogLocation(location, dialog);
  if (dialogForLocation(target) === dialog && dialogForLocation(location) !== dialog) dispatch(push(target));
};

export const closeDialog = (dialog) => (dispatch, getState) => {
  const location = getState().router.location;
  // A stale close callback must not overwrite a newer page or another dialog.
  if (dialogForLocation(location) === dialog) dispatch(push(dialogLocation(location, null)));
};
