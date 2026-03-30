/**
 * canvas-interface.js
 * Mirrors the original Sunbird mobile app bridge logic.
 */
(function () {
    "use strict";

    var noop = function () { };
    var origin = window.location.origin || '*';

    // Global Exit Handler
    window.exitApp = function () {
        window.parent.postMessage({ eid: 'EXIT', edata: { type: 'EXIT' } }, origin);
    };

    // Genie Service Interface (Proactively provided to the engine)
    window.genieservice = (function () {
        return {
            send: function (data) { window.parent.postMessage(data, origin); },
            endGenieCanvas: window.exitApp, // Crucial for Exit logic
            showExitConfirmPopup: window.exitApp, // Crucial for Exit logic
            getContentMetadata: noop,
            launchPortal: noop,
            endContent: noop,
            getRelevantContent: function (req, cb) { if (cb) cb({ status: 'success', content: [] }); }
        };
    })();

    // Receiver for parent configuration (Replaces the inline init logic)
    window.addEventListener('message', function handler(event) {
        if (event.source !== window.parent || event.origin !== window.location.origin) return;
        var data = event.data;
        if (data && data.__ecmlPlayerConfig && window.initializePreview) {
            window.removeEventListener('message', handler);
            window.initializePreview(data.config);
        }
    });

    // Native environment stubs
    if (!window.cordova) window.cordova = { plugins: {}, file: { dataDirectory: '' } };
    window.StatusBar = { hide: noop, show: noop, isVisible: true };
    if (!navigator.splashscreen) navigator.splashscreen = { hide: noop, show: noop };

    // Patch JSON.parse for legacy artifact data
    var originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        if (typeof text === 'object' && text !== null) return text;
        return originalParse.call(JSON, text, reviver);
    };

    console.log('[EcmlBridge] Service Interface Loaded');
})();
