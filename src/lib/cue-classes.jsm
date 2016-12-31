/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2013-2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['_FormatPattern', '_AsynHandler'];

var SEPARATOR = '|';
var ESCAPED_SEPARATOR = '\\|';


function _FormatPattern(id, name, pattern) {
  this.id = id;
  this.name = name;
  this.pattern = pattern;
  this.prefix = '';
  this.postfix = '';
}

// _FormatPattern instance functions
_FormatPattern.prototype.toString= function() {

    var pipeRegex = /\|/g;

  var v = [
    /*0*/	this.id,
    /*1*/	this.name.replace(pipeRegex, ESCAPED_SEPARATOR),
    /*2*/	this.prefix.replace(pipeRegex, ESCAPED_SEPARATOR),
    /*3*/	this.pattern.replace(pipeRegex, ESCAPED_SEPARATOR),
    /*4*/	this.postfix.replace(pipeRegex, ESCAPED_SEPARATOR)
      ].join(SEPARATOR);

    return v;
    };


_FormatPattern.prototype.clone= function() {
  var c = new _FormatPattern(this.id, this.name, this.pattern);
  c.prefix = this.prefix;
  c.postfix = this.postfix;
  return c;
  };

// _FormatPattern static functions
_FormatPattern.parseString = function(theString) {

  //var elements = theString.split(/[^\\]\|/);
  var elements = theString.replace(/([^\\])\|/g, "$1$1|")  // replace all occurnces of | preceding any character but not \ with two times the character and |
              .replace(/\|\|/g, "| |") // replcae two connecutive | with |<space>|. Happens when a part (prefi, postfix) is empty
                .split(/[^\\]\|/);
    

  var escapedPipeRegex = /\\\|/g;

  var pattern = new _FormatPattern(parseInt(elements[0]),
                    elements[1],
                    elements[3].replace(escapedPipeRegex, SEPARATOR)
                  );

  pattern.prefix = elements[2].replace(escapedPipeRegex, SEPARATOR);
  pattern.postfix = elements[4].replace(escapedPipeRegex, SEPARATOR);

  return pattern;

};

function _AsynHandler(file, oPrefs) {
  this.file = file;
  this.oPrefs = oPrefs;
}

_AsynHandler.prototype.read = function (inputStream, status) {
  var data = '';

  var converterStream = null;
  try {
    //data = NetUtil.readInputStreamToString(inputStream, inputStream.available());

    converterStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
        .createInstance(Components.interfaces.nsIConverterInputStream);
    converterStream.init(inputStream, 'UTF-8', 1024, Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

    var input = {};
    // read all "bytes" (not characters) into the input
    var numChars = converterStream.readString(inputStream.available(), input);
    if (numChars != 0) /* EOF */
      data = input.value;
  }
  catch (ex) {
    Components.utils.reportError('Copy Urls Expert: ' + ex);
    data = null;
  }
  finally {
    if (converterStream) {
      try {
        converterStream.close();
      }
      catch (ex) {
        Components.utils.reportError('Copy Urls Expert: Error while closing file - ' + ex);
      }
    }
  }

  return data;

};

_AsynHandler.prototype.handleUpdate = function (status) {
  if (!Components.isSuccessCode(status)) {
    // Handle error!
    alert('Copy Urls Expert: Failed to update file templates list file: ' + status);
    return;
  }

  // Data has been written to the file.
  // First update the preferences to store the path of file
  var relFile = Components.classes['@mozilla.org/pref-relativefile;1'].createInstance(Components.interfaces.nsIRelativeFilePref);
  relFile.relativeToKey = 'ProfD'; // or any other string listed above
  relFile.file = this.file;             // |file| is nsILocalFile
  this.oPrefs.setComplexValue('urltemplatesfile', Components.interfaces.nsIRelativeFilePref, relFile);
};
