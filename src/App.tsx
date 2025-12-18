import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import Overview from "./pages/Overview";
import Performance from "./pages/Performance";
import Posts from "./pages/Posts";
import Stories from "./pages/Stories";
import Demographics from "./pages/Demographics";
import OnlineFollowers from "./pages/OnlineFollowers";
import Reels from "./pages/Reels";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DateRangeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/posts" element={<Posts />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/demographics" element={<Demographics />} />
              <Route path="/online" element={<OnlineFollowers />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DateRangeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
