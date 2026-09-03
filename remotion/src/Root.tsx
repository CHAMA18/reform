import { Composition } from 'remotion';
import { ReformDemo } from './ReformDemo';
import { ReformCinematic } from './ReformCinematic';
import { ReformHackathon } from './ReformHackathon';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReformDemo"
        component={ReformDemo}
        durationInFrames={30 * 180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ReformHackathon"
        component={ReformHackathon}
        durationInFrames={30 * 180}
        fps={30}
        width={1920}
        height={1040}
      />
      <Composition
        id="ReformCinematic"
        component={ReformCinematic}
        durationInFrames={30 * 180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
