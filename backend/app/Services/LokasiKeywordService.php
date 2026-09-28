<?php

namespace App\Services;

/**
 * Pencocokan campaign Meta Ads dengan produk lewat keyword lokasi (kota).
 *
 * Nama campaign dan nama produk sama-sama menyebut kota ("Seminar Ternak
 * Properti Depok", "Depok - Seminar Akuisisi"), jadi kota dipakai sebagai
 * jembatan untuk menarik data order internal ke baris campaign.
 */
class LokasiKeywordService
{
    /**
     * Kanonik => daftar ejaan/alias yang mungkin muncul di nama campaign/produk.
     * Alias ditulis lowercase. Tambah di sini kalau ada kota baru yang diiklankan.
     */
    private const KOTA = [
        'Jakarta' => ['jakarta', 'jkt', 'dki'],
        'Bogor' => ['bogor'],
        'Depok' => ['depok'],
        'Tangerang' => ['tangerang', 'tangsel', 'bsd'],
        'Bekasi' => ['bekasi'],
        'Bandung' => ['bandung', 'bdg'],
        'Cirebon' => ['cirebon'],
        'Tegal' => ['tegal'],
        'Pekalongan' => ['pekalongan'],
        'Semarang' => ['semarang', 'smg'],
        'Solo' => ['solo', 'surakarta'],
        'Jogjakarta' => ['jogjakarta', 'yogyakarta', 'jogja', 'yogya', 'diy'],
        'Surabaya' => ['surabaya', 'sby'],
        'Sidoarjo' => ['sidoarjo'],
        'Malang' => ['malang'],
        'Denpasar' => ['denpasar', 'bali'],
        'Medan' => ['medan'],
        'Palembang' => ['palembang'],
        'Pekanbaru' => ['pekanbaru'],
        'Padang' => ['padang'],
        'Batam' => ['batam'],
        'Lampung' => ['lampung', 'bandar lampung'],
        'Pontianak' => ['pontianak'],
        'Banjarmasin' => ['banjarmasin'],
        'Balikpapan' => ['balikpapan'],
        'Samarinda' => ['samarinda'],
        'Makassar' => ['makassar', 'ujung pandang'],
        'Manado' => ['manado'],
        'Gorontalo' => ['gorontalo'],
        'Kendari' => ['kendari'],
        'Jayapura' => ['jayapura'],
    ];

    /**
     * Ambil kota pertama yang terdeteksi dari sebuah teks (nama campaign/produk).
     * Alias yang lebih panjang diperiksa duluan supaya "bandar lampung" tidak
     * kalah oleh "lampung", dan pencocokan dibatasi batas kata supaya
     * "solo" tidak ikut kena di kata seperti "solusi".
     */
    public function deteksiKota(?string $teks): ?string
    {
        if (empty($teks)) {
            return null;
        }

        $lower = mb_strtolower($teks);

        $kandidat = [];
        foreach (self::KOTA as $kanonik => $aliasList) {
            foreach ($aliasList as $alias) {
                if (preg_match('/(?<![a-z0-9])' . preg_quote($alias, '/') . '(?![a-z0-9])/u', $lower)) {
                    $kandidat[] = ['kota' => $kanonik, 'panjang' => mb_strlen($alias)];
                }
            }
        }

        if (empty($kandidat)) {
            return null;
        }

        usort($kandidat, fn ($a, $b) => $b['panjang'] <=> $a['panjang']);

        return $kandidat[0]['kota'];
    }

    /**
     * Pisahkan nama kota yang ada di UJUNG teks: "Seminar Ternak Properti
     * Jakarta" -> ['sisa' => 'Seminar Ternak Properti', 'kota' => 'Jakarta'].
     * Hanya kota di akhir yang dipisah, supaya kota di tengah nama produk
     * tidak memotong nama produknya. Kota dikembalikan dalam bentuk kanonik
     * ("jkt" -> "Jakarta"). Null kalau ujung teks bukan nama kota.
     *
     * @return array{sisa: string, kota: string}|null
     */
    public function pisahKotaDiAkhir(?string $teks): ?array
    {
        $teks = trim((string) $teks);
        if ($teks === '') {
            return null;
        }

        $kandidat = [];
        foreach (self::KOTA as $kanonik => $aliasList) {
            foreach ($aliasList as $alias) {
                $kandidat[] = [$kanonik, $alias];
            }
        }
        // Alias terpanjang dulu ("bandar lampung" sebelum "lampung").
        usort($kandidat, fn ($a, $b) => mb_strlen($b[1]) <=> mb_strlen($a[1]));

        foreach ($kandidat as [$kanonik, $alias]) {
            $pola = '/^(.*?)(?:\s+|^)(?:kota\s+)?' . preg_quote($alias, '/') . '$/iu';
            if (preg_match($pola, $teks, $m)) {
                $sisa = trim($m[1]);
                if ($sisa === '') {
                    return null; // teksnya cuma nama kota, bukan produk + kota
                }

                return ['sisa' => $sisa, 'kota' => $kanonik];
            }
        }

        return null;
    }

    /**
     * Kelompokkan produk berdasarkan kota yang terdeteksi dari namanya.
     *
     * @param  iterable  $produkList  butuh properti id dan nama
     * @return array<string, int[]>   kota => daftar produk id
     */
    public function petakanProdukPerKota(iterable $produkList): array
    {
        $peta = [];
        foreach ($produkList as $produk) {
            $kota = $this->deteksiKota($produk->nama ?? null);
            if (!$kota) {
                continue;
            }
            $peta[$kota][] = (int) $produk->id;
        }

        return $peta;
    }
}
