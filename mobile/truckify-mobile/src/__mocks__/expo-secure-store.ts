const store: Record<string, string> = {};

export const getItemAsync = async (key: string): Promise<string | null> => {
  return store[key] || null;
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  store[key] = value;
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  delete store[key];
};
