import React, { useEffect, useState } from "react";
import { Spinner, Alert } from "react-bootstrap";

/* =====================================================
   Constants
===================================================== */
const LOG_KEY = "login_flow_logs";
const RUN_KEY = "login_flow_running";
const STEP_DELAY_MS = 10_000; // 30 seconds

/* =====================================================
   Helpers
===================================================== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}

function log(step, data) {
  const entry = {
    ts: new Date().toISOString(),
    step,
    data,
  };

  console.log(`[LoginFlow] ${step}`, data ?? "");

  const logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  logs.push(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

/* =====================================================
   Component
===================================================== */
export const LoginFlowExecutor = () => {
  const [error, setError] = useState(null);

  /* ---------------------------------------------
     Query params
  --------------------------------------------- */
  const qs = new URLSearchParams(window.location.search);

  const subscriberId = qs.get("subscriber_id");
  const userId = qs.get("user_id");
  const sessionId = qs.get("session_id");
  const customerReferenceId = qs.get("customer_reference_id");
  const redirectUrl = qs.get("redirect_url");
  const failureUrl = qs.get("failure_url");

  // Optional params
  const firstName = qs.get("first_name");
  const lastName = qs.get("last_name");
  const phoneNumber = qs.get("phone_number");
  const debug = qs.get("debug") === "1";

  const apiBase = "http://localhost:8080";

  /* ---------------------------------------------
     Main flow
  --------------------------------------------- */
  const STEP_DELAY_MS = debug ? 30_000 : 0;

  useEffect(() => {
    const runFlow = async () => {
      if (sessionStorage.getItem(RUN_KEY)) return;
      sessionStorage.setItem(RUN_KEY, "1");

      clearLogs();
      log("FLOW_START", { url: window.location.href });

      try {
        if (
          !subscriberId ||
          !userId ||
          !sessionId ||
          !redirectUrl ||
          !failureUrl
        ) {
          throw new Error("Missing required login parameters");
        }

        const isValidUrl = (u) => {
          try {
            new URL(u);
            return true;
          } catch {
            return false;
          }
        };

        if (!isValidUrl(redirectUrl) || !isValidUrl(failureUrl)) {
          throw new Error("Invalid redirect URLs");
        }

        // STEP 1
        log("STEP_1_FP_START");
        const fp = await window.FPClient.getFingerprint({
          subscriberId: String(subscriberId),
        });
        log("STEP_1_FP_RESPONSE", fp);

        const { requestId } = fp;
        if (!requestId) throw new Error("Fingerprint missing requestId");

        await sleep(STEP_DELAY_MS);

        // STEP 2
        const createPayload = {
          request_id: requestId,
          subscriber_id: Number(subscriberId),
          session_id: sessionId,
          user_id: userId,
          redirect_uri: redirectUrl,
          customer_reference_id: customerReferenceId,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
          ...(phoneNumber && { phone_number: phoneNumber }),
        };

        log("STEP_2_CREATE_PAYLOAD", createPayload);

        const createResp = await fetch(`${apiBase}/login/fingerprint/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        const createText = await createResp.text();
        log("STEP_2_CREATE_RESPONSE", {
          status: createResp.status,
          body: createText,
        });

        if (!createResp.ok) throw new Error("Fingerprint create failed");

        await sleep(STEP_DELAY_MS);

        // STEP 3
        const checksResp = await fetch(`${apiBase}/login/run/checks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: requestId,
            subscriber_id: Number(subscriberId),
            session_id: sessionId,
            user_id: userId,
            event_type: "loginflow",
            redirect_url: redirectUrl,
            failure_url: failureUrl,
            explain: true
          }),
        });

        const checksResult = await checksResp.json();
        log("STEP_3_CHECKS_RESULT", checksResult);

        if (checksResult.decision === "ALLOW") {
          log("REDIRECT_SUCCESS", redirectUrl);
          window.location.replace(redirectUrl);
        } else {
          log("REDIRECT_FAILURE", failureUrl);
          window.location.replace(failureUrl);
        }
      } catch (err) {
        log("FLOW_ERROR", err.message);
        window.location.replace(failureUrl);
      } finally {
        sessionStorage.removeItem(RUN_KEY);
      }
    };

    runFlow();
    return () => sessionStorage.removeItem(RUN_KEY);
  }, []);

  /* ---------------------------------------------
     Minimal UI
  --------------------------------------------- */
  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100">
      {!error ? (
        <>
          <Spinner animation="border" />
          <p className="mt-3 text-muted">Verifying your session…</p>
        </>
      ) : (
        <Alert variant="danger">Login failed. Redirecting…</Alert>
      )}
    </div>
  );
};
