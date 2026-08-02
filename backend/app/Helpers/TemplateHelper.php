<?php

namespace App\Helpers;

class TemplateHelper
{
    /**
     * Batas iterasi resolusi spin text. Spin bersarang diselesaikan dari yang
     * paling dalam, satu lapis per iterasi — 20 lapis jauh melebihi kebutuhan
     * nyata dan memastikan template aneh tidak bikin loop tak berujung.
     */
    private const SPIN_MAX_ITERASI = 20;

    public static function render(string $text, array $data = []): string
    {
        // Spin diselesaikan lebih dulu, baru variabel. Urutan ini disengaja:
        // kalau nilai variabel (nama customer, dsb) kebetulan mengandung
        // "{a|b}", isinya tidak ikut diacak — data customer bukan template.
        $text = self::spin($text);

        preg_match_all('/{{(.*?)}}/', $text, $matches);

        if (empty($matches[1])) {
            return $text;
        }

        foreach ($matches[1] as $key) {
            $trimmedKey = trim($key);

            if (array_key_exists($trimmedKey, $data)) {
                $text = str_replace('{{' . $key . '}}', $data[$trimmedKey], $text);
            } else {
                $text = str_replace('{{' . $key . '}}', '', $text);
            }
        }

        return $text;
    }

    /**
     * Spin text: "{halo|hai|hi} kak" -> salah satu opsi dipilih acak tiap render,
     * supaya pesan yang dikirim ke banyak nomor tidak identik persis
     * (mengurangi risiko dianggap spam oleh WhatsApp).
     *
     * - Hanya kurung kurawal yang BERISI tanda "|" yang diproses, jadi
     *   placeholder {{customer_name}} aman — tidak ada pipa di dalamnya.
     * - Spin bersarang didukung: "{halo {kak|mbak}|hai}" diselesaikan dari dalam.
     * - Spasi di sekitar opsi dibuang, supaya "{halo | hai}" tidak menyisakan
     *   spasi ganda ketika opsi kedua yang terpilih.
     */
    public static function spin(string $text): string
    {
        // [^{}] memastikan yang tertangkap adalah kurung paling dalam: grup yang
        // masih mengandung kurung lain baru cocok setelah isinya beres duluan.
        $pattern = '/{([^{}]*\|[^{}]*)}/';

        for ($i = 0; $i < self::SPIN_MAX_ITERASI; $i++) {
            if (!preg_match($pattern, $text)) {
                break;
            }

            $text = preg_replace_callback($pattern, function ($m) {
                $opsi = array_map('trim', explode('|', $m[1]));

                return $opsi[array_rand($opsi)];
            }, $text);
        }

        return $text;
    }
}
