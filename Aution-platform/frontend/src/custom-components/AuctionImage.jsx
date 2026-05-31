import { IMAGE_FALLBACK_SRC, getAuctionImageSrc } from "@/lib/dashboardUi";
import { useEffect, useMemo, useState } from "react";

/* eslint-disable react/prop-types */
const aspectClasses = {
  square: "aspect-square",
  "4/3": "aspect-[4/3]",
  wide: "aspect-video",
};

const fitClasses = {
  contain: "object-contain",
  cover: "object-cover",
};

const AuctionImage = ({
  image,
  src,
  alt = "Auction item",
  aspect = "square",
  fit = "contain",
  className = "",
  imgClassName = "",
  priority = false,
}) => {
  const resolvedSrc = useMemo(
    () => getAuctionImageSrc(src || image),
    [image, src]
  );
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  const handleError = () => {
    if (currentSrc !== IMAGE_FALLBACK_SRC) {
      setCurrentSrc(IMAGE_FALLBACK_SRC);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-md border border-slate-200 bg-slate-100 p-2 ${
        aspectClasses[aspect] || aspectClasses.square
      } ${className}`}
    >
      <img
        src={currentSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={handleError}
        className={`h-full w-full rounded-[4px] ${
          fitClasses[fit] || fitClasses.contain
        } ${imgClassName}`}
      />
    </div>
  );
};

export default AuctionImage;
