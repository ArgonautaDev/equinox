import { Routes, Route } from "react-router-dom";
import { ReceivablesList } from "./pages/ReceivablesList";

export const ReceivablesModule = () => {
  return (
    <Routes>
      <Route index element={<ReceivablesList />} />
    </Routes>
  );
};

export default ReceivablesModule;
