const store: Record<string, string> = {};

export const getItem = async (key: string): Promise<string | null> => store[key] || null;
export const setItem = async (key: string, value: string): Promise<void> => { store[key] = value; };
export const removeItem = async (key: string): Promise<void> => { delete store[key]; };
export const clear = async (): Promise<void> => { Object.keys(store).forEach(k => delete store[k]); };
export const getAllKeys = async (): Promise<string[]> => Object.keys(store);
export const multiGet = async (keys: string[]): Promise<[string, string | null][]> => keys.map(k => [k, store[k] || null]);
export const multiSet = async (pairs: [string, string][]): Promise<void> => { pairs.forEach(([k, v]) => { store[k] = v; }); };
export const multiRemove = async (keys: string[]): Promise<void> => { keys.forEach(k => delete store[k]); };

export default { getItem, setItem, removeItem, clear, getAllKeys, multiGet, multiSet, multiRemove };
