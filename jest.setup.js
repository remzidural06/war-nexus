const mockStorage = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
  default: {
    setItem: jest.fn(async (key, value) => {
      mockStorage.set(key, value);
    }),
    getItem: jest.fn(async key => (mockStorage.has(key) ? mockStorage.get(key) : null)),
    removeItem: jest.fn(async key => {
      mockStorage.delete(key);
    }),
    clear: jest.fn(async () => {
      mockStorage.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(mockStorage.keys())),
    multiGet: jest.fn(async keys =>
      keys.map(key => [key, mockStorage.has(key) ? mockStorage.get(key) : null])),
    multiSet: jest.fn(async entries => {
      entries.forEach(([key, value]) => {
        mockStorage.set(key, value);
      });
    }),
    multiRemove: jest.fn(async keys => {
      keys.forEach(key => {
        mockStorage.delete(key);
      });
    }),
  },
}));
