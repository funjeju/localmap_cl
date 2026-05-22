import GNB from '@/components/home/GNB';
import HeroSection from '@/components/home/HeroSection';
import DashboardGrid from '@/components/home/DashboardGrid';
import Footer from '@/components/home/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <GNB />
      <HeroSection />
      <DashboardGrid />
      <Footer />
    </div>
  );
}
