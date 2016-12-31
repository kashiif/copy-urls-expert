/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['LINE_FEED', 'SORT_BY_TAB_ORDER', 'SORT_BY_DOMAIN', 'SORT_BY_TITLE', 'getPrefService',
  'getCustomShortcuts', 'readTemplatesFile', 'convertStringToModel', 'createTransferable'];

var Cc=Components.classes;
var Ci=Components.interfaces;

Components.utils.import('resource://copy-urls-expert/cue-classes.jsm');

var LINE_FEED = null;
var SORT_BY_TAB_ORDER = 'default';
var SORT_BY_DOMAIN = 'domain';
var SORT_BY_TITLE = 'title';

function getPrefService() {
  var prefService = null;
  try {
    prefService = gPrefService;
  }
  catch (err) {
    // gPrefService not available in SeaMonkey
    prefService = Cc['@mozilla.org/preferences-service;1']
        .getService(Ci.nsIPrefService);
  }

  prefService = prefService.getBranch('extensions.copyurlsexpert.');
  return prefService;
}

/**
 * Returns a Map of shortcut keys. Map key is action id, value is a json object
 */
function getCustomShortcuts() {
  let shortcutStr = getPrefService().getCharPref('shortcuts'),
      shortcutMap = {};

  if (shortcutStr) {
    Components.utils.import('resource://copy-urls-expert/keyboardshortcut.jsm');

    // convert pref string to JSON
    let allShortcuts = JSON.parse(shortcutStr);

    // Populate shortcutMap object
    for (let commandId in allShortcuts) {
      let shortcutJson = allShortcuts[commandId];
      shortcutMap[commandId] = KeyboardShortcut.fromPOJO(shortcutJson);
    }
  }

  return shortcutMap;
}


/*
 Fills the 'templates' by parsing the contents of 'data'
 @param: data - Contents of file.
 @param: templates - target array object that would be populated.
 @returns: int representing the index of default pattern. -1 in case of parsing fails
 */
function convertStringToModel(data, templates) {
  var lines = data.split(LINE_FEED);

  var defPatternIndex = -1, defId = -1;

  if (lines.length < 2) {
    return -1;
  }

  try {
    defId = parseInt(lines[0]);
  }
  catch (ex) {
    // Simply ignore the bad line
  }

  for (let i = 1, j = 0; i < lines.length; i++) {
    var pattern = null;
    try {
      pattern = _FormatPattern.parseString(lines[i]);
    }
    catch (ex) {
      // Simply ignore the bad line
      continue;
    }
    templates.push(pattern);

    if (pattern.id == defId) {
      defPatternIndex = j;
    }
    j++;
  }

  if (templates.length == 0) {
    return -1;
  }

  if (defPatternIndex < 0) {
    defPatternIndex = 0;
  }

  return defPatternIndex;

}

function readTemplatesFile(callback) {
  var prefService = getPrefService();
  var templatesPrefName = 'urltemplatesfile';
  var file = null;

  var result = {
    errorStatus: null,
    templates: null,
    defaultTemplateId: -1
  };

  if (prefService.prefHasUserValue(templatesPrefName)) {
    var v = prefService.getComplexValue(templatesPrefName, Ci.nsIRelativeFilePref);
    file = v.file;

    if (file.exists()) {
      var fetchHandler = new _AsynHandler(file, prefService);

      Components.utils.import('resource://gre/modules/NetUtil.jsm');

      NetUtil.asyncFetch(file, function (inputStream, status) {

        if (!Components.isSuccessCode(status)) {
          // Handle error!

          result.errorStatus = status;

          callback(result);

          return;
        }

        var data = fetchHandler.read(inputStream, status),
            index;

        if (data == null) {
          result.errorStatus = 'There was an error reading templates file.'
        }
        else {
          result.templates = [];
          index = convertStringToModel(data, result.templates);
          result.defaultTemplateId = result.templates[index].id;
        }

        callback(result);

      });

      return;
    }
  }

  callback(result);

}

function createTransferable(source) {
  var trans = Cc['@mozilla.org/widget/transferable;1'].createInstance(Ci.nsITransferable);
  if (!trans) return null;

  // Ref: https://developer.mozilla.org/en-US/docs/Using_the_Clipboard
  if ('init' in trans) {
    // When passed a Window object, find a suitable provacy context for it.
    if (source instanceof Ci.nsIDOMWindow) {
      // Note: in Gecko versions >16, you can import the PrivateBrowsingUtils.jsm module
      // and use PrivateBrowsingUtils.privacyContextFromWindow(sourceWindow) instead
      source = source.QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIWebNavigation);
    }

    trans.init(source);
  }

  trans.addDataFlavor('text/unicode');

  return trans;
}

function _setupLineFeedChar() {
  if (LINE_FEED) {
    return;
  }

  var platformStr = Cc['@mozilla.org/network/protocol;1?name=http']
                              .getService(Ci.nsIHttpProtocolHandler)
                              .oscpu.toLowerCase();

  if (platformStr.indexOf('win') != -1) {
    LINE_FEED = '\r\n';
  }
  else if (platformStr.indexOf('mac') != -1) {
    LINE_FEED = '\r';
  }
  else if (platformStr.indexOf('unix') != -1
      || platformStr.indexOf('linux') != -1
      || platformStr.indexOf('sun') != -1) {
    LINE_FEED = '\n';
  }
}

_setupLineFeedChar();