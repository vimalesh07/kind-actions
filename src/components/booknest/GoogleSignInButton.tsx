import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonConfig = {
  theme: "outline";
  size: "large";
  width: number;
  text: "continue_with";
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }): void;
          renderButton(element: HTMLElement, config: GoogleButtonConfig): void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | undefined;

function loadGoogleScript() {
  googleScriptPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || disabled) return;

    let mounted = true;
    loadGoogleScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.google?.accounts?.id) return;
        containerRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) onCredential(response.credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: containerRef.current.clientWidth || 360,
          text: "continue_with",
        });
      })
      .catch((error: Error) => {
        if (mounted) setLoadError(error.message);
      });

    return () => {
      mounted = false;
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <div className="mt-3 rounded-lg border border-border px-4 py-3 text-center text-sm font-bold text-muted-foreground">
        Google sign-in is not configured.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm font-bold text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none mt-3 opacity-60" : "mt-3"}>
      <div ref={containerRef} className="min-h-11 w-full" />
    </div>
  );
}
