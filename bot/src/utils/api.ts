import axios from "axios";
import {
  PROFILE_BY_TG_URL,
  UPLOAD_URL,
  AD_SERVE_URL,
  AD_IMPRESSION_URL,
  AD_CLICK_URL,
  API_BASE,
} from "../config";
import { Profile, Advertisement } from "../types";

export async function fetchProfile(tgId: number): Promise<Profile | null> {
  try {
    const url = PROFILE_BY_TG_URL.replace("{telegram_id}", tgId.toString());
    const { data } = await axios.get(url, { timeout: 5000 });
    return data.exists ? data.profile : null;
  } catch {
    return null;
  }
}

export async function uploadPhoto(telegramId: number, imageUrl: string): Promise<boolean> {
  try {
    const { status } = await axios.post(UPLOAD_URL, { telegramId, imageUrl });
    return status === 200;
  } catch {
    return false;
  }
}

export async function getAdvertisement(userId: number): Promise<Advertisement | null> {
  try {
    const { data } = await axios.get(AD_SERVE_URL, { params: { userId }, timeout: 5000 });
    return data.ad || null;
  } catch {
    return null;
  }
}

export async function trackAdImpression(campaignId: string, userId: number) {
  try {
    await axios.post(AD_IMPRESSION_URL, { campaignId, userId });
  } catch {}
}

export async function trackAdClick(campaignId: string, userId: number) {
  try {
    await axios.post(AD_CLICK_URL, { campaignId, userId });
  } catch {}
} 