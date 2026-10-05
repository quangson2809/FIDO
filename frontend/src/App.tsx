import React from 'react';
import { useApp } from './context/AppContext';
import { AppProvider } from './context/AppProvider';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './screens/CartDrawer';
import { HomeScreen } from './screens/HomeScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { OrderSuccessScreen } from './screens/OrderSuccessScreen';
import { OrderDetailScreen } from './screens/OrderDetailScreen';
import { MyOrdersScreen } from './screens/MyOrdersScreen';
import { PolicyScreen } from './screens/PolicyScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AdminScreen } from './screens/AdminScreen';

const MainContent: React.FC = () => {
  const { currentScreen, toastMessage } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home': return <HomeScreen />;
      case 'catalog': return <CatalogScreen />;
      case 'product-detail': return <ProductDetailScreen />;
      case 'cart': return <HomeScreen />;
      case 'checkout': return <CheckoutScreen />;
      case 'order-success': return <OrderSuccessScreen />;
      case 'order-detail': return <OrderDetailScreen />;
      case 'my-orders': return <MyOrdersScreen />;
      case 'policy': return <PolicyScreen />;
      case 'auth': return <AuthScreen />;
      case 'profile': return <ProfileScreen />;
      case 'admin': return <AdminScreen />;
      default: return <HomeScreen />;
    }
  };

  if (currentScreen === 'admin') {
    return (
      <div className="min-h-screen bg-[#071911] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif]">
        <AdminScreen />
        {toastMessage && <Toast message={toastMessage} />}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif]">
      <Header />
      <main className="flex-1 pb-8">{renderScreen()}</main>
      <CartDrawer />
      <Footer />
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
};

const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed bottom-6 right-4 z-50 bg-[#0B2419] px-5 py-3 text-sm text-white shadow-2xl sm:right-8">
    {message}
  </div>
);

export default function App() {
  return <AppProvider><MainContent /></AppProvider>;
}
