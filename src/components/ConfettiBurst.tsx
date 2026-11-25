const CONFETTI_PIECES = [
  {tx: '-120px', ty: '70px', rot: '220deg', color: '#F97316', delay: '0ms'},
  {tx: '-95px', ty: '95px', rot: '-180deg', color: '#38BDF8', delay: '40ms'},
  {tx: '-70px', ty: '60px', rot: '160deg', color: '#FACC15', delay: '80ms'},
  {tx: '-45px', ty: '105px', rot: '-260deg', color: '#22C55E', delay: '20ms'},
  {tx: '-20px', ty: '80px', rot: '290deg', color: '#FB7185', delay: '60ms'},
  {tx: '15px', ty: '92px', rot: '-210deg', color: '#F97316', delay: '30ms'},
  {tx: '40px', ty: '68px', rot: '190deg', color: '#38BDF8', delay: '70ms'},
  {tx: '65px', ty: '110px', rot: '-240deg', color: '#FACC15', delay: '10ms'},
  {tx: '92px', ty: '74px', rot: '260deg', color: '#22C55E', delay: '50ms'},
  {tx: '118px', ty: '96px', rot: '-170deg', color: '#A855F7', delay: '90ms'},
  {tx: '-105px', ty: '45px', rot: '140deg', color: '#FACC15', delay: '110ms'},
  {tx: '-82px', ty: '115px', rot: '-290deg', color: '#FB7185', delay: '120ms'},
  {tx: '-58px', ty: '52px', rot: '210deg', color: '#38BDF8', delay: '130ms'},
  {tx: '-30px', ty: '120px', rot: '-150deg', color: '#F97316', delay: '100ms'},
  {tx: '5px', ty: '58px', rot: '230deg', color: '#22C55E', delay: '140ms'},
  {tx: '28px', ty: '112px', rot: '-220deg', color: '#A855F7', delay: '150ms'},
  {tx: '52px', ty: '48px', rot: '185deg', color: '#F97316', delay: '115ms'},
  {tx: '78px', ty: '104px', rot: '-260deg', color: '#38BDF8', delay: '135ms'},
  {tx: '102px', ty: '55px', rot: '240deg', color: '#FACC15', delay: '145ms'},
  {tx: '130px', ty: '88px', rot: '-195deg', color: '#22C55E', delay: '125ms'},
];

export function ConfettiBurst() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50"
    >
      {CONFETTI_PIECES.map((piece, idx) => (
        <span
          key={idx}
          className="weatherly-confetti-piece absolute w-2 h-2.5 rounded-sm"
          style={
            {
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              '--tx': piece.tx,
              '--ty': piece.ty,
              '--rot': piece.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
