/**
 * AI Setting API Functions
 */

import { api } from "./api";
import { API_ENDPOINTS } from "@/config/api";

/**
 * GET /api/sales/ai-setting
 * Get AI Setting
 * @returns {Promise<{success: boolean, data: object|null}>}
 */
export async function getAiSetting() {
  const res = await api(API_ENDPOINTS.sales.aiSetting, { method: "GET" });
  return {
    success: res.success,
    data: res.data,
    message: res.message,
  };
}

/**
 * POST /api/sales/ai-setting
 * Create or Update AI Setting
 * @param {object} settingData - { prompt: string }
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function saveAiSetting(settingData) {
  const res = await api(API_ENDPOINTS.sales.aiSetting, {
    method: "POST",
    body: JSON.stringify(settingData),
  });

  return {
    success: res.success,
    message: res.message,
    data: res.data,
  };
}

/**
 * PUT /api/sales/ai-setting/{id}
 * Update AI Setting
 * @param {number|string} id - Setting ID
 * @param {object} settingData - { prompt: string }
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function updateAiSetting(id, settingData) {
  const res = await api(API_ENDPOINTS.sales.aiSettingById(id), {
    method: "PUT",
    body: JSON.stringify(settingData),
  });

  return {
    success: res.success,
    message: res.message,
    data: res.data,
  };
}
