import { Suspense } from "react";
import SupplierInvoiceTable from "./SupplierInvoiceTable";

export default function SupplierInvoice({ searchParams }) {
  const id = searchParams?.id;

  if (!id) return <div className="p-4">Supplier ID is required.</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Supplier Invoice</h1>

      {/* Filter Form */}
      <div className="mb-4 border p-4 rounded shadow">
        <form action="">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <input type="date" name="from_date" className="border p-2 rounded" />
            <input type="date" name="to_date" className="border p-2 rounded" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              Submit
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <Suspense fallback={<div>Loading invoices...</div>}>
        <SupplierInvoiceTable supplierId={id} />
      </Suspense>
    </div>
  );
}
