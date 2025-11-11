import { CustomerSessionProvider } from '@/context/CustomerSessionContext';

export const metadata = {
  title: 'MPCL Customer Portal',
  description: 'Customer Management System',
};

export default function CustomerLayout({ children }) {
  return (
    <CustomerSessionProvider>
      {children}
    </CustomerSessionProvider>
  );
}