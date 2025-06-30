import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { MainLayout } from "../layouts/MainLayout";

import { App } from "../pages/App/App";
import { RegisterProfile } from "../pages/RegisterProfile/RegisterProfile";
import { Search } from "../pages/Search/Search";
import { ProfileView } from "../pages/Profile/Profile";
import { Likes } from "../pages/Likes/Likes";
import { Chat } from "../pages/Chat/Chat";
import { Settings } from "../pages/Settings/Settings";
import { NotificationSettings } from "../pages/Settings/NotificationSettings";
import { RecommendationSettings } from "../pages/Settings/RecommendationSettings";
import { Reset } from "../pages/Reset/Reset";
import { MyProfile } from "../pages/Profile/MyProfile";
import { CityMigration } from "../pages/CityMigration/CityMigration";
import { AdminPanel } from "../pages/Admin/AdminPanel";
import { AdminUsers } from "../pages/Admin/AdminUsers";
import { AdminNews } from "../pages/Admin/AdminNews";
import { AdminModeration } from "../pages/Admin/AdminModeration";
import { AdminAnalytics } from "../pages/Admin/AdminAnalytics";
import { AdminAdvertisement } from "../pages/Admin/AdminAdvertisement";
import { ModerationPanel } from "../pages/Moderation/ModerationPanel";
import { ModerationComplaints } from "../pages/Moderation/ModerationComplaints";
import { ModerationStats } from "../pages/Moderation/ModerationStats";
import { ModerationProfiles } from "../pages/Moderation/ModerationProfiles";
import { ModerationProfilesView } from "../pages/Moderation/ModerationProfilesView";
import { ModerationUserView } from "../pages/Moderation/ModerationUserView";
import { ModerationChats } from "../pages/Moderation/ModerationChats";
import { AdvertiserPanel } from "../pages/Advertiser/AdvertiserPanel";
import { CreateCampaign } from "../pages/Advertiser/CreateCampaign";
import { CampaignsList } from "../pages/Advertiser/CampaignsList";
import { CampaignAnalytics } from "../pages/Advertiser/CampaignAnalytics";
import { TermsOfService } from "../pages/Legal/TermsOfService";
import { PrivacyPolicy } from "../pages/Legal/PrivacyPolicy";
import { DataProcessing } from "../pages/Legal/DataProcessing";


// Компонент для проверки прав администратора
const AdminRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://spectrmod.ru/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setIsAdmin(data.profile?.user?.isAdmin === true);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  if (loading) {
    return <div>Проверка прав доступа...</div>;
  }

  return isAdmin ? element : <Navigate to="/" replace />;
};

// Компонент для проверки прав модератора
const ModeratorRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const [canModerate, setCanModerate] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkModerator = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://spectrmod.ru/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const user = data.profile?.user;
        setCanModerate(user?.isAdmin === true || user?.isModerator === true);
      } catch (error) {
        console.error('Failed to check moderator status:', error);
        setCanModerate(false);
      } finally {
        setLoading(false);
      }
    };
    checkModerator();
  }, []);

  if (loading) {
    return <div>Проверка прав доступа...</div>;
  }

  return canModerate ? element : <Navigate to="/" replace />;
};

// Компонент для проверки прав рекламодателя
const AdvertiserRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const [canAdvertise, setCanAdvertise] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdvertiser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://spectrmod.ru/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const user = data.profile?.user;
        setCanAdvertise(user?.isAdmin === true || user?.isAdvertiser === true);
      } catch (error) {
        console.error('Failed to check advertiser status:', error);
        setCanAdvertise(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdvertiser();
  }, []);

  if (loading) {
    return <div>Проверка прав доступа...</div>;
  }

  return canAdvertise ? element : <Navigate to="/" replace />;
};

export const AppRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/reset" element={<Reset />} />
        <Route path="/city-migration" element={<CityMigration />} />
        
        {/* Legal pages */}
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/data-processing" element={<DataProcessing />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<App />} />
          <Route path="likes" element={<Likes />} />
          <Route path="chats" element={<Chat />} />
          <Route path="search" element={<Search />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/notifications" element={<NotificationSettings />} />
          <Route path="settings/recommendations" element={<RecommendationSettings />} />
          <Route path="profile/:profileId" element={<ProfileView />} />
          <Route path="register" element={<RegisterProfile />} />
          <Route path="my-profile" element={<MyProfile />} />
          
          {/* Админ панель */}
          <Route path="admin" element={<AdminRoute element={<AdminPanel />} />} />
                      <Route path="admin/users" element={<AdminRoute element={<AdminUsers />} />} />
            <Route path="admin/news" element={<AdminRoute element={<AdminNews />} />} />
            <Route path="admin/moderation" element={<AdminRoute element={<AdminModeration />} />} />
            <Route path="admin/advertisement" element={<AdminRoute element={<AdminAdvertisement />} />} />
            <Route path="admin/analytics" element={<AdminRoute element={<AdminAnalytics />} />} />
          
          {/* Модераторская панель */}
          <Route path="moderation" element={<ModeratorRoute element={<ModerationPanel />} />} />
          <Route path="moderation/complaints" element={<ModeratorRoute element={<ModerationComplaints />} />} />
          <Route path="moderation/profiles" element={<ModeratorRoute element={<ModerationProfiles />} />} />
          <Route path="moderation/profiles/view" element={<ModeratorRoute element={<ModerationProfilesView />} />} />
          <Route path="moderation/user/:userId" element={<ModeratorRoute element={<ModerationUserView />} />} />
          <Route path="moderation/chats" element={<ModeratorRoute element={<ModerationChats />} />} />
          <Route path="moderation/stats" element={<ModeratorRoute element={<ModerationStats />} />} />
          
          {/* Панель рекламодателя */}
          <Route path="advertiser" element={<AdvertiserRoute element={<AdvertiserPanel />} />} />
          <Route path="advertiser/create-campaign" element={<AdvertiserRoute element={<CreateCampaign />} />} />
          <Route path="advertiser/campaigns" element={<AdvertiserRoute element={<CampaignsList />} />} />
          <Route path="advertiser/campaigns/:campaignId/analytics" element={<AdvertiserRoute element={<CampaignAnalytics />} />} />

          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};
