<?php

namespace App\Exceptions;

use Exception;

class MetaAdsApiException extends Exception
{
    public ?int $metaErrorCode;
    public ?int $metaErrorSubcode;
    public ?string $metaErrorType;

    public function __construct(string $message, ?int $metaErrorCode = null, ?int $metaErrorSubcode = null, ?string $metaErrorType = null)
    {
        parent::__construct($message);
        $this->metaErrorCode = $metaErrorCode;
        $this->metaErrorSubcode = $metaErrorSubcode;
        $this->metaErrorType = $metaErrorType;
    }

    /**
     * Token kadaluarsa / tidak valid (perlu sambungkan ulang akun).
     */
    public function isAuthError(): bool
    {
        return in_array($this->metaErrorCode, [190, 200], true);
    }

    /**
     * Kena rate limit Meta - sebaiknya dicoba lagi nanti, bukan error permanen.
     */
    public function isRateLimited(): bool
    {
        return in_array($this->metaErrorCode, [4, 17, 32, 80004], true);
    }
}
