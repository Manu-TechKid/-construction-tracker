export const loadFilters = (key, defaults) => {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    return { ...defaults, ...parsed };
  } catch (err) {
    console.warn('Failed to load saved filters', key, err);
    return defaults;
  }
};

export const saveFilters = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to save filters', key, err);
  }
};
