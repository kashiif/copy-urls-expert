/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['getWindowMediator', 'getMostRecentWindow', 'getGBrowser'];

function getWindowMediator() {
  return Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
}

function getMostRecentWindow() {
  return getWindowMediator().getMostRecentWindow('navigator:browser');
}

function getGBrowser() {
  var _g = null;

  let chromeWindow = getMostRecentWindow();

  if (typeof(chromeWindow.gBrowser) == 'undefined') {
    // gBrowser is not available in Seamonkey
    _g = chromeWindow.document.getElementById('content');
  } else {
    _g = chromeWindow.gBrowser;
  }
  return _g;
}