/**
 * @format
 */

import { LogBox, AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

LogBox.ignoreAllLogs(true);

// Global error handler — hatayı logla
var _eu = globalThis.ErrorUtils;
if (_eu && _eu.getGlobalHandler) {
  var _dh = _eu.getGlobalHandler();
  _eu.setGlobalHandler(function(error, isFatal) {
    console.error('[GLOBAL_ERROR]', isFatal ? 'FATAL' : 'NON-FATAL', error && error.message, error && error.stack && error.stack.slice(0, 500));
    if (_dh) _dh(error, isFatal);
  });
}

AppRegistry.registerComponent(appName, () => App);
