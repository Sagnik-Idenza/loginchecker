import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LoginFlowLauncher } from "./components/LoginFlowLauncher";
import { LoginFlowExecutor } from "./components/LoginFlowExecutor";

function App() {
  return (
    <Router>
      <Routes>
        {/* 📝 Form page */}
        <Route path="/" element={<LoginFlowLauncher />} />

        {/* ⚡ Silent executor */}
        <Route path="/login-flow" element={<LoginFlowExecutor />} />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <div style={{ padding: 40 }}>
              <h2>404</h2>
              <p>Page not found</p>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

