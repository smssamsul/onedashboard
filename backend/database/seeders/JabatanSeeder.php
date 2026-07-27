<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Jabatan;

class JabatanSeeder extends Seeder
{
    /**
     * Seed tabel jabatan sesuai JABATAN_MAP di frontend
     * (frontend-tp/src/lib/jabatanLabels.js), id harus sama
     * dengan kode jabatan yang dipakai di hr_karyawan.jabatan.
     *
     * @return void
     */
    public function run()
    {
        $jabatanList = [
            1 => 'Staff',
            2 => 'Manager',
            3 => 'General Manager',
            4 => 'Direksi',
        ];

        foreach ($jabatanList as $id => $nama) {
            Jabatan::updateOrCreate(
                ['id' => $id],
                ['nama' => $nama, 'create_at' => now()->format('Y-m-d H:i:s')]
            );
        }

        // Kode lama 5-8 (Supervisor, Officer, Clerical Staff, Internship) sudah
        // dilebur ke 4 kategori di atas — hapus baris lama supaya tidak jadi pilihan lagi.
        Jabatan::whereIn('id', [5, 6, 7, 8])->delete();
    }
}
