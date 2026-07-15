<?php

namespace App\Helpers;

/**
 * Ambil Facebook Pixel ID dari landing page builder (blok type "settings"),
 * bukan dari kolom produk.fb_pixel — selaras dengan ProductClient.js.
 */
class FacebookPixelLandingpageHelper
{
    /**
     * @param  mixed  $landingpage  Array blok landing / string JSON / null
     * @return list<string>
     */
    public static function extractPixelIdsFromLandingpage($landingpage): array
    {
        $blocks = self::normalizeLandingpageBlocks($landingpage);
        $settings = self::findSettingsBlock($blocks);
        if (!$settings) {
            return [];
        }

        $ids = [];

        $fp = $settings['facebook_pixels'] ?? null;
        if (is_array($fp)) {
            foreach ($fp as $x) {
                if ($x !== null && $x !== '') {
                    $ids[] = trim((string) $x);
                }
            }
        } elseif (is_string($fp) && $fp !== '') {
            foreach (preg_split('/\s*,\s*/', $fp, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $x) {
                $ids[] = trim($x);
            }
        }

        $pixels = $settings['analytics']['facebook']['pixels'] ?? [];
        if (is_array($pixels)) {
            foreach ($pixels as $p) {
                if (!is_array($p)) {
                    continue;
                }
                $id = $p['id'] ?? $p['pixel'] ?? $p['pixel_id'] ?? null;
                if ($id !== null && $id !== '') {
                    $ids[] = trim((string) $id);
                }
            }
        }

        $ids = array_values(array_unique(array_filter($ids, function ($v) {
            return $v !== '';
        })));

        return $ids;
    }

    /**
     * Extract pixel configurations including custom events from landingpage builder settings.
     * 
     * @param  mixed  $landingpage
     * @return array
     */
    public static function extractPixelsWithEvents($landingpage): array
    {
        $blocks = self::normalizeLandingpageBlocks($landingpage);
        $settings = self::findSettingsBlock($blocks);
        if (!$settings) {
            return [];
        }

        $pixelsList = [];

        // Format baru (builder): settings.analytics.facebook.pixels
        $pixels = $settings['analytics']['facebook']['pixels'] ?? [];
        if (is_array($pixels)) {
            foreach ($pixels as $p) {
                if (!is_array($p)) {
                    continue;
                }
                $id = $p['id'] ?? $p['pixel'] ?? $p['pixel_id'] ?? null;
                if ($id !== null && $id !== '') {
                    $pixelsList[] = [
                        'pixel_id' => trim((string) $id),
                        'events' => $p['events'] ?? []
                    ];
                }
            }
        }

        // Format lama: settings.facebook_pixels (bisa array/string)
        if (empty($pixelsList)) {
            $fp = $settings['facebook_pixels'] ?? null;
            $ids = [];
            if (is_array($fp)) {
                foreach ($fp as $x) {
                    if ($x !== null && $x !== '') {
                        $ids[] = trim((string) $x);
                    }
                }
            } elseif (is_string($fp) && $fp !== '') {
                foreach (preg_split('/\s*,\s*/', $fp, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $x) {
                    $ids[] = trim($x);
                }
            }
            foreach ($ids as $id) {
                $pixelsList[] = [
                    'pixel_id' => $id,
                    'events' => []
                ];
            }
        }

        return $pixelsList;
    }

    /**
     * @param  mixed  $landingpage
     */
    private static function normalizeLandingpageBlocks($landingpage): array
    {
        if ($landingpage === null || $landingpage === '') {
            return [];
        }
        if (is_array($landingpage)) {
            return $landingpage;
        }
        if (is_string($landingpage)) {
            $decoded = json_decode($landingpage, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * @param  array<int, mixed>  $blocks
     * @return array<string, mixed>|null
     */
    private static function findSettingsBlock(array $blocks): ?array
    {
        foreach ($blocks as $item) {
            if (is_array($item) && (($item['type'] ?? '') === 'settings')) {
                return $item;
            }
        }

        return null;
    }
}
