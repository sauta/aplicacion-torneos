import { Avatar } from "./Avatar";

export function ChampionStrip({ champion }) {
  if (!champion) {
    return null;
  }

  return (
    <div className="champion-strip">
      <Avatar participant={champion} />
      <div>
        <span className="eyebrow">Campeon</span>
        <strong>{champion.name}</strong>
      </div>
    </div>
  );
}
