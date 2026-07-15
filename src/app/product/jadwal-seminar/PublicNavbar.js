'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const PRODUCT_MENU_ITEMS = [
  { label: 'Seminar', href: 'https://ternakproperti.com/p/jadwal-seminar' },
  { label: 'Workshop', href: 'https://ternakproperti.com/workshop/' },
  { label: 'Books & E-Course', href: 'https://ternakproperti.com/books/' },
];

export default function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileProductOpen, setIsMobileProductOpen] = useState(false);

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="https://ternakproperti.com/">
              <img
                className="h-10 w-auto"
                src="/assets/logo.png"
                alt="Ternak Properti Logo"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/200x60/ffffff/facc15?text=TERNAK+PROPERTI';
                }}
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="https://ternakproperti.com/" className="text-gray-900 font-semibold hover:text-[#facc15] transition-colors">
              Home
            </Link>
            <div className="relative group">
              <div className="cursor-pointer flex items-center text-[#facc15] font-semibold transition-colors">
                <span>Product</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
              <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                <div className="bg-white shadow-lg rounded-md py-2 w-56">
                  {PRODUCT_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block px-5 py-2.5 text-gray-900 font-semibold hover:bg-gray-50 hover:text-[#facc15] transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link href="https://ternakproperti.com/about-us/" className="text-gray-900 font-semibold hover:text-[#facc15] transition-colors">
              About Us
            </Link>
            <Link href="https://ternakproperti.com/blog/" className="text-gray-900 font-semibold hover:text-[#facc15] transition-colors">
              Blog
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-900 hover:text-gray-600 focus:outline-none p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-lg">
            <Link href="https://ternakproperti.com/" className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-md">
              Home
            </Link>
            <div>
              <button
                onClick={() => setIsMobileProductOpen(!isMobileProductOpen)}
                className="w-full flex justify-between items-center px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <span>Product</span>
                <svg className={`w-4 h-4 transition-transform ${isMobileProductOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              {isMobileProductOpen && (
                <div className="pl-5">
                  {PRODUCT_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="https://ternakproperti.com/about-us/" className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-md">
              About Us
            </Link>
            <Link href="https://ternakproperti.com/blog/" className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-md">
              Blog
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
