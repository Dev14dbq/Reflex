"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationRouter = void 0;
const express_1 = require("express");
const auth_1 = require("./middleware/auth");
const locationRouter = (0, express_1.Router)();
exports.locationRouter = locationRouter;
// Geoapify API key - добавьте свой ключ
const GEOAPIFY_API_KEY = "b9d6b522024346b7abe4c5c77b2a805b"; // Замените на свой ключ
// Поиск городов через Geoapify Geocoding API
locationRouter.post("/location/suggest-cities", auth_1.authMiddleware, async (req, res) => {
    try {
        const { query, count = 10 } = req.body;
        if (!query || query.length < 2) {
            res.status(400).json({ error: "Query must be at least 2 characters" });
            return;
        }
        // Используем Geoapify для поиска городов
        const searchParams = new URLSearchParams({
            text: query,
            limit: Math.min(count, 20).toString(),
            type: 'city',
            lang: 'ru',
            format: 'json',
            apiKey: GEOAPIFY_API_KEY
        });
        // Делаем запрос к Geoapify API с обработкой ошибок
        let response;
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${searchParams}`, {
                    headers: {
                        'User-Agent': 'Reflex-Dating-App/1.0'
                    },
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                if (!response.ok) {
                    throw new Error(`Geoapify API error: ${response.status}`);
                }
                break; // Успешный запрос
            }
            catch (error) {
                console.warn(`[LOCATION] Geoapify attempt ${attempt + 1} failed:`, error.message);
                if (attempt === maxRetries) {
                    // Если все попытки неудачны, возвращаем пустой результат
                    console.error('[LOCATION] All Geoapify attempts failed, returning empty suggestions');
                    res.json({ suggestions: [] });
                    return;
                }
                // Ждем перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        const data = await response.json();
        // Фильтруем и форматируем результаты для городов
        const filteredSuggestions = data.features
            ?.filter((item) => {
            // Фильтруем только населенные пункты
            const placeType = item.properties?.result_type;
            return placeType === 'city' || placeType === 'locality';
        })
            .map((item) => {
            const props = item.properties || {};
            const cityName = props.city || props.name || '';
            const region = props.state || props.county || '';
            const country = props.country || 'Россия';
            return {
                value: region ? `${cityName}, ${region}` : cityName,
                unrestricted_value: props.formatted,
                data: {
                    city: cityName,
                    settlement: cityName,
                    region: region,
                    region_with_type: region,
                    country: country,
                    geo_lat: item.geometry?.coordinates?.[1] || 0,
                    geo_lon: item.geometry?.coordinates?.[0] || 0,
                    place_id: props.place_id,
                    formatted: props.formatted
                }
            };
        })
            .slice(0, count) || [];
        res.json({
            suggestions: filteredSuggestions
        });
    }
    catch (error) {
        console.error("[LOCATION] Geoapify city suggestion error:", error);
        res.status(500).json({
            error: "Failed to fetch city suggestions",
            message: error.message
        });
    }
});
// Обратное геокодирование (координаты -> адрес) через Geoapify
locationRouter.get("/location/reverse-geocode", auth_1.authMiddleware, async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            res.status(400).json({ error: "Latitude and longitude are required" });
            return;
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        if (isNaN(latitude) || isNaN(longitude)) {
            res.status(400).json({ error: "Invalid coordinates" });
            return;
        }
        const searchParams = new URLSearchParams({
            lat: latitude.toString(),
            lon: longitude.toString(),
            lang: 'ru',
            format: 'json',
            apiKey: GEOAPIFY_API_KEY
        });
        // Делаем запрос к Geoapify API с обработкой ошибок
        let response;
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${searchParams}`, {
                    headers: {
                        'User-Agent': 'Reflex-Dating-App/1.0'
                    },
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                if (!response.ok) {
                    throw new Error(`Geoapify API error: ${response.status}`);
                }
                break; // Успешный запрос
            }
            catch (error) {
                console.warn(`[LOCATION] Geoapify reverse attempt ${attempt + 1} failed:`, error.message);
                if (attempt === maxRetries) {
                    console.error('[LOCATION] All Geoapify reverse attempts failed');
                    res.status(500).json({
                        error: "Location service temporarily unavailable",
                        message: "Unable to connect to location service"
                    });
                    return;
                }
                // Ждем перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        const data = await response.json();
        if (!data.features || data.features.length === 0) {
            res.status(404).json({ error: "Location not found" });
            return;
        }
        const feature = data.features[0];
        const props = feature.properties;
        const cityName = props.city || props.name || '';
        const regionName = props.state || props.county || '';
        const countryName = props.country || '';
        res.json({
            city: cityName,
            locality: cityName,
            region: regionName,
            country: countryName,
            full_address: props.formatted,
            coordinates: {
                lat: latitude,
                lng: longitude
            },
            data: {
                city: cityName,
                region: regionName,
                country: countryName,
                formatted: props.formatted,
                place_id: props.place_id
            }
        });
    }
    catch (error) {
        console.error("[LOCATION] Geoapify reverse geocoding error:", error);
        res.status(500).json({
            error: "Failed to reverse geocode location",
            message: error.message
        });
    }
});
// Поиск мест через Geoapify (для дополнительных возможностей)
locationRouter.post("/location/search-places", auth_1.authMiddleware, async (req, res) => {
    try {
        const { query, count = 10, categories = 'accommodation' } = req.body;
        if (!query || query.length < 2) {
            res.status(400).json({ error: "Query must be at least 2 characters" });
            return;
        }
        const searchParams = new URLSearchParams({
            text: query,
            limit: Math.min(count, 20).toString(),
            categories: categories,
            lang: 'ru',
            format: 'json',
            apiKey: GEOAPIFY_API_KEY
        });
        // Делаем запрос к Geoapify API с обработкой ошибок
        let response;
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await fetch(`https://api.geoapify.com/v1/geocode/search?${searchParams}`, {
                    headers: {
                        'User-Agent': 'Reflex-Dating-App/1.0'
                    },
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                if (!response.ok) {
                    throw new Error(`Geoapify API error: ${response.status}`);
                }
                break; // Успешный запрос
            }
            catch (error) {
                console.warn(`[LOCATION] Geoapify places attempt ${attempt + 1} failed:`, error.message);
                if (attempt === maxRetries) {
                    console.error('[LOCATION] All Geoapify places attempts failed, returning empty results');
                    res.json({ places: [] });
                    return;
                }
                // Ждем перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        const data = await response.json();
        // Форматируем результаты
        const places = data.features?.map((item) => {
            const props = item.properties || {};
            return {
                name: props.name || '',
                address: props.formatted || '',
                city: props.city || '',
                region: props.state || props.county || '',
                country: props.country || '',
                coordinates: {
                    lat: item.geometry?.coordinates?.[1] || 0,
                    lng: item.geometry?.coordinates?.[0] || 0
                },
                categories: props.categories || [],
                place_id: props.place_id
            };
        }) || [];
        res.json({
            places: places.slice(0, count)
        });
    }
    catch (error) {
        console.error("[LOCATION] Geoapify place search error:", error);
        res.status(500).json({
            error: "Failed to search places",
            message: error.message
        });
    }
});
// Получить популярные города (для автокомплита без API)
locationRouter.get("/location/popular-cities", auth_1.authMiddleware, async (req, res) => {
    try {
        // Популярные города стран СНГ и соседних государств
        const popularCities = [
            // Россия
            { city: "Москва", region: "Москва", country: "Россия" },
            { city: "Санкт-Петербург", region: "Санкт-Петербург", country: "Россия" },
            { city: "Новосибирск", region: "Новосибирская область", country: "Россия" },
            { city: "Екатеринбург", region: "Свердловская область", country: "Россия" },
            { city: "Казань", region: "Республика Татарстан", country: "Россия" },
            { city: "Нижний Новгород", region: "Нижегородская область", country: "Россия" },
            { city: "Челябинск", region: "Челябинская область", country: "Россия" },
            { city: "Самара", region: "Самарская область", country: "Россия" },
            { city: "Омск", region: "Омская область", country: "Россия" },
            { city: "Ростов-на-Дону", region: "Ростовская область", country: "Россия" },
            // Украина
            { city: "Киев", region: "Киевская область", country: "Украина" },
            { city: "Харьков", region: "Харьковская область", country: "Украина" },
            { city: "Одесса", region: "Одесская область", country: "Украина" },
            { city: "Днепр", region: "Днепропетровская область", country: "Украина" },
            { city: "Львов", region: "Львовская область", country: "Украина" },
            { city: "Запорожье", region: "Запорожская область", country: "Украина" },
            { city: "Кривой Рог", region: "Днепропетровская область", country: "Украина" },
            { city: "Николаев", region: "Николаевская область", country: "Украина" },
            // Беларусь
            { city: "Минск", region: "Минская область", country: "Беларусь" },
            { city: "Гомель", region: "Гомельская область", country: "Беларусь" },
            { city: "Витебск", region: "Витебская область", country: "Беларусь" },
            { city: "Могилёв", region: "Могилёвская область", country: "Беларусь" },
            { city: "Брест", region: "Брестская область", country: "Беларусь" },
            { city: "Гродно", region: "Гродненская область", country: "Беларусь" },
            // Казахстан
            { city: "Алматы", region: "Алматинская область", country: "Казахстан" },
            { city: "Астана", region: "Акмолинская область", country: "Казахстан" },
            { city: "Шымкент", region: "Туркестанская область", country: "Казахстан" },
            { city: "Караганда", region: "Карагандинская область", country: "Казахстан" },
            // Другие страны
            { city: "Ташкент", region: "Ташкентская область", country: "Узбекистан" },
            { city: "Бишкек", region: "Чуйская область", country: "Киргизия" },
            { city: "Баку", region: "Бакинский район", country: "Азербайджан" },
            { city: "Ереван", region: "Ереван", country: "Армения" },
            { city: "Тбилиси", region: "Тбилиси", country: "Грузия" },
            { city: "Кишинёв", region: "Кишинёв", country: "Молдова" },
            { city: "Душанбе", region: "Душанбе", country: "Таджикистан" },
            { city: "Ашхабад", region: "Ахал", country: "Туркменистан" }
        ];
        res.json({
            cities: popularCities
        });
    }
    catch (error) {
        console.error("[LOCATION] Popular cities error:", error);
        res.status(500).json({
            error: "Failed to fetch popular cities",
            message: error.message
        });
    }
});
