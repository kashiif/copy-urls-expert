/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['CUESelectionWorker'];

function CUESelectionWorker(doc) {

  let entryExtractors = {
    a: _getEntryFromLink,
    img: _getEntryFromImage
  };

  function _isDuplicate(entries, url) {
    url = url.toLowerCase();
    for(var i = 0; i < entries.length; i++) {
      var entryUrl = entries[i];
      if (entryUrl.toLowerCase() == url) {
        return true;
      }
    }
    return false;
  }

  function _getUrlEntry(title, url) {
    return {
      title: title,
      url: url
    };
  }

  function _getEntryFromLink(link, sel) {
    var entry = null;
    // skip named anchors
    if (link.href && sel.containsNode(link, true)) {

      var title = link.title;
      if (title == '') {
        title = (link.innerText ? link.innerText : link.textContent).trim();
      }
      entry = _getUrlEntry(title, link.href);
    }
    return entry;
  }

  function _getEntryFromImage(image, sel) {
    var entry = null;
    // skip named anchors
    if (sel.containsNode(image, true)) {
      var title = image.title;
      if (title == '')
      {
        title = image.name;
      }
      if (title == '')
      {
        title = image.alt;
      }

      entry = _getUrlEntry(title,image.src);
    }
    return entry;
  }

  function SelectionWorker(doc) {
    this.document = doc;
  }

  SelectionWorker.prototype.getEntriesFromSelection = function(tagName, filterDuplicates) {

    let entryExtractor = entryExtractors[tagName];

    let entries = [],
        urls = [],
        //chromeWindow = this._getChromeWin(),
        sel = this.document.getSelection(),
        items = this.document.getElementsByTagName(tagName);

    for (var i=0;i < items.length;i++) {
      var item = items[i];
      var entry = entryExtractor(item, sel);

      // ignore if the <item> is not in selection
      if (entry) {

        if (filterDuplicates && _isDuplicate(urls, entry.url)) {
          continue;
        }

        entries.push(entry);
        urls.push(entry.url);
      }
    }

    //Components.utils.reportError('entries ' + entries);
    return entries;
  };

  return new SelectionWorker(doc);
}