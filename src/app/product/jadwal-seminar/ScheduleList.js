'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, AlignJustify, Calendar, Clock, MapPin } from 'lucide-react';

export default function ScheduleList({ products }) {
  const [openIndex, setOpenIndex] = useState(0);

  // Format Date gracefully (Senin, 20 Juli 2026)
  const formatDateFull = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const time = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
      return time.replace('.', ':');
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="bg-white w-full max-w-5xl mx-auto p-6 md:p-12 shadow-2xl">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-10 text-black uppercase tracking-tight leading-tight">
        SEMINAR EXCLUSIVE PROPERTY<br />ACQUISITION
      </h2>

      <div className="space-y-4">
        {products.map((product, idx) => {
          const isOpen = openIndex === idx;
          const url = `https://ternakproperti.com/p/${product.kode}`;
          const eventDate = product.jadwal_rel && product.jadwal_rel.length > 0
            ? formatDateFull(product.jadwal_rel[0].waktu_mulai)
            : formatDateFull(product.tanggal_event);

          // In the screenshot they use format like "Seminar Property Acquisition (Depok)"
          const titleName = (product.nama || `Seminar Property Acquisition (${product.kota || "KOTA"})`).replace(/\s*\(AS\)\s*$/i, '');

          return (
            <div key={product.id || idx} className="flex flex-col">
              {/* Accordion Header */}
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className={`flex items-center w-full px-4 py-3 text-left transition-colors ${isOpen
                  ? 'border-2 border-black font-semibold text-black'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 mr-3 flex-shrink-0 text-black stroke-[3]" />
                ) : (
                  <AlignJustify className="w-5 h-5 mr-3 flex-shrink-0 text-gray-600 stroke-[2]" />
                )}
                <span className="text-sm md:text-base">{titleName}</span>
              </button>

              {/* Accordion Body */}
              {isOpen && (
                <div className="border-x border-b border-gray-300 p-6 md:p-8 bg-white flex flex-col items-start -mt-[1px]">
                  <h3 className="text-xl md:text-2xl font-extrabold uppercase mb-5 text-black">
                    SEMINAR {product.kota || "KOTA"}
                  </h3>

                  <div className="space-y-3 mb-8">
                    {/* Date */}
                    <div className="flex items-center text-gray-800 text-[17px]">
                      <Calendar className="w-5 h-5 mr-4 flex-shrink-0" />
                      <span>{eventDate || "Tanggal Belum Diatur"}</span>
                    </div>

                    {/* Time */}
                    <div className="flex items-start text-gray-800 text-[17px]">
                      <Clock className="w-5 h-5 mr-4 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        {product.jadwal_rel && product.jadwal_rel.length > 0 ? (
                          product.jadwal_rel.map((jadwal, jIdx) => {
                            const mulai = formatTime(jadwal.waktu_mulai);
                            const selesai = jadwal.waktu_selesai ? formatTime(jadwal.waktu_selesai) : 'Selesai';
                            return (
                              <span key={jadwal.id}>
                                {mulai} WIB - {selesai} {product.jadwal_rel.length > 1 ? `(${jadwal.nama_jadwal})` : ''}
                              </span>
                            );
                          })
                        ) : (
                          <span>Belum ada sesi</span>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start text-black text-[17px]">
                      <MapPin className="w-5 h-5 mr-4 flex-shrink-0 mt-0.5 fill-black text-black stroke-[1.5]" />
                      <span className="font-extrabold">{product.tempat || "Tempat Belum Diatur"}</span>
                    </div>
                  </div>

                  {/* Button */}
                  <Link href={url} className="mt-2">
                    <button className="bg-black hover:bg-gray-800 text-white font-bold py-2.5 px-5 text-[15px] transition-colors rounded-sm">
                      Ikuti Seminarnya Sekarang!
                    </button>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
