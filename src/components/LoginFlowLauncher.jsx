import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Button } from "react-bootstrap";

export const LoginFlowLauncher = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    subscriber_id: "1",
    user_id: "john.doe@example.com",
    session_id: "sess-abc-123",
    customer_reference_id: "player_0",
    redirect_url: "http://localhost:3000",
    failure_url: "http://localhost:3000",
    environment: "DEV",

    // ✅ OPTIONAL (nullable)
    first_name: "John",
    last_name: "Doe",
    phone_number: "000-0000-0000",
  });

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = (e) => {
    e.preventDefault();

    // ✅ Only include non-empty params
    const params = new URLSearchParams(
      Object.entries({
        subscriber_id: form.subscriber_id,
        user_id: form.user_id,
        session_id: form.session_id,
        customer_reference_id: form.customer_reference_id,
        redirect_url: form.redirect_url,
        failure_url: form.failure_url,
        env: form.environment,

        // optional
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone_number,
      }).filter(([_, v]) => v && v.trim() !== "")
    );

    // 🔥 Silent redirect into executor
    navigate(`/login-flow?${params.toString()}`);
  };

  return (
    <Card className="p-4 shadow-sm">
      <h3 className="mb-3">Login Flow Launcher</h3>

      <Form onSubmit={submit}>
        {/* REQUIRED */}
        <Form.Group className="mb-3">
          <Form.Label>Subscriber ID</Form.Label>
          <Form.Control
            name="subscriber_id"
            value={form.subscriber_id}
            onChange={update}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>User ID (email)</Form.Label>
          <Form.Control
            name="user_id"
            value={form.user_id}
            onChange={update}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Session ID</Form.Label>
          <Form.Control
            name="session_id"
            value={form.session_id}
            onChange={update}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Customer Reference ID</Form.Label>
          <Form.Control
            name="customer_reference_id"
            value={form.customer_reference_id}
            onChange={update}
            required
          />
        </Form.Group>

        {/* OPTIONAL USER INFO */}
        <Form.Group className="mb-3">
          <Form.Label>First Name (optional)</Form.Label>
          <Form.Control
            name="first_name"
            value={form.first_name}
            onChange={update}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Last Name (optional)</Form.Label>
          <Form.Control
            name="last_name"
            value={form.last_name}
            onChange={update}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Phone Number (optional)</Form.Label>
          <Form.Control
            name="phone_number"
            value={form.phone_number}
            onChange={update}
            placeholder="+15551234567"
          />
        </Form.Group>

        {/* REDIRECTS */}
        <Form.Group className="mb-3">
          <Form.Label>Success Redirect URL</Form.Label>
          <Form.Control
            name="redirect_uri"
            value={form.redirect_url}
            onChange={update}
            placeholder="https://app.example.com/login/callback"
            required
          />
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label>Failure Redirect URL</Form.Label>
          <Form.Control
            name="failure_uri"
            value={form.failure_url}
            onChange={update}
            placeholder="https://app.example.com/login/failed"
            required
          />
        </Form.Group>

        <Button type="submit" className="w-100">
          Start Login Flow
        </Button>
      </Form>
    </Card>
  );
};

