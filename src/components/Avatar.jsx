import { initials, safeImage } from "../lib/text";

export function Avatar({ participant, className = "" }) {
  const image = safeImage(participant?.image);
  const combinedClass = `avatar ${className}`.trim();

  if (image) {
    return <img className={combinedClass} src={image} alt="" />;
  }

  return (
    <div className={`${combinedClass} avatar-fallback`}>
      {initials(participant?.name)}
    </div>
  );
}
