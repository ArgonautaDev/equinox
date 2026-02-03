import { Routes, Route } from "react-router-dom";
import { InvoiceList } from "./InvoiceList";
import { InvoiceForm } from "./InvoiceForm";
import { InvoiceDetails } from "./InvoiceDetails";

export default function BillingModule() {
    return (
        <Routes>
            <Route index element={<InvoiceList />} />
            <Route path="new" element={<InvoiceForm />} />
            <Route path=":id" element={<InvoiceDetails />} />
        </Routes>
    );
}
