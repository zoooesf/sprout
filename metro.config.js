const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Metro 0.83 on Windows fails to resolve datetimepicker's TurboModule spec files.
// The app never uses design="material" so these native modules are never called.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './specs/NativeModuleMaterialDatePicker' ||
    moduleName === './specs/NativeModuleMaterialTimePicker'
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'stubs/NativeModuleMaterialStub.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
