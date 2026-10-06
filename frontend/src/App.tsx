import React from 'react';
import { useApp } from './context/AppContext';
import { AppProvider } from './context/AppProvider';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScreenSwitcherBar } from './components/ScreenSwitcherBar';
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
import { ShowroomsScreen } from './screens/ShowroomsScreen';
import { AdminScreen } from './screens/AdminScreen';

const MainContent: React.FC = () => {
  const { currentScreen, toastMessage } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'catalog':
        return <CatalogScreen />;
      case 'product-detail':
        return <ProductDetailScreen />;
      case 'cart':
        return <HomeScreen />;
      case 'checkout':
        return <CheckoutScreen />;
      case 'order-success':
        return <OrderSuccessScreen />;
      case 'order-detail':
        return <OrderDetailScreen />;
      case 'my-orders':
        return <MyOrdersScreen />;
      case 'policy':
        return <PolicyScreen />;
      case 'auth':
        return <AuthScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'showrooms':
        return <ShowroomsScreen />;
      case 'admin':
        return <AdminScreen />;
      default:
        return <HomeScreen />;
    }
  };

  if (currentScreen === 'admin') {
    return (
      <div className="admin-shell min-h-screen bg-[#071911] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#0B2419] selection:text-[#E8C75B]">
        <AdminScreen />
        <ScreenSwitcherBar />
        {toastMessage && (
          <div className="fixed bottom-20 right-4 sm:right-8 z-50 animate-bounce duration-300">
            <div className="bg-[#0B2419] text-white px-5 py-3 shadow-2xl border border-[#E8C75B]/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#E8C75B] text-xl">info</span>
              <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col min-h-screen bg-[#FAF9F5] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#0B2419] selection:text-[#E8C75B]">
      <Header />
      <main className="flex-1 pb-16">{renderScreen()}</main>
      <CartDrawer />
      <Footer />
      <ScreenSwitcherBar />

      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 animate-bounce duration-300">
          <div className="bg-[#0B2419] text-white px-5 py-3 shadow-2xl border border-[#E8C75B]/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#E8C75B] text-xl">info</span>
            <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
