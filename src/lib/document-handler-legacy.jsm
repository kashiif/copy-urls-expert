/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['documentHandler'];

function onContentContextMenuShowing(evt) {
  if (evt.target.id == 'contentAreaContextMenu')
  {
    var mnuItm = document.getElementById('copyurlsexpert-contextmenu-mainmenu');
    mnuItm.collapsed = copyUrlsExpert._isEmptySelection();
  }
}

var documentHandler = {
  init: function() {

    var cm = document.getElementById('contentAreaContextMenu');
    if (cm != null) {
      cm.addEventListener('popupshowing', function (evt) {
        onContentContextMenuShowing(evt);
      }, false);
    }
  },


  /*
   Copies a list of urls to clipboard
   @param: tagName - Name of tag to process e.g. a, img
   @param: entryExtractor - pointer to a function that accepts two arguments item and selection
   */
  extractAndCopyUrlsFromSelection: function (options) {
    return this.getEntriesFromSelection(options);
  },

  getEntriesFromSelection: function() {

    let entries = [],
        urls = [],
        chromeWindow = this.getMostRecentWindow(),
        sel = chromeWindow.content.getSelection(),
        items = chromeWindow.content.document.getElementsByTagName(tagName);

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var entry = entryExtractor(item, sel);

      // ignore if the <item> is not in selection
      if (entry) {

        if (filterDuplicates && this._isDuplicate(urls, entry.url)) {
          continue;
        }

        entries.push(entry);
        urls.push(entry.url);
      }
    }
    return entries;

  },

  uninit: function() {

  }

};