/**
 * Clients Module - Entry Point
 */

import { Routes, Route } from "react-router-dom";
import { ClientList } from "./ClientList";
import { ClientForm } from "./ClientForm";

export function ClientsModule() {
  return (
    <Routes>
      <Route index element={<ClientList />} />
      <Route path="new" element={<ClientForm />} />
      <Route path=":id" element={<ClientForm />} />
    </Routes>
  );
}
