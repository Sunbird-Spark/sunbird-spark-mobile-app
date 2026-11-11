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
            wrapIndexJsonForDynamicAssess();
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

    // Dynamic Assess ECML: in device mode the renderer drops the body it is given and loads index.json itself, so keep only the questions the app drew.
    var DYNAMIC_ECML = 'Dynamic Course Assessment';
    var asList = function (v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); };
    var parseOrNull = function (v) {
        if (typeof v !== 'string') return v == null ? null : v;
        try { return originalParse.call(JSON, v); } catch (e) { return null; }
    };
    var quizzesOf = function (body) {
        var quizzes = [];
        asList(body && body.theme && body.theme.stage).forEach(function (stage) {
            asList(stage && stage['org.ekstep.questionset']).forEach(function (quiz) { quizzes.push(quiz); });
        });
        return quizzes;
    };

    // Filters each generated quiz in the package body to the question ids in the app's drawn body; a quiz the app did not draw plays nothing.
    var applyLearnerDraw = function (pkgBody, drawnBody) {
        var drawnById = {};
        quizzesOf(drawnBody).forEach(function (quiz) { drawnById[quiz.id] = quiz; });
        quizzesOf(pkgBody).forEach(function (quiz) {
            var config = parseOrNull(quiz.config && quiz.config.__cdata);
            if (config && !config.dynamic_assess) return;
            var drawn = drawnById[quiz.id];
            var drawnConfig = parseOrNull(drawn && drawn.config && drawn.config.__cdata) || {};
            var keep = {};
            asList(drawn && drawn['org.ekstep.question']).forEach(function (q) { keep[String(q.id)] = true; });
            quiz['org.ekstep.question'] = asList(quiz['org.ekstep.question']).filter(function (q) { return keep[String(q.id)]; });
            if (quiz.data) {
                var items = asList(parseOrNull(quiz.data.__cdata));
                quiz.data.__cdata = JSON.stringify(items.filter(function (item) { return keep[String(item && item.identifier)]; }));
            }
            if (config && quiz.config) {
                config.total_items = quiz['org.ekstep.question'].length;
                config.max_score = drawnConfig.max_score != null ? drawnConfig.max_score : config.total_items;
                quiz.config.__cdata = JSON.stringify(config);
            }
        });
        return pkgBody;
    };

    var wrapIndexJsonForDynamicAssess = function () {
        var jq = window.jQuery;
        if (!jq || typeof jq.getJSON !== 'function' || jq.getJSON.__dynamicAssess) return;
        var originalGetJSON = jq.getJSON;
        var wrapped = function (url, success) {
            var api = window.EkstepRendererAPI;
            var cfg = api && typeof api.getGlobalConfig === 'function' ? api.getGlobalConfig() : null;
            var isDynamic = !!(cfg && cfg.metadata && cfg.metadata.primaryCategory === DYNAMIC_ECML);
            if (!isDynamic || typeof url !== 'string' || !/\/index\.json$/.test(url) || typeof success !== 'function') {
                return originalGetJSON.apply(this, arguments);
            }
            var drawnBody = parseOrNull(cfg.data);
            return originalGetJSON.call(this, url, function (json) {
                var args = Array.prototype.slice.call(arguments);
                args[0] = applyLearnerDraw(json, drawnBody);
                return success.apply(this, args);
            });
        };
        wrapped.__dynamicAssess = true;
        jq.getJSON = wrapped;
    };

    console.log('[EcmlBridge] Service Interface Loaded');
})();
