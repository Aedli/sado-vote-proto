import { PlannerPanel } from './components/PlannerPanel';
import { Stage } from './components/Stage';
import { ProtoBar } from './components/TopBar';
import { BattleScreen } from './screens/BattleScreen';
import { InvasionScreen, OpeningScreen } from './screens/CinematicScreen';
import { MissionScreen } from './screens/MissionScreen';
import { PartyScreen } from './screens/PartyScreen';
import { ReportScreen } from './screens/ReportScreen';
import { DevNoteScreen, ResultsScreen } from './screens/ResultsScreen';
import { SaintSelectScreen } from './screens/SaintSelectScreen';
import { StartScreen } from './screens/StartScreen';
import { useGameStore, type Screen } from './store/gameStore';

function GameScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'opening':
      return <OpeningScreen />;
    case 'invasion':
      return <InvasionScreen />;
    case 'prelimSelect':
      return <SaintSelectScreen key="prelim" mode="prelim" />;
    case 'mission':
      return <MissionScreen />;
    case 'finalSelect':
      return <SaintSelectScreen key="final" mode="final" />;
    case 'party':
      return <PartyScreen />;
    case 'battle':
      return <BattleScreen />;
    case 'results':
      return <ResultsScreen />;
    case 'devnote':
      return <DevNoteScreen />;
    default:
      return null;
  }
}

export function App() {
  const { screen, plannerOn, busy, toast, go } = useGameStore();

  let body: React.ReactNode;
  if (screen === 'start') body = <StartScreen />;
  else if (screen === 'report') body = <ReportScreen onBack={() => go('start')} />;
  else
    body = (
      <div className="game">
        <ProtoBar />
        <div className="game-body">
          <Stage>
            <GameScreen screen={screen} />
          </Stage>
          {plannerOn && <PlannerPanel />}
        </div>
      </div>
    );

  return (
    <>
      {body}
      {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
      {busy && (
        <div className="busy">
          <div className="spinner" />
          {busy}
        </div>
      )}
    </>
  );
}
