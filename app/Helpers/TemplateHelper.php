<?php

namespace App\Helpers;

class TemplateHelper
{

    public static function render(string $text, array $data = []): string
    {
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
}
