import React from "react";
import api from '@api';

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { MainLayout } from "@layouts/MainLayout";

// TODO: Сгрупировать 
import { RegisterProfile } from "@page/RegisterProfile";
import { Search } from "@page/Search";
import { Likes } from "@page/Likes";
import { Chat } from "@page/Chat";
import { App } from "@page/App";


import { 
    ProfileView,
    MyProfile
} from "@page/Profile";

import {
    Settings,
    Recommendation,
    Notification
} from "@page/Settings";

import {
    Reset
} from "@page/Reset";

import { CityMigration } from "@page/CityMigration/CityMigration";
import { AdminPanel } from "@page/Admin/AdminPanel";
import { AdminUsers } from "@page/Admin/AdminUsers";
import { AdminNews } from "@page/Admin/AdminNews";
import { AdminModeration } from "@page/Admin/AdminModeration";
import { AdminAnalytics } from "@page/Admin/AdminAnalytics";
import { AdminAdvertisement } from "@page/Admin/AdminAdvertisement";
import { ModerationPanel } from "@page/Moderation/ModerationPanel";
import { ModerationComplaints } from "@page/Moderation/ModerationComplaints";
import { ModerationStats } from "@page/Moderation/ModerationStats";
import { ModerationProfiles } from "@page/Moderation/ModerationProfiles";
import { ModerationProfilesView } from "@page/Moderation/ModerationProfilesView";
import { ModerationUserView } from "@page/Moderation/ModerationUserView";
import { ModerationChats } from "@page/Moderation/ModerationChats";
import { AdvertiserPanel } from "@page/Advertiser/AdvertiserPanel";
import { CreateCampaign } from "@page/Advertiser/CreateCampaign";
import { CampaignsList } from "@page/Advertiser/CampaignsList";
import { CampaignAnalytics } from "@page/Advertiser/CampaignAnalytics";
import { TermsOfService } from "@page/Legal/TermsOfService";
import { PrivacyPolicy } from "@page/Legal/PrivacyPolicy";
import { DataProcessing } from "@page/Legal/DataProcessing";

/**
 * Компонент для проверки прав. Необходимое право: Администратор
 */
const AdminRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/profile/me', {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        });

        const data = await response.json();
        setIsAdmin(data.profile?.user?.isAdmin === true);
      } catch (error) {
        console.error('[CHECK] Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return <div>Пожалуйста, подождите немного. Выполняется проверка прав!</div>;
  }

  return isAdmin ? element : <Navigate to="/" replace />;
};

/**
 * Компонент для проверки прав. Необходимое право: Модератор
 */
const ModeratorRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const [canModerate, setCanModerate] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkModerator = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/profile/me', {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        });

        const data = await response.json();
        const user = data.profile?.user;
        setCanModerate(user?.isAdmin === true || user?.isModerator === true);
      } catch (error) {
        console.error('[CHECK] Failed to check moderator status:', error);
        setCanModerate(false);
      } finally {
        setLoading(false);
      }
    };
    checkModerator();
  }, []);

  if (loading) {
    return <div>Пожалуйста, подождите немного. Выполняется проверка прав!</div>;
  }

  return canModerate ? element : <Navigate to="/" replace />;
};

/**
 * Компонент для проверки прав. Необходимое право: Рекламодатель
 */
const AdvertiserRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const [canAdvertise, setCanAdvertise] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdvertiser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/profile/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json();
        const user = data.profile?.user;
        setCanAdvertise(user?.isAdmin === true || user?.isAdvertiser === true);
      } catch (error) {
        console.error('[CHECK] Failed to check advertiser status:', error);
        setCanAdvertise(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdvertiser();
  }, []);

  if (loading) {
    return <div>Пожалуйста, подождите немного. Выполняется проверка прав!</div>;
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
          <Route path="settings/notifications" element={<Notification />} />
          <Route path="settings/recommendations" element={<Recommendation />} />
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
