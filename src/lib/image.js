/**
 * Image Utilities
 * Centralized image URL building and handling
 */

/**
 * Build image URL from backend path
 * Backend returns path without "storage/" prefix, e.g., "produk/header/xxx.png"
 * For landing page products, this function returns full URL with https://app.ternakproperti.com/
 * Otherwise, returns a proxy URL: /api/image?path=...
 * Proxy handler (src/app/api/image/route.js) adds /storage/ prefix and fetches from BACKEND_URL
 */
export const buildImageUrl = (path, isLandingPage = false) => {
    if (!path) return "";
    if (typeof path !== "string") return "";

    // If already a full URL with https, or a blob/data URL, return directly
    if (
        path.startsWith("https://") ||
        path.startsWith("http://") ||
        path.startsWith("blob:") ||
        path.startsWith("data:")
    ) {
        return path;
    }

    // Clean path
    let cleanPath = path;

    // If path is full HTTP URL, extract pathname
    if (path.startsWith("http://")) {
        try {
            const url = new URL(path);
            // If it's already an absolute URL to the backend, we still want to proxy it
            // to avoid Mixed Content (HTTPS -> HTTP) issues on Vercel
            cleanPath = url.pathname;
        } catch {
            cleanPath = path;
        }
    }

    // Normalize backslashes (for Windows paths)
    cleanPath = cleanPath.replace(/\\/g, "/");

    // Remove leading slash
    cleanPath = cleanPath.replace(/^\/+/, "");

    // Remove "storage/" prefix if already there
    cleanPath = cleanPath.replace(/^storage\//, "");

    // Remove double slashes
    cleanPath = cleanPath.replace(/\/+/g, "/");

    // Encode URL for proxy
    const encodedPath = encodeURIComponent(cleanPath);

    // For landing page products, return full URL with https://app.ternakproperti.com/api/image?path=...
    if (isLandingPage) {
        return `https://app.ternakproperti.com/api/image?path=${encodedPath}`;
    }

    // Use proxy to avoid mixed content HTTPS/HTTP
    return `/api/image?path=${encodedPath}`;
};

/**
 * Resolve header source from various possible formats
 */
export const resolveHeaderSource = (header) => {
    if (!header) return "";
    let rawPath = "";
    if (typeof header === "string") {
        rawPath = header;
    } else if (header?.path && typeof header.path === "string") {
        rawPath = header.path;
    } else if (header?.value && typeof header.value === "string") {
        rawPath = header.value;
    }

    if (rawPath) {
        rawPath = rawPath.replace(/\\/g, '/');
    }

    return buildImageUrl(rawPath);
};

/**
 * Convert File to WebP Data URL (or JPEG for Safari)
 */
export const convertToWebp = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided"));
        
        // Don't convert SVG or non-images
        if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                const format = isSafari ? "image/jpeg" : "image/webp";
                
                // For JPEG, fill transparent background with white
                if (format === "image/jpeg") {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                }

                const dataUrl = canvas.toDataURL(format, 0.85);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("Failed to load image for conversion"));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
};
