import AdminApp from "./app/AdminApp";
import CustomerPortalPage from "./features/customerPortal/CustomerPortalPage";
import { parseCustomerPortalPath } from "./features/customerPortal/customerPortalUtils";

export default function App() {
  const customerPortalRoute = parseCustomerPortalPath(window.location.pathname);

  if (customerPortalRoute.isPortal) {
    return <CustomerPortalPage token={customerPortalRoute.token} />;
  }

  return <AdminApp />;
}
