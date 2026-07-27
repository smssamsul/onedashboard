/**
 * Task Lintas Divisi API Functions
 */

import { api } from "./api";
import { API_ENDPOINTS } from "@/config/api";

/** GET /api/task — task saya */
export async function getMyTasks() {
  const res = await api(API_ENDPOINTS.task.saya, { method: "GET" });
  return res.success && Array.isArray(res.data) ? res.data : [];
}

/** GET /api/task/tim — task bawahan langsung saya */
export async function getTeamTasks() {
  const res = await api(API_ENDPOINTS.task.tim, { method: "GET" });
  return res.success && Array.isArray(res.data) ? res.data : [];
}

/** GET /api/task/menunggu-approval-saya */
export async function getPendingApprovals() {
  const res = await api(API_ENDPOINTS.task.menungguApprovalSaya, { method: "GET" });
  return res.success && Array.isArray(res.data) ? res.data : [];
}

/** GET /api/task/{id} */
export async function getTaskDetail(id) {
  const res = await api(API_ENDPOINTS.task.byId(id), { method: "GET" });
  return res.data;
}

/**
 * POST /api/task
 * @param {{hr_karyawan_id: number, judul: string, deskripsi?: string, tenggat?: string}} payload
 */
export async function createTask(payload) {
  const res = await api(API_ENDPOINTS.task.saya, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * PUT /api/task/{id}
 * @param {number|string} id
 * @param {object} payload - judul/deskripsi/tenggat/status/persentase_penyelesaian
 */
export async function updateTask(id, payload) {
  const res = await api(API_ENDPOINTS.task.byId(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/** POST /api/task/{id}/approve */
export async function approveTask(id, catatan = "") {
  const res = await api(API_ENDPOINTS.task.approve(id), {
    method: "POST",
    body: JSON.stringify({ catatan }),
  });
  return res.data;
}

/** POST /api/task/{id}/reject */
export async function rejectTask(id, catatan = "") {
  const res = await api(API_ENDPOINTS.task.reject(id), {
    method: "POST",
    body: JSON.stringify({ catatan }),
  });
  return res.data;
}
