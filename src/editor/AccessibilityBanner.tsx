import { useEffect, useRef } from "react";
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
} from "tauri-plugin-macos-permissions-api";
import { isPluginUnavailableError } from "../utils/errors";

interface AccessibilityBannerProps {
  onGranted: () => void;
}

export default function AccessibilityBanner({
  onGranted,
}: AccessibilityBannerProps) {
  const cleanupRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  async function startPermissionWatch() {
    cleanupRef.current?.();

    const timeoutMs = 5000;
    const pollMs = 500;
    let active = true;

    const cleanup = () => {
      active = false;
      window.removeEventListener("focus", handleCheck);
      document.removeEventListener("visibilitychange", handleCheck);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      cleanupRef.current = null;
    };

    const handleCheck = async () => {
      if (!active) {
        return;
      }

      try {
        const granted = await checkAccessibilityPermission();
        if (granted) {
          cleanup();
          onGranted();
        }
      } catch (error) {
        cleanup();
        if (isPluginUnavailableError(error)) {
          console.warn(
            "Accessibility permission request is unavailable on this platform",
            error,
          );
          return;
        }
        console.error("Failed to re-check accessibility permission", error);
      }
    };

    window.addEventListener("focus", handleCheck, { once: true });
    document.addEventListener("visibilitychange", handleCheck, { once: true });

    const intervalId = window.setInterval(() => {
      if (!active) {
        return;
      }
      if (document.visibilityState === "visible") {
        void handleCheck();
      }
    }, pollMs);

    const timeoutId = window.setTimeout(() => {
      if (active) {
        cleanup();
      }
    }, timeoutMs);

    cleanupRef.current = cleanup;
    await handleCheck();
  }

  return (
    <div
      role="alert"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-warning/30 bg-warning-muted px-4 py-2 text-sm text-warning-foreground"
    >
      <span>단축키를 사용하려면 손쉬운 사용 권한이 필요합니다</span>
      <button
        type="button"
        className="font-medium text-warning-foreground hover:opacity-80"
        onClick={async () => {
          try {
            await requestAccessibilityPermission();
            await startPermissionWatch();
          } catch (error) {
            if (isPluginUnavailableError(error)) {
              console.warn(
                "Accessibility permission request is unavailable on this platform",
                error,
              );
              return;
            }
            console.error("Failed to request accessibility permission", error);
          }
        }}
      >
        설정 열기
      </button>
    </div>
  );
}
