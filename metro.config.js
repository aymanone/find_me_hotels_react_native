const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const fallbackIcon = path.resolve(__dirname, 'shims/fallbackIcon.js');
// Keep Ionicons, MaterialIcons, FontAwesome (v4) and FontAwesome5. Stub the rest.
const UNUSED =
  'AntDesign|Entypo|EvilIcons|Feather|Fontisto|Foundation|MaterialCommunityIcons|Octicons|SimpleLineIcons|Zocial';
// e.g. react-native-vector-icons/Ionicons, @expo/vector-icons/build/Ionicons
const packageRe = new RegExp(
  `^(react-native-vector-icons|@expo/vector-icons)(/(build|dist|lib))?/(${UNUSED})(\\.js)?$`
);
// e.g. "./Ionicons" imported from inside @expo/vector-icons/build/index.js
const relativeRe = new RegExp(`^\\./(${UNUSED})$`);

const originalResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const fromVectorIcons = (context.originModulePath || '').includes('vector-icons');
    if (packageRe.test(moduleName) || (fromVectorIcons && relativeRe.test(moduleName))) {
      return { type: 'sourceFile', filePath: fallbackIcon };
    }
  }
  return originalResolve
    ? originalResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
