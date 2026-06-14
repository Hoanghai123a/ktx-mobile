// Phien ban app duoc inject tu vite.config.js qua define `__APP_VERSION__`.
// Format: MM.DD.NN (thang.ngay.so lan build trong ngay).
/* global __APP_VERSION__ */
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "00.00.00";