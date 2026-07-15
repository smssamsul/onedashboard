export const runtime = "nodejs";

import { NextResponse } from "next/server";
import axios from "axios";
import { BACKEND_URL } from "@/config/env";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const reqBody = await request.json();
    
    console.log(`[TRAINER_UPDATE] ========== PUT /api/sales/produk/${id}/trainer ==========`);
    console.log(`[TRAINER_UPDATE] Request body:`, reqBody);
    
    if (!reqBody || (reqBody.trainer !== null && typeof reqBody.trainer !== "number")) {
      return NextResponse.json(
        { success: false, message: "Trainer ID harus berupa number atau null" },
        { status: 400, headers: corsHeaders }
      );
    }

    let feeTrainerForward = undefined;
    if (Object.prototype.hasOwnProperty.call(reqBody, "fee_trainer")) {
      const f = reqBody.fee_trainer;
      if (f === null || f === "" || f === undefined) {
        feeTrainerForward = null;
      } else {
        const n = typeof f === "number" ? f : Number(f);
        if (!Number.isFinite(n)) {
          return NextResponse.json(
            { success: false, message: "fee_trainer harus angka (persen) atau null" },
            { status: 400, headers: corsHeaders }
          );
        }
        feeTrainerForward = Math.min(100, Math.max(0, n));
      }
    }

    const forwardBody = { trainer: reqBody.trainer };
    if (feeTrainerForward !== undefined) {
      forwardBody.fee_trainer = feeTrainerForward;
    }

    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/sales/produk/${id}/trainer`,
        forwardBody,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(`[TRAINER_UPDATE] ✅ Backend response:`, response.data);
      
      // Response sesuai dokumentasi: { success: true, message: "...", data: {...} }
      return NextResponse.json(response.data, { headers: corsHeaders });
    } catch (axiosError) {
      console.error(`[TRAINER_UPDATE] ❌ Axios error:`, axiosError);
      
      if (axiosError.response) {
        // Backend responded with error
        const errorData = axiosError.response.data || {};
        const errorMessage = errorData.message || errorData.error || "Gagal mengupdate trainer";
        
        console.error(`[TRAINER_UPDATE] ❌ Backend error response:`, {
          status: axiosError.response.status,
          data: errorData,
          message: errorMessage
        });
        
        // Handle specific error about trainer_rel relationship
        if (errorMessage.includes("trainer_rel") || errorMessage.includes("undefined relationship")) {
          return NextResponse.json(
            {
              success: false,
              message: "Error: Relationship trainer_rel tidak didefinisikan di backend. Silakan hubungi developer backend untuk memperbaiki model Produk.",
              error: errorMessage,
              hint: "Backend perlu menambahkan relationship trainer_rel di model Produk"
            },
            { status: axiosError.response.status }
          );
        }
        
        return NextResponse.json(
          {
            success: false,
            message: errorMessage,
            error: errorData
          },
          { status: axiosError.response.status, headers: corsHeaders }
        );
      } else if (axiosError.request) {
        // Request sent but no response
        console.error(`[TRAINER_UPDATE] ❌ No response from backend`);
        return NextResponse.json(
          {
            success: false,
            message: "Tidak ada response dari backend",
            error: axiosError.message,
          },
          { status: 500, headers: corsHeaders }
        );
      } else {
        // Error setting up request
        console.error(`[TRAINER_UPDATE] ❌ Request setup error:`, axiosError.message);
        throw axiosError;
      }
    }
  } catch (error) {
    console.error(`[TRAINER_UPDATE] ❌ Unexpected error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat mengupdate trainer",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

