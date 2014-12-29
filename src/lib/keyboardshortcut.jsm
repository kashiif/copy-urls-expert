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
  this.key = data.key;
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
      key: this.key,
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
    parts.push(this.modifiers.toString() + "+");
  }

  if (this.key) {
    parts.push(String.fromCharCode(this.key));
  }

  let keyName = this.getKeyName();
  if (keyName) {
    parts.push(keyName);
  }

  return this._toStringCache = parts.join("");
}

KeyboardShortcut.prototype.getKeyName = function () {
  if (this.keycode) {
    let keyName = this.keycode.replace(/^VK_/, "");
    keyName = keyName[0] + keyName.substr(1).toLowerCase();
    keyName = keyName.replace(/_[a-z]/i, str => str[1].toUpperCase());
    return keyName;
  }

  return "";
}

KeyboardShortcut.prototype.isComplete = function () {
  return !!(this.key || this.keycode);
}

KeyboardShortcut.fromJSONString = function (str) {
  let data = JSON.parse(str);
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
