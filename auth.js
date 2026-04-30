/*
 * auth.js — tiny client-side access gate for v-day.
 *
 * Flow:
 *   1) If localStorage.vday_authed === '1', allow.
 *   2) Else fetch public IP from https://ipapi.co/json/ and exact-match it
 *      against ALLOWED_IPS. If matched, set localStorage flag and allow.
 *   3) Else (or if the IP fetch fails / rate-limits) redirect to blocked.html,
 *      which has the Pinocchio block screen and a passcode escape hatch.
 *
 * To add a new device/IP: open https://ipapi.co/json/ on that device,
 * copy the "ip" field, and paste it as a new entry in ALLOWED_IPS below.
 *
 * Note on IPv6: IPv6 privacy extensions rotate the device suffix every
 * few hours/days, so an allowlisted address may eventually stop matching.
 * That is fine: the user hits the block page once, types the passcode,
 * and localStorage keeps them in forever on that browser.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'vday_authed';
    var BLOCK_PAGE = 'blocked.html';

    var ALLOWED_IPS = [
        // IPv4
        '49.43.111.67',                                // iPhone on cellular

        // IPv6 (exact match — no /64 prefix matching, so other Jio
        // customers on the same tower cannot slip in)
        '2405:201:5021:90:404:3d60:9914:93ee',         // Windows PC, home Wi-Fi
        '2405:201:5021:90:e046:b314:3e99:63d',         // iPhone, home Wi-Fi
        '2405:201:5021:90:7cc4:6a07:b598:ff26',        // iPhone, home Wi-Fi (different session)
        '2401:4900:814f:d954:907b:4f:b75a:d07'         // iPhone on a different cellular network
    ];

    // Already authenticated on this browser → let the page render.
    try {
        if (localStorage.getItem(STORAGE_KEY) === '1') {
            return;
        }
    } catch (e) {
        // localStorage unavailable (private mode etc.) — fall through to IP check.
    }

    // Hide the page while we check, so unauthorized eyes don't see a flash.
    var styleEl = document.createElement('style');
    styleEl.id = 'vday-auth-hide';
    styleEl.textContent = 'html{visibility:hidden!important}';
    (document.head || document.documentElement).appendChild(styleEl);

    function block() {
        // Replace history entry so back-button doesn't loop.
        window.location.replace(BLOCK_PAGE);
    }

    function allow() {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
        var s = document.getElementById('vday-auth-hide');
        if (s) s.parentNode.removeChild(s);
    }

    fetch('https://ipapi.co/json/')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.ip && ALLOWED_IPS.indexOf(data.ip) !== -1) {
                allow();
            } else {
                block();
            }
        })
        .catch(function () {
            // Network/ad-blocker/rate-limit → fail safe to block page.
            // Authorized users can still get in via the passcode there.
            block();
        });
})();
