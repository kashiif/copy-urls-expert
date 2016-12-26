/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['copyEntriesToClipBoard'];

Components.utils.import('resource://copy-urls-expert/common.jsm');

function _compareEntriesByTitle(a, b) {
  if (a.title.toLowerCase() < b.title.toLowerCase())
    return -1;
  if (a.title.toLowerCase() > b.title.toLowerCase())
    return 1;
  // a must be equal to b
  return 0;
}

function _compareEntriesByUrl(a, b) {
  if (a.url.toLowerCase() < b.url.toLowerCase())
    return -1;
  if (a.url.toLowerCase() > b.url.toLowerCase())
    return 1;
  // a must be equal to b
  return 0;
}

// make a single digit two digit by prefixing 0
function t(n) {
  return n < 10 ? "0" + n : n;
}

function _formatDate(d, f) {

  var h = d.getHours(),
      m = d.getMinutes(),
      s = d.getSeconds(),
      month = d.getMonth() + 1, // Months are 0-based index;
      dt = d.getDate();

  var strDate = f.replace(/YYYY/g, d.getFullYear())
      .replace(/YY/g, d.getFullYear().toString().substr(2))
      .replace(/mm/g, t(month))
      .replace(/m/g, month)
      .replace(/dd/g, t(dt))
      .replace(/d/g, dt)
      .replace(/HH/g, t(h))  // 24-hour clock
      .replace(/hh/g, t(h > 12 ? h - 12 : h))
      .replace(/h/gi, h)
      .replace(/MM/g, t(m))
      .replace(/M/g, m)
      .replace(/SS/g, t(s))
      .replace(/S/g, s);

  return strDate;
}

function _transform(fmtPattern, entries) {
  var returnValue = '';

  var d = new Date();

  var strDate = d.toLocaleString();
  var strTime = d.getTime();

  var pattern = fmtPattern.pattern;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var mystring = pattern.replace(/\$title/gi, entry.title);
    mystring = mystring.replace(/\$url/gi, entry.url);
    mystring = mystring.replace(/\$index/gi, i + 1);
    returnValue += mystring;
  }

  returnValue = fmtPattern.prefix + returnValue + fmtPattern.postfix;

  // http://stackoverflow.com/questions/1234712/javascript-replace-with-reference-to-matched-group
  returnValue = returnValue.replace(/\$date\((.+?)\)/g, function (match, grp1) {
    return _formatDate(d, grp1);
  });

  returnValue = returnValue.replace(/\$date/gi, strDate);
  returnValue = returnValue.replace(/\$time/gi, strTime);
  returnValue = returnValue.replace(/\$n/gi, LINE_FEED);
  returnValue = returnValue.replace(/\$t/gi, '\t');

  return returnValue;
}

function copyEntriesToClipBoard(entries, sortBy, patternToUse) {

  switch (sortBy) {
    case SORT_BY_TITLE:
      entries.sort(_compareEntriesByTitle);
      break;
    case SORT_BY_DOMAIN:
      entries.sort(_compareEntriesByUrl);
      break;
  }

  var str = _transform(patternToUse, entries);

  //alert(str);
  if (str === null || str.length === 0) {
    return;
  }

  var clipboard = Components.classes['@mozilla.org/widget/clipboard;1']
                            .getService(Components.interfaces.nsIClipboard);
  var trans = createTransferable();
  var supportsString = Components.classes['@mozilla.org/supports-string;1']
                            .createInstance(Components.interfaces.nsISupportsString);
  supportsString.data = str;

  // We multiply the length of the string by 2, since it's stored in 2-byte UTF-16
  // format internally.
  trans.setTransferData('text/unicode', supportsString, str.length * 2);

  clipboard.setData(trans, null, clipboard.kGlobalClipboard);
}
