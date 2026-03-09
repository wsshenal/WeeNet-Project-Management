// src/App.jsx
import React, { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router/Router";
import StartupSplash from "./components/StartupSplash";

const App = () => {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (isBooting) {
    return <StartupSplash />;
  }

  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
};

export default App;
