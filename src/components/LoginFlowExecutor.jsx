import React, { useEffect, useState, useRef } from "react";
import { Spinner } from "react-bootstrap";

const RUN_KEY = "login_flow_running";

const LOGIN_CHECKS_ENABLED =
  process.env.REACT_APP_LOGIN_CHECKS_ENABLED !== "false";

export const LoginFlowExecutor = () => {
  const [error, setError] = useState(null);

  const hasRunRef = useRef(false); // ✅ StrictMode guard

  const qs = new URLSearchParams(window.location.search);

  const subscriberId = qs.get("subscriber_id");
  const userId = qs.get("user_id");
  const sessionId = qs.get("session_id");
  const customerReferenceId = qs.get("customer_reference_id");
  const redirectUrl = qs.get("redirect_url");
  const failureUrl = qs.get("failure_url");

  const firstName = qs.get("first_name");
  const lastName = qs.get("last_name");
  const phoneNumber = qs.get("phone_number");

  const bypass = qs.get("bypass") === "1";

  const apiBase = "http://localhost:8080";

  useEffect(() => {
    // ✅ Prevent double execution (React 18 StrictMode)
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const runFlow = async () => {
      try {
        if (!subscriberId || !userId || !sessionId || !redirectUrl || !failureUrl) {
          throw new Error("Missing required login parameters");
        }

        if (!LOGIN_CHECKS_ENABLED || bypass) {
          const successUrl = new URL(redirectUrl);
          successUrl.searchParams.set("status", "success");
          successUrl.searchParams.set("request_id", "bypassed");
          successUrl.searchParams.set("session_id", sessionId);
          window.location.replace(successUrl.toString());
          return;
        }

        /* STEP 0: Get Token */
        const initResp = await fetch(`${apiBase}/login/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriber_id: Number(subscriberId),
            session_id: sessionId,
          }),
        });

        if (!initResp.ok) {
          const err = await initResp.json().catch(() => ({}));
          throw new Error(err.error || "Login initialization failed");
        }

        const { token } = await initResp.json();
        if (!token) throw new Error("Token generation failed");

        /* STEP 1: Fingerprint */
        const fp = await window.FPClient.getFingerprint({
          subscriberId: String(subscriberId),
        });

        const { requestId } = fp;
        if (!requestId) throw new Error("Fingerprint failed");

        /* STEP 2: Create fingerprint */
        const createResp = await fetch(`${apiBase}/login/fingerprint/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            request_id: requestId,
            subscriber_id: Number(subscriberId),
            session_id: sessionId,
            user_id: userId,
            redirect_url: redirectUrl,
            customer_reference_id: customerReferenceId,
            ...(firstName && { first_name: firstName }),
            ...(lastName && { last_name: lastName }),
            ...(phoneNumber && { phone_number: phoneNumber }),
          }),
        });

        if (!createResp.ok) {
          const err = await createResp.json().catch(() => ({}));
          throw new Error(err.error || "Fingerprint create failed");
        }

        /* STEP 3: Run checks */
        const checksResp = await fetch(`${apiBase}/login/run/checks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            request_id: requestId,
            subscriber_id: Number(subscriberId),
            session_id: sessionId,
            user_id: userId,
            event_type: "loginflow",
            redirect_url: redirectUrl,
            failure_url: failureUrl,
          }),
        });

        if (!checksResp.ok) {
          const err = await checksResp.json().catch(() => ({}));
          throw new Error(err.error || "Risk evaluation failed");
        }

        const { decision } = await checksResp.json();

        /* REDIRECTS */
        const targetUrl =
          decision === "ALLOW"
            ? redirectUrl
            : failureUrl;

        const url = new URL(targetUrl);

        if (decision === "ALLOW") {
          url.searchParams.set("status", "success");
          url.searchParams.set("request_id", requestId);
        } else {
          url.searchParams.set("status", "failed");
          url.searchParams.set("reason", decision || "UNKNOWN");
        }

        url.searchParams.set("session_id", sessionId);
        window.location.replace(url.toString());

      } catch (e) {
        console.error("Login flow error:", e);
        setError(e.message);
      }
    };

    runFlow();
  }, []);

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ height: "100vh", background: "#f5f7fa" }}
    >
      {error ? (
        <div style={{ color: "red", textAlign: "center" }}>
          <h5>Login Failed</h5>
          <p>{error}</p>
        </div>
      ) : (
        <Spinner animation="border" role="status" style={{ width: 60, height: 60 }} />
      )}
    </div>
  );
};
