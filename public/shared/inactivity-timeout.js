(function () {
  const LAST_ACTIVITY_KEY = "material-tracker:last-activity";
  const LOGOUT_EVENT_KEY = "material-tracker:logout-event";
  const GLOBAL_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
  const DEFAULT_TIMEOUT_MS = GLOBAL_INACTIVITY_TIMEOUT_MS;
  const DEFAULT_THROTTLE_MS = 10 * 1000;
  const DEFAULT_CHECK_MS = 10 * 1000;
  const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "focus"];

  function getNow() {
    return Date.now();
  }

  function readTimestamp() {
    try {
      const rawValue = window.localStorage.getItem(LAST_ACTIVITY_KEY);
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  }

  function writeTimestamp(timestamp) {
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
    } catch (_error) {
      // ignore storage failures
    }
  }

  function broadcastLogout(reason) {
    try {
      window.localStorage.setItem(
        LOGOUT_EVENT_KEY,
        JSON.stringify({
          reason: reason || "timeout",
          at: getNow(),
        }),
      );
    } catch (_error) {
      // ignore storage failures
    }
  }

  function install(options) {
    const config = options || {};
    const supabase = config.supabase;
    if (!supabase || !supabase.auth) {
      return { stop() {} };
    }

    const timeoutMs = Number(config.timeoutMs) || DEFAULT_TIMEOUT_MS;
    const throttleMs = Number(config.throttleMs) || DEFAULT_THROTTLE_MS;
    const checkMs = Number(config.checkMs) || DEFAULT_CHECK_MS;
    const redirectUrl = typeof config.redirectUrl === "string" ? config.redirectUrl : "";
    const onTimeout = typeof config.onTimeout === "function" ? config.onTimeout : null;

    let stopped = false;
    let logoutInProgress = false;
    let hasSession = false;
    let lastWriteAt = 0;
    let checkTimer = null;
    let authSubscription = null;

    function markActivity(force) {
      if (stopped || !hasSession) {
        return;
      }

      const now = getNow();
      if (!force && now - lastWriteAt < throttleMs) {
        return;
      }

      lastWriteAt = now;
      writeTimestamp(now);
    }

    async function signOutCurrentSession() {
      try {
        await supabase.auth.signOut();
      } catch (_signOutError) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (_error) {
          // ignore sign out errors
        }
      }
    }

    async function handleTimeout(reason, source) {
      if (stopped || logoutInProgress || !hasSession) {
        return;
      }

      logoutInProgress = true;
      hasSession = false;

      await signOutCurrentSession();

      if (onTimeout) {
        onTimeout({ reason: reason || "timeout", source: source || "local" });
      } else if (redirectUrl) {
        window.location.href = redirectUrl;
      }

      logoutInProgress = false;
    }

    async function evaluateTimeout() {
      if (stopped || logoutInProgress || !hasSession) {
        return;
      }

      const lastActivity = readTimestamp();
      if (!lastActivity) {
        markActivity(true);
        return;
      }

      if (getNow() - lastActivity < timeoutMs) {
        return;
      }

      broadcastLogout("timeout");
      await handleTimeout("timeout", "local");
    }

    function handleStorage(event) {
      if (event.key !== LOGOUT_EVENT_KEY || !event.newValue || stopped) {
        return;
      }

      if (!hasSession) {
        return;
      }

      handleTimeout("timeout", "remote");
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        markActivity(true);
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    supabase.auth.getSession().then(({ data }) => {
      if (stopped) {
        return;
      }
      hasSession = !!data?.session;
      if (hasSession) {
        markActivity(true);
      }
    });

    const authResult = supabase.auth.onAuthStateChange((_event, session) => {
      hasSession = !!session;
      if (hasSession) {
        markActivity(true);
      }
    });
    authSubscription = authResult?.data?.subscription || null;

    checkTimer = window.setInterval(evaluateTimeout, checkMs);

    return {
      stop() {
        stopped = true;
        if (checkTimer) {
          window.clearInterval(checkTimer);
        }
        ACTIVITY_EVENTS.forEach((eventName) => {
          window.removeEventListener(eventName, markActivity, { passive: true });
        });
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("storage", handleStorage);
        authSubscription?.unsubscribe?.();
      },
    };
  }

  window.MaterialTrackerInactivity = {
    install,
    GLOBAL_INACTIVITY_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  };
})();
