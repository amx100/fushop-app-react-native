// Custom Metro transformer to handle import.meta syntax
const { transform } = require('@expo/metro-config/babel-transformer');
const path = require('path');

module.exports.transform = function({ src, filename, options }) {
  let transformedSrc = src;
  
  // Don't transform our own polyfill files or mock files
  const isOurFile = filename && (
    filename.includes('polyfills.js') ||
    filename.includes('ws-mock.js') ||
    filename.includes('metro-transformer.js')
  );
  
  // Only transform import.meta in external dependencies, not our own files
  if (!isOurFile && transformedSrc.includes('import.meta')) {
    // Replace various import.meta patterns
    transformedSrc = transformedSrc
      .replace(/import\.meta\.url/g, '"file://react-native-bundle"')
      .replace(/import\.meta\.env/g, '(global.process?.env || {})')
      .replace(/import\.meta\.resolve\(/g, '(function(specifier) { return specifier; })(')
      .replace(/import\.meta\.hot/g, 'undefined')
      .replace(/import\.meta\.glob\(/g, '(function() { return {}; })(')
      .replace(/import\.meta/g, '(global.import?.meta || { url: "file://react-native-bundle", env: (global.process?.env || {}), resolve: function(s) { return s; }, hot: undefined, glob: function() { return {}; } })');
  }

  // Call the default Expo transformer with the modified source
  return transform({ src: transformedSrc, filename, options });
};
