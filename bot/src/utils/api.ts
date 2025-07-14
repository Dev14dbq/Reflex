import axios from "axios";

import { Profile, Advertisement } from "../types/index.js";
import { API_BASE, BOT_TOKEN } from "../config.js";

export async function fetchProfile(tgId: number): Promise<Profile | null> {
    try {
        const { data } = await axios.get(`${API_BASE}/profile/by-telegram/${tgId.toString()}`, {
            timeout: 5000
        });

        return data.exists ? data.profile : null;
    } catch (error) {
        console.error('[API] Ошибка при использовании функции fetchProfile:', error.responce || error);
        return null;
    }
}

export async function uploadPhoto(telegramId: number, imageId: string): Promise<{ ok: boolean, fileUrl: string }> {
    try {
        /**
         * Получаем путь до нужного нам файла используя айди фото
         */

        const fileInfoResp = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${imageId}`
        );

        const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfoResp.data?.result?.file_path}`;

        const { status } = await axios.post(`${API_BASE}/profile/add-media`, {
            telegramId,
            imageUrl
        });

        return {
            ok: status === 200,
            fileUrl: imageUrl
        };
    } catch (error: any) {
        console.error('[API] Ошибка при использовании функции uploadPhoto:', error.responce || error);
        return {
            ok: false,
            fileUrl: ''
        };
    }
}

export async function getAdvertisement(userId: number): Promise<Advertisement | null> {
    try {
        const { data } = await axios.get(`${API_BASE}/advertising/serve`, {
            params: {
                userId
            },
            timeout: 5000
        });

        return data.ad || null;
    } catch {
        return null;
    }
}

export async function getAdvertisementData(campaign_id: string): Promise<Advertisement | null> {
    try {
        const { data } = await axios.get(`${API_BASE}/advertising/campaign/${campaign_id}/ad`, {
            timeout: 5000
        });

        return data.ad || null;
    } catch {
        return null;
    }
}


export async function trackAdImpression(campaignId: string, userId: number) {
    try {
        await axios.post(`${API_BASE}/advertising/track/impression`, {
            campaignId,
            userId
        });
    } catch (error) {
        console.error('[API] Ошибка при использовании функции uploadPhoto:', error.responce || error);
        return null;
    }
}

export async function trackAdClick(campaignId: string, userId: number) {
    try {
        await axios.post(`${API_BASE}/advertising/track/click`, {
            campaignId,
            userId
        });
    } catch (error) {
        console.error('[API] Ошибка при использовании функции uploadPhoto:', error.responce || error);
        return null;
    }
} 