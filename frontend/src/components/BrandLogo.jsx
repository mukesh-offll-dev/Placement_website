/**
 * The Government College of Engineering, Srirangam crest, served from /gces-logo.png (public/).
 * Size it with a height class (for example "h-10"); the width follows the image's proportions.
 */
export default function BrandLogo({ className = 'h-10', alt = 'Government College of Engineering, Srirangam' }) {
  return (
    <img
      src="/gces-logo.png"
      alt={alt}
      // Intrinsic size (the file is 320 x 275) lets the browser reserve space before it loads.
      width="320"
      height="275"
      draggable={false}
      className={`w-auto object-contain select-none ${className}`}
    />
  );
}
