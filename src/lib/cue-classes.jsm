
var EXPORTED_SYMBOLS = ['_FormatPattern'];

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