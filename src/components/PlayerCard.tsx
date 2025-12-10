// src/components/PlayerCard.tsx
type Player = {
  id: number | string;
  name: string;
  number?: number;
  photo?: string;
  positions?: string[]; 
  teamId?: number | string;
};

type Props = {
  player: Player;
  onClick: (player: Player) => void;
};

export default function PlayerCard({ player, onClick }: Props) {
  return (
    <div className="player-card" onClick={() => onClick(player)} role="button" tabIndex={0}>
      <div className="player-card__img">
        <img src={player.photo || "/placeholder-player.png"} alt={player.name} />
      </div>
      <div className="player-card__info">
        <div className="player-card__name">{player.name}</div>
        {player.number !== undefined && <div className="player-card__number">#{player.number}</div>}
      </div>
    </div>
  );
}
