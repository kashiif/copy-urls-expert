/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['openAllUrls'];

Components.utils.import('resource://copy-urls-expert/chrome-utils.jsm');
Components.utils.import('resource://copy-urls-expert/common.jsm');

// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Timer.jsm
Components.utils.import("resource://gre/modules/Timer.jsm");

function openAllUrls(urls){

  if (!urls.length) return true;

  var _g = getGBrowser(),
      prefs = getPrefService(),
      urlOpener = null, webNav;

  var aBrowsers = _g.browsers;

  var start = 0;

  var delayStep = prefs.getIntPref('opentabdelaystepinmillisecs');

  if (prefs.getBoolPref('openlinksinwindows')) {

    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                       .getService(Components.interfaces.nsIWindowWatcher);

    urlOpener = function (url) {
      ww.openWindow(null,  /* aParent */
                    url,   /* aUrl */
                    null,  /* aName */
                    null,  /* aFeatures */
                    null); /* aArguments */
    };
  }
  else {
    webNav = aBrowsers[aBrowsers.length - 1].webNavigation;

    if (webNav.currentURI.spec == 'about:blank') {
      // yes it is empty
      _g.loadURI(urls[0]);
      start++;
    }
    urlOpener = function (url) {
      _g.addTab(url);
    };
  }

  for (; start < urls.length; start++) {
    setTimeout(urlOpener, delayStep * start, urls[start]);
  }

  return true;
}