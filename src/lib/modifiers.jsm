/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * Original code is: Customizable Shortcut
 * Original contributor is: Tim Taubert
 *
 */

"use strict";

var EXPORTED_SYMBOLS = ['Modifiers'];

const modifierKeys = {
    16: "shift",
    17: "control",
    18: "alt",
    224: "meta"
  };

const modifierNames = {
    control: "Ctrl",
    meta: "Meta",
    shift: "Shift",
    alt: "Alt"
  };

function getAccelKeyName() {
  return modifierKeys[prefs.get("ui.key.accelKey")] || "control";
}

function isAccelKeyPressed(event) {
  let accelKeyName = getAccelKeyName().replace("control", "ctrl");
  return event[accelKeyName + "Key"];
}

function Modifiers(data) {
  this.modifiers = data.modifiers;
}

Modifiers.prototype.toString = function () {
  let keys = {};
  this.modifiers.forEach(function (modifier) {
    keys[modifier.toLowerCase()] = 1;
  });

  if (keys.accel) {
    keys[getAccelKeyName()] = 1;
  }

  let names = [];
  for (let name in modifierNames) {
    if (keys[name]) {
      names.push(modifierNames[name]);
    }
  }

  return names.join("+");
}

Modifiers.prototype.toXulModifiersString = function () {
  let keys = [];
  this.modifiers.forEach(function (modifier) {
    let m = modifier.toLowerCase();
    if (m == "control") {
      m = "accel";
    }

    keys.push(m);
  });

  return keys.join(",");
}

Modifiers.fromEvent = function (event) {
  let modifiers = [];

  if (event.ctrlKey) {
    modifiers.push("control");
  }

  if (event.shiftKey) {
    modifiers.push("shift");
  }

  if (event.metaKey) {
    modifiers.push("meta");
  }

  if (event.altKey) {
    modifiers.push("alt");
  }

  if (event.keyCode in modifierKeys && event.type != 'keyup') {
    let key = modifierKeys[event.keyCode];
    if (-1 == modifiers.indexOf(key)) {
      modifiers.push(key);
    }
  }

  if (modifiers.length) {
    return new Modifiers({modifiers: modifiers});
  }

  return null;
}

Modifiers.isModifier = function (key) {
  return key in modifierKeys;
}
