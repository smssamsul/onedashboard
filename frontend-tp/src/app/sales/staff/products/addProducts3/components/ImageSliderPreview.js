"use client";

import { useState, useEffect, useRef } from "react";
import { buildImageUrl } from "@/lib/image";

export default function ImageSliderPreview({ data = {}, isLandingPage = false }) {
  const images = data.images || [];
  const sliderType = data.sliderType || "gallery";
  const autoslide = data.autoslide || false;
  const autoslideDuration = data.autoslideDuration || 5;
  const showCaption = data.showCaption || false;
  const showDots = data.showDots !== undefined ? data.showDots : true;
  const showArrows = data.showArrows !== undefined ? data.showArrows : true;

  // Advanced settings
  const alignment = data.alignment || "center";
  const imageWidth = data.imageWidth || 100;
  const imageFit = data.imageFit || "fill";
  const aspectRatio = data.aspectRatio || "OFF";
  const backgroundType = data.backgroundType || "none";
  const backgroundColor = data.backgroundColor || "#ffffff";
  const backgroundImage = data.backgroundImage || "";
  const paddingTop = data.paddingTop || 0;
  const paddingRight = data.paddingRight || 0;
  const paddingBottom = data.paddingBottom || 0;
  const paddingLeft = data.paddingLeft || 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  // Auto slide
  useEffect(() => {
    if (autoslide && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, autoslideDuration * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoslide, autoslideDuration, images.length]);

  if (images.length === 0) {
    return <div className="preview-placeholder">Belum ada gambar</div>;
  }

  // Calculate aspect ratio
  let aspectRatioStyle = {};
  if (aspectRatio !== "OFF") {
    const [width, height] = aspectRatio.split(":").map(Number);
    if (width && height) {
      aspectRatioStyle.aspectRatio = `${width} / ${height}`;
    }
  }

  // Background style
  let imageBackgroundStyle = {};
  if (backgroundType === "color") {
    imageBackgroundStyle.backgroundColor = backgroundColor;
  } else if (backgroundType === "image" && backgroundImage) {
    imageBackgroundStyle.backgroundImage = `url(${backgroundImage})`;
    imageBackgroundStyle.backgroundSize = "cover";
    imageBackgroundStyle.backgroundPosition = "center";
  }

  // Image fit style
  let objectFitValue;
  if (aspectRatio !== "OFF") {
    objectFitValue = "cover";
  } else {
    objectFitValue = imageFit === "fill" ? "fill" : imageFit === "fit" ? "contain" : "fill";
  }

  // Padding style
  const imagePaddingStyle = {
    paddingTop: `${paddingTop}px`,
    paddingRight: `${paddingRight}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingLeft: `${paddingLeft}px`,
  };

  // Container style with alignment
  const containerStyle = {
    display: "flex",
    justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
    width: "100%",
    ...imagePaddingStyle,
    position: "relative",
  };

  // Image wrapper style
  // ✅ Tambahkan maxWidth 625px untuk membatasi ukuran maksimal (sama seperti image component)
  const imageWrapperStyle = {
    width: `${imageWidth}%`,
    maxWidth: "625px",
    ...aspectRatioStyle,
    ...imageBackgroundStyle,
    overflow: "hidden",
    borderRadius: "4px",
    position: "relative",
  };

  const currentImage = images[currentIndex];

  const goToSlide = (index) => {
    setCurrentIndex(index);
    // Reset autoslide timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (autoslide && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, autoslideDuration * 1000);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={imageWrapperStyle}>
        {sliderType === "banner" && currentImage.link ? (
          <a href={currentImage.link} style={{ display: "block", width: "100%", height: "100%" }}>
            <img
              src={buildImageUrl(currentImage.src, isLandingPage)}
              alt={currentImage.alt || ""}
              style={{
                width: "100%",
                height: "100%",
                objectFit: objectFitValue,
                display: "block",
              }}
            />
          </a>
        ) : (
          <img
            src={buildImageUrl(currentImage.src, isLandingPage)}
            alt={currentImage.alt || ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: objectFitValue,
              display: "block",
            }}
          />
        )}

        {/* Caption */}
        {showCaption && currentImage.caption && (
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            color: "#ffffff",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500"
          }}>
            {currentImage.caption}
          </div>
        )}
      </div>

      {/* Slider Dots */}
      {images.length > 1 && showDots && (
        <div style={{
          position: "absolute",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "8px",
          zIndex: 10
        }}>
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              style={{
                width: currentIndex === index ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: currentIndex === index ? "#F1A124" : "rgba(255, 255, 255, 0.5)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slider Arrows */}
      {images.length > 1 && showArrows && (
        <>
          <button
            onClick={() => goToSlide((currentIndex - 1 + images.length) % images.length)}
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0, 0, 0, 0.5)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              color: "#ffffff",
              fontSize: "20px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)"}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={() => goToSlide((currentIndex + 1) % images.length)}
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0, 0, 0, 0.5)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              color: "#ffffff",
              fontSize: "20px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)"}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

