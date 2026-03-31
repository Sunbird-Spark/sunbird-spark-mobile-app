/**
 * canvas-telemetry-interface.js
 * Comprehensive telemetry bridge for capturing events from all sources.
 */
(function () {
    "use strict";
    var origin = window.location.origin || '*';

    // Core outbound bridge to parent React container
    function post(data) {
        if (!data) return;
        // Un-nest if necessary (some plugins wrap events in target/detail)
        var flat = (data.eid || data.event) ? data : (data.target || data.detail || data);
        if (flat && (flat.eid || flat.event)) {
            window.parent.postMessage(flat, origin);
        }
    }

    // Standard outbound bridge called by the engine's TelemetryService
    window.telemetry = {
        send: function (object) { post(object); }
    };

    /**
     * Renderer Bridge (Proactive Catching)
     * Some legacy assessment plugins dispatch a "TelemetryEvent" on the document.
     */
    document.addEventListener('TelemetryEvent', function (e) {
        if (e.detail) post(e.detail);
    });

    /**
     * EkstepRendererAPI Bridge
     * The internal renderer event bus for telemetry emission.
     * We poll for its existence since script.min.1.1.js loads later.
     */
    var apiInitCount = 0;
    var attachApiListener = function () {
        if (typeof EkstepRendererAPI !== 'undefined') {
            var listener = function (data) { post(data); };
            EkstepRendererAPI.addEventListener('telemetryEvent', listener);
            EkstepRendererAPI.addEventListener('renderer:telemetry:event', listener);
            console.log('[EcmlBridge] EkstepRendererAPI listeners attached');
        } else if (apiInitCount < 20) { // Limit polling to 10 seconds
            apiInitCount++;
            setTimeout(attachApiListener, 500);
        }
    };
    attachApiListener();

    console.log('[EcmlBridge] Telemetry Interface Loaded (Omni-Channel Mode)');
})();
