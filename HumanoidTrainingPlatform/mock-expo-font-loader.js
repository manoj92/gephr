// Mock ExpoFontLoader module to prevent import errors
const mockExpoFontLoader = {
  default: {
    getLoadedFonts: () => [],
    loadAsync: () => Promise.resolve(),
    isLoaded: () => true,
    isLoading: () => false
  },
  getLoadedFonts: () => [],
  loadAsync: () => Promise.resolve(),
  isLoaded: () => true,
  isLoading: () => false
};

module.exports = mockExpoFontLoader;
module.exports.default = mockExpoFontLoader;