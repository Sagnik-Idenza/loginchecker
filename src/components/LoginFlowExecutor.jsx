import React, { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";

const RUN_KEY = "login_flow_running";

export const LoginFlowExecutor = () => {
  const [error, setError] = useState(null);

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

  const apiBase = "http://localhost:8080";

  useEffect(() => {
    const runFlow = async () => {
      if (sessionStorage.getItem(RUN_KEY)) return;
      sessionStorage.setItem(RUN_KEY, "1");

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

        /* STEP 1: Fingerprint */
        const fp = await window.FPClient.getFingerprint({
          subscriberId: String(subscriberId),
        });

        const { requestId } = fp;
        if (!requestId) throw new Error("Fingerprint failed");

        /* STEP 2: Create fingerprint */
        const createPayload = {
          request_id: requestId,
          subscriber_id: Number(subscriberId),
          session_id: sessionId,
          user_id: userId,
          redirect_url: redirectUrl,
          customer_reference_id: customerReferenceId,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
          ...(phoneNumber && { phone_number: phoneNumber }),
        };

        const createResp = await fetch(`${apiBase}/login/fingerprint/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        if (!createResp.ok) throw new Error("Fingerprint create failed");

        /* STEP 3: Run checks */
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
          }),
        });

        const checksResult = await checksResp.json();
        const decision = checksResult.decision;

        sessionStorage.removeItem(RUN_KEY);

        /* -----------------------------------------
          SUCCESS → ALLOW
        ------------------------------------------ */
        if (decision === "ALLOW") {
          const successUrl = new URL(redirectUrl);
          successUrl.searchParams.set("status", "success");
          successUrl.searchParams.set("request_id", requestId);
          successUrl.searchParams.set("session_id", sessionId);

          window.location.replace(successUrl.toString());
          return;
        }

        /* -----------------------------------------
          STEP-UP → OTP
        ------------------------------------------ */
        if (decision === "OTP") {
          const otpUrl = new URL(failureUrl);
          otpUrl.searchParams.set("status", "failed");
          otpUrl.searchParams.set("reason", "OTP");
          otpUrl.searchParams.set("session_id", sessionId);

          window.location.replace(otpUrl.toString());
          return;
        }

        /* -----------------------------------------
          HARD BLOCK → BLOCK
        ------------------------------------------ */
        if (decision === "BLOCK") {
          const blockUrl = new URL(failureUrl);
          blockUrl.searchParams.set("status", "failed");
          blockUrl.searchParams.set("reason", "BLOCK");
          blockUrl.searchParams.set("session_id", sessionId);

          window.location.replace(blockUrl.toString());
          return;
        }

        /* -----------------------------------------
          Unknown fallback
        ------------------------------------------ */
        const fallbackUrl = new URL(failureUrl);
        fallbackUrl.searchParams.set("status", "failed");
        fallbackUrl.searchParams.set("reason", "UNKNOWN");
        fallbackUrl.searchParams.set("session_id", sessionId);

        window.location.replace(fallbackUrl.toString());
      } catch (e) {
        setError(e.message);
      }
    };

    runFlow();
    return () => sessionStorage.removeItem(RUN_KEY);
  }, []);

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ height: "100vh", background: "#f5f7fa" }}
    >
      <Spinner
        animation="border"
        role="status"
        style={{ width: 60, height: 60 }}
      />
    </div>
  );
};
