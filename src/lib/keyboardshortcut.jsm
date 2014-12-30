/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * Original code is: Customizable Shortcut
 * Original contributor is: Tim Taubert
 *
 */

"use strict";

var EXPORTED_SYMBOLS = ['KeyboardShortcut'];

Components.utils.import('resource://copy-urls-expert/modifiers.jsm');

function KeyboardShortcut(data) {
  this.keycode = data.keycode;
  this.modifiers = data.modifiers;
}

KeyboardShortcut.prototype.equals = function (obj) {
  if (obj instanceof KeyboardShortcut) {
    return obj.toString() == this.toString();
  }

  return false;
}

KeyboardShortcut.prototype.toString = function () {
  let data = {
      keycode: this.keycode,
      modifiers: this.modifiers
    };

  return JSON.stringify(data);
}

KeyboardShortcut.prototype.toUIString = function () {
  if (this._toStringCache) {
    return this._toStringCache;
  }

  let parts = [];

  if (this.modifiers) {
    let m = this.modifiers.toString();

    if (m.length > 0) {
      parts.push(m);
    }

  }

  let keyConfig = this.getKeyConfig();
  if (keyConfig) {
    parts.push(keyConfig.keytext);
  }

  return this._toStringCache = parts.join("+");
}

KeyboardShortcut.prototype.getKeyConfig = function () {
  var config = {
      keytext: ""
    };

  if (!this.keycode) {
    return config;
  }

  let symbols = {
     VK_SEMICOLON: ';',
     VK_EQUALS: '=',
     VK_COMMA: ',',
     VK_PERIOD: '.',
     VK_SLASH: '/',
     VK_BACK_QUOTE: '`',
     VK_OPEN_BRACKET: '[',
     VK_BACK_SLASH: '\\',
     VK_CLOSE_BRACKET: ']',
     VK_QUOTE: '\'',

     /* Numpad */
     VK_MULTIPLY: '*',
     VK_ADD: '+',
     VK_SUBTRACT: '-',
     VK_DIVIDE: '/'
  }

  if (symbols.hasOwnProperty(this.keycode)) {
    config.keytext = symbols[this.keycode];
  }
  else {
    config.keytext = this.keycode.replace(/^VK_/, "");

    let domKeys = Components.interfaces.nsIDOMKeyEvent,
        key = domKeys["DOM_" + this.keycode];


    if (key >= domKeys.DOM_VK_F1 && key <= domKeys.DOM_VK_F24) {
      // function keys should be handled through <key keycode="VK_FXX">
      config.keycode = this.keycode;
    }

  }

  return config;
}

KeyboardShortcut.prototype.isComplete = function () {
  return !!(this.keycode);
}

KeyboardShortcut.fromPOJO = function (data) {

  data.modifiers = new Modifiers(data.modifiers || {modifiers: []});

  return new KeyboardShortcut(data);
}

KeyboardShortcut.fromEvent = function (event) {
  let data = {modifiers: Modifiers.fromEvent(event)};

  let keys = Components.interfaces.nsIDOMKeyEvent;
  for (let name in keys) {
    let key = keys[name];

    if (!Modifiers.isModifier(key) && event.keyCode == key) {
      data.keycode = name.replace(/^DOM_/, "");
      break;
    }
  }

  return new KeyboardShortcut(data);
}