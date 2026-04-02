import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/app/contexts/AppContext';
import { HomePage } from '@/app/components/HomePage';
import { AuthPage } from '@/app/components/AuthPage';
import { UserInterface } from '@/app/components/UserInterfaceNew';
import { VendorInterface } from '@/app/components/VendorInterfaceNew';
import { CourierInterface } from '@/app/components/CourierInterface';
import { AdminInterface } from '@/app/components/AdminInterface';
import { Toaster } from '@/app/components/ui/sonner';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/user" element={<UserInterface />} />
          <Route path="/vendor" element={<VendorInterface />} />
          <Route path="/courier" element={<CourierInterface />} />
          <Route path="/admin" element={<AdminInterface />} />
        </Routes>
        <Toaster position="top-right" />
      </AppProvider>
    </BrowserRouter>
  );
}