export const MUTE_STATE_EVENT = 'mute_state_change';

let globalMuted = true;

export const setGlobalMuted = (muted: boolean) => {
  globalMuted = muted;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MUTE_STATE_EVENT, { detail: muted }));
  }
};

export const getGlobalMuted = () => globalMuted;
