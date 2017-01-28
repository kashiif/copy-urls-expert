/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2013-2016 Kashif Iqbal Khan
********************************************/


'use strict';
var copyUrlsExpert;

(function() {

  /**
   * Installs the toolbar button with the given ID into the given
   * toolbar, if it is not already present in the document.
   *
   * Source: https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Toolbar
   *
   * @param {string} toolbarId The ID of the toolbar to install to.
   * @param {string} id The ID of the button to install.
   * @param {string} afterId The ID of the element to insert after. @optional
   */
  function installButton(toolbarId, id, afterId) {
    try {
      if (document.getElementById(id)) {
        return;
      }

      var toolbar = document.getElementById(toolbarId);

      // If no afterId is given, then append the item to the toolbar
      var before = null;
      if (afterId) {
          let elem = document.getElementById(afterId);
          if (elem /* && elem.parentNode == toolbar */) {
              before = elem.nextElementSibling;
          }
      }

      toolbar.insertItem(id, before);
      toolbar.setAttribute('currentset', toolbar.currentSet);
      document.persist(toolbar.id, 'currentset');

      if (toolbarId == 'addon-bar') {
          toolbar.collapsed = false;
      }
    }
    catch(ex) {
      Components.utils.reportError(ex);
    }
  }

  function _isDuplicate(entries, url) {
    url = url.toLowerCase();
    for (var i = 0; i < entries.length; i++) {
      var entryUrl = entries[i];
      if (entryUrl.toLowerCase() == url) {
        return true;
      }
    }
    return false;
  }

  function setupMainRef() {
    copyUrlsExpert = {
      _prefService: null,
      TBB_ACTION_ACTIVE_WIN: 'active-win',
      TBB_ACTION_ACTIVE_TAB: 'active-tab',
      TBB_ACTION_ACTIVE_TABGROUP: 'active-tabgroup',
      TBB_ACTION_ALL_WIN: 'all-win',
      TBB_ACTION_OPEN_TABS: 'open-tabs',
      TBB_ACTION_ADVANCED_COPY: 'advanced-copy',
      TBB_ACTION_SELECTION_LINKS: 'selection-links',
      TBB_ACTION_SELECTION_IMAGES: 'selection-images',

      defaultPattern: null,

      /* Following props are initialized by common.jsm */
      SORT_BY_TAB_ORDER: null,
      SORT_BY_DOMAIN: null,
      SORT_BY_TITLE: null,
      LINE_FEED: null,

      /* documentHandler is initialized by imported document handler module */
      documentHandler: null,

      init: function () {
        const Cu = Components.utils;
        Cu.import('resource://copy-urls-expert/common.jsm', this);

        this._prefService = this.getPrefService();
        this._handleStartup();

        Cu.import('resource://copy-urls-expert/chrome-utils.jsm', this);
        Cu.import('resource://copy-urls-expert/copy-task.jsm', this);
        Cu.import('resource://copy-urls-expert/keyboardshortcut.jsm');
        Cu.import('resource://copy-urls-expert/modifiers.jsm');

        // Use a document handler depending on messageManager feature
        let resourceUrl = 'resource://copy-urls-expert/document-handler-legacy.jsm';
        if (window.messageManager) {
          resourceUrl = 'resource://copy-urls-expert/document-handler-modern.jsm';
        }

        //Components.utils.reportError('document-handler: ' + resourceUrl.substr(resourceUrl.lastIndexOf('/') + 1));
        Cu.import(resourceUrl, this);

        this.documentHandler.init({
          messageManager: window.messageManager,
        });

        try {
          this._updateShortcutsForDocument(document, this.getCustomShortcuts());
        }
        catch (ex) {
          //ignore any exception in new feature and let the init complete
          Cu.reportError(ex);
        }

        Cu.import('resource://copy-urls-expert/cue-classes.jsm', this);

        this.readTemplatesFile(function (result) {

          var target = result.templates;
          var index = result.defaultTemplateId;

          if (target === null) {

            if (result.errorStatus === null) {

              if (!copyUrlsExpert.isFirstRun) {
                alert('Copy Urls Expert: templates list file is missing.\nRestoring to default values.'); // TODO: localize it
              }

              target = [];
              index = copyUrlsExpert._setupDefaultModel(target);

              // attempt to update file
              var defaultContent = '0' + copyUrlsExpert.LINE_FEED + target.join(copyUrlsExpert.LINE_FEED);
              copyUrlsExpert.updateUrlListFile(defaultContent);

            }
            else {
              // Handle error!
              alert('Copy Urls Expert: Error reading templates list file.\n' + result.errorStatus); // TODO: localize it
            }

          }

          copyUrlsExpert._updateFuelAppData(target, index);

        });
      },

      onUnload: function (evt) {
        this.documentHandler.uninit({
          messageManager: window.messageManager
        });
      },

      _handleStartup: function () {
        var oldVersion = '___version___';
        var currVersion = '___version___';

        try {
          oldVersion = this._prefService.getCharPref('version');
        }
        catch (e) {
        }

        if (oldVersion != currVersion) {
          this._prefService.setCharPref('version', currVersion);
        }

        if (oldVersion === '') {
          this.isFirstRun = true;
          // extension is installed for the first time
          installButton('nav-bar', 'copyurlsexpert-toolbar-btnmain', 'urlbar-container');
          // The "addon-bar" is available since Firefox 4
          installButton('addon-bar', 'copyurlsexpert-toolbar-btnmain');
        }
      },

      getUrlEntry: function (title, url) {
        return {
          title: title,
          url: url
        };
      },

      _getEntriesFromTabs: function (aBrowsers, filterHidden, filterDuplicates, filterPinnedTabs) {
        var title = '',
            url = '',
            urls = [],
            entries = [];

        for (var i = 0; i < aBrowsers.length; i++) {
          var tabbrowser = aBrowsers[i].gBrowser;
          var tabHistory = aBrowsers[i].sessionHistory;

          // Check each tab of this tabbrowser instance
          var numTabs = tabbrowser.browsers.length,
              tabContainer = tabbrowser.tabContainer;

          for (var index = 0; index < numTabs; index++) {
            var targetBrwsr = tabbrowser.getBrowserAtIndex(index),
                targetTab = tabContainer.getItemAtIndex(index);

            if (filterHidden && targetTab.hidden) continue;

            if (filterPinnedTabs && targetTab.pinned) continue;

            if (filterDuplicates && _isDuplicate(urls, targetBrwsr.currentURI.spec)) {
              continue;
            }

            var auxTemp = this._getEntryForTab(targetBrwsr, targetTab);
            entries.push(auxTemp);
            urls.push(auxTemp.url);
          }
        }

        return entries;
      },

      _getEntryForTab: function (brwsr, tab) {
        var url = brwsr.currentURI.spec;

        var useContentTitle = this._prefService.getBoolPref("usecontenttitle");

        var title = useContentTitle && brwsr.contentTitle ? brwsr.contentTitle : tab.label;

        var entry = this.getUrlEntry(title, url);
        return entry;
      },

      performCopyActiveTabUrl: function (opts) {
        opts = opts || {};
        opts.contextTab = opts.contextTab || this.getGBrowser().selectedTab;

        this._performCopyOfSingleTabUrl(opts);
      },

      performCopyTabUnderMouseUrl: function (opts) {
        opts = opts || {};

        let _g = this.getGBrowser();
        opts.contextTab = _g.mContextTab || _g.selectedTab;

        this._performCopyOfSingleTabUrl(opts);
      },

      _performCopyOfSingleTabUrl: function (opts) {

        let templateToUse = opts.template || this.defaultPattern;
        let sortBy = opts.sortBy || this._prefService.getCharPref('sortby');

        var entries = [this._getEntryForTab(this.getGBrowser().getBrowserForTab(opts.contextTab), opts.contextTab)];
        this.copyEntriesToClipBoard(entries, sortBy, templateToUse);
      },

      _getBrowsers: function (onlyActiveWindow) {
        var aBrowsers = [];

        var winMediator = copyUrlsExpert.getWindowMediator();
        if (onlyActiveWindow) {
          aBrowsers.push(winMediator.getMostRecentWindow('navigator:browser'));
        }
        else {
          var browserEnumerator = winMediator.getEnumerator('navigator:browser');
          // Iterate all open windows
          while (browserEnumerator.hasMoreElements()) {
            aBrowsers.push(browserEnumerator.getNext());
          }
        }

        return aBrowsers;
      },

      performCopyTabsUrl: function (onlyActiveWindow, filterHidden) {
        this.performCopyTabsUrlWithOptions({
          onlyActiveWindow: onlyActiveWindow,
          filterHidden: filterHidden
        });
      },

      performCopyTabsUrlWithOptions: function (opts) {

        let options = {
          onlyActiveWindow: true,
          filterHidden: false,
          filterDuplicates: this._prefService.getBoolPref('filterduplicates'),
          filterPinnedTabs: this._prefService.getBoolPref('excludepinnedtabs'),
          sortBy: this._prefService.getCharPref('sortby'),
          template: this.defaultPattern
        };

        // override default options with the opts
        for (let prop in opts) {
          if (opts.hasOwnProperty(prop)) {
            options[prop] = opts[prop];
          }
        }

        // This function must be called awith all three arguments
        var aBrowsers = this._getBrowsers(options.onlyActiveWindow);

        var entries = this._getEntriesFromTabs(aBrowsers, options.filterHidden, options.filterDuplicates, options.filterPinnedTabs);

        this.copyEntriesToClipBoard(entries, options.sortBy, options.template);
      },

      performOpenUrlsInSelection: function () {
        copyUrlsExpert.documentHandler.openUrlsInSelection({
          filterDuplicates: this._prefService.getBoolPref('filterduplicates')
        });
      },

      performCopyUrlsInSelection: function (opts) {
        opts = opts || {};

        opts.tagName = 'a';
        copyUrlsExpert._performCopyUrlsInSelection(opts);
      },

      performCopyUrlsOfImagesInSelection: function (opts) {
        opts = opts || {};

        opts.tagName = 'img';

        copyUrlsExpert._performCopyUrlsInSelection(opts);
      },

      _performCopyUrlsInSelection: function (opts) {

        let options = {
          filterDuplicates: this._prefService.getBoolPref('filterduplicates'),
          sortBy: this._prefService.getCharPref('sortby'),
          tagName: '',
          template: opts.template || this.defaultPattern
        };

        for (let prop in opts) {
          if (opts.hasOwnProperty(prop)) {
            options[prop] = opts[prop];
          }
        }

        this.documentHandler.extractAndCopyUrlsFromSelection(options);
      },

      _isEmptySelection: function () {
        // Check if there is some text selected

        var sel = content.getSelection();

        return sel & sel.length > 0;
      },

      performDefaultAction: function () {
        copyUrlsExpert._doAction(copyUrlsExpert._prefService.getCharPref('toolbaraction'), {});
      },

      _doAction: function (action, options) {

        switch (action) {
          case this.TBB_ACTION_ACTIVE_WIN:
            options.onlyActiveWindow = true;
            options.filterHidden = false;
            this.performCopyTabsUrlWithOptions(options);
            break;

          case this.TBB_ACTION_ACTIVE_TABGROUP:
            options.onlyActiveWindow = true;
            options.filterHidden = true;
            this.performCopyTabsUrlWithOptions(options);
            break;

          case this.TBB_ACTION_ACTIVE_TAB:
            this.performCopyActiveTabUrl(options);
            break;

          case this.TBB_ACTION_ALL_WIN:
            options.onlyActiveWindow = false;
            options.filterHidden = false;
            this.performCopyTabsUrlWithOptions(options);
            break;

          case this.TBB_ACTION_SELECTION_LINKS:
            this.performCopyUrlsInSelection(options);
            break;

          case this.TBB_ACTION_SELECTION_IMAGES:
            this.performCopyUrlsOfImagesInSelection(options);
            break;

          case this.TBB_ACTION_ADVANCED_COPY:
            this.showAdvancedCopyWindow();
            break;

          case this.TBB_ACTION_OPEN_TABS:
            document.getElementById('cmd_cue_openTabs').doCommand();
            break;
        }
      },

      showOptionsWindow: function () {
        //window.open('chrome://copy-urls-expert/content/dialogs/options.xul', 'copyUrlsExpertOptionsWindow', 'addressbar=no, modal');

        var features = "chrome,titlebar,toolbar,centerscreen";
        try {
          var instantApply = Services.prefs.getBoolPref('browser.preferences.instantApply');
          features += instantApply ? ",dialog=no" : ",modal";
        }
        catch (e) {
          features += ",modal";
        }
        openDialog('chrome://copy-urls-expert/content/dialogs/options.xul', '', features);
      },

      showAdvancedCopyWindow: function () {
        var features = "chrome,titlebar,toolbar,centerscreen";
        try {
          var instantApply = Services.prefs.getBoolPref('browser.preferences.instantApply');
          features += instantApply ? ",dialog=no" : ",modal";
        }
        catch (e) {
          features += ",modal";
        }

        let dialogArgs = {
          contextTab: null
        };

        // If the context menu was invoked on a tab other than active tab, Let the dialog know the contextTab
        let _g = this.getGBrowser();
        dialogArgs.contextTab = _g.mContextTab;

        openDialog('chrome://copy-urls-expert/content/dialogs/advanced.xul', '', features, dialogArgs);
      },

      _getClipboardText: function () {
        var clip = Components.classes['@mozilla.org/widget/clipboard;1'].getService(Components.interfaces.nsIClipboard);
        if (!clip) return null;

        var trans = copyUrlsExpert.createTransferable(window);

        clip.getData(trans, clip.kGlobalClipboard);

        var str = new Object();
        var strLength = new Object();

        trans.getTransferData("text/unicode", str, strLength);

        if (str) {
          str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
          str = str.data.substring(0, strLength.value / 2);
        }

        return str;
      },

      /**
       This function is called for 'Open Tabs from Clipboard'
       */
      openTabs: function () {
        var sUrl = this._getClipboardText(),
        // the following regex is extracting urls from any text
            myRe = /((https?):\/\/((?:(?:(?:(?:(?:[a-zA-Z0-9][-a-zA-Z0-9]*)?[a-zA-Z0-9])[.])*(?:[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]|[a-zA-Z])[.]?)|(?:[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+)))(?::((?:[0-9]*)))?(\/(((?:(?:(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*)(?:;(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*))*)(?:\/(?:(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*)(?:;(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*))*))*))(?:[?]((?:(?:[;\/?:@&=+$,^#a-zA-Z0-9\-_.!~*'()]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*)))?))?)/ig,
            myArray = null,
            urls = [],
            filterDuplicates = this._prefService.getBoolPref('filterduplicates');

        while ((myArray = myRe.exec(sUrl))) {
          var newUrl = String(myArray[0]);

          if (filterDuplicates && _isDuplicate(urls, newUrl)) {
            continue;
          }

          urls.push(newUrl);
        }

        if (typeof this.openAllUrls === 'undefined') {
          Cu.import('resource://copy-urls-expert/open-urls-task.jsm', this);
        }

        return this.openAllUrls(urls);
      },


      _updateFuelAppData: function (target, defaultIndex) {
        // FUEL DEPRECIATED - update local data of all windows

        const Cc = Components.classes,
            Ci = Components.interfaces;

        let defaultPattern = target[defaultIndex];

        let wm = this.getWindowMediator();

        // Get the list of browser windows already open
        let windows = wm.getEnumerator('navigator:browser');
        while (windows.hasMoreElements()) {
          let xulWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

          xulWindow.copyUrlsExpert.defaultPattern = defaultPattern;
        }
      },

      updateCustomShortcuts: function (shortcutsMap) {
        this._prefService.setCharPref('shortcuts', JSON.stringify(shortcutsMap));
        this._loadCustomShortcuts(shortcutsMap);

      },

      _loadCustomShortcuts: function (shortcutsMap) {

        let wm = this.getWindowMediator();

        // Get the list of browser windows already open
        let windows = wm.getEnumerator('navigator:browser');
        while (windows.hasMoreElements()) {
          let domWindow = windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);

          this._updateShortcutsForDocument(domWindow.document, shortcutsMap);
        }
      },

      _updateShortcutsForDocument: function (document, shortcutsMap) {

        // Add keyset to XUL document for all the defined shortcuts

        let CUE_KEYSET_ID = 'copyUrlsExpert-keyset',
            keysetParent = document.getElementById('mainKeyset');

        if (keysetParent == null) {
          // loaded in a non-browser window
          return;
        }
        else {
          keysetParent = keysetParent.parentNode;
        }

        let keyset = keysetParent.querySelector('#' + CUE_KEYSET_ID);

        // Remove the old keyset to remove the old key bindings
        if (keyset != null) {
          keyset.remove();
        }

        // Create a new keyset for new shortcuts defined
        keyset = document.createElement('keyset');
        keyset.setAttribute('id', CUE_KEYSET_ID);

        for (let commandId in shortcutsMap) {
          let keyElemId = 'key-' + commandId,
              targetKey = null,
              shortcut = shortcutsMap[commandId];

          if (!shortcut) {
            // shortcut is not defined
            continue;
          }

          targetKey = document.createElement('key');
          targetKey.setAttribute('id', keyElemId);
          targetKey.setAttribute('command', commandId);

          var shortcutKeyConfig = shortcut.getKeyConfig();

          if (shortcutKeyConfig.hasOwnProperty('keycode')) {
            targetKey.setAttribute('keycode', shortcutKeyConfig.keycode);
            targetKey.setAttribute('keytext', shortcutKeyConfig.keytext);
          }
          else {
            targetKey.setAttribute('key', shortcutKeyConfig.keytext);
          }

          if (shortcut.modifiers) {
            targetKey.setAttribute('modifiers', shortcut.modifiers.toXulModifiersString());
          }

          keyset.appendChild(targetKey);
        }

        keysetParent.appendChild(keyset);

      },

      updateUrlListFile: function (theContent) {
        // Write to prefs
        // get profile directory
        var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
        file.append('copyurlsexpert');
        if (!file.exists() || !file.isDirectory()) {
          // if it doesn't exist, create
          file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0x1FF);   // 0x1FF = 0777
        }

        file.append('urls.templates');

        var updateHandler = new copyUrlsExpert._AsynHandler(file, copyUrlsExpert._prefService);
        copyUrlsExpert._writeDataToFile(theContent, file, function (inputStream, status) {
          updateHandler.handleUpdate(inputStream, status);
        });
      },

      _writeDataToFile: function (content, file, fptr) {
        // file is nsIFile, content is a string

        Components.utils.import('resource://gre/modules/NetUtil.jsm');
        Components.utils.import('resource://gre/modules/FileUtils.jsm');
        // You can also optionally pass a flags parameter here. It defaults to
        // FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE;
        var ostream = FileUtils.openSafeFileOutputStream(file)

        var converter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = 'UTF-8';
        var istream = converter.convertToInputStream(content);

        // The last argument (the callback) is optional.
        NetUtil.asyncCopy(istream, ostream, fptr);
      },

      /*
       Fills the 'templates' by parsing the contents of 'data'
       @param: data - Contents of file.
       @param: templates - target array object that would be populated.
       @returns: int representing the index of default pattern.
       */
      _updateModel: function (data, templates) {
        var index = this.convertStringToModel(data, templates);

        if (index == -1) {
          index = copyUrlsExpert._setupDefaultModel(templates);
        }

        return index;

      },

      _setupDefaultModel: function (templates) {
        templates.push(new this._FormatPattern(0, 'Default', '$url$n'));
        templates.push(new this._FormatPattern(1, 'html', '<a href="$url">$title</a>$n'));
        templates.push(new this._FormatPattern(2, 'forum', '[a=$url]$title[/a]$n'));
        return 0;
      }

    };
  }

  function init() {
    window.removeEventListener('load', init);

    window.setTimeout(function () {
      setupMainRef();

      window.addEventListener('unload', function onUnload(evt){
        copyUrlsExpert.onUnload(evt);
      }, false);

      // @ifdef DEBUG
      var consoleSvc = Components.classes["@mozilla.org/consoleservice;1"]
          .getService(Components.interfaces.nsIConsoleService);

      copyUrlsExpert.log = function() {
        consoleSvc.logStringMessage.call(consoleSvc, "Copy Urls Expert: " + Array.prototype.join.call(arguments, ' '));
      };
      // @endif

      copyUrlsExpert.init();
    }, 50);
  }

  window.addEventListener('load', init, false);
})();

