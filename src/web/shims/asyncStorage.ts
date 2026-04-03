const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch {}
  },
};
export default AsyncStorage;
